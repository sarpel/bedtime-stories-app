#!/usr/bin/env bash
# ELI5: This script prepares a Raspberry Pi Zero 2 W (Bookworm) to host the Story App.
# It installs minimal packages, configures the IQaudIO Codec Zero audio HAT, deploys the app,
# creates systemd services, sets sane logging, and runs simple acceptance checks.
# Re-running is safe (idempotent). It won't overwrite custom settings unless needed.

set -euo pipefail
IFS=$'\n\t'

# -----------------------------
# Tiny arg parser (ELI5 style)
# -----------------------------
DRY_RUN=0
UNINSTALL=0
NO_AUDIO=0
NO_BUILD=0
SWAP_DURING_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --no-audio) NO_AUDIO=1 ;;
    --no-build) NO_BUILD=1 ;;
    --swap-during-build) SWAP_DURING_BUILD=1 ;;
    *) echo "Unknown flag: $arg"; exit 2 ;;
  esac
done

# DRY helper: wrap commands to echo instead of execute
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[DRY-RUN] $*"
  else
    eval "$@"
  fi
}

# -----------------------------
# Defaults (overridable via env)
# -----------------------------
APP_REPO=${APP_REPO:-""}            # E.g. https://github.com/user/repo.git or blank to use local copy
APP_DIR=${APP_DIR:-"/opt/storyapp"}
APP_PORT=${APP_PORT:-"8080"}        # We'll run Node backend on this port
APP_ENV=${APP_ENV:-"production"}
MEDIA_DIR=${MEDIA_DIR:-"/var/lib/storyapp/media"}
APP_USER=${APP_USER:-"storyapp"}
APP_GROUP=${APP_GROUP:-"storyapp"}
# Optional: set system hostname (e.g., "story" for story.local)
APP_HOSTNAME=${APP_HOSTNAME:-""}
ENV_FILE="/etc/storyapp/env"
LOG_DIR="/var/log/storyapp"
STATE_DIR="/var/lib/storyapp"
FIFO_PATH="$STATE_DIR/play-queue.fifo"
BOOT_CONFIG="/boot/firmware/config.txt"
LEGACY_BOOT_CONFIG="/boot/config.txt"
NEED_REBOOT=0

# Versions and minimal deps
NODE_MAJOR=${NODE_MAJOR:-"20"}   # NodeSource LTS stream

# -----------------------------
# Uninstall mode
# -----------------------------
if [ "$UNINSTALL" -eq 1 ]; then
  echo "Uninstalling Story App services and files..."
  run "systemctl stop storyaudio.service || true"
  run "systemctl disable storyaudio.service || true"
  run "systemctl stop storyapp.service || true"
  run "systemctl disable storyapp.service || true"
  run "rm -f /etc/systemd/system/storyapp.service"
  run "rm -f /etc/systemd/system/storyaudio.service"
  run "rm -f /etc/logrotate.d/storyapp"
  run "rm -f /etc/alsa/conf.d/99-storycard.conf"
  run "rm -f /usr/local/bin/play_story"
  run "systemctl daemon-reload || true"
  echo "Keeping $APP_DIR, $STATE_DIR for safety. Remove manually if desired."
  echo "Done."
  exit 0
fi

# -----------------------------
# OS + arch detection
# -----------------------------
ARCH=$(dpkg --print-architecture || true)
UNAME_M=$(uname -m || true)
if [ -f "$BOOT_CONFIG" ]; then
  ACTIVE_BOOT_CFG="$BOOT_CONFIG"
elif [ -f "$LEGACY_BOOT_CONFIG" ]; then
  ACTIVE_BOOT_CFG="$LEGACY_BOOT_CONFIG"
else
  ACTIVE_BOOT_CFG="$BOOT_CONFIG" # Default to Bookworm path
fi

echo "Architecture: $ARCH ($UNAME_M)"
echo "Boot config: $ACTIVE_BOOT_CFG"

# -----------------------------
# Minimal apt packages
# -----------------------------
# ELI5: We install only what we need. These are small.
run "apt-get update -y"
run "apt-get install -y --no-install-recommends \
  ca-certificates curl jq git unzip \
  avahi-daemon \
  alsa-utils mpg123 \
  logrotate \
  python3 build-essential pkg-config \
  libasound2-dev libsqlite3-dev"

# -----------------------------
# Node.js (NodeSource repo) - fits armhf/armv7l
# -----------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js $NODE_MAJOR (LTS)"
  run "curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -"
  run "apt-get install -y --no-install-recommends nodejs"
else
  echo "Node.js already installed: $(node -v)"
fi

# -----------------------------
# System user and directories
# -----------------------------
run "id -u $APP_USER >/dev/null 2>&1 || adduser --system --group --home $APP_DIR --no-create-home $APP_USER"
run "mkdir -p $APP_DIR/releases $APP_DIR/current"
run "mkdir -p $MEDIA_DIR"
run "mkdir -p $LOG_DIR"
run "mkdir -p /etc/storyapp"
run "mkdir -p $STATE_DIR"
run "chown -R $APP_USER:$APP_GROUP $APP_DIR $MEDIA_DIR $LOG_DIR $STATE_DIR"

# -----------------------------
# Fetch or copy app sources into a new release dir
# -----------------------------
TS=$(date +%Y%m%d%H%M%S)
RELEASE_DIR="$APP_DIR/releases/$TS"
run "mkdir -p $RELEASE_DIR"

if [ -n "$APP_REPO" ]; then
  echo "Cloning repo: $APP_REPO"
  run "git clone --depth 1 --recurse-submodules '$APP_REPO' '$RELEASE_DIR'"
else
  echo "No APP_REPO provided. Attempting to copy current directory to $RELEASE_DIR"
  # rsync preserves permissions and is efficient; fallback to cp -a if missing
  if command -v rsync >/dev/null 2>&1; then
    run "rsync -a --delete ./ '$RELEASE_DIR/'"
  else
    run "cp -a . '$RELEASE_DIR/'"
  fi
fi

run "chown -R $APP_USER:$APP_GROUP '$RELEASE_DIR'"

# Symlink current -> release
if [ -L "$APP_DIR/current" ]; then
  run "ln -sfn '$RELEASE_DIR' '$APP_DIR/current'"
else
  run "rm -rf '$APP_DIR/current'"
  run "ln -s '$RELEASE_DIR' '$APP_DIR/current'"
fi

# -----------------------------
# App stack detection (Node vs Python)
# -----------------------------
cd "$APP_DIR/current"
STACK="unknown"
if [ -f package.json ]; then
  STACK="node"
elif [ -f requirements.txt ] || [ -f pyproject.toml ]; then
  STACK="python"
fi

echo "Detected stack: $STACK"

# -----------------------------
# Node stack install/build (frontend + backend)
# -----------------------------
if [ "$STACK" = "node" ]; then
  # ELI5: Install only what's needed. Prefer prebuilt frontend (dist/) if exists.
  # Backend lives in backend/ and starts with: node backend/server.js

  # Try to use prebuilt dist; build only if missing and allowed.
  if [ -d dist ]; then
    echo "Found prebuilt frontend (dist/). Will use it."
  else
    # If a prebuilt archive is present locally, extract it
    if [ -f dist.zip ]; then
      echo "Found dist.zip, extracting..."
      run "unzip -oq dist.zip -d dist"
    elif [ -f dist.tar.gz ]; then
      echo "Found dist.tar.gz, extracting..."
      run "mkdir -p dist && tar -xzf dist.tar.gz -C dist --strip-components=1 || true"
    elif [ -n "${PREBUILT_DIST_URL:-}" ]; then
      echo "Downloading prebuilt dist from PREBUILT_DIST_URL..."
      run "curl -fsSL '$PREBUILT_DIST_URL' -o /tmp/dist.zip && unzip -oq /tmp/dist.zip -d dist || true"
    fi

    if [ -d dist ]; then
      echo "Prebuilt dist extracted."
    else
    if [ "$NO_BUILD" -eq 1 ]; then
      echo "--no-build set and no dist/ present. Skipping build. Frontend will not be served."
    else
      echo "No prebuilt dist/. Will build frontend (this can take long on Zero 2 W)."
      if [ "$SWAP_DURING_BUILD" -eq 1 ]; then
        echo "Creating temporary 1G swap for build..."
        run "fallocate -l 1G /swapfile-build || dd if=/dev/zero of=/swapfile-build bs=1M count=1024"
        run "chmod 600 /swapfile-build"
        run "mkswap /swapfile-build"
        run "swapon /swapfile-build"
      fi
  # Use tmpfs for npm cache to reduce SD wear
  run "NPM_CONFIG_CACHE=/tmp/npm-cache npm ci --no-audit --no-fund"
  run "NPM_CONFIG_CACHE=/tmp/npm-cache npm run build"
      if [ "$SWAP_DURING_BUILD" -eq 1 ]; then
        echo "Removing temporary swap..."
        run "swapoff /swapfile-build || true"
        run "rm -f /swapfile-build || true"
      fi
    fi
  fi

  # Install backend deps only (keeps frontend dev deps out if we used prebuilt)
  if [ -f backend/package.json ]; then
    (cd backend && run "NPM_CONFIG_CACHE=/tmp/npm-cache npm ci --omit=dev --no-audit --no-fund || NPM_CONFIG_CACHE=/tmp/npm-cache npm install --omit=dev --no-audit --no-fund")
  fi

  # Ensure a .env exists for backend (dotenv reads this)
  if [ ! -f backend/.env ]; then
    echo "Creating backend/.env (safe defaults)"
    run "install -o $APP_USER -g $APP_GROUP -m 0640 /dev/null backend/.env"
    cat > backend/.env <<EOF
PORT=$APP_PORT
NODE_ENV=$APP_ENV
MEDIA_DIR=$MEDIA_DIR
EOF
  fi
fi

# -----------------------------
# Python stack (not used for this repo, but supported)
# -----------------------------
if [ "$STACK" = "python" ]; then
  echo "Python stack detected. Setting up venv..."
  run "apt-get install -y --no-install-recommends python3-venv"
  run "python3 -m venv .venv"
  run ". .venv/bin/activate && pip install --no-cache-dir -U pip"
  if [ -f requirements.txt ]; then
    run ". .venv/bin/activate && pip install --no-cache-dir -r requirements.txt"
  fi
fi

# -----------------------------
# Environment file for systemd (central place)
# -----------------------------
if [ ! -f "$ENV_FILE" ]; then
  run "install -o root -g root -m 0640 /dev/null '$ENV_FILE'"
fi
# Ensure required keys exist or update them
# ELI5: we append or replace keys safely
ensure_kv() {
  local key="$1"; shift
  local val="$1"; shift
  if grep -q "^${key}=" "$ENV_FILE"; then
    run "sed -i 's|^${key}=.*|${key}=${val}|g' '$ENV_FILE'"
  else
    run "bash -c 'echo ${key}=${val} >> "$ENV_FILE"'"
  fi
}
ensure_kv APP_PORT "$APP_PORT"
ensure_kv PORT "$APP_PORT"
ensure_kv NODE_ENV "$APP_ENV"
ensure_kv MEDIA_DIR "$MEDIA_DIR"
ensure_kv APP_DIR "$APP_DIR"
ensure_kv APP_USER "$APP_USER"

# -----------------------------
# Optional: set hostname for mDNS (story.local)
# -----------------------------
if [ -n "$APP_HOSTNAME" ]; then
  CURRENT_HOST=$(hostname)
  if [ "$CURRENT_HOST" != "$APP_HOSTNAME" ] && [ "$CURRENT_HOST" != "${APP_HOSTNAME%.local}" ]; then
    # Strip .local if provided
    NEW_HOST="${APP_HOSTNAME%.local}"
    echo "Setting system hostname to: $NEW_HOST (for ${NEW_HOST}.local)"
    run "hostnamectl set-hostname '$NEW_HOST'"
    # Ensure /etc/hosts has 127.0.1.1 mapping
    if ! grep -q "^127.0.1.1\s\+$NEW_HOST" /etc/hosts 2>/dev/null; then
      run "bash -c 'echo 127.0.1.1\\t$NEW_HOST >> /etc/hosts'"
    fi
  fi
fi

# -----------------------------
# Audio overlay detection + ALSA default
# -----------------------------
if [ "$NO_AUDIO" -eq 0 ]; then
  echo "Configuring audio for IQaudIO/WM8960..."
  # Candidate overlays (first matching wins)
  CANDIDATES=(iqaudio-codec iqaudio-dac iqaudio-dacplus iqaudio-digi wm8960-soundcard)

  AVAILABLE_OVERLAY=""
  for ov in "${CANDIDATES[@]}"; do
    if [ -f "/boot/firmware/overlays/${ov}.dtbo" ] || [ -f "/boot/overlays/${ov}.dtbo" ] || dtoverlay -h "$ov" >/dev/null 2>&1; then
      AVAILABLE_OVERLAY="$ov"
      break
    fi
  done

  if [ -n "$AVAILABLE_OVERLAY" ]; then
    echo "Detected available overlay: $AVAILABLE_OVERLAY"
    if ! grep -q "^dtoverlay=$AVAILABLE_OVERLAY" "$ACTIVE_BOOT_CFG" 2>/dev/null; then
      echo "Enabling overlay in $ACTIVE_BOOT_CFG"
      run "cp -a '$ACTIVE_BOOT_CFG' '${ACTIVE_BOOT_CFG}.bak.$TS' || true"
      run "bash -c 'echo dtoverlay=$AVAILABLE_OVERLAY >> "$ACTIVE_BOOT_CFG"'"
      NEED_REBOOT=1
    else
      echo "Overlay already enabled."
    fi
    # Disable legacy analog if present to free I2S (safe to append if missing)
    if ! grep -q '^dtparam=audio=off' "$ACTIVE_BOOT_CFG" 2>/dev/null; then
      run "bash -c 'echo dtparam=audio=off >> "$ACTIVE_BOOT_CFG"'"
      NEED_REBOOT=1
    fi
  else
    echo "No known IQaudIO/WM8960 overlay found. Continuing without overlay change."
  fi

  # After reboot (or now if already active), set default ALSA card + unmute
  # Detect first matching card line from aplay -l
  CARD_LINE=$(aplay -l 2>/dev/null | grep -i -E 'IQaudIO|wm8960|iqaudio|codec' | head -n1 || true)
  CARD_NUM=0
  CARD_NAME=""
  if [ -n "$CARD_LINE" ]; then
    CARD_NUM=$(echo "$CARD_LINE" | sed -n 's/^card \([0-9]\+\):.*/\1/p')
    CARD_NAME=$(echo "$CARD_LINE" | sed -n 's/^card [0-9]\+: \([^ ]\+\).*/\1/p')
  fi

  # Create ALSA default pointing to detected card (dmix so multiple apps can play)
  run "install -d -m 0755 /etc/alsa/conf.d"
  cat > /etc/alsa/conf.d/99-storycard.conf <<EOF
# ELI5: Make this sound card the default for all apps
# Using dmix allows many apps to share audio without conflicts
pcm.!default {
  type plug
  slave.pcm "dmix${CARD_NAME:+:CARD=$CARD_NAME}"
}
ctl.!default {
  type hw
  card ${CARD_NAME:-$CARD_NUM}
}
EOF

  # Try to unmute and set safe volume (won't fail the script)
  for ctl in Master Headphone Speaker Playback DAC; do
    amixer -c "$CARD_NUM" sset "$ctl" 70% unmute >/dev/null 2>&1 || true
  done
fi

# -----------------------------
# Systemd unit files
# -----------------------------
cat > /etc/systemd/system/storyapp.service <<'EOF'
[Unit]
Description=Story App (Node backend + static frontend)
Wants=network-online.target sound.target
After=network-online.target sound.target

[Service]
Type=simple
User=storyapp
Group=storyapp
EnvironmentFile=/etc/storyapp/env
WorkingDirectory=/opt/storyapp/current
# ELI5: We redirect logs to our own file to reduce journal writes
ExecStart=/bin/sh -lc 'exec node backend/server.js >> /var/log/storyapp/app.log 2>&1'
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ProtectKernelTunables=true
ReadWritePaths=/var/log/storyapp /var/lib/storyapp /opt/storyapp

[Install]
WantedBy=multi-user.target
EOF

# Optional audio queue worker: reads FIFO and plays sequentially
cat > /etc/systemd/system/storyaudio.service <<EOF
[Unit]
Description=Story Audio Queue Worker
After=sound.target
Wants=sound.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_GROUP
ExecStart=/usr/local/bin/play_story --daemon --fifo "$FIFO_PATH"
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$STATE_DIR $LOG_DIR

[Install]
WantedBy=multi-user.target
EOF

# -----------------------------
# Playback helper CLI
# -----------------------------
install -o root -g root -m 0755 /dev/stdin /usr/local/bin/play_story <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
# ELI5: This plays a WAV (with aplay) or MP3 (with mpg123) safely with a timeout.
# It can also run as a tiny daemon that reads a FIFO queue and plays files one by one.

LOG_DIR=/var/log/storyapp
STATE_DIR=/var/lib/storyapp
FIFO_PATH="$STATE_DIR/play-queue.fifo"
TIMEOUT_SECS=${PLAY_TIMEOUT:-30}

usage() {
  echo "Usage: play_story [--timeout SEC] [--queue] [--fifo PATH] [--daemon] <file>"
  echo "  --timeout SEC  Stop playback after SEC seconds (default: $TIMEOUT_SECS)"
  echo "  --queue        Enqueue instead of immediate play (uses $FIFO_PATH)"
  echo "  --fifo PATH    Custom FIFO path"
  echo "  --daemon       Run worker that reads FIFO and plays sequentially"
}

log() { echo "[play_story] $*" >> "$LOG_DIR/play_story.log"; }

play_file() {
  local f="$1"
  if [ ! -f "$f" ]; then
    log "Missing file: $f"; exit 5
  fi
  local ext="${f##*.}"; ext="${ext,,}"
  case "$ext" in
    wav)
      timeout "$TIMEOUT_SECS" aplay -q "$f" || { rc=$?; log "aplay rc=$rc"; exit ${rc}; }
      ;;
    mp3)
      timeout "$TIMEOUT_SECS" mpg123 -q "$f" || { rc=$?; log "mpg123 rc=$rc"; exit ${rc}; }
      ;;
    *)
      log "Unsupported format: .$ext"; exit 2
      ;;
  esac
}

# Daemon mode: ensure FIFO and loop
if [ "${1:-}" = "--daemon" ]; then
  shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --fifo) FIFO_PATH="$2"; shift 2 ;;
      --timeout) TIMEOUT_SECS="$2"; shift 2 ;;
      *) break ;;
    esac
  done
  mkdir -p "$STATE_DIR" "$LOG_DIR"
  [ -p "$FIFO_PATH" ] || mkfifo "$FIFO_PATH"
  log "Audio daemon started. FIFO=$FIFO_PATH"
  while true; do
    if read -r line < "$FIFO_PATH"; then
      [ -n "$line" ] && play_file "$line" || true
    fi
  done
  exit 0
fi

# Normal CLI mode
QUEUE=0
FILE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --timeout) TIMEOUT_SECS="$2"; shift 2 ;;
    --queue) QUEUE=1; shift ;;
    --fifo) FIFO_PATH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) FILE="$1"; shift ;;
  esac
done

[ -z "$FILE" ] && usage && exit 1

mkdir -p "$STATE_DIR" "$LOG_DIR"
if [ "$QUEUE" -eq 1 ]; then
  [ -p "$FIFO_PATH" ] || mkfifo "$FIFO_PATH"
  echo "$FILE" > "$FIFO_PATH"
  log "Enqueued: $FILE"
  exit 0
else
  play_file "$FILE"
  exit 0
fi
EOF

# -----------------------------
# logrotate (protect SD card)
# -----------------------------
cat > /etc/logrotate.d/storyapp <<'EOF'
/var/log/storyapp/*.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
  copytruncate
}
EOF

# -----------------------------
# Enable and start services
# -----------------------------
run "systemctl daemon-reload"
run "systemctl enable storyapp.service"
run "systemctl enable storyaudio.service"
run "systemctl start storyapp.service"
run "systemctl start storyaudio.service || true"
run "systemctl enable --now avahi-daemon || true"

# -----------------------------
# Acceptance tests (print results, do not fail install hard)
# -----------------------------
PASS=1

echo "\nRunning acceptance checks..."
# 1) Audio device visible
if aplay -l 2>/dev/null | grep -Eqi 'iqaudio|wm8960|codec'; then
  echo "[OK] aplay shows IQaudIO/WM8960 device"
else
  echo "[WARN] aplay does not show IQaudIO/WM8960 yet (may require reboot)"
fi

# 2) Default ALSA points to our card (best-effort)
amixer info >/dev/null 2>&1 && echo "[OK] ALSA mixer available" || echo "[WARN] ALSA mixer not available"

# 3) App service active
if systemctl is-active --quiet storyapp; then
  echo "[OK] systemctl is-active storyapp"
else
  echo "[FAIL] storyapp not active"
  PASS=0
fi

# 4) App health endpoint
if curl -fsS "http://127.0.0.1:${APP_PORT}/healthz" >/dev/null 2>&1; then
  echo "[OK] Health check: 200 from /healthz"
else
  echo "[FAIL] Health check failed on port $APP_PORT"
  PASS=0
fi

# 5) Play a short test sound (if available)
TEST_WAV="/usr/share/sounds/alsa/Front_Center.wav"
if [ -f "$TEST_WAV" ]; then
  if /usr/local/bin/play_story --timeout 3 "$TEST_WAV" >/dev/null 2>&1; then
    echo "[OK] play_story test WAV played"
  else
    echo "[WARN] play_story failed (audio may need reboot/volume tweak)"
  fi
else
  echo "[INFO] Test WAV not found, skipping audio playback test"
fi

# Reboot hint if overlay changed
if [ "$NEED_REBOOT" -eq 1 ]; then
  echo "[INFO] A reboot is recommended to apply new audio overlay settings."
fi

# -----------------------------
# Final summary
# -----------------------------
HOSTNAME=$(hostname)
IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}')
CARD_SUMMARY=$(aplay -l 2>/dev/null | sed -n '1,4p' || true)

cat <<SUMMARY

==== Story App Deployment Summary ====
- URL:        http://${IP_ADDR:-127.0.0.1}:${APP_PORT}/
- mDNS:       http://${HOSTNAME}.local:${APP_PORT}/
- Service:    storyapp.service (systemctl status storyapp)
- Audio svc:  storyaudio.service (optional queue worker)
- Logs:       $LOG_DIR (logrotate daily x7)
- Media dir:  $MEDIA_DIR
- Working:    $APP_DIR/current
- Audio card: 
$CARD_SUMMARY

Quick tests you can run:
  systemctl status storyapp --no-pager
  curl -fsS http://127.0.0.1:${APP_PORT}/healthz | cat
  /usr/local/bin/play_story /usr/share/sounds/alsa/Front_Center.wav

If you want to bind to port 80, set APP_PORT=80 in $ENV_FILE and restart service. We grant CAP_NET_BIND_SERVICE.
If you changed audio overlay, reboot to finalize: sudo reboot

Installation complete. Waiting for your manual tests.
SUMMARY

exit $PASS

# Story App - Raspberry Pi Zero 2 W Deployment

This runbook helps you deploy the app to a Raspberry Pi Zero 2 W with an IQaudIO Codec Zero HAT.

## Prerequisites

- Raspberry Pi OS Lite (Bookworm, 32-bit recommended)
- IQaudIO Codec Zero HAT (or compatible WM8960)
- Network connectivity (mDNS enabled via `avahi-daemon`)

## One-time install

- Copy this repo to the Pi or set `APP_REPO` to the Git URL below.
- Run the installer (it is idempotent):

```bash
sudo APP_REPO=https://github.com/sarpel/bedtime-stories-app.git APP_PORT=8080 APP_DIR=/opt/storyapp APP_HOSTNAME=story bash ./install_pi_zero_host.sh --swap-during-build
```

Flags:

- `--dry-run` to print actions only
- `--uninstall` to remove services/files (keeps app dir/state)
- `--no-audio` to skip audio overlay/ALSA setup
- `--no-build` to skip frontend build (requires prebuilt `dist/`)
- `--swap-during-build` to add a temporary 1G swap only while building
  - Recommended when there is no prebuilt `dist/` on a Zero 2 W

## What it does

- Installs minimal packages (node, alsa-utils, mpg123, logrotate, avahi)
- Creates `storyapp` user and directories:
  - `/opt/storyapp/{releases,current}`
  - `/var/lib/storyapp` (state, FIFO)
  - `/var/lib/storyapp/media` (audio files)
  - `/var/log/storyapp` (logs)
- Detects audio overlay (iqaudio-*/wm8960) and sets default ALSA card
- Installs services:
  - `storyapp.service` (Node backend + serves built frontend)
  - `storyaudio.service` (optional FIFO-based playback worker)
- Adds logrotate rule

## Daily operations

- Start/Stop services:

```bash
sudo systemctl start storyapp
sudo systemctl stop storyapp
sudo systemctl restart storyapp
sudo systemctl status storyapp --no-pager
```

- Logs:

```bash
sudo journalctl -u storyapp -e --no-pager
sudo tail -n 200 /var/log/storyapp/app.log
sudo tail -n 200 /var/log/storyapp/play_story.log
```

- Health check:

```bash
curl -fsS http://127.0.0.1:8080/healthz
```

- Audio test:

```bash
/usr/local/bin/play_story /usr/share/sounds/alsa/Front_Center.wav
```

- Queue an audio file:

```bash
/usr/local/bin/play_story --queue /path/to/file.mp3
```

## Rollback

- Switch back to a previous release:

```bash
ls -1 /opt/storyapp/releases
sudo ln -sfn /opt/storyapp/releases/<OLD_TS> /opt/storyapp/current
sudo systemctl restart storyapp
```

## Notes

- If binding to :80, edit `/etc/storyapp/env` and set `APP_PORT=80`, then `sudo systemctl restart storyapp`.
- If an overlay was added, reboot once: `sudo reboot`.
- On Zero 2 W, builds are slow. Prefer prebuilt `dist/` or `--swap-during-build`.
- To access via mDNS, set `APP_HOSTNAME=story` so it’s reachable at `http://story.local:8080`.

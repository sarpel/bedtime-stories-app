# Uyku Masalları - Production Deployment Guide for Raspberry Pi Zero 2 W

## 🎯 Overview

This is a Turkish bedtime stories application optimized for **Raspberry Pi Zero 2 W** deployment with **IQaudio Codec Zero HAT**. The system generates custom bedtime stories using AI and converts them to high-quality Turkish speech, designed specifically for a 5-year-old Turkish girl.

### Key Features
- **AI Story Generation**: Custom Turkish bedtime stories using OpenAI GPT or Gemini
- **High-Quality TTS**: Turkish voice synthesis via ElevenLabs or Gemini TTS
- **Hybrid Data Storage**: SQLite database with localStorage fallback
- **Audio Pipeline**: ALSA + I2S audio with hardware codec support
- **Production Ready**: SystemD services, health monitoring, and automatic restarts

---

## 📋 Hardware Requirements

### Raspberry Pi Zero 2 W Specifications
- **CPU**: BCM2710A1 quad-core ARM Cortex-A53 @ 1GHz (throttles to ~600MHz sustained)
- **Memory**: 512MB RAM (shared with GPU) - **Critical constraint**
- **Storage**: Class 10 SD card (16GB minimum, 32GB recommended)
- **Network**: 802.11n wireless, Bluetooth 4.2/BLE
- **Audio**: 40-pin GPIO header for HAT connection

### Audio Hardware Setup
```
┌─────────────────────────────────────────────────────────────┐
│                    Raspberry Pi Zero 2 W                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                40-Pin GPIO Header                   │   │
│  │  [I2S Data] ────────────────────┐                  │   │
│  │  [I2S Clock] ───────────────────┼──────────────────│   │
│  │  [I2S Frame] ───────────────────┼──────────────────│   │
│  │  [3.3V Power] ──────────────────┼──────────────────│   │
│  │  [Ground] ──────────────────────┼──────────────────│   │
│  └─────────────────────────────────┼──────────────────────┘
│                                    │
└────────────────────────────────────┼──────────────────────
                                     │
    ┌────────────────────────────────┼──────────────────────┐
    │              IQaudio Codec Zero HAT                   │
    │                                                       │
    │  Dialog DA7212 Codec  ←─────────┘                     │
    │  ┌─────────────┐                                      │
    │  │ Analog I/O  │ ← [3.5mm Line Out] ← Headphones     │
    │  │ Processing  │ ← [3.5mm Mic In]  ← Microphone      │
    │  └─────────────┘ ← [Line Level]    ← Speakers        │
    │                                                       │
    └───────────────────────────────────────────────────────┘

Signal Path: App → ALSA → I2S → DA7212 → Analog Output
```

### Verified Audio Hardware
- **Primary**: IQaudio Codec Zero (pre-Raspberry Pi acquisition, Dialog DA7212)
- **Alternative**: WM8960-based HATs with similar pinout
- **Driver**: Legacy `iqaudio-codec` overlay (Bookworm compatible)

---

## ⚙️ Software Installation

### Prerequisites
- **OS**: Raspberry Pi OS Lite (Bookworm, 32-bit armhf recommended)
- **Network**: WiFi configured with internet access
- **SSH**: Enabled for remote administration
- **Time Sync**: NTP configured (important for SSL certificate validation)

### One-Command Installation
```bash
# Download and run the automated installer
sudo curl -fsSL https://github.com/sarpel/bedtime-stories-app/raw/main/install_pi_zero_host.sh -o install_pi_zero_host.sh

# Execute with recommended flags for Pi Zero 2 W
sudo APP_REPO=https://github.com/sarpel/bedtime-stories-app.git \
     APP_PORT=8080 \
     APP_DIR=/opt/storyapp \
     APP_HOSTNAME=story \
     bash ./install_pi_zero_host.sh --swap-during-build
```

### Installation Options
```bash
# Dry run (show what would be done)
sudo bash ./install_pi_zero_host.sh --dry-run

# Skip audio setup (for headless testing)  
sudo bash ./install_pi_zero_host.sh --no-audio

# Use pre-built frontend (faster)
sudo bash ./install_pi_zero_host.sh --no-build

# Full uninstall (keeps data directories)
sudo bash ./install_pi_zero_host.sh --uninstall
```

---

## 🔧 Configuration

### API Keys Setup
1. **Copy environment template**:
   ```bash
   sudo cp /opt/storyapp/current/backend/.env.example /opt/storyapp/current/backend/.env
   sudo chown storyapp:storyapp /opt/storyapp/current/backend/.env
   sudo chmod 640 /opt/storyapp/current/backend/.env
   ```

2. **Configure API keys**:
   ```bash
   sudo nano /opt/storyapp/current/backend/.env
   ```
   
   **Required**: At least one LLM and one TTS provider:
   - `OPENAI_API_KEY` (for GPT story generation)
   - `ELEVENLABS_API_KEY` (for Turkish voice synthesis)
   
   **Optional alternatives**:
   - `GEMINI_LLM_API_KEY` (alternative to OpenAI)
   - `GEMINI_TTS_API_KEY` (alternative to ElevenLabs)

3. **Restart services**:
   ```bash
   sudo systemctl restart storyapp
   sudo systemctl status storyapp --no-pager
   ```

### Audio Configuration Verification
```bash
# Check audio device detection
aplay -l

# Test ALSA default device
amixer info

# Check I2S overlay status
dtoverlay -l | grep -i iqaudio

# Test audio playback
/usr/local/bin/play_story /usr/share/sounds/alsa/Front_Center.wav
```

### Performance Tuning for 512MB RAM
```bash
# Edit environment file
sudo nano /etc/storyapp/env

# Add memory optimization settings
MAX_CONCURRENT_TTS=1
LOG_LEVEL=error
COMPRESSION_LEVEL=3
NODE_OPTIONS="--max-old-space-size=200"
```

---

## 🚀 Operations

### Service Management
```bash
# Start/stop/restart services
sudo systemctl start storyapp
sudo systemctl stop storyapp  
sudo systemctl restart storyapp
sudo systemctl status storyapp --no-pager

# Enable/disable automatic startup
sudo systemctl enable storyapp
sudo systemctl disable storyapp

# Audio queue service (optional)
sudo systemctl status storyaudio --no-pager
```

### Health Monitoring
```bash
# Quick health check
curl -fsSL http://localhost:8080/healthz

# Detailed status
curl -fsSL http://localhost:8080/healthz | jq

# Check resource usage
htop
vcgencmd measure_temp
vcgencmd get_throttled
free -h
df -h
```

### Log Management
```bash
# Application logs
sudo tail -f /var/log/storyapp/app.log

# System service logs
sudo journalctl -u storyapp -f --no-pager

# Audio service logs
sudo journalctl -u storyaudio -f --no-pager

# Rotated logs (older entries)
sudo ls -la /var/log/storyapp/
sudo zcat /var/log/storyapp/app.log.1.gz | tail -50
```

### Database Management
```bash
# Check database status
sudo -u storyapp sqlite3 /opt/storyapp/current/backend/database/stories.db "SELECT COUNT(*) FROM stories;"

# Create manual backup
sudo -u storyapp node /opt/storyapp/current/backend/database/backup.js

# Check database integrity
sudo -u storyapp sqlite3 /opt/storyapp/current/backend/database/stories.db "PRAGMA integrity_check;"
```

---

## 🔍 Troubleshooting

### Audio Issues

#### No Sound Output
```bash
# Check audio device enumeration
aplay -l
# Should show: card 0: sndrpiiqaudioco [snd_rpi_iqaudio_codec]

# Verify I2S overlay loaded
dmesg | grep -i iqaudio
# Should show: iqaudio-codec sound card found

# Check ALSA mixer levels
amixer -c 0 sget Master
amixer -c 0 sget Headphone

# Unmute and set volume
sudo amixer -c 0 sset Master 70% unmute
sudo amixer -c 0 sset Headphone 70% unmute
```

#### Audio Distortion
```bash
# Check for underruns
dmesg | grep -i underrun

# Increase audio buffer size
sudo nano /etc/storyapp/env
# Add: AUDIO_BUFFER_SIZE=2048

# Check CPU throttling during playback
vcgencmd measure_temp
vcgencmd get_throttled
```

#### I2S Conflicts
```bash
# Disable conflicting audio
sudo nano /boot/firmware/config.txt
# Ensure: dtparam=audio=off

# Check for overlay conflicts
sudo dtoverlay -l | grep audio

# Reboot after overlay changes
sudo reboot
```

### Memory Issues

#### Out of Memory During Story Generation
```bash
# Check current memory usage
free -h
ps aux --sort=-%mem | head -10

# Reduce concurrent TTS requests
sudo nano /opt/storyapp/current/backend/.env
# Set: MAX_CONCURRENT_TTS=1

# Enable memory monitoring
sudo nano /etc/storyapp/env
# Add: NODE_OPTIONS="--max-old-space-size=200"
```

#### SD Card Full
```bash
# Check disk space
df -h

# Clean old logs
sudo journalctl --vacuum-time=7d
sudo find /var/log/storyapp/ -name "*.gz" -mtime +7 -delete

# Remove old audio files
sudo find /var/lib/storyapp/media/ -name "*.mp3" -mtime +30 -delete
```

### Network Issues

#### App Not Accessible
```bash
# Check service binding
sudo netstat -tlnp | grep 8080
sudo ss -tlnp | grep 8080

# Check firewall (if enabled)
sudo iptables -L INPUT

# Test local access
curl -I http://localhost:8080/

# Check mDNS resolution
ping story.local
```

#### API Key Errors
```bash
# Check environment variables loaded
sudo systemctl show storyapp | grep Environment

# Validate API key format
sudo -u storyapp grep OPENAI_API_KEY /opt/storyapp/current/backend/.env

# Test API connectivity
curl -H "Authorization: Bearer your-api-key" https://api.openai.com/v1/models
```

### Performance Issues

#### High CPU Usage
```bash
# Check process CPU usage
top -p $(pgrep node)

# Check thermal throttling
vcgencmd measure_temp
vcgencmd get_throttled

# Enable CPU frequency monitoring
watch -n 1 "vcgencmd measure_clock arm; vcgencmd measure_temp"

# Reduce compression level
sudo nano /opt/storyapp/current/backend/.env
# Set: COMPRESSION_LEVEL=1
```

#### Slow Response Times
```bash
# Check I/O wait
iostat -x 1

# Monitor SD card performance
sudo iotop -ao

# Check swap usage (should be 0 or minimal)
swapon --show
cat /proc/swaps

# Optimize database
sudo -u storyapp sqlite3 /opt/storyapp/current/backend/database/stories.db "VACUUM;"
```

---

## 📊 Performance Monitoring

### System Health Commands
```bash
# CPU temperature and throttling
vcgencmd measure_temp
vcgencmd get_throttled

# Memory usage breakdown
cat /proc/meminfo | grep -E "(MemTotal|MemAvailable|MemFree|Buffers|Cached)"

# Disk I/O statistics
iostat -x 1 5

# Network interface statistics
cat /proc/net/dev

# System load average
uptime
cat /proc/loadavg
```

### Application Metrics
```bash
# Node.js process stats
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | grep node

# Database size and performance
sudo -u storyapp sqlite3 /opt/storyapp/current/backend/database/stories.db "
  SELECT 
    COUNT(*) as story_count,
    AVG(LENGTH(story_text)) as avg_story_length,
    SUM(LENGTH(story_text)) as total_characters
  FROM stories;"

# Audio file statistics  
find /var/lib/storyapp/media/ -name "*.mp3" -exec ls -lh {} \; | \
  awk '{total+=$5} END {print "Total audio files:", NR, "Size:", total/1024/1024 "MB"}'
```

### Automated Health Checks
```bash
# Create monitoring script
cat > /usr/local/bin/story-health-check << 'EOF'
#!/bin/bash
set -euo pipefail

echo "=== Story App Health Check $(date) ==="

# Service status
systemctl is-active --quiet storyapp && echo "✓ App service: running" || echo "✗ App service: failed"

# Health endpoint
curl -fs http://localhost:8080/healthz >/dev/null && echo "✓ HTTP health: OK" || echo "✗ HTTP health: failed"

# Temperature check
TEMP=$(vcgencmd measure_temp | grep -o '[0-9.]*')
echo "🌡️  CPU temperature: ${TEMP}°C"
[ "${TEMP%.*}" -lt 70 ] && echo "✓ Temperature: normal" || echo "⚠️  Temperature: high"

# Memory check
MEM_AVAIL=$(free | awk 'NR==2{print int($7/$2*100)}')
echo "💾 Memory available: ${MEM_AVAIL}%"
[ "$MEM_AVAIL" -gt 20 ] && echo "✓ Memory: sufficient" || echo "⚠️  Memory: low"

# Disk space check
DISK_AVAIL=$(df / | awk 'NR==2{print int($4/$2*100)}')
echo "💽 Disk available: ${DISK_AVAIL}%"
[ "$DISK_AVAIL" -gt 15 ] && echo "✓ Disk space: sufficient" || echo "⚠️  Disk space: low"

echo "=== End Health Check ==="
EOF

chmod +x /usr/local/bin/story-health-check

# Run health check
/usr/local/bin/story-health-check
```

---

## 🔄 Maintenance

### Regular Maintenance Tasks
```bash
# Weekly: Clean logs and temporary files
sudo journalctl --vacuum-time=7d
sudo find /tmp -name "npm-*" -type d -mtime +1 -exec rm -rf {} \; 2>/dev/null || true
sudo find /var/lib/storyapp/media -name "*.mp3" -mtime +30 -delete

# Monthly: Database optimization
sudo -u storyapp sqlite3 /opt/storyapp/current/backend/database/stories.db "VACUUM; ANALYZE;"

# Monthly: Update system packages (with caution)
sudo apt update && sudo apt list --upgradable
# Only update if needed and test thoroughly

# Quarterly: Full backup
sudo tar -czf /root/storyapp-backup-$(date +%Y%m%d).tar.gz \
  /opt/storyapp/current \
  /var/lib/storyapp \
  /etc/storyapp \
  /etc/systemd/system/story*.service
```

### Update Deployment
```bash
# Deploy new version (automated)
sudo APP_REPO=https://github.com/sarpel/bedtime-stories-app.git \
     bash /opt/storyapp/current/install_pi_zero_host.sh

# Manual rollback to previous version
sudo ls -la /opt/storyapp/releases/
sudo ln -sfn /opt/storyapp/releases/PREVIOUS_TIMESTAMP /opt/storyapp/current
sudo systemctl restart storyapp
```

---

## 🔒 Security Considerations

### File Permissions
```bash
# Verify secure permissions
ls -la /opt/storyapp/current/backend/.env          # Should be 640 storyapp:storyapp
ls -la /etc/storyapp/env                          # Should be 640 root:root
ls -ld /var/lib/storyapp                          # Should be 755 storyapp:storyapp
```

### Network Security
```bash
# Check listening ports
sudo netstat -tlnp | grep ":8080"

# If needed, restrict to localhost only
sudo nano /etc/storyapp/env
# Add: HOST=127.0.0.1

# Enable UFW firewall (optional)
sudo ufw allow ssh
sudo ufw allow 8080/tcp
sudo ufw --force enable
```

### API Key Protection
- Never commit `.env` files to version control
- Use strong, unique API keys for each deployment
- Regularly rotate API keys
- Monitor API usage for anomalies

---

## 📞 Support & Resources

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/sarpel/bedtime-stories-app/issues)
- **Documentation**: [Project Wiki](https://github.com/sarpel/bedtime-stories-app/wiki)
- **Raspberry Pi Forums**: [Official RPi Community](https://www.raspberrypi.org/forums/)

### Useful Resources
- **IQaudio Codec Zero**: [Legacy Documentation](https://github.com/iqaudio/Pi-Codec)
- **ALSA Configuration**: [Advanced Linux Sound Architecture](https://wiki.archlinux.org/title/Advanced_Linux_Sound_Architecture)
- **Raspberry Pi Performance**: [Official Monitoring Guide](https://www.raspberrypi.org/documentation/computers/os.html#monitoring)

### Performance Benchmarks
| Metric | Target (Pi Zero 2 W) | Warning Threshold |
|--------|---------------------|-------------------|
| CPU Temperature | < 65°C | > 70°C |
| Memory Usage | < 80% | > 90% |
| SD Card Space | > 20% free | < 15% free |
| Response Time | < 2s | > 5s |
| Audio Latency | < 100ms | > 500ms |

---

**License**: MIT - See LICENSE file for details
**Version**: 1.5.0 Production Ready
**Last Updated**: August 2025

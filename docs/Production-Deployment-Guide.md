# Enhanced STT Production Deployment Guide

**Version**: 4.0
**Target Platform**: Raspberry Pi Zero 2W
**Generated**: 2025-01-27

## Quick Start

This guide covers deploying the enhanced STT system with wake word detection optimized for Raspberry Pi Zero 2W.

### Prerequisites
- Raspberry Pi Zero 2W with Raspbian OS
- 512MB RAM (full 512MB available)
- MicroSD card (16GB+, Class 10 recommended)
- WiFi connectivity
- USB-C power supply (5V, 2.5A recommended)
- Microphone (USB or HAT-based)

### Deployment Checklist
- [ ] Hardware setup and OS configuration
- [ ] Environment variables configuration
- [ ] Wake word model deployment
- [ ] Service configuration and startup
- [ ] Performance validation
- [ ] Health monitoring setup

## System Architecture

```
┌─────────────────────────────────────────┐
│              Frontend (React)           │
├─────────────────────────────────────────┤
│         Enhanced STT Service           │
│  ┌─────────────┬───────────────────────┐│
│  │Wake Word    │ GPT-4o-mini-transcribe││
│  │Detector     │ STT Service           ││
│  │(Porcupine)  │                       ││
│  └─────────────┴───────────────────────┘│
├─────────────────────────────────────────┤
│        System Integration Manager       │
│  ┌─────────┬──────────┬─────────────────┐│
│  │Resource │Audio     │Power            ││
│  │Monitor  │Buffer    │Manager          ││
│  │         │Manager   │                 ││
│  └─────────┴──────────┴─────────────────┘│
│  ┌─────────┬──────────┬─────────────────┐│
│  │Error    │Pi Zero   │Performance      ││
│  │Recovery │Optimizer │Monitor          ││
│  │         │          │                 ││
│  └─────────┴──────────┴─────────────────┘│
├─────────────────────────────────────────┤
│          Backend (Node.js/Express)      │
└─────────────────────────────────────────┘
```

## Hardware Setup

### Pi Zero 2W Preparation
1. **Flash Raspbian OS** to microSD card
2. **Enable SSH** for remote access
3. **Configure WiFi** connection
4. **Update system packages**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

### Audio Hardware Configuration
1. **USB Microphone Setup**
   ```bash
   # List audio devices
   arecord -l

   # Test recording
   arecord -D plughw:1,0 -f cd test.wav
   ```

2. **Audio Permissions**
   ```bash
   # Add user to audio group
   sudo usermod -a -G audio pi

   # Set audio device permissions
   sudo chmod 666 /dev/snd/*
   ```

### Performance Optimizations
1. **GPU Memory Split**
   ```bash
   # Reduce GPU memory to maximize system RAM
   sudo raspi-config
   # Advanced Options -> Memory Split -> 16MB
   ```

2. **Disable Unused Services**
   ```bash
   sudo systemctl disable bluetooth
   sudo systemctl disable avahi-daemon
   sudo systemctl disable triggerhappy
   ```

3. **Enable Hardware Acceleration**
   ```bash
   # Add to /boot/config.txt
   echo "dtparam=audio=on" | sudo tee -a /boot/config.txt
   echo "gpu_mem=16" | sudo tee -a /boot/config.txt
   ```

## Software Installation

### Node.js and Dependencies
```bash
# Install Node.js 18 LTS (recommended for Pi Zero 2W)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x or higher
```

### Project Setup
```bash
# Clone the repository
git clone <repository-url> bedtime-stories-app
cd bedtime-stories-app

# Install dependencies with Pi Zero optimizations
npm ci --production --no-optional

# Install additional Pi Zero specific packages
npm install @picovoice/porcupine-web --save
```

### Wake Word Model Setup
```bash
# Ensure hey-elsa.ppn is in project root
ls -la hey-elsa.ppn

# Verify model file integrity
file hey-elsa.ppn  # Should show binary data, ~2.8KB
```

## Configuration

### Environment Variables
Create `/home/pi/bedtime-stories-app/.env`:
```bash
# Production Environment
NODE_ENV=production

# Backend Configuration
VITE_BACKEND_URL=http://localhost:3001

# Pi Zero 2W Optimizations
VITE_PI_ZERO_MODE=true
VITE_MEMORY_LIMIT=400
VITE_AUDIO_SAMPLE_RATE=16000
VITE_AUDIO_CHANNELS=1

# Wake Word Configuration
VITE_WAKE_WORD_ENABLED=true
VITE_WAKE_WORD_MODEL=./hey-elsa.ppn
VITE_WAKE_WORD_SENSITIVITY=medium
VITE_CONTINUOUS_LISTENING=true

# STT Configuration
VITE_STT_PROVIDER=openai
VITE_STT_MODEL=gpt-4o-mini-transcribe
VITE_STT_LANGUAGE=tr
VITE_STT_RESPONSE_FORMAT=verbose_json

# Performance Monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_HEALTH_CHECK_INTERVAL=5000

# Security - Configure according to your setup
# VITE_API_KEYS_FILE=/secure/api-keys.json

# Logging
LOG_LEVEL=info
LOG_FILE_MAX_SIZE=10485760
LOG_FILE_MAX_FILES=3

# Database
DATABASE_PATH=./database/stories.db
DATABASE_BACKUP_INTERVAL=3600000

# Performance
COMPRESSION_LEVEL=3
CACHE_MAX_AGE=86400
```

### API Keys Configuration
Create secure API keys file `/secure/api-keys.json` (outside web root):
```json
{
  "openai": {
    "apiKey": "your-openai-api-key",
    "endpoint": "https://api.openai.com/v1"
  },
  "elevenlabs": {
    "apiKey": "your-elevenlabs-api-key",
    "endpoint": "https://api.elevenlabs.io/v1"
  },
  "picovoice": {
    "accessKey": "your-picovoice-access-key"
  }
}
```

### System Service Configuration
Create `/etc/systemd/system/bedtime-stories.service`:
```ini
[Unit]
Description=Bedtime Stories Enhanced STT App
After=network.target
Wants=network.target

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/bedtime-stories-app
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=bedtime-stories
KillMode=mixed
TimeoutStopSec=30

# Resource limits for Pi Zero 2W
MemoryMax=450M
MemoryAccounting=true
CPUAccounting=true
TasksMax=50

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=false
ReadWritePaths=/home/pi/bedtime-stories-app

[Install]
WantedBy=multi-user.target
```

### Build and Optimize
```bash
# Build with Pi Zero 2W optimizations
NODE_ENV=production npm run build

# Verify build size
du -sh dist/
# Should be <10MB total

# Test the application
npm run preview
```

## Deployment Steps

### 1. Pre-deployment Validation
```bash
# Run the validation suite
npm run test:pi-zero

# Check system resources
free -h
df -h

# Verify audio setup
arecord -D plughw:1,0 -f cd -t wav -d 5 test.wav
aplay test.wav
```

### 2. Service Deployment
```bash
# Enable and start the service
sudo systemctl enable bedtime-stories.service
sudo systemctl start bedtime-stories.service

# Check service status
sudo systemctl status bedtime-stories.service

# View logs
sudo journalctl -u bedtime-stories.service -f
```

### 3. Performance Verification
```bash
# Monitor resource usage
htop

# Check memory usage
cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable"

# Monitor network connectivity
ping -c 4 api.openai.com
```

### 4. Health Check Setup
Create `/home/pi/health-check.sh`:
```bash
#!/bin/bash
# Health check script for production monitoring

API_URL="http://localhost:3000/api/health"
LOGFILE="/var/log/bedtime-stories-health.log"

# Check service health
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $response -eq 200 ]; then
    echo "$(date): Service healthy" >> $LOGFILE
else
    echo "$(date): Service unhealthy (HTTP: $response)" >> $LOGFILE
    # Restart service if unhealthy
    sudo systemctl restart bedtime-stories.service
fi

# Check memory usage
mem_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')
if [ $mem_usage -gt 90 ]; then
    echo "$(date): High memory usage: ${mem_usage}%" >> $LOGFILE
fi
```

Add to crontab:
```bash
# Add health check to crontab (every 5 minutes)
crontab -e
*/5 * * * * /home/pi/health-check.sh
```

## Performance Monitoring

### System Monitoring Dashboard
Access the integrated performance monitor:
- URL: `http://pi-zero-ip:3000`
- Navigate to Settings > Monitor tab
- Real-time system metrics and health status

### Log Monitoring
```bash
# Application logs
tail -f /var/log/syslog | grep bedtime-stories

# Health check logs
tail -f /var/log/bedtime-stories-health.log

# System resource usage
iostat -x 1
vmstat 1
```

### Performance Alerts
Configure system alerts for critical thresholds:

1. **Memory Usage >90%**
   ```bash
   # Add to /etc/cron.d/memory-alert
   */5 * * * * root bash -c 'mem=$(free | grep Mem | awk "{printf(\"%.0f\", \$3/\$2 * 100)}"); [ $mem -gt 90 ] && echo "High memory: ${mem}%" | logger -t memory-alert'
   ```

2. **CPU Usage >85%**
   ```bash
   # Add to /etc/cron.d/cpu-alert
   */5 * * * * root bash -c 'cpu=$(top -bn1 | grep "Cpu(s)" | awk "{print \$2}" | cut -d% -f1); [ ${cpu%.*} -gt 85 ] && echo "High CPU: ${cpu}%" | logger -t cpu-alert'
   ```

## Troubleshooting

### Common Issues

#### 1. High Memory Usage
**Symptoms**: System becomes slow, OOM killer activated
**Solution**:
```bash
# Check memory usage
cat /proc/meminfo
ps aux --sort=-%mem | head

# Restart service with memory cleanup
sudo systemctl restart bedtime-stories.service

# Adjust memory limits in service file
sudo systemctl edit bedtime-stories.service
# Add: [Service] MemoryMax=350M
```

#### 2. Audio Device Not Found
**Symptoms**: Wake word detection fails, microphone errors
**Solution**:
```bash
# Check audio devices
arecord -l
lsusb | grep -i audio

# Reset audio system
sudo modprobe -r snd_usb_audio
sudo modprobe snd_usb_audio

# Check permissions
ls -la /dev/snd/
```

#### 3. Network Connectivity Issues
**Symptoms**: STT requests timeout, API failures
**Solution**:
```bash
# Check network connectivity
ping -c 4 8.8.8.8
ping -c 4 api.openai.com

# Check DNS resolution
nslookup api.openai.com

# Restart networking
sudo systemctl restart networking
```

#### 4. Wake Word Model Loading Failures
**Symptoms**: Wake word detection doesn't start
**Solution**:
```bash
# Verify model file
ls -la hey-elsa.ppn
file hey-elsa.ppn

# Check file permissions
chmod 644 hey-elsa.ppn

# Verify Picovoice access key
grep VITE_PICOVOICE_ACCESS_KEY .env
```

### Performance Optimization

#### 1. Memory Optimization
```bash
# Enable swap if needed (use sparingly)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # Set CONF_SWAPSIZE=512
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Optimize kernel parameters
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
```

#### 2. CPU Optimization
```bash
# Set CPU governor for balanced performance
echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Or for power saving:
echo 'powersave' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

#### 3. I/O Optimization
```bash
# Mount tmpfs for temporary files
echo 'tmpfs /tmp tmpfs defaults,size=100m 0 0' | sudo tee -a /etc/fstab

# Optimize SD card access
echo 'vm.dirty_ratio=15' | sudo tee -a /etc/sysctl.conf
echo 'vm.dirty_background_ratio=5' | sudo tee -a /etc/sysctl.conf
```

## Security Configuration

### Firewall Setup
```bash
# Install and configure ufw
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000/tcp  # App port
sudo ufw enable
```

### API Key Security
```bash
# Secure API keys file
sudo mkdir -p /secure
sudo chown root:pi /secure
sudo chmod 750 /secure
sudo chmod 640 /secure/api-keys.json
```

### Service Security
The systemd service includes security restrictions:
- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `ProtectSystem=strict`
- Resource limits for memory and CPU

## Backup and Recovery

### Automated Backup
Create `/home/pi/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR

# Backup application data
cp -r /home/pi/bedtime-stories-app/database $BACKUP_DIR/
cp /home/pi/bedtime-stories-app/.env $BACKUP_DIR/
cp /secure/api-keys.json $BACKUP_DIR/

# Backup system configuration
cp /etc/systemd/system/bedtime-stories.service $BACKUP_DIR/

# Compress backup
tar -czf "${BACKUP_DIR}.tar.gz" -C /backup $(basename $BACKUP_DIR)
rm -rf $BACKUP_DIR

# Keep only last 7 days
find /backup -name "*.tar.gz" -mtime +7 -delete
```

### Recovery Procedure
```bash
# Stop service
sudo systemctl stop bedtime-stories.service

# Restore from backup
tar -xzf /backup/2025-01-27.tar.gz -C /tmp/
cp -r /tmp/2025-01-27/* /home/pi/bedtime-stories-app/

# Restart service
sudo systemctl start bedtime-stories.service
```

## Updates and Maintenance

### Application Updates
```bash
# Pull latest changes
cd /home/pi/bedtime-stories-app
git pull origin main

# Install updated dependencies
npm ci --production

# Rebuild application
npm run build

# Restart service
sudo systemctl restart bedtime-stories.service
```

### System Updates
```bash
# Update system packages monthly
sudo apt update && sudo apt upgrade -y

# Update Node.js if needed
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Reboot after system updates
sudo reboot
```

## Monitoring and Metrics

### Key Performance Indicators
Monitor these metrics for production health:

1. **Memory Usage**: <90% of 512MB (460MB)
2. **CPU Usage**: <80% average
3. **Response Time**: STT <5s, Wake Word <500ms
4. **Error Rate**: <1% of requests
5. **Uptime**: >99% availability

### Alerting Thresholds
Set up alerts for these conditions:
- Memory usage >90%
- CPU usage >85% for >5 minutes
- STT error rate >5%
- Network connectivity issues
- Service restart required

### Performance Reports
Generate weekly reports:
```bash
# Create performance report script
cat > /home/pi/performance-report.sh << 'EOF'
#!/bin/bash
echo "=== Weekly Performance Report $(date) ===" > /tmp/report.txt
echo "Memory Usage:" >> /tmp/report.txt
free -h >> /tmp/report.txt
echo "CPU Usage:" >> /tmp/report.txt
uptime >> /tmp/report.txt
echo "Service Status:" >> /tmp/report.txt
systemctl status bedtime-stories.service --no-pager >> /tmp/report.txt
echo "Error Summary:" >> /tmp/report.txt
journalctl -u bedtime-stories.service --since="1 week ago" | grep ERROR | wc -l >> /tmp/report.txt

# Email or save report as needed
cat /tmp/report.txt
EOF

# Schedule weekly reports
echo "0 9 * * 1 /home/pi/performance-report.sh" | crontab -
```

## Support and Maintenance

### Contact Information
- **Technical Support**: [Your support contact]
- **Documentation**: This guide and inline code comments
- **Updates**: Check repository for latest versions

### Maintenance Schedule
- **Daily**: Automated health checks
- **Weekly**: Performance reports and log review
- **Monthly**: System updates and security patches
- **Quarterly**: Full system backup and disaster recovery testing

### Version History
- **v4.0**: Enhanced STT with wake word detection, Pi Zero 2W optimization
- **v3.x**: Previous versions with basic STT support

This completes the production deployment guide for the enhanced STT system on Raspberry Pi Zero 2W.

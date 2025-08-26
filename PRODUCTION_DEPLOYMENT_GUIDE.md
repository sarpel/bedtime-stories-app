# 🚀 Production Deployment Guide - Pi Zero 2W

## 🎯 Pre-Deployment Checklist

### **Hardware Setup**
- [ ] Raspberry Pi Zero 2W with 512MB RAM
- [ ] 16GB+ SD Card (Class 10 or better)
- [ ] Audio output device (3.5mm jack or USB speaker)
- [ ] Stable power supply (5V 2.5A recommended)
- [ ] Wi-Fi network access
- [ ] SSH access configured

### **API Keys Ready**
- [ ] OpenAI API key (for story generation)
- [ ] ElevenLabs API key (for text-to-speech)
- [ ] Optional: Gemini API keys (backup providers)

## 🚀 Production Deployment Steps

### **Step 1: Connect to Pi Zero 2W**
```bash
# SSH into your Pi Zero 2W
ssh pi@YOUR_PI_IP_ADDRESS

# Update system packages
sudo apt update && sudo apt upgrade -y
```

### **Step 2: Run Automated Installer**
```bash
# Download and execute the production installer
sudo curl -fsSL https://github.com/sarpel/bedtime-stories-app/raw/main/setup.sh -o setup.sh
sudo bash setup.sh
```

**What happens during installation:**
- ✅ Installs Node.js 20 (ARM optimized)
- ✅ Installs system dependencies (SQLite, ALSA, build tools)
- ✅ Clones repository to `/opt/storyapp`
- ✅ Builds production frontend (686KB optimized)
- ✅ Installs backend dependencies
- ✅ Creates systemd service
- ✅ Generates .env template

### **Step 3: Configure API Keys**
```bash
# Edit the environment configuration
sudo nano /opt/storyapp/backend/.env
```

**Add your API keys:**
```env
# OpenAI Configuration (Required)
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-5-mini
OPENAI_ENDPOINT=https://api.openai.com/v1/responses

# ElevenLabs Configuration (Required)
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=xsGHrtxT5AdDzYXTQT0d
ELEVENLABS_MODEL=eleven_turbo_v2_5

# Optional: Gemini Configuration (Backup)
GEMINI_LLM_API_KEY=your_gemini_key_here
GEMINI_TTS_API_KEY=your_gemini_key_here

# Server Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn
```

### **Step 4: Start Production Service**
```bash
# Restart service with new configuration
sudo systemctl restart storyapp

# Enable auto-start on boot
sudo systemctl enable storyapp

# Check service status
sudo systemctl status storyapp
```

### **Step 5: Verify Deployment**
```bash
# Run comprehensive health check
cd /opt/storyapp && bash check-setup.sh
```

**Expected output:**
```
✅ Tüm gerekli dosyalar ve klasörler mevcut
✅ API anahtarları ayarlanmış
✅ Servis aktif ve çalışıyor
✅ Health endpoint yanıt veriyor
🎉 Tüm kontroller başarılı!
```

### **Step 6: Test Functionality**
```bash
# Get Pi's IP address
hostname -I

# Test health endpoint
curl http://localhost:3001/health

# Test story creation (optional)
curl -X POST http://localhost:3001/api/stories \
  -H "Content-Type: application/json" \
  -d '{"storyText":"Test story for production","storyType":"test"}'
```

## 🌐 Access Your Application

### **Local Network Access**
```
http://YOUR_PI_IP:3001
```

### **Find Your Pi's IP Address**
```bash
hostname -I
# or
ip addr show wlan0 | grep inet
```

## 📊 Production Monitoring

### **Service Management**
```bash
# Check service status
sudo systemctl status storyapp

# View real-time logs
sudo journalctl -u storyapp -f

# Restart service
sudo systemctl restart storyapp

# Stop service
sudo systemctl stop storyapp
```

### **System Monitoring**
```bash
# Check memory usage
free -h

# Check disk usage
df -h

# Check CPU usage
htop

# Check audio devices
aplay -l
```

### **Application Health**
```bash
# Health check endpoint
curl http://localhost:3001/health

# Test audio playback (if story ID 1 exists)
curl -X POST http://localhost:3001/api/play/1

# Check database
sqlite3 /opt/storyapp/backend/database/stories.db ".tables"
```

## 🔧 Troubleshooting

### **Service Won't Start**
```bash
# Check logs for errors
sudo journalctl -u storyapp -n 50

# Common issues:
# 1. Missing API keys
sudo nano /opt/storyapp/backend/.env

# 2. Port already in use
sudo netstat -tlnp | grep 3001

# 3. Permission issues
sudo chown -R root:root /opt/storyapp
```

### **High Memory Usage**
```bash
# Check memory
free -h

# If memory > 400MB, restart service
sudo systemctl restart storyapp

# Enable swap if needed
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### **Audio Not Working**
```bash
# Test audio output
aplay /usr/share/sounds/alsa/Front_Center.wav

# Check audio devices
aplay -l

# Install audio dependencies
sudo apt install -y alsa-utils mpg123

# Set audio output (if needed)
sudo raspi-config
# Advanced Options > Audio > Force 3.5mm jack
```

### **Frontend Not Loading**
```bash
# Check if assets exist
ls -la /opt/storyapp/assets/

# If missing, rebuild
cd /opt/storyapp
npm run build
sudo systemctl restart storyapp

# Check MIME types
curl -I http://localhost:3001/assets/index.js
```

## 📈 Performance Optimization

### **Memory Optimization**
```bash
# Monitor memory usage
watch -n 5 'free -h && echo "---" && ps aux --sort=-%mem | head -10'

# Clear system cache if needed
sudo sync && sudo echo 3 > /proc/sys/vm/drop_caches
```

### **Storage Optimization**
```bash
# Clean old audio files (optional)
find /opt/storyapp/backend/audio -name "*.mp3" -mtime +30 -delete

# Clean system logs
sudo journalctl --vacuum-time=7d
```

## 🔄 Updates and Maintenance

### **Update Application**
```bash
cd /opt/storyapp
sudo git pull origin main
sudo npm run build
sudo systemctl restart storyapp
```

### **Backup Data**
```bash
# Backup database
sudo cp /opt/storyapp/backend/database/stories.db /home/pi/stories-backup-$(date +%Y%m%d).db

# Backup audio files
sudo tar -czf /home/pi/audio-backup-$(date +%Y%m%d).tar.gz /opt/storyapp/backend/audio/
```

### **System Updates**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js (if needed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 🎉 Production Success Indicators

### **✅ Deployment Successful When:**
- Service status shows "active (running)"
- Health endpoint returns HTTP 200
- Web interface loads at http://PI_IP:3001
- Memory usage < 300MB
- No errors in service logs
- Audio test plays successfully

### **📊 Expected Performance:**
- **Memory Usage**: 150-200MB (30-40% of 512MB)
- **CPU Usage**: 5-15% idle, 40-60% during generation
- **Response Times**: <30s stories, <15s audio
- **Uptime**: 99.9% target
- **Storage**: ~50MB base + audio files

---

## 🚀 **PRODUCTION DEPLOYMENT COMPLETE!**

Your bedtime stories application is now running in production on Pi Zero 2W with industry-standard optimization and monitoring.

**Access your app**: `http://YOUR_PI_IP:3001`  
**Monitor logs**: `sudo journalctl -u storyapp -f`  
**Health check**: `curl http://localhost:3001/health`

**🎉 Congratulations! Your app is production-ready and optimized for Pi Zero 2W! 🎉**

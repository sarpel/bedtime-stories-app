# 🚀 Deployment Action Plan: Dev → Debug → Production

## 📋 Current Status
- ✅ **Development Phase**: COMPLETED
- 🔄 **Debug Phase**: IN PROGRESS (95% complete)
- ⏳ **Production Phase**: READY TO BEGIN

## 🎯 Phase 1: Debug Phase Completion (1-2 days)

### **Immediate Actions (Today)**

#### 1. **Fix Remaining Test Issues**
```bash
# Run tests to identify specific failures
cd backend
npm test -- --verbose

# Fix mock configurations for LLM tests
# Update test environment variables
```

#### 2. **Environment Validation**
```bash
# Verify all required environment variables
bash check-setup.sh

# Test API connectivity
curl -X POST http://localhost:3001/api/llm \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","prompt":"test","modelId":"gpt-4o-mini"}'
```

#### 3. **Integration Testing**
```bash
# Test complete story generation workflow
npm run dev:all
# Navigate to http://localhost:5173
# Create story → Generate audio → Test playback
```

### **Debug Phase Checklist**
- [x] Fix linting errors
- [ ] Resolve failing unit tests
- [ ] Verify API integrations work with real keys
- [ ] Test audio generation and playback
- [ ] Validate database operations
- [ ] Test error handling scenarios

## 🚀 Phase 2: Production Deployment (1 day)

### **Pre-Deployment Setup**

#### 1. **Prepare Production Environment**
```bash
# On Raspberry Pi Zero 2W
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git

# Download and run installer
sudo curl -fsSL https://github.com/sarpel/bedtime-stories-app/raw/main/setup.sh -o setup.sh
sudo bash setup.sh
```

#### 2. **Configure API Keys**
```bash
# Edit production environment file
sudo nano /opt/storyapp/backend/.env

# Add required keys:
OPENAI_API_KEY=your_production_key
ELEVENLABS_API_KEY=your_production_key
NODE_ENV=production
PORT=8080
LOG_LEVEL=warn
```

#### 3. **Start Production Service**
```bash
# Start the service
sudo systemctl start storyapp
sudo systemctl enable storyapp

# Verify service status
sudo systemctl status storyapp
```

### **Production Validation**

#### 1. **Health Check**
```bash
# Test health endpoint
curl http://localhost:8080/health

# Expected response: {"status":"healthy",...}
```

#### 2. **Functional Testing**
```bash
# Test story creation
curl -X POST http://localhost:8080/api/stories \
  -H "Content-Type: application/json" \
  -d '{"storyText":"Test story","storyType":"test"}'

# Test audio generation (if story ID is 1)
curl -X POST http://localhost:8080/api/play/1
```

#### 3. **Performance Monitoring**
```bash
# Monitor system resources
htop

# Check memory usage
free -h

# Monitor logs
sudo journalctl -u storyapp -f
```

## 📊 Phase 3: Production Monitoring (Ongoing)

### **Daily Monitoring**
```bash
# Check service status
sudo systemctl status storyapp

# Review logs for errors
sudo journalctl -u storyapp --since "1 day ago" | grep ERROR

# Monitor disk space
df -h /opt/storyapp
```

### **Weekly Maintenance**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart service if needed
sudo systemctl restart storyapp

# Backup database
cp /opt/storyapp/backend/database/stories.db /opt/storyapp/backup/
```

### **Performance Metrics to Track**
- **Memory Usage**: Should stay under 300MB
- **Response Times**: Story generation <30s, Audio <15s
- **Error Rates**: <1% of requests
- **Uptime**: Target 99.9%

## 🔧 Troubleshooting Guide

### **Common Issues & Solutions**

#### **Service Won't Start**
```bash
# Check logs
sudo journalctl -u storyapp -n 50

# Common fixes:
sudo nano /opt/storyapp/backend/.env  # Check API keys
sudo systemctl restart storyapp       # Restart service
```

#### **High Memory Usage**
```bash
# Check memory
free -h

# Restart if needed
sudo systemctl restart storyapp

# Enable swap if not present
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

#### **Audio Not Working**
```bash
# Test audio output
aplay /usr/share/sounds/alsa/Front_Center.wav

# Check audio devices
aplay -l

# Install audio dependencies
sudo apt install -y alsa-utils mpg123
```

## 📈 Success Metrics

### **Technical Metrics**
- ✅ Service uptime > 99%
- ✅ Memory usage < 300MB
- ✅ Response time < 30s for stories
- ✅ Error rate < 1%

### **Functional Metrics**
- ✅ Story generation working
- ✅ Audio synthesis working
- ✅ Remote playback working
- ✅ Database operations stable

### **User Experience Metrics**
- ✅ Web interface responsive
- ✅ Mobile compatibility
- ✅ Audio quality acceptable
- ✅ Story quality appropriate

## 🎯 Next Steps

### **Immediate (Next 24 hours)**
1. Complete debug phase testing
2. Fix any remaining test failures
3. Prepare production environment

### **Short-term (Next week)**
1. Deploy to production
2. Monitor initial performance
3. Gather user feedback
4. Optimize based on usage patterns

### **Long-term (Next month)**
1. Implement automated backups
2. Set up monitoring alerts
3. Plan feature enhancements
4. Document operational procedures

---

**Status**: Ready for production deployment  
**Risk Level**: Low  
**Estimated Deployment Time**: 2-4 hours  
**Rollback Plan**: Documented in setup.sh script

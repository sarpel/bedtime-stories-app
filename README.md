# Uyku Masalları (Basit Uzak Oynatma Odaklı)

## 🎯 Amaç

Bu proje artık sadece şunu yapar:

1. Anne uzaktan web arayüzünden (aynı ağ veya VPN) masal seçer / oluşturur.
2. Tek tıkla masalı sunucu (Raspberry Pi Zero 2 W) üzerinde MP3 olarak hoparlörden çaldırır.
3. Fazla güvenlik, karmaşık optimizasyonlar, fazla ayar yok. Çalışsın yeter.

Eklenen yeni özellik: Sunucu üzerinde "Cihazda Çal" fonksiyonu. MP3 dosyası varsa `/api/play/:id` ile Pi üzerinde mpg123 kullanılarak çalınır.

### ✨ Temel Özellikler (Sade)

- Masal oluştur (LLM / fallback)
- Seslendir (TTS)
- Kayıtlı masalı listeden seç
- Tarayıcıda oynat veya Cihazda Çal (hoparlör)
- Favori işaretle (isteğe bağlı)

Gereksiz olan (şu an odak değil): aşırı analitik, karmaşık güvenlik, çoklu provider ince ayar ekranları.

---

## 🚀 Quick Installation (Pi Zero 2W)

### Requirements

- **Hardware**: Raspberry Pi Zero 2 W (512MB RAM)
- **OS**: Raspberry Pi OS Lite (32-bit recommended)
- **Network**: Wi-Fi configured with internet access
- **Storage**: 16GB+ SD card (Class 10)

### One-Command Installation

```bash
# Download and run the automated installer
sudo curl -fsSL https://github.com/sarpel/bedtime-stories-app/raw/main/setup.sh -o setup.sh
sudo bash setup.sh
```

### Post-Installation Setup

1. **Configure API Keys** (Required):

   ```bash
   sudo nano /opt/storyapp/backend/.env
   ```

   Add your API keys:

   ```env
   # Required for story generation
   OPENAI_API_KEY=your_openai_key_here

   # Required for speech synthesis
   ELEVENLABS_API_KEY=your_elevenlabs_key_here
   ```

2. **Restart the service**:

   ```bash
   sudo systemctl restart storyapp
   ```

3. **Access the application**:
   - Local: `http://PI_IP_ADDRESS:8080`
   - Find your Pi's IP: `hostname -I`

### Doğrulama

```bash
# Check service status
sudo systemctl status storyapp

# View logs
sudo journalctl -u storyapp -f

# Run health check
bash /opt/storyapp/check-setup.sh
curl -X POST http://PI_IP_ADDRESS:8080/api/play/1   # ID 1 masalını hoparlörden çal (mp3 varsa)
```

---

## 🛠️ Development Setup

### Local Development

1. **Clone the repository**:

   ```bash
   git clone https://github.com/sarpel/bedtime-stories-app.git
   cd bedtime-stories-app
   ```

2. **Install dependencies**:

   ```bash
   # Frontend
   npm install

   # Backend
   cd backend
   npm install
   ```

3. **Configure environment**:

   ```bash
   # Frontend
   cp .env.example .env

   # Backend
   cd backend
   cp .env.example .env
   ```

4. **Start development servers**:

   ```bash
   # Start both frontend and backend
   npm run dev

   # Or separately:
   npm run dev:frontend  # Frontend on :5173
   cd backend && npm start  # Backend on :3001
   ```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```bash
sudo systemctl restart storyapp
```

---

## 📁 Project Structure

```text
bedtime-stories-app/
├── src/                    # Frontend React application
│   ├── components/         # UI components
│   ├── services/          # API services (LLM, TTS, Database)
│   ├── hooks/             # Custom React hooks
│   └── utils/             # Utility functions
├── backend/               # Node.js backend
│   ├── server.js          # Express server
│   ├── database/          # SQLite database management
│   └── audio/             # Generated audio files
├── deploy/                # Deployment configurations
├── docs/                  # Documentation
├── setup.sh              # Production installation script
└── check-setup.sh        # Post-installation verification
```

---

## 🔧 Konfigürasyon (Minimum)

### API Keys Setup

The application requires API keys for AI services:

**OpenAI (Required for story generation)**:

- Get API key from [OpenAI Platform](https://platform.openai.com/)
- Models supported: `gpt-4o-mini`, `gpt-5-mini`

**ElevenLabs (Required for TTS)**:

- Get API key from [ElevenLabs](https://elevenlabs.io/)
- Recommended voice: Turkish voices available

**Gemini (Optional alternative)**:

- Get API key from [Google AI Studio](https://makersuite.google.com/)
- Supports both LLM and TTS capabilities

### Environment Variables (Örnek)

Backend `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5-mini
OPENAI_ENDPOINT=https://api.openai.com/v1/responses

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=xsGHrtxT5AdDzYXTQT0d
ELEVENLABS_MODEL=eleven_turbo_v2_5

# Optional: Gemini Configuration
GEMINI_LLM_API_KEY=your_key_here
GEMINI_TTS_API_KEY=your_key_here

# Server Configuration
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
```

---

## 🚀 Dağıtım

### Option 1: Pi Zero 2W (Recommended)

Optimized for Raspberry Pi Zero 2W deployment:

```bash
sudo curl -fsSL https://github.com/sarpel/bedtime-stories-app/raw/main/setup.sh -o setup.sh
sudo bash setup.sh
```

Features:

- Memory optimized (300MB limit)
- TTS concurrency control
- Automatic service management
- Health monitoring

### Option 2: Docker (Coming Soon)

```bash
# Docker deployment (in development)
docker run -d \
  -p 8080:8080 \
  -v /path/to/data:/data \
  -e OPENAI_API_KEY=your_key \
  -e ELEVENLABS_API_KEY=your_key \
  sarpel/bedtime-stories-app
```

### Option 3: Manual Installation

For other Linux systems:

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and build
git clone https://github.com/sarpel/bedtime-stories-app.git
cd bedtime-stories-app
npm install
npm run build

# Start backend
cd backend
npm install --production
npm start
```

---

## 🔍 Troubleshooting

### Common Issues

### 1. Service won't start

```bash
# Check service status
sudo systemctl status storyapp

# View detailed logs
sudo journalctl -u storyapp -f

# Common fix: API keys not set
sudo nano /opt/storyapp/backend/.env
```

### 2. Memory issues on Pi Zero 2W

```bash
# Check memory usage
free -h

# Restart service if memory high
sudo systemctl restart storyapp

# Check if swap is enabled
swapon --show
```

### 3. Audio not working

```bash
# Test audio output
aplay /usr/share/sounds/alsa/Front_Center.wav

# Check audio devices
aplay -l

# Restart audio service (if needed)
sudo systemctl restart alsa-state
```

### 4. Build failures

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check disk space
df -h
```

### Performans (Önemli Değil)

```bash
# Check system resources
htop

# Monitor service performance
sudo systemctl status storyapp

# Check API response times
curl -w "%{time_total}" http://localhost:8080/health

# Database size
du -h /opt/storyapp/backend/database/
```

---

## 📊 Kullanım

### Story Generation

- Turkish bedtime stories for 5-year-old children
- Multiple story types: goodnight, friendship, adventure, nature
- Custom topics and themes
- Moral lessons integrated naturally

### Seslendirme / Cihazda Çal

1. Önce masalı oluştur ve Seslendir (TTS) tıkla → MP3 `backend/audio/` altına kaydolur.
2. Playlist bölümünde masal satırındaki anten (radyo) ikonuna bas → Pi hoparlöründe çalar.
3. Üst çubuktaki aynı ikon genel durumu gösterir (mavi = çalıyor).

Arka plan servisleri: `mpg123` komutu varsayılan. Değiştirmek için backend ortam değişkeni:

```
export AUDIO_PLAYER_COMMAND="mpg123"
```

Deneme amaçlı gerçek çalmayı kapatmak için:

```
export DRY_RUN_AUDIO_PLAYBACK=true
```

- High-quality Turkish TTS
- Multiple voice options
- Adjustable speech rate and pitch
- Audio caching for faster playback

### Data Management

- SQLite database for stories and metadata
- Audio file management
- Automatic backup system
- Data export capabilities

### User Interface

- Responsive design (mobile-friendly)
- Dark/light theme support
- Accessibility features
- Offline story reading

---

## 🤝 Katkı

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests (if available)
npm run test

# Integration tests
bash tests/run-tests.sh
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Not

Odak: Sadece uzaktan masal çaldırma. Gereksiz karmaşıklık eklemeyin.

- **Issues**: [GitHub Issues](https://github.com/sarpel/bedtime-stories-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sarpel/bedtime-stories-app/discussions)
- **Documentation**: Check the `/docs` folder for detailed guides

---

**Version**: 1.0.0 Production Ready
**Last Updated**: August 2025
**Hardware Tested**: Raspberry Pi Zero 2 W

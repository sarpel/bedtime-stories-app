# 🌙 Bedtime Stories App - Project Index

## 📋 Project Overview

**AI-powered bedtime story generator optimized for Raspberry Pi Zero 2W**

- **Version**: 1.0.0 (Production Ready)
- **Platform**: Raspberry Pi Zero 2W + iQaudio Codec Zero
- **Stack**: React 19 + TypeScript + Node.js + SQLite
- **Purpose**: Create personalized bedtime stories with natural voice narration

---

## 🗂️ Project Structure

### 📁 Root Directory
```
bedtime-stories-app/
├── 📄 README.md                 # Main documentation
├── 📄 PROJECT-INDEX.md          # This file - complete project reference
├── 📄 package.json              # Frontend dependencies & scripts
├── 📄 setup.sh                  # One-click installer for Pi Zero 2W
├── ⚙️ tsconfig.json             # TypeScript configuration
├── ⚙️ vite.config.ts            # Vite build configuration
├── ⚙️ components.json           # shadcn/ui component configuration
└── 📁 src/                      # Frontend source code
```

### 🎨 Frontend (`/src`)
```
src/
├── 📄 App.tsx                   # Main application component
├── 📄 main.tsx                  # React entry point
├── 📄 vite-env.d.ts            # Vite type definitions
├── 🎨 components/               # React components
├── 🔗 hooks/                    # Custom React hooks
├── ⚙️ services/                 # API service layer
├── 🔧 utils/                    # Utility functions
└── 🎨 lib/                      # Shared libraries
```

#### Components Architecture
```
components/
├── ui/                          # shadcn/ui base components
│   ├── button.tsx              # Button component
│   ├── card.tsx                # Card layout
│   ├── dialog.tsx              # Modal dialogs
│   ├── input.tsx               # Form inputs
│   └── [28 more UI components]  # Complete UI system
├── App/                         # Application-specific components
│   ├── StoryCreator.tsx        # Story generation interface
│   ├── AudioControls.tsx       # Audio playback controls
│   ├── StoryCard.tsx           # Story display component
│   ├── Settings.tsx            # Application settings
│   ├── VoiceSelector.tsx       # Voice selection interface
│   └── [12 more components]    # Feature components
└── Panels/                      # Dashboard panels
    ├── SearchPanel.tsx         # Story search functionality
    ├── FavoritesPanel.tsx      # Favorite stories management
    ├── StoryQueuePanel.tsx     # Playback queue management
    └── AnalyticsDashboard.tsx  # Performance monitoring
```

### 🔙 Backend (`/backend`)
```
backend/
├── 📄 package.json              # Backend dependencies
├── 📄 server.ts                 # Main server application
├── 📄 tsconfig.json             # Backend TypeScript config
├── 🗄️ database/                 # Database layer
│   ├── db.ts                   # SQLite database interface
│   ├── backup.ts               # Database backup utilities
│   └── maintenance.ts          # Database maintenance
├── 🔧 middleware/               # Express middleware
│   └── validation.ts           # Request validation
├── 📊 monitoring/               # System monitoring
│   └── metrics.ts              # Performance metrics
├── 📁 dist/                     # Compiled JavaScript
├── 📁 audio/                    # Generated audio files
└── 📁 database/                 # SQLite database files
```

### 🚀 Deployment (`/deploy`)
```
deploy/
├── 📄 storyapp.service         # SystemD service configuration
├── 📄 health-check.sh          # Comprehensive health monitoring
└── 📄 bedtime-stories-app.code-workspace  # VS Code workspace
```

---

## 🏗️ Architecture Overview

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │────│   Backend API   │────│   AI Services   │
│   (React SPA)   │    │   (Express.js)  │    │  (OpenAI/EL11)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Local Storage  │    │   SQLite DB     │    │  Audio Files    │
│   (Browser)     │    │   (Stories)     │    │    (.mp3)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
```
Story Creation:
User Input → LLM Service → Story Text → TTS Service → Audio File → Database

Story Playback:
Database Query → Audio File → Remote/Local Playback
```

---

## 🔧 Core Technologies

### Frontend Stack
- **React 19**: Latest React with concurrent features
- **TypeScript**: Full type safety
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Modern component library
- **React Router**: Client-side routing

### Backend Stack
- **Node.js 20+**: JavaScript runtime
- **Express.js 5**: Web framework
- **TypeScript**: Backend type safety
- **SQLite3**: Embedded database
- **better-sqlite3**: High-performance SQLite driver
- **Pino**: High-performance logging

### AI & Audio
- **OpenAI GPT-5**: Story generation
- **ElevenLabs**: Text-to-speech synthesis
- **Gemini**: Backup AI provider
- **mpg123**: Audio playback on Pi

### System Integration
- **SystemD**: Service management
- **Nginx**: Reverse proxy (optional)
- **ALSA**: Audio system
- **iQaudio Codec Zero**: Audio hardware

---

## 🎯 Key Features

### 🤖 AI Story Generation
- **LLM Provider**: OpenAI GPT-5-mini
- **Customization**: Age-appropriate content (3-12 years)
- **Personalization**: Character names, themes, moral lessons
- **Types**: Adventure, fairy tale, educational, bedtime
- **Languages**: Turkish (primary), extensible

### 🎵 Voice Synthesis
- **Primary**: ElevenLabs TTS (11 voices available)
- **Backup**: Google Gemini TTS
- **Output**: MP3 format, 44.1kHz
- **Storage**: Local audio files with metadata

### 📱 User Interface
- **Responsive**: Mobile-first design
- **Components**: 40+ reusable UI components
- **Accessibility**: WCAG 2.1 compliant
- **Performance**: <200ms interactions

### 🔊 Audio Playback
- **Local**: Web audio player
- **Remote**: Pi Zero 2W speaker output
- **Controls**: Play, pause, stop, queue
- **Quality**: High-fidelity audio

### 💾 Data Management
- **Database**: SQLite with FTS5 search
- **Storage**: ~1MB per story with audio
- **Backup**: Automated daily backups
- **Search**: Full-text story search

---

## 🚀 Installation & Deployment

### One-Click Installation
```bash
# Download and run installer
curl -fsSL https://github.com/sarpel/bedtime-stories-app/raw/main/setup.sh -o setup.sh
chmod +x setup.sh
./setup.sh
```

### What the Installer Does
1. **System Updates**: Updates package repositories
2. **Dependencies**: Installs Node.js, audio tools, system packages
3. **Audio Configuration**: Sets up iQaudio Codec Zero
4. **Application Setup**: Downloads, builds, and configures app
5. **Service Creation**: Creates SystemD service with user isolation
6. **Health Monitoring**: Sets up monitoring and logging
7. **Security**: Configures firewall and permissions

### Manual Installation Steps
```bash
# 1. System preparation
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm sqlite3 alsa-utils mpg123

# 2. Audio configuration (iQaudio Codec Zero)
echo "dtoverlay=iqaudio-codec" | sudo tee -a /boot/config.txt

# 3. Application setup
git clone https://github.com/sarpel/bedtime-stories-app.git /opt/storyapp
cd /opt/storyapp
npm install && npm run build
cd backend && npm install && npm run build

# 4. Service configuration
sudo cp deploy/storyapp.service /etc/systemd/system/
sudo systemctl enable storyapp
sudo systemctl start storyapp
```

---

## ⚙️ Configuration

### Environment Variables (`/backend/.env`)
```env
# Required API Keys
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...

# Optional Backup
GEMINI_LLM_API_KEY=...
GEMINI_TTS_API_KEY=...

# Server Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Pi Optimizations
MEMORY_WARNING_THRESHOLD=70
PERFORMANCE_MONITORING_INTERVAL=60000
SQLITE_CACHE_SIZE=1024
```

### Service Configuration
- **User**: Dynamic user isolation (`storyapp-username`)
- **Working Directory**: `/opt/storyapp`
- **Auto-start**: Yes (after network)
- **Resource Limits**: 300MB memory, 80% CPU
- **Security**: Restricted filesystem access

### Audio Configuration
- **Device**: iQaudio Codec Zero (card 0)
- **Output**: 44.1kHz, 16-bit, stereo
- **Player**: mpg123 (configurable)
- **Permissions**: Audio group membership

---

## 📊 Performance Specifications

### System Requirements
- **Hardware**: Raspberry Pi Zero 2W (512MB RAM)
- **Storage**: 16GB+ SD Card (Class 10)
- **Network**: Wi-Fi for API access
- **Audio**: 3.5mm jack or speakers

### Performance Metrics
- **Memory Usage**: 150-250MB typical
- **CPU Usage**: 5-15% idle, 40-60% generation
- **Response Times**: Stories <30s, Audio <15s
- **Storage**: ~1MB per story with audio
- **Uptime**: 99.9% target

### Resource Optimization
- **Database**: SQLite with optimized queries
- **Caching**: In-memory story cache
- **Compression**: Gzip compression for static assets
- **Lazy Loading**: Component-level code splitting

---

## 🔧 API Reference

### Core Endpoints

#### Health & Status
```http
GET /health
# Returns: System health, uptime, memory usage

GET /api/play/status
# Returns: Current playback status
```

#### Story Management
```http
POST /api/stories
Content-Type: application/json
{
  "storyText": "Generated story text",
  "storyType": "adventure|fairy-tale|educational|bedtime",
  "customTopic": "Optional custom topic"
}

GET /api/stories
# Returns: Array of all stories

GET /api/stories/:id
# Returns: Specific story with audio metadata

PUT /api/stories/:id
# Updates: Story text and metadata

DELETE /api/stories/:id
# Removes: Story and associated audio files

PATCH /api/stories/:id/favorite
Content-Type: application/json
{ "isFavorite": true }
```

#### AI & TTS Services
```http
POST /api/llm
Content-Type: application/json
{
  "provider": "openai|gemini",
  "prompt": "Story generation prompt",
  "max_completion_tokens": 5000,
  "temperature": 1.0
}

POST /api/tts
Content-Type: application/json
{
  "provider": "elevenlabs|gemini",
  "voiceId": "voice_id",
  "requestBody": {...},
  "storyId": 123
}
```

#### Audio Playback (Remote)
```http
POST /api/play/:id
# Plays story audio on Pi speakers

POST /api/play/stop
# Stops current playback

GET /api/play/status
# Returns current playback status
```

#### Search & Queue
```http
GET /api/stories/search?q=query&limit=20&type=title|content
# Searches stories using FTS5

GET /api/queue
# Returns: Current playback queue

PUT /api/queue
Content-Type: application/json
{ "ids": [1, 2, 3] }

POST /api/queue/add
Content-Type: application/json
{ "id": 123 }
```

---

## 🛡️ Security & Best Practices

### Security Measures
- **Input Validation**: Joi schema validation
- **SQL Injection**: Prepared statements only
- **XSS Protection**: Content-Type headers
- **CSRF**: Same-origin policy
- **File System**: Restricted write permissions
- **Process Isolation**: Non-root service user

### Best Practices Implementation
- **Error Handling**: Comprehensive error boundaries
- **Logging**: Structured logging with Pino
- **Monitoring**: Health checks and metrics
- **Resource Management**: Memory and CPU limits
- **Backup Strategy**: Automated database backups

---

## 🔍 Troubleshooting Guide

### Common Issues & Solutions

#### Service Won't Start
```bash
# Check service status
sudo systemctl status storyapp-$(whoami)

# View logs
sudo journalctl -u storyapp-$(whoami) -n 50

# Common fixes
sudo nano /opt/storyapp/backend/.env  # Check API keys
sudo systemctl daemon-reload          # Reload service config
sudo systemctl restart storyapp-$(whoami)
```

#### High Memory Usage
```bash
# Check current usage
free -h
ps aux | grep node

# Restart service
sudo systemctl restart storyapp-$(whoami)

# Enable swap (if needed)
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

#### Audio Issues
```bash
# Test audio hardware
aplay -l
speaker-test -c 2 -t sine

# Check audio permissions
groups $(whoami) | grep audio

# Restart audio service
sudo systemctl restart alsa-state
```

#### API Connection Issues
```bash
# Test API endpoints
curl http://localhost:3001/health

# Check network connectivity
ping 8.8.8.8

# Verify API keys
sudo cat /opt/storyapp/backend/.env | grep -E "(OPENAI|ELEVENLABS)"
```

### Health Check Script
```bash
# Run comprehensive health check
cd /opt/storyapp
./deploy/health-check.sh --verbose --fix-issues

# JSON output for monitoring
./deploy/health-check.sh --format=json
```

---

## 🔄 Development Workflow

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/sarpel/bedtime-stories-app.git
cd bedtime-stories-app

# Install dependencies
npm install
cd backend && npm install && cd ..

# Configure environment
cp backend/.env.example backend/.env
# Edit with your API keys

# Start development servers
npm run dev  # Frontend + Backend concurrently
```

### Development Scripts
```bash
# Frontend development
npm run dev:frontend     # Vite dev server
npm run build           # Production build
npm run preview         # Preview build

# Backend development
npm run dev:backend     # TypeScript watch mode
npm run start          # Production server

# Code quality
npm run lint           # ESLint check
npm run lint:fix       # Auto-fix linting issues
npm run type-check     # TypeScript validation
```

### Build Process
1. **Frontend Build**: Vite creates optimized bundle (~686KB)
2. **Backend Build**: TypeScript compilation to `/dist`
3. **Asset Optimization**: Compression, code splitting
4. **Service Integration**: SystemD service configuration

---

## 📈 Monitoring & Analytics

### Built-in Monitoring
- **Health Endpoint**: `/health` with system metrics
- **Performance Tracking**: Response times, memory usage
- **Error Logging**: Structured error capture
- **Analytics Dashboard**: Usage statistics UI

### System Metrics Collected
- **Memory**: Usage, available, swap status
- **CPU**: Load average, temperature (Pi-specific)
- **Storage**: Disk space, database size
- **Network**: API response times, connectivity
- **Application**: Story generation times, error rates

### Log Management
- **Location**: `/var/log/storyapp/`
- **Format**: JSON structured logging
- **Rotation**: Daily rotation, 7-day retention
- **Levels**: ERROR, WARN, INFO, DEBUG

---

## 🤝 Contributing

### Development Guidelines
1. **Code Style**: TypeScript + ESLint + Prettier
2. **Testing**: Jest for backend, React Testing Library for frontend
3. **Documentation**: JSDoc comments for complex functions
4. **Git Flow**: Feature branches, conventional commits

### Project Structure Guidelines
- **Components**: Single responsibility, reusable
- **Services**: Business logic separation
- **Hooks**: Reusable state management
- **Utils**: Pure functions, well-tested

### Pull Request Process
1. Fork repository
2. Create feature branch (`feature/amazing-feature`)
3. Implement changes with tests
4. Update documentation
5. Submit pull request with description

---

## 📚 Additional Resources

### External Documentation
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [ElevenLabs API Reference](https://elevenlabs.io/docs)
- [Raspberry Pi Documentation](https://www.raspberrypi.org/documentation/)
- [React 19 Documentation](https://react.dev/)
- [Node.js Documentation](https://nodejs.org/docs/)

### Internal Documentation
- `README.md`: User-facing documentation
- `backend/database/db.ts`: Database schema documentation
- `src/services/`: API service documentation
- `deploy/health-check.sh`: System monitoring documentation

### Community
- **Issues**: [GitHub Issues](https://github.com/sarpel/bedtime-stories-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sarpel/bedtime-stories-app/discussions)
- **Discord**: Community support server

---

## 🏷️ Version History

### v1.0.0 - Production Release
- ✅ Complete Pi Zero 2W optimization
- ✅ Full TypeScript migration
- ✅ Advanced UI components (40+)
- ✅ Comprehensive monitoring
- ✅ One-click installation
- ✅ Security hardening
- ✅ Performance optimization

### Previous Versions
- v0.9.x: Beta releases with Pi testing
- v0.8.x: Alpha releases with core features
- v0.7.x: Initial development versions

---

*Last Updated: 2025-01-30*
*Generated by: /sc:index command*

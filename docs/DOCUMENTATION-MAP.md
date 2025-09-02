# 📚 Documentation Navigation Map

## 🗺️ Complete Documentation Guide

This document provides navigation to all project documentation and knowledge resources.

---

## 📖 Core Documentation

### 🏠 Main Documentation
| Document | Purpose | Audience | Last Updated |
|----------|---------|----------|--------------|
| [`../README.md`](../README.md) | Project overview, installation, usage guide | End users, operators | 2025-01-30 |
| [`PROJECT-INDEX.md`](PROJECT-INDEX.md) | Complete project reference and index | Developers, maintainers | 2025-01-30 |
| [`DOCUMENTATION-MAP.md`](DOCUMENTATION-MAP.md) | This file - documentation navigation | All stakeholders | 2025-09-02 |

### 📋 Analysis & Reports
| Document | Purpose | Focus Area | Status |
|----------|---------|------------|---------|
| [`CLAUDE.md`](CLAUDE.md) | Claude AI interactions and configurations | AI Development | Current |
| [`IMPLEMENTATION-PROGRESS.md`](IMPLEMENTATION-PROGRESS.md) | Development progress tracking | Project Management | Current |
| [`ENTERPRISE-FEATURES-REMOVAL-REPORT.md`](ENTERPRISE-FEATURES-REMOVAL-REPORT.md) | Enterprise features cleanup | Code Cleanup | Completed |
| [`ENTERPRISE-REMOVAL-SUMMARY.md`](ENTERPRISE-REMOVAL-SUMMARY.md) | Summary of enterprise removal | Code Cleanup | Completed |
| [`PR-COMMENTS-ANALYSIS.md`](PR-COMMENTS-ANALYSIS.md) | Pull request feedback analysis | Code Review | Current |

### 🎤 Speech & Audio Documentation
| Document | Purpose | Technology Focus | Status |
|----------|---------|------------------|---------|
| [`STT-Implementation-Plan.md`](STT-Implementation-Plan.md) | Speech-to-text implementation strategy | STT Services | Planning |
| [`STT-Implementation-Summary.md`](STT-Implementation-Summary.md) | STT implementation results | STT Integration | Current |
| [`STT-Performance-Metrics.md`](STT-Performance-Metrics.md) | Speech recognition performance data | Performance Analysis | Current |
| [`STT-Services-Comparison.md`](STT-Services-Comparison.md) | Comparison of STT services | Service Evaluation | Reference |
| [`STT_AUDIO_FORMAT_FIX.md`](STT_AUDIO_FORMAT_FIX.md) | Audio format compatibility fixes | Audio Processing | Resolved |
| [`GPT-4o-mini-transcribe-STT-Integration-Report.md`](GPT-4o-mini-transcribe-STT-Integration-Report.md) | GPT-4o mini transcription integration | AI Integration | Current |

### 🔊 Wake Word Documentation
| Document | Purpose | Technology Focus | Status |
|----------|---------|------------------|---------|
| [`WAKE_WORD_FIX_SUMMARY.md`](WAKE_WORD_FIX_SUMMARY.md) | Wake word implementation fixes | Porcupine | Resolved |
| [`WAKE_WORD_PLATFORM_FIX.md`](WAKE_WORD_PLATFORM_FIX.md) | Platform compatibility solutions | WASM/Web | Resolved |
| [`WAKE_WORD_IMPLEMENTATION_SUCCESS.md`](WAKE_WORD_IMPLEMENTATION_SUCCESS.md) | Successful wake word setup guide | Implementation Guide | Current |
| [`WAKE_WORD_TROUBLESHOOTING_GUIDE.md`](WAKE_WORD_TROUBLESHOOTING_GUIDE.md) | Comprehensive troubleshooting | User Support | Current |
| [`PORCUPINE-REACT-IMPLEMENTATION.md`](PORCUPINE-REACT-IMPLEMENTATION.md) | React integration details | React Implementation | Historical |

---

## 🛠️ Technical Documentation

### 🏗️ Architecture & Setup
| File | Description | Key Information |
|------|-------------|-----------------|
| [`../setup.sh`](../setup.sh) | One-click installer script | Pi Zero 2W installation, service setup |
| [`../deploy/storyapp.service`](../deploy/storyapp.service) | SystemD service configuration | Service management, auto-start |
| [`../deploy/health-check.sh`](../deploy/health-check.sh) | System health monitoring | Performance metrics, troubleshooting |

### ⚙️ Configuration Files
| File | Purpose | Documentation Location |
|------|---------|------------------------|
| [`../package.json`](../package.json) | Frontend dependencies & scripts | [PROJECT-INDEX.md](PROJECT-INDEX.md#frontend-stack) |
| [`../backend/package.json`](../backend/package.json) | Backend dependencies & scripts | [PROJECT-INDEX.md](PROJECT-INDEX.md#backend-stack) |
| [`../tsconfig.json`](../tsconfig.json) | TypeScript configuration | [PROJECT-INDEX.md](PROJECT-INDEX.md#core-technologies) |
| [`../vite.config.ts`](../vite.config.ts) | Build configuration | [PROJECT-INDEX.md](PROJECT-INDEX.md#build-process) |
| [`../components.json`](../components.json) | UI component configuration | [PROJECT-INDEX.md](PROJECT-INDEX.md#components-architecture) |

---

## 🎨 Frontend Documentation

### 📦 Component Documentation
| Component Category | Files | Documentation |
|--------------------|-------|---------------|
| **UI Components** | `src/components/ui/` (28 files) | [shadcn/ui docs](https://ui.shadcn.com/) |
| **App Components** | `src/components/*.tsx` (12 files) | Inline JSDoc comments |
| **Panels** | `src/components/*Panel.tsx` (4 files) | [PROJECT-INDEX.md](PROJECT-INDEX.md#components-architecture) |

### 🔗 Hooks & Services
| Category | Location | Purpose |
|----------|----------|---------|
| **Custom Hooks** | `src/hooks/` (10 files) | State management, side effects |
| **API Services** | `src/services/` (8 files) | Backend communication layer |
| **Utilities** | `src/utils/` (8 files) | Helper functions, type definitions |

---

## 🔙 Backend Documentation

### 🗄️ Database Documentation
| File | Purpose | Schema Info |
|------|---------|-------------|
| [`backend/database/db.ts`](backend/database/db.ts) | Database interface | SQLite schema, queries |
| [`backend/database/backup.ts`](backend/database/backup.ts) | Backup utilities | Data persistence |
| [`backend/database/maintenance.ts`](backend/database/maintenance.ts) | DB maintenance | Cleanup, optimization |

### 🔧 Backend Services
| Component | File | API Documentation |
|-----------|------|------------------|
| **Main Server** | [`backend/server.ts`](backend/server.ts) | [API Reference](PROJECT-INDEX.md#api-reference) |
| **Validation** | [`backend/middleware/validation.ts`](backend/middleware/validation.ts) | Input validation schemas |
| **Monitoring** | [`backend/monitoring/metrics.ts`](backend/monitoring/metrics.ts) | Performance tracking |

---

## 📊 API Documentation

### 🌐 REST API Endpoints

#### Core Services
| Endpoint | Method | Documentation | Purpose |
|----------|---------|---------------|---------|
| `/health` | GET | [Health Check](PROJECT-INDEX.md#health--status) | System status |
| `/api/stories` | GET/POST/PUT/DELETE | [Story Management](PROJECT-INDEX.md#story-management) | Story CRUD operations |
| `/api/llm` | POST | [AI Services](PROJECT-INDEX.md#ai--tts-services) | Story generation |
| `/api/tts` | POST | [AI Services](PROJECT-INDEX.md#ai--tts-services) | Audio synthesis |

#### Audio & Playback
| Endpoint | Method | Purpose | Documentation |
|----------|---------|---------|---------------|
| `/api/play/:id` | POST | Remote audio playback | [Audio Playback](PROJECT-INDEX.md#audio-playback-remote) |
| `/api/play/status` | GET | Playback status | [Audio Playback](PROJECT-INDEX.md#audio-playback-remote) |
| `/api/play/stop` | POST | Stop playback | [Audio Playback](PROJECT-INDEX.md#audio-playback-remote) |

#### Search & Queue
| Endpoint | Method | Purpose | Documentation |
|----------|---------|---------|---------------|
| `/api/stories/search` | GET | Full-text search | [Search & Queue](PROJECT-INDEX.md#search--queue) |
| `/api/queue` | GET/PUT | Queue management | [Search & Queue](PROJECT-INDEX.md#search--queue) |

---

## 🚀 Deployment Documentation

### 📋 Installation Guides
| Guide Type | File/Section | Audience |
|------------|--------------|----------|
| **Quick Start** | [README.md#quick-start](README.md#-one-click-installation) | End users |
| **Manual Installation** | [PROJECT-INDEX.md#manual-installation](PROJECT-INDEX.md#manual-installation-steps) | System administrators |
| **Development Setup** | [PROJECT-INDEX.md#local-development](PROJECT-INDEX.md#local-development-setup) | Developers |

### 🔧 Configuration Guides
| Configuration | Location | Documentation |
|---------------|----------|---------------|
| **Environment Variables** | [PROJECT-INDEX.md#environment-variables](PROJECT-INDEX.md#environment-variables-backendenv) | API keys, server config |
| **Audio Setup** | [README.md#audio-configuration](README.md#audio-configuration) | Pi audio configuration |
| **Service Management** | [README.md#service-management](README.md#service-management) | SystemD operations |

---

## 🛡️ Security Documentation

### 🔐 Security Measures
| Security Aspect | Documentation | Implementation |
|----------------|---------------|----------------|
| **Input Validation** | [PROJECT-INDEX.md#security-measures](PROJECT-INDEX.md#security-measures) | Joi schemas |
| **Process Isolation** | [PROJECT-INDEX.md#service-configuration](PROJECT-INDEX.md#service-configuration) | SystemD security |
| **File Permissions** | [setup.sh](setup.sh) | Restricted access |

---

## 📈 Monitoring Documentation

### 🔍 Health Monitoring
| Monitor Type | File | Purpose |
|--------------|------|---------|
| **System Health** | [`deploy/health-check.sh`](deploy/health-check.sh) | Comprehensive system check |
| **Performance Metrics** | [PROJECT-INDEX.md#performance-specifications](PROJECT-INDEX.md#performance-specifications) | Resource monitoring |
| **Log Management** | [PROJECT-INDEX.md#log-management](PROJECT-INDEX.md#log-management) | Error tracking |

### 📊 Analytics
| Feature | Documentation | Location |
|---------|---------------|----------|
| **Performance Dashboard** | `src/components/AnalyticsDashboard.tsx` | Built-in UI |
| **System Metrics** | [PROJECT-INDEX.md#system-metrics-collected](PROJECT-INDEX.md#system-metrics-collected) | Health endpoint |

---

## 🔧 Troubleshooting Documentation

### 🚨 Common Issues
| Issue Category | Documentation | Quick Fix |
|----------------|---------------|-----------|
| **Service Issues** | [README.md#service-wont-start](README.md#service-wont-start) | Check logs, restart service |
| **Memory Issues** | [README.md#high-memory-usage](README.md#high-memory-usage) | Enable swap, restart |
| **Audio Issues** | [README.md#audio-not-working](README.md#audio-not-working) | Test hardware, configure |
| **API Issues** | [PROJECT-INDEX.md#api-connection-issues](PROJECT-INDEX.md#api-connection-issues) | Check keys, connectivity |

### 🔍 Diagnostic Tools
| Tool | File | Purpose |
|------|------|---------|
| **Health Check** | [`deploy/health-check.sh`](deploy/health-check.sh) | System diagnosis |
| **Log Analysis** | System logs | Error investigation |

---

## 👥 Developer Resources

### 🛠️ Development Documentation
| Resource | Location | Purpose |
|----------|----------|---------|
| **Development Setup** | [PROJECT-INDEX.md#development-workflow](PROJECT-INDEX.md#development-workflow) | Local development |
| **Code Style Guide** | [PROJECT-INDEX.md#development-guidelines](PROJECT-INDEX.md#development-guidelines) | Contribution standards |
| **Architecture Overview** | [PROJECT-INDEX.md#architecture-overview](PROJECT-INDEX.md#architecture-overview) | System design |

### 📚 External References
| Resource | URL | Purpose |
|----------|-----|---------|
| **OpenAI API** | https://platform.openai.com/docs | Story generation |
| **ElevenLabs API** | https://elevenlabs.io/docs | Text-to-speech |
| **React Documentation** | https://react.dev/ | Frontend framework |
| **Node.js Documentation** | https://nodejs.org/docs/ | Backend runtime |
| **shadcn/ui** | https://ui.shadcn.com/ | UI components |

---

## 🏷️ Quick Reference

### 📋 Essential Commands
```bash
# Installation
./setup.sh

# Service Management
sudo systemctl status storyapp-$(whoami)
sudo systemctl restart storyapp-$(whoami)
sudo journalctl -u storyapp-$(whoami) -f

# Health Check
./deploy/health-check.sh --verbose

# Development
npm run dev
npm run build
```

### 📁 Important Files
```
README.md                    # Main documentation
PROJECT-INDEX.md            # Complete project reference
setup.sh                    # Installation script
deploy/health-check.sh      # System monitoring
backend/.env                # Configuration
deploy/storyapp.service     # Service definition
```

### 🔗 Key Endpoints
```
http://localhost:3001       # Web interface
http://localhost:3001/health # System health
/api/stories               # Story management
/api/play/:id             # Remote playback
```

---

## 📞 Support Resources

### 🆘 Getting Help
1. **Check Documentation**: This map → specific docs
2. **Run Health Check**: `./deploy/health-check.sh --verbose`
3. **Check Logs**: `sudo journalctl -u storyapp-$(whoami) -f`
4. **GitHub Issues**: [Report bugs/request features](https://github.com/sarpel/bedtime-stories-app/issues)

### 🤝 Contributing
1. **Development Guide**: [PROJECT-INDEX.md#contributing](PROJECT-INDEX.md#contributing)
2. **Pull Request Process**: [PROJECT-INDEX.md#pull-request-process](PROJECT-INDEX.md#pull-request-process)
3. **Code Standards**: Follow TypeScript + ESLint guidelines

---

*This documentation map is automatically maintained. Last updated: 2025-01-30*

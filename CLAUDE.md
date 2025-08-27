# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready AI-powered bedtime story generator optimized for Raspberry Pi Zero 2W. The application generates personalized stories for children using OpenAI GPT-4 and converts them to audio using ElevenLabs TTS. It features local storage, remote audio playback, and comprehensive monitoring.

## Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS + Radix UI
- **Backend**: Node.js + Express + CommonJS
- **Database**: SQLite3 with better-sqlite3 for local storage
- **Audio**: ElevenLabs TTS with remote playback on Pi speakers
- **AI**: OpenAI GPT-4 with Gemini as backup
- **Monitoring**: Custom stability monitor + performance tracking
- **Deployment**: Systemd service with Docker support

### Project Structure
```
├── src/                          # React frontend (TypeScript)
│   ├── components/              # React components (TSX)
│   │   └── ui/                  # Reusable UI components (Radix UI)
│   ├── hooks/                   # Custom React hooks
│   ├── services/               # Frontend services
│   └── utils/                  # Frontend utilities
├── backend/                     # Node.js backend (CommonJS)
│   ├── database/               # SQLite database & migrations
│   ├── middleware/             # Express middleware
│   ├── monitoring/             # Performance monitoring
│   └── tests/                  # Backend tests
├── tests/                      # Project-wide tests
└── deploy/                     # Deployment files
```

### Key Architecture Patterns

**Monorepo Structure**: Frontend and backend in same repository with separate package.json files and workspaces configuration.

**TypeScript Conversion**: Project is transitioning from JavaScript to TypeScript. Frontend is fully TypeScript, backend remains CommonJS for Pi Zero 2W compatibility.

**Service Architecture**: 
- Frontend services handle API communication and state management
- Backend follows Express middleware pattern with validation layer
- Database service uses better-sqlite3 for synchronous operations

**Component System**: 
- Radix UI components with custom styling using class-variance-authority
- Mobile-responsive design with useIsMobile hook
- Component composition pattern with reusable UI primitives

**State Management**: 
- React hooks for local state
- Custom hooks for complex state logic (audio, favorites, profiles)
- SafeLocalStorage for persistent client state

## Development Commands

### Primary Development
```bash
# Start development servers (frontend + backend)
npm run dev

# Build for production
npm run build

# Start production server (backend only)
npm start
```

### Testing
```bash
# Run all tests (backend + frontend)
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

### Code Quality
```bash
# Run ESLint with zero warnings policy
npm run lint

# TypeScript type checking (no emit)
npm run type-check

# Preview production build
npm run preview
```

### Backend-Specific Commands
```bash
cd backend

# Start backend in development mode
npm run dev

# Start backend in production mode
npm start

# Run backend tests with Jest
npm test

# Rebuild SQLite native bindings
npm run rebuild
```

## Important Configuration Files

### Environment Setup
- **Frontend**: Uses Vite environment variables
- **Backend**: Requires `backend/.env` with API keys:
  ```
  OPENAI_API_KEY=your_key_here
  ELEVENLABS_API_KEY=your_key_here
  NODE_ENV=production
  PORT=3001
  ```

### TypeScript Configuration
- **tsconfig.json**: Frontend TypeScript config with strict mode
- **Path mapping**: `@/*` maps to `./src/*`
- **Target**: ES2020 for modern browser support

### Vite Configuration
- **Development**: HMR with proxy to backend on port 8080
- **Production**: Optimized chunks, terser minification, asset hashing
- **Bundle Analysis**: Manual chunks for vendor and app code

## Database Schema

### Core Tables
- **stories**: Main story data with metadata
- **favorites**: User favorite stories
- **profiles**: Child profiles with preferences
- **series**: Story series for character consistency
- **analytics**: Usage analytics and performance metrics

### Database Service
- **optimizedDatabaseService.ts**: Frontend SQLite interface
- **database/db.js**: Backend SQLite operations
- **database/maintenance.js**: Database cleanup and optimization

## Audio System

### TTS Integration
- **Primary**: ElevenLabs API with voice selection
- **Backup**: Gemini TTS API
- **Storage**: MP3 files in `backend/audio/`
- **Playback**: Browser audio player + remote Pi speaker playback

### Audio Components
- **AudioControls.tsx**: Player UI component
- **useAudioPlayer.ts**: Audio state management hook
- **remotePlaybackService.ts**: Pi speaker integration

## Performance Optimizations

### Pi Zero 2W Specific
- **Memory Management**: 150-200MB target usage
- **Stability Monitor**: Resource monitoring with automatic recovery
- **SQLite Optimizations**: Custom cache size and journaling
- **Build Optimization**: 686KB production bundle

### Frontend Optimizations
- **Code Splitting**: Vendor chunks, lazy loading
- **Asset Optimization**: Image compression, inline assets
- **Bundle Analysis**: Manual chunk configuration
- **Tree Shaking**: Unused code elimination

## Testing Strategy

### Backend Testing
- **Jest**: Unit tests with supertest for API testing
- **Database Testing**: Separate test database
- **Health Checks**: Endpoint monitoring tests

### Frontend Testing
- **Custom Test Runner**: `tests/run-tests.cjs`
- **Component Testing**: React component tests
- **Integration Testing**: Service layer tests

## Production Deployment

### Automated Setup
```bash
# One-command deployment on Pi Zero 2W
sudo curl -fsSL https://github.com/sarpel/bedtime-stories-app/raw/main/setup.sh -o setup.sh
sudo bash setup.sh
```

### Manual Deployment Steps
1. Build production assets: `npm run build`
2. Copy to `/opt/storyapp/`
3. Install systemd service: `deploy/storyapp.service`
4. Configure environment: `backend/.env`
5. Start service: `sudo systemctl start storyapp`

### Health Monitoring
- **Health Endpoint**: `/health` for service monitoring
- **System Monitoring**: Memory, CPU, disk usage tracking
- **Log Management**: Pino logger with structured logging
- **Performance Metrics**: Real-time performance dashboard

## API Endpoints

### Story Management
- `POST /api/stories` - Create story
- `GET /api/stories` - List stories  
- `GET /api/stories/:id` - Get story
- `DELETE /api/stories/:id` - Delete story

### Audio & Playback
- `POST /api/tts` - Generate audio
- `POST /api/play/:id` - Play on Pi speakers
- `GET /audio/:filename` - Serve audio files

### System
- `GET /health` - Health check
- `GET /api/analytics` - Usage analytics

## Key Dependencies

### Frontend
- **React 19**: Latest React with concurrent features
- **Radix UI**: Accessible component primitives
- **TailwindCSS 4**: Utility-first styling
- **Lucide React**: Icon library
- **React Router DOM 7**: Client-side routing

### Backend  
- **Express 5**: Web framework
- **better-sqlite3**: Synchronous SQLite driver
- **Pino**: Structured logging
- **Joi**: Schema validation
- **Axios**: HTTP client for API calls

## Development Guidelines

### File Naming
- **Components**: PascalCase (e.g., `StoryCreator.tsx`)
- **Hooks**: camelCase starting with "use" (e.g., `useAudioPlayer.ts`)
- **Services**: camelCase (e.g., `llmService.ts`)
- **Utils**: camelCase (e.g., `storyTypes.ts`)

### Code Style
- **Frontend**: TypeScript with strict mode
- **Backend**: CommonJS with JSDoc comments
- **Linting**: ESLint with zero warnings policy
- **Formatting**: Consistent with project .eslintrc

### State Management Patterns
- **Local State**: useState for component state
- **Complex State**: Custom hooks for business logic  
- **Persistent State**: SafeLocalStorage utility
- **Server State**: Direct API calls with error handling

### Error Handling
- **Frontend**: Try-catch with user-friendly messages
- **Backend**: Centralized error middleware
- **Database**: Transaction rollback on failures
- **API Calls**: Retry logic with exponential backoff

## Troubleshooting Common Issues

### Build Issues
- Run `npm run type-check` for TypeScript errors
- Check Vite proxy configuration for API connection issues
- Verify all dependencies installed with `npm install`

### Database Issues  
- Check SQLite file permissions in `backend/database/`
- Run database maintenance: `node backend/database/maintenance.js`
- Verify schema with `.schema` in SQLite CLI

### Audio Issues
- Test ElevenLabs API key with `curl` request
- Check audio file permissions in `backend/audio/`
- Verify ALSA configuration on Pi Zero 2W

### Performance Issues
- Monitor with built-in performance dashboard
- Check memory usage: `free -h` 
- Review logs: `sudo journalctl -u storyapp -f`
- Run stability monitor checks
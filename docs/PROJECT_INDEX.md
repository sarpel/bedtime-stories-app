# 📋 Project Documentation Index

## Table of Contents
- [Project Overview](#project-overview)
- [Component Architecture](#component-architecture)
- [Service Layer](#service-layer)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Hooks & Utilities](#hooks--utilities)
- [Deployment Guide](#deployment-guide)

---

## Project Overview

### 🎯 Purpose
AI-powered bedtime story generator optimized for Raspberry Pi Zero 2W with personalized story creation, natural voice synthesis, and remote audio playback.

### 🏗️ Architecture Pattern
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express (CommonJS)
- **Database**: SQLite3 with better-sqlite3
- **AI Services**: OpenAI GPT-4 + ElevenLabs TTS
- **Deployment**: Systemd service with Docker support

### 📊 Performance Targets
- **Memory Usage**: 150-200MB (Pi Zero 2W optimized)
- **Bundle Size**: 686KB production build
- **Response Times**: <30s stories, <15s audio generation
- **Uptime**: 99.9% target with stability monitoring

---

## Component Architecture

### 🎨 UI Component Hierarchy

#### Core Application Components
```typescript
App.tsx                          // Main application container
├── components/
│   ├── StoryCreator.tsx        // Story generation interface
│   ├── AudioControls.tsx       // Audio playback controls
│   ├── StoryCard.tsx          // Story display component
│   ├── Settings.tsx           // Application settings
│   ├── FavoritesPanel.tsx     // Favorites management
│   ├── SearchPanel.tsx        // Story search interface
│   ├── SeriesManager.tsx      // Story series management
│   ├── ProfileSelector.tsx    // User profile selection
│   └── PerformanceMonitor.tsx // System monitoring
```

#### Specialized Components
```typescript
AnalyticsDashboard.tsx          // Usage analytics display
StoryManagementPanel.tsx        // Story CRUD operations
StoryQueuePanel.tsx            // Story queue management  
SharedStoryViewer.tsx          // Shared story viewer
OptimizedStoryList.tsx         // Performance-optimized list
ApiKeyHelp.tsx                 // API key configuration help
ErrorBoundary.tsx              // Error handling wrapper
```

#### UI Primitives (Radix-based)
```typescript
ui/
├── button.tsx                 // Button variations
├── card.tsx                   // Card layouts
├── dialog.tsx                 // Modal dialogs
├── input.tsx                  // Form inputs
├── select.tsx                 // Dropdown selectors
├── progress.tsx               // Progress indicators
├── tabs.tsx                   // Tabbed interfaces
├── tooltip.tsx                // Contextual tooltips
├── alert.tsx                  // Alert notifications
└── [13 more UI primitives]
```

### 🔄 Component Interactions

**State Flow**: App → StoryCreator → Services → Database
**Event Flow**: User Input → Component State → API Calls → UI Updates
**Data Flow**: Database ← Services ← Hooks ← Components

---

## Service Layer

### 🧠 AI & Generation Services

#### LLM Service (`llmService.ts`)
```typescript
interface LLMService {
  generateStory(params: StoryParams): Promise<Story>
  settings: LLMSettings
  providers: ['openai', 'gemini']
}
```
- **Primary**: OpenAI GPT-4 for story generation
- **Backup**: Google Gemini for fallback
- **Features**: Context caching, retry logic, error handling

#### TTS Service (`ttsService.ts`) 
```typescript
interface TTSService {
  generateAudio(text: string, voice: VoiceOption): Promise<AudioBuffer>
  getVoices(): VoiceOption[]
  providers: ['elevenlabs', 'gemini']
}
```
- **Primary**: ElevenLabs for natural voice synthesis
- **Voices**: Multiple character voices available
- **Output**: MP3 files optimized for Pi Zero 2W

### 📊 Data Services

#### Database Service (`optimizedDatabaseService.ts`)
```typescript
interface DatabaseService {
  stories: StoryOperations
  favorites: FavoriteOperations  
  profiles: ProfileOperations
  series: SeriesOperations
  analytics: AnalyticsOperations
}
```
- **Storage**: SQLite with better-sqlite3 synchronous driver
- **Optimization**: Custom cache sizing for Pi Zero 2W
- **Features**: Transaction support, backup/restore

#### Analytics Service (`analyticsService.ts`)
```typescript
interface AnalyticsService {
  trackEvent(event: AnalyticsEvent): void
  getUsageMetrics(): UsageStats
  performanceMetrics: PerformanceData
}
```
- **Tracking**: User interactions, performance metrics
- **Storage**: Local SQLite analytics table
- **Privacy**: No external analytics services

### 🎵 Audio Services

#### Remote Playback Service (`remotePlaybackService.ts`)
```typescript
interface RemotePlaybackService {
  playOnPi(storyId: string): Promise<PlaybackResult>
  stopPlayback(): Promise<void>
  getPlaybackStatus(): PlaybackState
}
```
- **Target**: Pi Zero 2W speakers (ALSA)
- **Control**: Remote playback via HTTP API
- **Features**: Volume control, playback status

### 🔧 Configuration Services

#### Config Service (`configService.ts`)
```typescript
interface ConfigService {
  getDefaultSettings(): AppSettings
  updateSettings(settings: Partial<AppSettings>): void
  validateApiKeys(): ValidationResult
}
```
- **Settings**: Application configuration management
- **Validation**: API key validation and testing
- **Persistence**: SafeLocalStorage for client settings

---

## Database Schema

### 📚 Core Tables

#### Stories Table
```sql
CREATE TABLE stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  story_text TEXT NOT NULL,
  story_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  audio_file TEXT,
  child_name TEXT,
  child_age INTEGER,
  series_id INTEGER,
  profile_id INTEGER,
  FOREIGN KEY (series_id) REFERENCES series(id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
```

#### Profiles Table  
```sql
CREATE TABLE profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  age INTEGER,
  gender TEXT CHECK(gender IN ('boy', 'girl', 'other')),
  custom_prompt TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 0
);
```

#### Series Table
```sql
CREATE TABLE series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Favorites & Analytics
```sql
-- User favorites
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);

-- Usage analytics
CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  event_data TEXT, -- JSON
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 🔗 Relationships
- **Stories → Series**: Many-to-one (story belongs to series)
- **Stories → Profiles**: Many-to-one (story created for profile)
- **Stories → Favorites**: One-to-many (story can be favorited)
- **Stories → Analytics**: Tracked via events

---

## API Documentation

### 📖 Story Endpoints

#### POST `/api/stories`
Create new story with AI generation
```typescript
interface CreateStoryRequest {
  storyText?: string           // Pre-written story
  storyType: string           // Story category
  childName?: string          // Personalization
  childAge?: number           // Age-appropriate content
  customTopic?: string        // Custom story topic
  seriesId?: number          // Series continuation
  profileId?: number         // Profile association
}

interface CreateStoryResponse {
  id: number
  title: string
  story_text: string
  audio_file?: string
  created_at: string
}
```

#### GET `/api/stories`
Retrieve stories with filtering
```typescript
interface GetStoriesQuery {
  limit?: number              // Pagination limit
  offset?: number            // Pagination offset
  search?: string            // Text search
  type?: string             // Filter by story type
  series_id?: number        // Filter by series
  profile_id?: number       // Filter by profile
}
```

#### DELETE `/api/stories/:id`
Delete story and associated files
```typescript
interface DeleteStoryResponse {
  success: boolean
  message: string
  deleted_files: string[]    // Audio files removed
}
```

### 🎵 Audio Endpoints

#### POST `/api/tts`
Generate audio from text
```typescript
interface TTSRequest {
  text: string                // Text to convert
  voice?: string             // Voice selection
  speed?: number            // Playback speed (0.5-2.0)
  provider?: 'elevenlabs' | 'gemini'
}

interface TTSResponse {
  success: boolean
  audioFile: string         // File path
  duration: number          // Audio duration in seconds
}
```

#### POST `/api/play/:id`
Play story on Pi speakers
```typescript
interface PlayStoryRequest {
  volume?: number           // Volume level (0-100)
  speed?: number           // Playback speed
}

interface PlayStoryResponse {
  success: boolean
  playing: boolean
  duration: number
  message: string
}
```

### 🏥 Health & Monitoring

#### GET `/health`
System health check
```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number              // Seconds since start
  memory: {
    used: number             // MB used
    total: number            // MB total  
    percentage: number       // Usage percentage
  }
  storage: {
    free: number            // MB free
    used: number            // MB used
    stories_count: number   // Number of stories
    audio_files: number     // Number of audio files
  }
  api_status: {
    openai: boolean         // OpenAI API accessible
    elevenlabs: boolean     // ElevenLabs API accessible
  }
}
```

---

## Hooks & Utilities

### 🎣 Custom Hooks

#### useAudioPlayer (`useAudioPlayer.ts`)
Audio playback state management
```typescript
interface AudioPlayerState {
  currentAudio: string | null
  isPlaying: boolean
  isPaused: boolean
  progress: number
  duration: number
  volume: number
  isMuted: boolean
  playbackRate: number
}

interface AudioPlayerActions {
  play: (audioFile: string) => Promise<void>
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
}
```

#### useStoryDatabase (`useStoryDatabase.ts`)
Database operations with caching
```typescript
interface StoryDatabaseHook {
  stories: Story[]
  loading: boolean
  error: string | null
  
  // CRUD operations
  createStory: (story: CreateStoryInput) => Promise<Story>
  updateStory: (id: number, updates: Partial<Story>) => Promise<void>
  deleteStory: (id: number) => Promise<void>
  
  // Search & filter
  searchStories: (query: string) => Promise<Story[]>
  filterByType: (type: string) => Story[]
  
  // Favorites
  toggleFavorite: (storyId: number) => Promise<void>
  getFavorites: () => Story[]
}
```

#### useProfiles (`useProfiles.ts`)
Profile management
```typescript
interface ProfilesHook {
  profiles: Profile[]
  activeProfile: Profile | null
  
  createProfile: (profile: CreateProfileInput) => Promise<Profile>
  updateProfile: (id: number, updates: Partial<Profile>) => Promise<void>
  deleteProfile: (id: number) => Promise<void>
  setActiveProfile: (id: number) => Promise<void>
}
```

### 🛠️ Utility Functions

#### stabilityMonitor (`utils/stabilityMonitor.ts`)
Pi Zero 2W resource monitoring
```typescript
interface StabilityMonitor {
  startMonitoring(): void
  stopMonitoring(): void
  getCurrentStats(): SystemStats
  getMemoryPressure(): 'low' | 'medium' | 'high' | 'critical'
  
  // Event emitters
  onMemoryWarning: (callback: (stats: SystemStats) => void) => void
  onCpuWarning: (callback: (stats: SystemStats) => void) => void
  onRecovery: (callback: () => void) => void
}
```

#### cache (`utils/cache.ts`)
Intelligent caching system
```typescript
interface CacheManager {
  // Story caching
  setStoryCache: (key: string, story: Story, ttl?: number) => void
  getStoryCache: (key: string) => Story | null
  
  // Settings caching  
  setSettingsCache: (settings: AppSettings) => void
  getSettingsCache: () => AppSettings | null
  
  // Audio caching
  setAudioCache: (storyId: string, audioData: AudioData) => void
  getAudioCache: (storyId: string) => AudioData | null
  
  // Cache management
  clearCache: () => void
  getCacheStats: () => CacheStats
}
```

#### safeLocalStorage (`utils/safeLocalStorage.ts`)
Safe localStorage wrapper
```typescript
interface SafeLocalStorage {
  setItem: (key: string, value: any) => boolean
  getItem: <T>(key: string, defaultValue?: T) => T | null
  removeItem: (key: string) => boolean
  clear: () => boolean
  isAvailable: () => boolean
}
```

---

## Deployment Guide

### 🚀 Production Deployment

#### Automated Setup
```bash
# One-command Pi Zero 2W deployment
sudo curl -fsSL https://github.com/sarpel/bedtime-stories-app/raw/main/setup.sh -o setup.sh
sudo bash setup.sh
```

#### Manual Deployment Steps
1. **Build Production Assets**
   ```bash
   npm run build                    # Frontend build (686KB)
   ```

2. **System Service Setup**
   ```bash
   sudo cp deploy/storyapp.service /etc/systemd/system/
   sudo systemctl enable storyapp
   sudo systemctl start storyapp
   ```

3. **Environment Configuration**
   ```bash
   # Configure API keys in backend/.env
   OPENAI_API_KEY=your_openai_key
   ELEVENLABS_API_KEY=your_elevenlabs_key
   NODE_ENV=production
   PORT=3001
   ```

#### Performance Optimization
- **Memory Management**: 150-200MB target usage
- **Database Tuning**: Custom SQLite cache configuration
- **Asset Optimization**: Gzipped static files, CDN-ready
- **Monitoring**: Built-in stability monitoring and recovery

### 🔧 Development Setup

#### Local Environment
```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Configure environment
cp backend/.env.example backend/.env
# Edit with your API keys

# Start development servers
npm run dev                         # Frontend (port 5173) + Backend (port 8080)
```

#### Testing
```bash
npm test                           # All tests
npm run test:backend               # Backend tests only
npm run test:frontend              # Frontend tests only
npm run lint                       # Code quality checks
npm run type-check                 # TypeScript validation
```

### 📊 Monitoring & Maintenance

#### Service Management
```bash
sudo systemctl status storyapp     # Check service status
sudo journalctl -u storyapp -f     # View real-time logs
sudo systemctl restart storyapp    # Restart service
```

#### System Monitoring
```bash
# Application health
curl http://localhost:3001/health   # Health endpoint
curl http://localhost:3001/api/analytics  # Usage analytics

# System resources
free -h                            # Memory usage
df -h                             # Disk usage
htop                              # Process monitoring
```

#### Backup & Recovery
```bash
# Database backup
cp backend/database/stories.db backup/stories-$(date +%Y%m%d).db

# Audio files backup
tar -czf backup/audio-$(date +%Y%m%d).tar.gz backend/audio/

# Configuration backup
cp backend/.env backup/.env-$(date +%Y%m%d)
```

---

## 🔗 Cross-References

### Component → Service Mapping
- **StoryCreator** → llmService, ttsService, analyticsService
- **AudioControls** → remotePlaybackService, useAudioPlayer
- **Settings** → configService, safeLocalStorage
- **PerformanceMonitor** → stabilityMonitor, analyticsService

### Hook → Database Mapping  
- **useStoryDatabase** → stories, favorites tables
- **useProfiles** → profiles table
- **useSeries** → series table
- **useStoryHistory** → stories + analytics tables

### Service → API Mapping
- **llmService** → POST /api/stories (generation)
- **ttsService** → POST /api/tts
- **remotePlaybackService** → POST /api/play/:id
- **analyticsService** → GET /api/analytics

### File Dependencies
```
App.tsx → [12 components] → [8 services] → [6 hooks] → [4 utilities]
StoryCreator.tsx → llmService → configService → cache → safeLocalStorage
AudioControls.tsx → useAudioPlayer → remotePlaybackService → stabilityMonitor
```

This documentation index provides comprehensive coverage of the project architecture, with clear cross-references and navigation paths between components, services, and utilities.
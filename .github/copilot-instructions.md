# Bedtime Stories App - AI Coding Agent Instructions

## Project Overview

A Turkish bedtime stories app that generates custom stories using LLM APIs and converts them to speech using TTS APIs. Built with React + Vite frontend and Express + SQLite backend for a 5-year-old Turkish girl.

## Architecture & Key Components

### Frontend (React + Vite)
- **Main App**: `src/App.jsx` - Central state management, hybrid localStorage/database system
- **Services Layer**: `src/services/` - API integrations (LLM, TTS, database, analytics)
- **Custom Hooks**: `src/hooks/` - Data management (`useStoryDatabase`, `useFavorites`, `useAudioPlayer`)
- **UI Components**: Shadcn/UI with Tailwind CSS, optimized with manual chunks in `vite.config.js`

### Backend (Express + SQLite)
- **API Server**: `backend/server.js` - LLM/TTS proxy; CORS yok, aynı-origin model
- **Database**: `backend/database/db.js` - SQLite with WAL mode, auto-migration system
- **Audio Storage**: `backend/audio/` - MP3 files served via Express static middleware

## Critical Development Patterns

### Hybrid Data System
The app uses **both localStorage and SQLite database** for backward compatibility:
```javascript
// In App.jsx - Settings from localStorage, stories from both sources
const [settings, setSettings] = useState(() => {
  const savedSettings = localStorage.getItem('bedtime-stories-settings')
  return savedSettings ? JSON.parse(savedSettings) : getDefaultSettings()
})

// useStoryDatabase.js handles database operations
// useStoryHistory.js handles localStorage fallback
```

### API Configuration Pattern
Services use **fixed backend configuration** from `configService.js`, not user settings:
```javascript
// In llmService.js and ttsService.js
constructor(settings) {
  // Fixed backend routes (NOT user-configurable endpoints)
  this.endpoint = config.openai.endpoint  // Points to backend proxy
  this.apiKey = config.openai.apiKey      // From backend .env
}
```

### Performance Optimizations
- **Manual chunk splitting** in `vite.config.js` for vendor, UI, analytics, audio, utils
- **Audio caching** with `audioCache` utility
- **Story caching** with `storyCache` utility
- **Database connection pooling** with better-sqlite3 WAL mode

## Essential Development Workflows

### Start Full Stack Development
```bash
# Single command for both frontend (port 5173) and backend (port 3001)
npm run dev

# Alternative: Start individually
npm run dev:frontend  # Frontend only
cd backend && npm start  # Backend only
```

### Database Operations
- **Auto-migration**: First app load migrates localStorage data to SQLite
- **Hybrid queries**: Always check database first, fallback to localStorage
- **Audio files**: Stored in `backend/audio/` with database references

### Testing Backend APIs
```bash
cd backend
npm test           # Run Jest tests
node test-api.js   # Manual API testing
node check-db.js   # Database connectivity test
```

## Project-Specific Conventions

### Story Data Structure
```javascript
{
  id: number,
  story_text: string,
  story_type: string,    // From storyTypes.js
  custom_topic: string,
  is_favorite: boolean,
  audio: {
    file_name: string,   // Points to backend/audio/
    created_at: string
  },
  created_at: string
}
```

### Settings Configuration
- **Frontend settings**: Stored in localStorage as `bedtime-stories-settings`
- **Backend secrets**: Environment variables in `backend/.env`
- **Default settings**: Defined in `src/services/configService.js`

### Error Handling Pattern
All services implement graceful degradation:
- Database errors → fallback to localStorage
- API errors → show user-friendly Turkish messages
- Audio errors → provide text-only mode

## Turkish Language Requirements

- All UI text must be in Turkish
- Story prompts optimized for 5-year-old Turkish girl
- Error messages in Turkish
- Voice settings use Turkish voice models (ElevenLabs Turkish voices)

## Common Integration Points

### Adding New Story Types
1. Update `src/utils/storyTypes.js`
2. Add prompts in Turkish
3. Update `StoryTypeSelector.jsx` component

### Adding New Voice Options
1. Update `src/utils/voiceOptions.js`
2. Test with ElevenLabs API compatibility
3. Update `VoiceSelector.jsx` component

### Database Schema Changes
1. Modify `backend/database/db.js` initDatabase()
2. Add migration logic for existing users
3. Update corresponding service methods

## Performance Critical Areas

- **Audio preloading**: `useAudioPreloader.js` hook
- **Story list virtualization**: `OptimizedStoryList.jsx` for large datasets
- **Database queries**: Use prepared statements in `db.js`
- **Bundle size**: Monitor chunk sizes in build output

## Security Notes

- API anahtarları `backend/.env` içinde tutulur, frontend tarafına sızdırılmaz
- CORS kullanılmaz; geliştirmede Vite dev proxy ile aynı-origin akışı sağlanır
- Dış API çağrıları backend üzerinden proxy edilir
- Ses dosyaları Express static ile servis edilir

## Testing Strategy

- Backend: Jest tests in `backend/tests/`
- Manual API testing with `backend/test-api.js`
- Database integrity with `backend/check-db.js`
- Frontend: React Testing Library (setup needed)

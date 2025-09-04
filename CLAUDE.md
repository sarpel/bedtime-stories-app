# Claude Development Reference - Bedtime Stories App

## Project Overview

**Bedtime Stories App** is a full-stack TypeScript application that generates personalized bedtime stories using AI/LLM services and provides text-to-speech functionality. The app features a modern React frontend with a Node.js/Express backend, SQLite database, and supports both Raspberry Pi and standard deployments.

## Architecture Overview

### Frontend (React + TypeScript + Vite)
```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── services/           # API services and external integrations
├── utils/              # Utility functions and helpers
├── contexts/           # React context providers
└── types/              # TypeScript type definitions
```

### Backend (Node.js + Express + TypeScript)
```
backend/
├── services/           # Business logic services
├── database/           # SQLite database and migrations
├── middleware/         # Express middleware
├── types/              # Backend TypeScript types
└── utils/              # Backend utilities
```

## Key Technologies

### Core Stack
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js 20+, Express, TypeScript
- **Database**: SQLite3 with better-sqlite3
- **State Management**: React Context + Hooks
- **UI Components**: Radix UI + Shadcn/ui
- **Styling**: TailwindCSS + CSS Modules

### AI/ML Services
- **LLM Providers**: OpenAI GPT-4o-mini, Google Gemini
- **TTS Providers**: ElevenLabs, Google Gemini TTS
- **STT**: Whisper (OpenAI), Google Speech-to-Text

### Development Tools
- **Build**: Vite with TypeScript
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint + TypeScript ESLint
- **Formatting**: Prettier
- **Process Management**: PM2 (production)

## Development Patterns

### Component Structure
```typescript
// Standard component pattern
interface ComponentProps {
  data: DataType;
  onAction: (id: string) => void;
  isLoading?: boolean;
}

export function Component({ 
  data, 
  onAction, 
  isLoading = false 
}: ComponentProps) {
  // Component implementation
}
```

### Service Pattern
```typescript
// Service class pattern
export class ServiceName {
  private config: ServiceConfig;
  
  constructor(config: ServiceConfig) {
    this.config = config;
  }
  
  async performAction(input: InputType): Promise<OutputType> {
    // Implementation
  }
}
```

### Hook Pattern
```typescript
// Custom hook pattern
export function useFeatureName() {
  const [state, setState] = useState<StateType>(initialState);
  
  const action = useCallback(async (param: ParamType) => {
    // Implementation
  }, [dependency]);
  
  return { state, action };
}
```

## Database Schema

### Core Tables
```sql
-- Stories table
CREATE TABLE stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_text TEXT NOT NULL,
  story_type TEXT NOT NULL,
  custom_topic TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_favorite BOOLEAN DEFAULT 0
);

-- Audio files table
CREATE TABLE audio_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories (id)
);
```

## API Endpoints

### Story Operations
```
GET    /api/stories                 # List all stories
POST   /api/stories                 # Create new story
PUT    /api/stories/:id             # Update story
DELETE /api/stories/:id             # Delete story
PATCH  /api/stories/:id/favorite    # Toggle favorite
```

### Audio Operations
```
POST   /api/audio/generate/:id      # Generate TTS audio
GET    /api/audio/:filename         # Serve audio file
POST   /api/raspberry-audio/play    # Raspberry Pi audio
GET    /api/raspberry-audio/status  # Pi audio status
```

### Utility Endpoints
```
POST   /api/generate-story          # Generate story via LLM
POST   /api/stt/transcribe          # Speech-to-text
GET    /api/health                  # Health check
```

## Configuration Management

### Environment Variables

#### Frontend (.env)
```bash
NODE_ENV=production
VITE_BACKEND_URL=http://localhost:3001
DATABASE_PATH=./database/stories.db
```

#### Backend (backend/.env)
```bash
# LLM Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
GEMINI_LLM_API_KEY=...

# TTS Configuration
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
```

## Development Workflows

### Local Development
```bash
# Install dependencies
npm install
cd backend && npm install

# Start development servers
npm run dev              # Both frontend & backend
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only
```

### Building & Deployment
```bash
# Build application
npm run build           # Build frontend
cd backend && npm run build  # Build backend

# Production start
npm start               # Start production server
```

### Code Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Testing
npm test
```

## Component Guidelines

### Story Components
- **StoryCreator**: Main story generation interface
- **StoryQueuePanel**: Playlist management with drag-and-drop
- **AudioControls**: Audio playback controls
- **StoryManagementPanel**: Story CRUD operations

### Core Hooks
- **useAudioPlayer**: Audio playback state and controls
- **useStoryDatabase**: Database operations
- **useFavorites**: Favorite story management
- **useStoryHistory**: Local storage history

### Service Classes
- **LLMService**: Story generation via AI models
- **TTSService**: Text-to-speech conversion
- **DatabaseService**: SQLite operations
- **AnalyticsService**: Usage tracking

## Error Handling Patterns

### Frontend Error Boundaries
```typescript
export class ErrorBoundary extends Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Component Error', { error, errorInfo });
  }
}
```

### Backend Error Middleware
```typescript
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('API Error', { error: err.message, path: req.path });
  
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
};
```

## Performance Considerations

### Frontend Optimization
- React.memo for expensive components
- useCallback for event handlers
- useMemo for computed values
- Code splitting with React.lazy
- Bundle optimization with Vite

### Backend Optimization
- Database connection pooling
- Query optimization with indexes
- Caching strategies for API responses
- Rate limiting for AI API calls
- File streaming for large audio files

## Security Guidelines

### Input Validation
```typescript
// Use Joi for validation
const storySchema = Joi.object({
  storyText: Joi.string().min(50).max(10000).required(),
  storyType: Joi.string().valid(...validTypes).required(),
  customTopic: Joi.string().max(200).optional()
});
```

### API Security
- Input sanitization and validation
- Rate limiting on API endpoints
- CORS configuration
- Secure headers middleware
- API key protection (backend only)

## Testing Strategy

### Unit Tests
```typescript
describe('StoryService', () => {
  it('should generate story with valid parameters', async () => {
    const mockLLM = jest.fn().mockResolvedValue('Generated story');
    const service = new StoryService(mockLLM);
    
    const result = await service.generateStory({
      type: 'adventure',
      topic: 'dragons'
    });
    
    expect(result).toContain('Generated story');
  });
});
```

### Integration Tests
```typescript
describe('/api/stories', () => {
  it('should create and retrieve story', async () => {
    const response = await request(app)
      .post('/api/stories')
      .send({ storyText: 'Test story', storyType: 'adventure' })
      .expect(201);
    
    expect(response.body.id).toBeDefined();
  });
});
```

## Raspberry Pi Integration

### Hardware Support
- **Target**: Raspberry Pi Zero 2W
- **Audio HAT**: IQAudio Codec Zero
- **OS**: Raspberry Pi OS Lite
- **Audio**: ALSA with hardware audio output

### Pi-Specific Features
```typescript
// Raspberry Pi audio service
export class RaspberryAudioService {
  async playAudio(filePath: string): Promise<void> {
    // Use aplay or omxplayer for hardware audio
  }
  
  async getAudioStatus(): Promise<RaspberryAudioStatus> {
    // Check Pi hardware and audio devices
  }
}
```

## Deployment Options

### Standard Deployment (x64)
- Docker containers
- PM2 process management
- Nginx reverse proxy
- SQLite database
- File-based audio storage

### Raspberry Pi Deployment
- Native ARM64 binaries
- Hardware audio integration
- Optimized for low-resource environment
- Local file storage

### Proxmox LXC Deployment
- Ubuntu 22.04 LTS container
- Automated setup script
- Resource optimization
- Production-ready configuration

## Troubleshooting Guide

### Common Issues

#### Frontend Issues
- **Build failures**: Check TypeScript errors and dependencies
- **API connection**: Verify backend URL in environment variables
- **Audio playback**: Check browser audio permissions and file formats

#### Backend Issues
- **Database errors**: Verify SQLite file permissions and disk space
- **API key errors**: Check environment variable configuration
- **Audio generation**: Verify TTS service API keys and quotas

#### Raspberry Pi Issues
- **Audio output**: Check ALSA configuration and audio device detection
- **Performance**: Monitor CPU/memory usage during TTS generation
- **Network**: Verify internet connectivity for API calls

### Debug Commands
```bash
# Frontend debugging
npm run dev:frontend -- --debug

# Backend debugging
DEBUG=* npm run dev

# Database inspection
sqlite3 backend/database/stories.db ".tables"
sqlite3 backend/database/stories.db "SELECT * FROM stories LIMIT 5;"

# Audio system check (Pi)
aplay -l                    # List audio devices
speaker-test -t wav         # Test audio output
```

## Contributing Guidelines

### Code Style
- Follow TypeScript strict mode
- Use functional components with hooks
- Implement proper error boundaries
- Add JSDoc comments for public APIs
- Use descriptive variable names

### Git Workflow
- Feature branches from main
- Descriptive commit messages
- Pull request reviews required
- Automated testing on CI/CD

### Documentation
- Update this CLAUDE.md for architectural changes
- Document new API endpoints in comments
- Update README.md for user-facing changes
- Add inline comments for complex logic

## Future Enhancements

### Planned Features
- **PWA Support**: Offline story reading
- **Multi-language**: Internationalization support
- **Advanced Analytics**: User behavior tracking
- **Cloud Storage**: Optional cloud backup
- **Mobile App**: React Native companion

### Architecture Improvements
- **Microservices**: Split LLM and TTS services
- **Caching Layer**: Redis for API responses
- **WebSocket Support**: Real-time updates
- **GraphQL API**: Flexible data queries
- **TypeScript Monorepo**: Shared types across services

## Contact & Support

For development questions or issues:
1. Check the IMPROVEMENT_PLAN.md for known issues
2. Review the CODE_AUDIT_REPORT.md for detailed analysis
3. Consult this CLAUDE.md for architectural guidance
4. Create GitHub issues for bugs or feature requests

---

*This document is maintained alongside the codebase and should be updated with any significant architectural changes or new development patterns.*
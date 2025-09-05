# Development Guide - Bedtime Stories App

## Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher
- Git
- VS Code (recommended)

### Initial Setup
```bash
# Clone repository
git clone <your-repo-url>
cd bedtime-stories-app

# Install dependencies
npm install
cd backend && npm install && cd ..

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Configure API keys in backend/.env
# OPENAI_API_KEY=your-key-here
# ELEVENLABS_API_KEY=your-key-here

# Start development servers
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Development Workflow

### Feature Development
1. **Create feature branch**: `git checkout -b feature/story-sharing`
2. **Develop feature**: Follow component and service patterns
3. **Test locally**: Ensure all functionality works
4. **Run quality checks**: `npm run check`
5. **Create pull request**: Include description and test plan

### Code Quality Standards
```bash
# Before committing, run these commands:
npm run type-check    # TypeScript validation
npm run lint         # ESLint checks
npm run test         # Unit tests
npm run check        # All quality checks
```

### Debugging
```bash
# Frontend debugging
npm run dev:frontend -- --debug

# Backend debugging with logs
DEBUG=* npm run dev:backend

# Database inspection
sqlite3 backend/database/stories.db ".schema"
```

## Architecture Patterns

### Component Development

#### Standard Component Pattern
```typescript
// components/FeatureName/FeatureName.tsx
import React from 'react';
import { Button } from '@/components/ui/button';

interface FeatureNameProps {
  data: DataType;
  onAction: (id: string) => void;
  isLoading?: boolean;
}

export function FeatureName({ 
  data, 
  onAction, 
  isLoading = false 
}: FeatureNameProps) {
  return (
    <div className="feature-container">
      {/* Component implementation */}
    </div>
  );
}
```

#### Custom Hook Pattern
```typescript
// hooks/useFeature.ts
import { useState, useCallback } from 'react';

interface UseFeatureReturn {
  state: StateType;
  actions: {
    performAction: (data: DataType) => Promise<void>;
    resetState: () => void;
  };
  loading: boolean;
}

export function useFeature(): UseFeatureReturn {
  const [state, setState] = useState<StateType>(initialState);
  const [loading, setLoading] = useState(false);

  const performAction = useCallback(async (data: DataType) => {
    setLoading(true);
    try {
      // Implementation
    } finally {
      setLoading(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    actions: { performAction, resetState },
    loading
  };
}
```

#### Service Class Pattern
```typescript
// services/FeatureService.ts
export interface FeatureServiceConfig {
  apiKey: string;
  endpoint: string;
}

export class FeatureService {
  private config: FeatureServiceConfig;

  constructor(config: FeatureServiceConfig) {
    this.config = config;
  }

  async performOperation(input: InputType): Promise<OutputType> {
    try {
      // Service implementation
      return result;
    } catch (error) {
      throw new ServiceError('Operation failed', error);
    }
  }
}
```

### Database Operations

#### Migration Pattern
```typescript
// backend/database/migrations/001_create_feature.sql
CREATE TABLE IF NOT EXISTS feature_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feature_name ON feature_table(name);
```

#### Repository Pattern
```typescript
// backend/services/FeatureRepository.ts
export class FeatureRepository {
  constructor(private db: Database) {}

  async create(data: CreateFeatureData): Promise<Feature> {
    const stmt = this.db.prepare(`
      INSERT INTO feature_table (name, data)
      VALUES (?, ?)
    `);
    
    const result = stmt.run(data.name, JSON.stringify(data.data));
    return this.findById(result.lastInsertRowid as number);
  }

  async findById(id: number): Promise<Feature | null> {
    const stmt = this.db.prepare('SELECT * FROM feature_table WHERE id = ?');
    return stmt.get(id) as Feature | null;
  }
}
```

## Testing Guidelines

### Unit Testing
```typescript
// __tests__/services/FeatureService.test.ts
import { FeatureService } from '@/services/FeatureService';

describe('FeatureService', () => {
  let service: FeatureService;
  
  beforeEach(() => {
    service = new FeatureService({
      apiKey: 'test-key',
      endpoint: 'https://test-api.com'
    });
  });

  it('should handle valid input correctly', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'success' })
    });
    global.fetch = mockFetch;

    const result = await service.performOperation({ 
      type: 'test' 
    });

    expect(result.result).toBe('success');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('test-api.com'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key'
        })
      })
    );
  });
});
```

### Component Testing
```typescript
// __tests__/components/FeatureName.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureName } from '@/components/FeatureName';

describe('FeatureName Component', () => {
  const mockProps = {
    data: { id: '1', name: 'test' },
    onAction: jest.fn(),
    isLoading: false
  };

  it('renders with correct data', () => {
    render(<FeatureName {...mockProps} />);
    
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('calls onAction when clicked', () => {
    render(<FeatureName {...mockProps} />);
    
    const button = screen.getByRole('button', { name: /action/i });
    fireEvent.click(button);
    
    expect(mockProps.onAction).toHaveBeenCalledWith('1');
  });
});
```

### Integration Testing
```typescript
// __tests__/integration/api.test.ts
import request from 'supertest';
import { app } from '@/backend/server';

describe('Feature API', () => {
  it('should create and retrieve feature', async () => {
    const createResponse = await request(app)
      .post('/api/features')
      .send({ name: 'test-feature', data: { key: 'value' } })
      .expect(201);

    const featureId = createResponse.body.id;

    const getResponse = await request(app)
      .get(`/api/features/${featureId}`)
      .expect(200);

    expect(getResponse.body.name).toBe('test-feature');
    expect(getResponse.body.data.key).toBe('value');
  });
});
```

## Performance Guidelines

### Frontend Performance
```typescript
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data, onAction }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison if needed
  return prevProps.data.id === nextProps.data.id;
});

// Use useCallback for event handlers
const handleAction = useCallback((id: string) => {
  onAction(id);
}, [onAction]);

// Use useMemo for computed values
const computedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

### Backend Performance
```typescript
// Database query optimization
const stmt = db.prepare(`
  SELECT s.*, a.file_name as audio_file
  FROM stories s
  LEFT JOIN audio_files a ON s.id = a.story_id
  WHERE s.story_type = ?
  ORDER BY s.created_at DESC
  LIMIT ?
`);

// Cache frequently accessed data
const cache = new Map<string, any>();

export function getCachedData(key: string, fetcher: () => Promise<any>) {
  if (cache.has(key)) {
    return Promise.resolve(cache.get(key));
  }
  
  return fetcher().then(data => {
    cache.set(key, data);
    return data;
  });
}
```

## Security Best Practices

### Input Validation
```typescript
// Backend validation with Joi
import Joi from 'joi';

export const storyValidationSchema = Joi.object({
  storyText: Joi.string()
    .min(50)
    .max(10000)
    .required()
    .messages({
      'string.min': 'Story must be at least 50 characters',
      'string.max': 'Story cannot exceed 10,000 characters'
    }),
  storyType: Joi.string()
    .valid('adventure', 'princess', 'animal', 'fantasy', 'educational')
    .required(),
  customTopic: Joi.string()
    .max(200)
    .optional()
    .allow('')
});

// Middleware usage
export const validateStory = (req: Request, res: Response, next: NextFunction) => {
  const { error } = storyValidationSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }
  
  next();
};
```

### API Security
```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

// CORS configuration
import cors from 'cors';

export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

## Error Handling

### Frontend Error Handling
```typescript
// Error boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Backend Error Handling
```typescript
// Custom error classes
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

// Global error handler
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err as AppError;

  // Log error
  console.error(`Error ${req.method} ${req.path}:`, error);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error = new ValidationError('Invalid input data');
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  // Send error response
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal server error';

  res.status(statusCode).json({
    error: message,
    code: error.code,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};
```

## Environment Configuration

### Development Environment
```bash
# .env (Frontend)
NODE_ENV=development
VITE_BACKEND_URL=http://localhost:3001
VITE_APP_NAME="Bedtime Stories"
VITE_APP_VERSION=1.0.0
```

```bash
# backend/.env (Backend)
NODE_ENV=development
PORT=3001
HOST=localhost
DATABASE_PATH=./database/stories.db

# API Keys (required)
OPENAI_API_KEY=sk-your-key-here
ELEVENLABS_API_KEY=your-key-here

# Optional - Alternative providers
GEMINI_LLM_API_KEY=your-gemini-key
GEMINI_TTS_API_KEY=your-gemini-tts-key

# Logging
LOG_LEVEL=debug
```

### Production Environment
```bash
# .env (Frontend)
NODE_ENV=production
VITE_BACKEND_URL=https://your-domain.com
DATABASE_PATH=/var/lib/storyapp/stories.db
```

```bash
# backend/.env (Backend)
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Security
CORS_ORIGIN=https://your-domain.com
SESSION_SECRET=your-session-secret

# Performance
MAX_CONCURRENT_TTS=2
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

## Common Tasks

### Adding a New Story Type
1. **Update types**: Add to `src/utils/storyTypes.ts`
2. **Update validation**: Add to backend validation schemas
3. **Update UI**: Add to story type selector
4. **Add tests**: Test new type generation
5. **Update documentation**: Update type descriptions

### Adding a New API Endpoint
1. **Define route**: Add to `backend/server.ts`
2. **Add validation**: Create validation middleware
3. **Add business logic**: Create service method
4. **Add tests**: Integration and unit tests
5. **Update frontend**: Add API service method

### Adding a New Component
1. **Create component**: Follow component pattern
2. **Add TypeScript types**: Define prop interfaces
3. **Add styles**: Use TailwindCSS classes
4. **Add tests**: Component and interaction tests
5. **Update exports**: Add to component index

## Troubleshooting

### Common Development Issues

#### TypeScript Errors
- **Solution**: Check import paths and type definitions
- **Command**: `npm run type-check`

#### Build Failures
- **Solution**: Clear node_modules and reinstall
- **Commands**: `rm -rf node_modules package-lock.json && npm install`

#### Database Issues
- **Solution**: Check file permissions and path
- **Command**: `ls -la backend/database/`

#### API Connection Issues
- **Solution**: Verify backend URL and CORS settings
- **Command**: `curl http://localhost:3001/api/health`

### Performance Issues
```bash
# Bundle analysis
npm run build && npx vite-bundle-analyzer dist

# Memory usage profiling
node --inspect backend/dist/server.js

# Database query profiling
sqlite3 backend/database/stories.db ".timer on"
```

### Debugging Tips
```typescript
// Frontend debugging
console.log('Debug info:', { state, props, error });

// Backend debugging
import debug from 'debug';
const log = debug('app:feature');
log('Processing request:', req.body);

// Database debugging
const stmt = db.prepare('EXPLAIN QUERY PLAN SELECT ...');
console.log(stmt.all());
```

This guide covers the essential patterns and practices for developing the Bedtime Stories App. For more specific information, refer to the CLAUDE.md file for architecture details and the IMPROVEMENT_PLAN.md for enhancement opportunities.
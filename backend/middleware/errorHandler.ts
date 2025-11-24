// Error Handling Middleware
// SECURITY: Prevents information leakage through error messages
import { Request, Response, NextFunction } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler
 * SECURITY: Sanitizes error responses to prevent information disclosure
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default to 500 server error
  let statusCode = 500;
  let message = 'Sunucuda bir hata oluştu';
  
  // Check if it's our custom error
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  
  // SECURITY: Different error responses for production vs development
  if (isProduction) {
    // Production: Send only safe error message
    res.status(statusCode).json({
      error: message,
      timestamp: new Date().toISOString()
    });
    
    // Log full error details for debugging (not sent to client)
    if (statusCode === 500) {
      console.error('Internal Server Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
      });
    }
  } else {
    // Development: Send detailed error info for debugging
    res.status(statusCode).json({
      error: message,
      details: {
        message: err.message,
        stack: err.stack,
        name: err.name
      },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Async error wrapper
 * Catches errors in async route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'İstenen kaynak bulunamadı',
    path: req.url,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle uncaught exceptions and unhandled promise rejections
 * ROBUSTNESS: Prevents app crashes from unhandled errors
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down gracefully...', {
      message: error.message,
      stack: error.stack
    });
    
    // Give pending requests time to complete
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('UNHANDLED REJECTION! 💥', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise
    });
    
    // In production, we might want to exit the process
    if (isProduction) {
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });
  
  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    // Close server connections gracefully
    process.exit(0);
  });
}

// Security Headers Middleware
// SECURITY: Adds security headers to prevent common attacks
import { Request, Response, NextFunction } from 'express';

/**
 * Adds security headers to all responses
 * Protects against XSS, clickjacking, MIME sniffing, etc.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // SECURITY: Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // SECURITY: Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // SECURITY: Enable XSS protection (deprecated but still useful for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // SECURITY: Content Security Policy
  // Note: Adjust this based on your actual requirements
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts for React
    "style-src 'self' 'unsafe-inline'", // Allow inline styles
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://api.elevenlabs.io https://generativelanguage.googleapis.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', cspDirectives);
  
  // SECURITY: Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // SECURITY: Permissions policy (formerly Feature-Policy)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // SECURITY: HSTS (HTTP Strict Transport Security) - only if using HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
}

/**
 * Sanitizes response data to prevent XSS
 * SECURITY: Escapes HTML in string values
 */
export function sanitizeOutput(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeOutput(item));
  }
  
  if (data !== null && typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        sanitized[key] = sanitizeOutput(data[key]);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Removes sensitive headers from requests
 * SECURITY: Prevents accidental logging of credentials
 */
export function sanitizeHeaders(headers: any): any {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'xi-api-key'
  ];
  
  const sanitized = { ...headers };
  
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Request sanitization middleware
 * SECURITY: Sanitizes user input to prevent injection attacks
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        // Remove null bytes and control characters
        req.query[key] = (req.query[key] as string)
          .replace(/\x00/g, '')
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
      }
    }
  }
  
  // Sanitize body parameters (for string values)
  if (req.body && typeof req.body === 'object') {
    const sanitizeBodyValue = (value: any): any => {
      if (typeof value === 'string') {
        // Remove null bytes and control characters
        return value
          .replace(/\x00/g, '')
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
      }
      if (Array.isArray(value)) {
        return value.map(item => sanitizeBodyValue(item));
      }
      if (value !== null && typeof value === 'object') {
        const sanitized: any = {};
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            sanitized[key] = sanitizeBodyValue(value[key]);
          }
        }
        return sanitized;
      }
      return value;
    };
    
    req.body = sanitizeBodyValue(req.body);
  }
  
  next();
}

/**
 * IP-based rate limiting state
 * For production, use Redis or similar
 */
const ipRequestCount = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple IP-based rate limiting
 * SECURITY: Prevents abuse and DoS attacks
 */
export function ipRateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      for (const [key, value] of ipRequestCount.entries()) {
        if (now > value.resetAt) {
          ipRequestCount.delete(key);
        }
      }
    }
    
    const record = ipRequestCount.get(ip);
    
    if (!record || now > record.resetAt) {
      ipRequestCount.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({
        error: 'Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin.',
        retryAfter
      });
    }
    
    record.count++;
    next();
  };
}

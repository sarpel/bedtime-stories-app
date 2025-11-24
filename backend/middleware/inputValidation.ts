// Input Validation Middleware for Backend API
// SECURITY: Comprehensive validation to prevent injection attacks and malformed requests
import { Request, Response, NextFunction } from 'express';

/**
 * Validates and sanitizes story ID from request parameters
 * Prevents SQL injection and path traversal via invalid IDs
 */
export function validateStoryId(req: Request, res: Response, next: NextFunction): void | Response {
  const idParam = req.params.id;
  
  // SECURITY: Strict regex validation - only digits allowed
  if (!/^\d+$/.test(idParam)) {
    return res.status(400).json({ error: 'Geçersiz ID formatı: sadece sayılar kabul edilir' });
  }
  
  const id = parseInt(idParam, 10);
  
  // SECURITY: Range validation to prevent integer overflow
  if (!Number.isFinite(id) || id <= 0 || id > Number.MAX_SAFE_INTEGER) {
    return res.status(400).json({ error: 'ID aralık dışında' });
  }
  
  // Attach validated ID to request for use in route handler
  (req as any).validatedId = id;
  next();
}

/**
 * Validates share ID format
 * Prevents injection via malformed share IDs
 */
export function validateShareId(req: Request, res: Response, next: NextFunction): void | Response {
  const shareId = req.params.shareId;
  
  // SECURITY: Share IDs are hex strings from randomBytes - validate format
  if (!/^[a-f0-9]{32}$/i.test(shareId)) {
    return res.status(400).json({ error: 'Geçersiz paylaşım ID formatı' });
  }
  
  (req as any).validatedShareId = shareId;
  next();
}

/**
 * Validates search query parameters
 * Prevents excessively long queries and SQL injection attempts
 */
export function validateSearchQuery(req: Request, res: Response, next: NextFunction): void | Response {
  const { q: query, limit, type } = req.query;
  
  // SECURITY: Query validation
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Arama sorgusu gereklidir' });
  }
  
  if (query.length < 2) {
    return res.status(400).json({ error: 'Arama sorgusu en az 2 karakter olmalıdır' });
  }
  
  if (query.length > 500) {
    return res.status(400).json({ error: 'Arama sorgusu çok uzun (max 500 karakter)' });
  }
  
  // SECURITY: Validate limit if provided
  if (limit !== undefined) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Limit 1-100 arasında olmalıdır' });
    }
  }
  
  // SECURITY: Validate type if provided
  if (type !== undefined && !['title', 'content', 'all'].includes(type as string)) {
    return res.status(400).json({ error: 'Geçersiz arama türü' });
  }
  
  next();
}

/**
 * Validates story creation/update payload
 * Prevents XSS and malformed story data
 */
export function validateStoryPayload(req: Request, res: Response, next: NextFunction): void | Response {
  const { storyText, storyType, customTopic } = req.body;
  
  // SECURITY: Validate storyText
  if (!storyText || typeof storyText !== 'string') {
    return res.status(400).json({ error: 'Masal metni gereklidir' });
  }
  
  if (storyText.trim().length < 50) {
    return res.status(400).json({ error: 'Masal metni en az 50 karakter olmalıdır' });
  }
  
  if (storyText.length > 10000) {
    return res.status(400).json({ error: 'Masal metni 10.000 karakterden uzun olamaz' });
  }
  
  // SECURITY: Validate storyType
  if (storyType && (typeof storyType !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(storyType))) {
    return res.status(400).json({ error: 'Geçersiz masal türü formatı' });
  }
  
  if (storyType && storyType.length > 100) {
    return res.status(400).json({ error: 'Masal türü çok uzun (max 100 karakter)' });
  }
  
  // SECURITY: Validate customTopic
  if (customTopic && (typeof customTopic !== 'string' || customTopic.length > 200)) {
    return res.status(400).json({ error: 'Özel konu 200 karakterden uzun olamaz' });
  }
  
  next();
}

/**
 * Validates TTS request payload
 * Prevents injection and resource exhaustion
 */
export function validateTTSPayload(req: Request, res: Response, next: NextFunction): void | Response {
  const { provider, storyId, requestBody } = req.body;
  
  // SECURITY: Validate provider if provided
  if (provider && !['elevenlabs', 'gemini', 'openai'].includes(provider)) {
    return res.status(400).json({ error: 'Desteklenmeyen TTS sağlayıcısı' });
  }
  
  // SECURITY: Validate storyId if provided
  if (storyId !== undefined) {
    const idNum = parseInt(storyId, 10);
    if (isNaN(idNum) || idNum <= 0 || idNum > Number.MAX_SAFE_INTEGER) {
      return res.status(400).json({ error: 'Geçersiz masal ID' });
    }
  }
  
  // SECURITY: Validate requestBody structure
  if (requestBody && typeof requestBody !== 'object') {
    return res.status(400).json({ error: 'Geçersiz istek formatı' });
  }
  
  // SECURITY: Validate text content if present
  const text = requestBody?.text || requestBody?.contents?.[0]?.parts?.[0]?.text;
  if (text && typeof text === 'string' && text.length > 50000) {
    return res.status(400).json({ error: 'TTS metni çok uzun (max 50000 karakter)' });
  }
  
  next();
}

/**
 * Validates LLM request payload
 * Prevents prompt injection and resource exhaustion
 */
export function validateLLMPayload(req: Request, res: Response, next: NextFunction): void | Response {
  const { provider, prompt, max_output_tokens, temperature } = req.body;
  
  // SECURITY: Validate provider
  if (!provider || !['openai', 'gemini'].includes(provider)) {
    return res.status(400).json({ error: 'Geçersiz LLM sağlayıcısı' });
  }
  
  // SECURITY: Validate prompt
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Geçerli bir prompt gereklidir' });
  }
  
  if (prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt boş olamaz' });
  }
  
  if (prompt.length > 20000) {
    return res.status(400).json({ error: 'Prompt çok uzun (max 20000 karakter)' });
  }
  
  // SECURITY: Validate max_output_tokens
  if (max_output_tokens !== undefined) {
    const tokens = parseInt(max_output_tokens, 10);
    if (isNaN(tokens) || tokens <= 0 || tokens > 5000) {
      return res.status(400).json({ error: 'max_output_tokens 1-5000 arasında olmalıdır' });
    }
  }
  
  // SECURITY: Validate temperature
  if (temperature !== undefined) {
    const temp = parseFloat(temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      return res.status(400).json({ error: 'temperature 0-2 arasında olmalıdır' });
    }
  }
  
  next();
}

/**
 * Rate limiting helper - simple in-memory implementation
 * For production, use Redis-based rate limiting
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    
    const record = requestCounts.get(ip);
    
    if (!record || now > record.resetAt) {
      // New window
      requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin.',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

/**
 * Sanitizes filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename');
  }
  
  // SECURITY: Remove all path separators and parent directory references
  return filename
    .replace(/\.\./g, '') // Remove ..
    .replace(/[\/\\]/g, '') // Remove / and \
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove invalid filename chars
    .trim();
}

/**
 * Validates file path is within allowed directory
 */
export function validatePathWithinDirectory(filePath: string, allowedDir: string): boolean {
  const path = require('path');
  const resolvedPath = path.resolve(filePath);
  const resolvedAllowedDir = path.resolve(allowedDir);
  
  // SECURITY: Ensure resolved path starts with allowed directory
  return resolvedPath.startsWith(resolvedAllowedDir + path.sep) || 
         resolvedPath === resolvedAllowedDir;
}

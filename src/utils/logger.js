/**
 * Production-ready logging system optimized for Raspberry Pi Zero 2W
 * Reduces memory usage and provides proper log levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

// Detect environment safely
const getEnvVar = (name, defaultValue = '') => {
  try {
    // Check for process in a safe way using optional chaining
    return globalThis?.process?.env?.[name] || defaultValue
  } catch {
    return defaultValue
  }
}

class Logger {
  constructor(options = {}) {
    this.level = this.parseLogLevel(options.level || getEnvVar('LOG_LEVEL', 'INFO'))
    this.enableConsole = options.enableConsole !== false
    this.enableFile = options.enableFile || false
    this.maxMemoryLogs = options.maxMemoryLogs || 100 // Reduced for Pi Zero
    this.memoryLogs = []
    this.context = options.context || 'APP'
  }

  parseLogLevel(level) {
    const levelUpper = level.toString().toUpperCase()
    return LOG_LEVELS[levelUpper] !== undefined ? LOG_LEVELS[levelUpper] : LOG_LEVELS.INFO
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= this.level
  }

  formatMessage(level, message, context) {
    const timestamp = new Date().toISOString()
    const ctx = context || this.context
    return `[${timestamp}] [${level}] [${ctx}] ${message}`
  }

  log(level, message, context = null, data = null) {
    if (!this.shouldLog(level)) return

    const formattedMessage = this.formatMessage(level, message, context)
    
    // Console output (only if enabled and for important messages)
    if (this.enableConsole && (level === 'ERROR' || level === 'WARN' || this.level >= LOG_LEVELS.DEBUG)) {
      let consoleFn = console.log
      if (level === 'ERROR') {
        consoleFn = console.error
      } else if (level === 'WARN') {
        consoleFn = console.warn
      }
      consoleFn(formattedMessage, data || '')
    }

    // Memory logs (keep only recent ones to prevent memory leak)
    this.memoryLogs.push({
      timestamp: Date.now(),
      level,
      message,
      context: context || this.context,
      data
    })

    // Keep only last N logs to prevent memory buildup
    if (this.memoryLogs.length > this.maxMemoryLogs) {
      this.memoryLogs.shift()
    }
  }

  error(message, context, data) {
    this.log('ERROR', message, context, data)
  }

  warn(message, context, data) {
    this.log('WARN', message, context, data)
  }

  info(message, context, data) {
    this.log('INFO', message, context, data)
  }

  debug(message, context, data) {
    this.log('DEBUG', message, context, data)
  }

  // Get recent logs for debugging (limited to prevent memory issues)
  getRecentLogs(limit = 50) {
    return this.memoryLogs.slice(-limit)
  }

  // Clear memory logs to free up memory
  clearLogs() {
    this.memoryLogs = []
  }

  // Create child logger with specific context
  child(context) {
    return new Logger({
      level: this.level,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      maxMemoryLogs: this.maxMemoryLogs,
      context
    })
  }
}

// Create default logger instances
const isProd = getEnvVar('NODE_ENV') === 'production'
const defaultLogger = new Logger({
  level: isProd ? 'WARN' : 'DEBUG',
  enableConsole: !isProd, // Disable console in production to save memory
  maxMemoryLogs: isProd ? 50 : 100 // Reduced memory usage in production
})

// Specific loggers for different components
const stabilityLogger = defaultLogger.child('STABILITY')
const audioLogger = defaultLogger.child('AUDIO')
const dbLogger = defaultLogger.child('DATABASE')
const apiLogger = defaultLogger.child('API')

export {
  Logger,
  defaultLogger as logger,
  stabilityLogger,
  audioLogger,
  dbLogger,
  apiLogger,
  LOG_LEVELS
}

export default defaultLogger

/**
 * Production-ready logging system optimized for Raspberry Pi Zero 2W
 * Reduces memory usage and provides proper log levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

interface LoggerOptions {
  level?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  maxMemoryLogs?: number;
  context?: string;
}

interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  context: string;
  data?: any;
}

// Detect environment safely
const getEnvVar = (name: string, defaultValue: string = ""): string => {
  try {
    // Check for process in a safe way using optional chaining and any-cast for env lookup
    const proc: any = (globalThis as any)?.process;
    return (proc?.env?.[name] as string | undefined) || defaultValue;
  } catch {
    return defaultValue;
  }
};

class Logger {
  level: number;
  enableConsole: boolean;
  enableFile: boolean;
  maxMemoryLogs: number;
  memoryLogs: LogEntry[];
  context: string;

  constructor(options: LoggerOptions = {}) {
    this.level = this.parseLogLevel(
      options.level || getEnvVar("LOG_LEVEL", "INFO"),
    );
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile || false;
    this.maxMemoryLogs = options.maxMemoryLogs || 100; // Reduced for Pi Zero
    this.memoryLogs = [];
    this.context = options.context || "APP";
  }

  parseLogLevel(level: string): number {
    const levelUpper = level.toString().toUpperCase();
    return LOG_LEVELS[levelUpper as LogLevel] !== undefined
      ? LOG_LEVELS[levelUpper as LogLevel]
      : LOG_LEVELS.INFO;
  }

  shouldLog(level: string): boolean {
    return LOG_LEVELS[level as LogLevel] <= this.level;
  }

  formatMessage(
    level: string,
    message: string,
    context: string | null,
  ): string {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context;
    return `[${timestamp}] [${level}] [${ctx}] ${message}`;
  }

  log(
    level: string,
    message: string,
    context: string | null = null,
    data: any = null,
  ): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);

    // Console output (only if enabled and for important messages)
    if (
      this.enableConsole &&
      (level === "ERROR" || level === "WARN" || this.level >= LOG_LEVELS.DEBUG)
    ) {
      let consoleFn = console.log;
      if (level === "ERROR") {
        consoleFn = console.error;
      } else if (level === "WARN") {
        consoleFn = console.warn;
      }
      consoleFn(formattedMessage, data || "");
    }

    // Memory logs (keep only recent ones to prevent memory leak)
    this.memoryLogs.push({
      timestamp: Date.now(),
      level,
      message,
      context: context || this.context,
      data,
    });

    // Keep only last N logs to prevent memory buildup
    if (this.memoryLogs.length > this.maxMemoryLogs) {
      this.memoryLogs.shift();
    }
  }

  error(message: string, context?: string, data?: any): void {
    this.log("ERROR", message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log("WARN", message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log("INFO", message, context, data);
  }

  debug(message: string, context?: string, data?: any): void {
    this.log("DEBUG", message, context, data);
  }

  // Get recent logs for debugging (limited to prevent memory issues)
  getRecentLogs(limit: number = 50): LogEntry[] {
    return this.memoryLogs.slice(-limit);
  }

  // Clear memory logs to free up memory
  clearLogs(): void {
    this.memoryLogs = [];
  }

  // Create child logger with specific context
  child(context: string): Logger {
    return new Logger({
      level: this.level.toString(),
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      maxMemoryLogs: this.maxMemoryLogs,
      context,
    });
  }
}

// Create default logger instances
const isProd = getEnvVar("NODE_ENV") === "production";
const defaultLogger = new Logger({
  level: isProd ? "WARN" : "DEBUG",
  enableConsole: !isProd, // Disable console in production to save memory
  maxMemoryLogs: isProd ? 50 : 100, // Reduced memory usage in production
});

// Specific loggers for different components
const stabilityLogger = defaultLogger.child("STABILITY");
const audioLogger = defaultLogger.child("AUDIO");
const dbLogger = defaultLogger.child("DATABASE");
const apiLogger = defaultLogger.child("API");

export {
  Logger,
  defaultLogger as logger,
  stabilityLogger,
  audioLogger,
  dbLogger,
  apiLogger,
  LOG_LEVELS,
};

export default defaultLogger;

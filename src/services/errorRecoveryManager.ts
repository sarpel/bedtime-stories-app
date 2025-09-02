import { logger } from '@/utils/logger';

// Error recovery and resilience management for Pi Zero 2W
export interface ErrorContext {
  service: string;
  operation: string;
  error: Error;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryCount: number;
  metadata?: Record<string, any>;
}

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  applicable: (context: ErrorContext) => boolean;
  execute: (context: ErrorContext) => Promise<boolean>;
  priority: number;
  maxRetries: number;
}

export interface RecoveryConfig {
  maxRetryAttempts: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  maxBackoffMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
  enableAutoRecovery: boolean;
  logAllErrors: boolean;
}

export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager;
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private errorHistory: ErrorContext[] = [];
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; open: boolean }> = new Map();
  private recoveryCallbacks: Array<(context: ErrorContext, recovered: boolean) => void> = [];
  
  // Pi Zero 2W optimized configuration
  private readonly config: RecoveryConfig = {
    maxRetryAttempts: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
    maxBackoffMs: 10000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 30000,
    enableAutoRecovery: true,
    logAllErrors: true
  };

  private readonly maxHistorySize = 100; // Keep memory usage low

  constructor() {
    if (ErrorRecoveryManager.instance) {
      return ErrorRecoveryManager.instance;
    }
    ErrorRecoveryManager.instance = this;
    this.initializeDefaultStrategies();
  }

  static getInstance(): ErrorRecoveryManager {
    return new ErrorRecoveryManager();
  }

  // Initialize default recovery strategies
  private initializeDefaultStrategies(): void {
    // Audio context recovery
    this.registerStrategy({
      id: 'audio-context-recovery',
      name: 'Audio Context Recovery',
      description: 'Recover from audio context failures by recreating context',
      applicable: (context) => 
        context.service.includes('audio') || 
        context.service.includes('stt') ||
        context.service.includes('wakeWord'),
      execute: async (context) => {
        try {
          // Attempt to close existing audio contexts
          if (typeof window !== 'undefined' && window.AudioContext) {
            const contexts = (window as any).audioContexts || [];
            for (const ctx of contexts) {
              if (ctx && ctx.state !== 'closed') {
                await ctx.close();
              }
            }
          }
          
          logger.info('Audio context recovery attempted', 'ErrorRecoveryManager', {
            service: context.service,
            operation: context.operation
          });
          
          return true;
        } catch (error) {
          logger.warn('Audio context recovery failed', 'ErrorRecoveryManager', {
            error: (error as Error)?.message
          });
          return false;
        }
      },
      priority: 1,
      maxRetries: 2
    });

    // Memory pressure recovery
    this.registerStrategy({
      id: 'memory-pressure-recovery',
      name: 'Memory Pressure Recovery',
      description: 'Free memory by triggering garbage collection and clearing caches',
      applicable: (context) => 
        context.error.message.includes('memory') ||
        context.error.message.includes('allocation') ||
        context.severity === 'high',
      execute: async (context) => {
        try {
          // Force garbage collection if available
          if (typeof window !== 'undefined' && (window as any).gc) {
            (window as any).gc();
          }
          
          // Clear old error history
          if (this.errorHistory.length > 50) {
            this.errorHistory = this.errorHistory.slice(-25);
          }
          
          // Emit memory optimization event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('memory-pressure-recovery', {
              detail: { service: context.service }
            }));
          }
          
          logger.info('Memory pressure recovery attempted', 'ErrorRecoveryManager', {
            service: context.service,
            historySize: this.errorHistory.length
          });
          
          return true;
        } catch (error) {
          logger.warn('Memory pressure recovery failed', 'ErrorRecoveryManager', {
            error: (error as Error)?.message
          });
          return false;
        }
      },
      priority: 2,
      maxRetries: 1
    });

    // Network connectivity recovery
    this.registerStrategy({
      id: 'network-recovery',
      name: 'Network Connectivity Recovery',
      description: 'Handle network failures with exponential backoff',
      applicable: (context) => 
        context.error.message.includes('fetch') ||
        context.error.message.includes('network') ||
        context.error.message.includes('timeout') ||
        context.service.includes('stt'),
      execute: async (context) => {
        try {
          // Check network connectivity
          if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
            if (!navigator.onLine) {
              logger.warn('Network offline detected', 'ErrorRecoveryManager');
              return false;
            }
          }
          
          // Apply exponential backoff delay
          const delay = Math.min(
            this.config.retryDelayMs * Math.pow(2, context.retryCount),
            this.config.maxBackoffMs
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          logger.info('Network recovery delay applied', 'ErrorRecoveryManager', {
            delay,
            retryCount: context.retryCount
          });
          
          return true;
        } catch (error) {
          logger.warn('Network recovery failed', 'ErrorRecoveryManager', {
            error: (error as Error)?.message
          });
          return false;
        }
      },
      priority: 3,
      maxRetries: 5
    });

    // Service restart recovery
    this.registerStrategy({
      id: 'service-restart-recovery',
      name: 'Service Restart Recovery',
      description: 'Restart failed services with clean initialization',
      applicable: (context) => 
        context.severity === 'critical' && context.recoverable,
      execute: async (context) => {
        try {
          // Emit service restart event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('service-restart-required', {
              detail: { 
                service: context.service,
                operation: context.operation,
                error: context.error.message
              }
            }));
          }
          
          logger.info('Service restart recovery initiated', 'ErrorRecoveryManager', {
            service: context.service,
            operation: context.operation
          });
          
          return true;
        } catch (error) {
          logger.warn('Service restart recovery failed', 'ErrorRecoveryManager', {
            error: (error as Error)?.message
          });
          return false;
        }
      },
      priority: 4,
      maxRetries: 1
    });

    logger.info('Error recovery strategies initialized', 'ErrorRecoveryManager', {
      strategiesCount: this.recoveryStrategies.size
    });
  }

  // Handle error with automatic recovery
  async handleError(
    service: string,
    operation: string,
    error: Error,
    severity: ErrorContext['severity'] = 'medium',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const context: ErrorContext = {
      service,
      operation,
      error,
      timestamp: Date.now(),
      severity,
      recoverable: this.isRecoverable(error),
      retryCount: this.getRetryCount(service, operation),
      metadata
    };

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(service)) {
      logger.warn('Circuit breaker open, skipping recovery', 'ErrorRecoveryManager', {
        service,
        operation
      });
      return false;
    }

    // Log error
    if (this.config.logAllErrors) {
      logger.error('Error handled by recovery manager', 'ErrorRecoveryManager', {
        service,
        operation,
        severity,
        recoverable: context.recoverable,
        retryCount: context.retryCount,
        error: error.message
      });
    }

    // Add to error history
    this.addToHistory(context);

    // Update circuit breaker
    this.updateCircuitBreaker(service, false);

    // Attempt recovery if enabled and error is recoverable
    let recovered = false;
    if (this.config.enableAutoRecovery && context.recoverable) {
      recovered = await this.attemptRecovery(context);
    }

    // Update circuit breaker on success
    if (recovered) {
      this.updateCircuitBreaker(service, true);
    }

    // Notify callbacks
    this.notifyCallbacks(context, recovered);

    return recovered;
  }

  // Attempt recovery using registered strategies
  private async attemptRecovery(context: ErrorContext): Promise<boolean> {
    // Get applicable strategies sorted by priority
    const strategies = Array.from(this.recoveryStrategies.values())
      .filter(strategy => strategy.applicable(context))
      .sort((a, b) => a.priority - b.priority);

    if (strategies.length === 0) {
      logger.debug('No applicable recovery strategies', 'ErrorRecoveryManager', {
        service: context.service,
        operation: context.operation
      });
      return false;
    }

    logger.debug('Attempting recovery', 'ErrorRecoveryManager', {
      service: context.service,
      strategies: strategies.map(s => s.name),
      retryCount: context.retryCount
    });

    // Try each strategy
    for (const strategy of strategies) {
      try {
        // Check retry limit
        if (context.retryCount >= strategy.maxRetries) {
          continue;
        }

        const success = await strategy.execute(context);
        
        if (success) {
          logger.info('Recovery successful', 'ErrorRecoveryManager', {
            service: context.service,
            strategy: strategy.name,
            retryCount: context.retryCount
          });
          return true;
        }
      } catch (strategyError) {
        logger.warn('Recovery strategy failed', 'ErrorRecoveryManager', {
          strategy: strategy.name,
          error: (strategyError as Error)?.message
        });
      }
    }

    logger.warn('All recovery strategies failed', 'ErrorRecoveryManager', {
      service: context.service,
      operation: context.operation,
      strategiesAttempted: strategies.length
    });

    return false;
  }

  // Register custom recovery strategy
  registerStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.id, strategy);
    logger.debug('Recovery strategy registered', 'ErrorRecoveryManager', {
      id: strategy.id,
      name: strategy.name
    });
  }

  // Remove recovery strategy
  unregisterStrategy(strategyId: string): boolean {
    const removed = this.recoveryStrategies.delete(strategyId);
    if (removed) {
      logger.debug('Recovery strategy unregistered', 'ErrorRecoveryManager', {
        id: strategyId
      });
    }
    return removed;
  }

  // Check if error is recoverable
  private isRecoverable(error: Error): boolean {
    const recoverablePatterns = [
      'network',
      'timeout',
      'fetch',
      'audio',
      'context',
      'memory',
      'temporary',
      'transient',
      'rate limit'
    ];

    const errorMessage = error.message.toLowerCase();
    return recoverablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  // Get retry count for service/operation
  private getRetryCount(service: string, operation: string): number {
    const recent = this.errorHistory.filter(ctx => 
      ctx.service === service && 
      ctx.operation === operation &&
      Date.now() - ctx.timestamp < 60000 // Last minute
    );
    
    return recent.length;
  }

  // Circuit breaker management
  private isCircuitBreakerOpen(service: string): boolean {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return false;

    if (breaker.open) {
      // Check if timeout has passed
      if (Date.now() - breaker.lastFailure > this.config.circuitBreakerTimeoutMs) {
        breaker.open = false;
        breaker.failures = 0;
        logger.info('Circuit breaker closed', 'ErrorRecoveryManager', { service });
      }
    }

    return breaker.open;
  }

  private updateCircuitBreaker(service: string, success: boolean): void {
    let breaker = this.circuitBreakers.get(service);
    if (!breaker) {
      breaker = { failures: 0, lastFailure: 0, open: false };
      this.circuitBreakers.set(service, breaker);
    }

    if (success) {
      breaker.failures = Math.max(0, breaker.failures - 1);
    } else {
      breaker.failures++;
      breaker.lastFailure = Date.now();
      
      if (breaker.failures >= this.config.circuitBreakerThreshold) {
        breaker.open = true;
        logger.warn('Circuit breaker opened', 'ErrorRecoveryManager', {
          service,
          failures: breaker.failures
        });
      }
    }
  }

  // Add error to history with size management
  private addToHistory(context: ErrorContext): void {
    this.errorHistory.push(context);
    
    // Keep history size manageable for Pi Zero 2W
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize + 10);
    }
  }

  // Notify recovery callbacks
  private notifyCallbacks(context: ErrorContext, recovered: boolean): void {
    this.recoveryCallbacks.forEach(callback => {
      try {
        callback(context, recovered);
      } catch (error) {
        logger.warn('Recovery callback failed', 'ErrorRecoveryManager', {
          error: (error as Error)?.message
        });
      }
    });
  }

  // Register recovery callback
  onRecovery(callback: (context: ErrorContext, recovered: boolean) => void): () => void {
    this.recoveryCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.recoveryCallbacks.indexOf(callback);
      if (index > -1) {
        this.recoveryCallbacks.splice(index, 1);
      }
    };
  }

  // Get error statistics
  getErrorStats(): {
    totalErrors: number;
    recentErrors: number;
    errorsByService: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoveryRate: number;
  } {
    const now = Date.now();
    const recentThreshold = 3600000; // 1 hour
    
    const recentErrors = this.errorHistory.filter(ctx => 
      now - ctx.timestamp < recentThreshold
    );

    const errorsByService: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let totalRecovered = 0;

    this.errorHistory.forEach(ctx => {
      errorsByService[ctx.service] = (errorsByService[ctx.service] || 0) + 1;
      errorsBySeverity[ctx.severity] = (errorsBySeverity[ctx.severity] || 0) + 1;
    });

    const recoveryRate = this.errorHistory.length > 0 
      ? (totalRecovered / this.errorHistory.length) * 100 
      : 0;

    return {
      totalErrors: this.errorHistory.length,
      recentErrors: recentErrors.length,
      errorsByService,
      errorsBySeverity,
      recoveryRate
    };
  }

  // Get circuit breaker status
  getCircuitBreakerStatus(): Record<string, { failures: number; open: boolean; lastFailure: number }> {
    const status: Record<string, { failures: number; open: boolean; lastFailure: number }> = {};
    
    this.circuitBreakers.forEach((breaker, service) => {
      status[service] = {
        failures: breaker.failures,
        open: breaker.open,
        lastFailure: breaker.lastFailure
      };
    });

    return status;
  }

  // Update configuration
  updateConfig(newConfig: Partial<RecoveryConfig>): void {
    Object.assign(this.config, newConfig);
    logger.info('Error recovery configuration updated', 'ErrorRecoveryManager', {
      config: this.config
    });
  }

  // Get current configuration
  getConfig(): RecoveryConfig {
    return { ...this.config };
  }

  // Clear error history (for testing or cleanup)
  clearHistory(): void {
    this.errorHistory = [];
    this.circuitBreakers.clear();
    logger.debug('Error history and circuit breakers cleared', 'ErrorRecoveryManager');
  }

  // Cleanup resources
  cleanup(): void {
    this.clearHistory();
    this.recoveryCallbacks = [];
    this.recoveryStrategies.clear();
    logger.info('Error recovery manager cleaned up', 'ErrorRecoveryManager');
  }
}
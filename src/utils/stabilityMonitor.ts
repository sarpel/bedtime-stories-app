/**
 * Stability Monitor - System stability and performance monitoring
 *
 * Purpose: Monitor application stability, performance metrics, and system health
 * Logic Flow:
 * 1. Initialize monitoring with configuration
 * 2. Track performance metrics and errors
 * 3. Provide stability reports and alerts
 * 4. Handle graceful degradation when issues detected
 *
 * Edge Cases Handled:
 * - Browser compatibility issues
 * - Memory leaks detection
 * - Network connectivity problems
 * - Performance degradation over time
 */

export interface StabilityMetrics {
  memoryUsage: number;
  renderTime: number;
  errorCount: number;
  networkLatency: number;
  lastUpdate: Date;
}

export interface StabilityConfig {
  memoryThreshold: number;
  errorThreshold: number;
  performanceThreshold: number;
  monitoringInterval: number;
}

export class StabilityMonitor {
  private metrics: StabilityMetrics;
  private config: StabilityConfig;
  private monitoringInterval: number | null = null;
  private errorListeners: ((error: Error) => void)[] = [];
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  private errorHandler: ((event: ErrorEvent) => void) | null = null;

  constructor(config: Partial<StabilityConfig> = {}) {
    this.config = {
      memoryThreshold: 50 * 1024 * 1024, // 50MB
      errorThreshold: 10,
      performanceThreshold: 100, // 100ms
      monitoringInterval: 30000, // 30 seconds
      ...config
    };

    this.metrics = {
      memoryUsage: 0,
      renderTime: 0,
      errorCount: 0,
      networkLatency: 0,
      lastUpdate: new Date()
    };

    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring systems
   */
  private initializeMonitoring(): void {
    // Start periodic monitoring
    this.startMonitoring();

    // Set up global error handlers
    this.setupErrorHandlers();

    // Monitor memory usage if available
    const perfMemory = (performance as any).memory;
    if (perfMemory) {
      this.monitorMemoryUsage();
    }
  }

  /**
   * Start periodic monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = window.setInterval(() => {
      this.updateMetrics();
      this.checkStability();
    }, this.config.monitoringInterval);
  }

  /**
   * Set up global error handlers
   */
  private setupErrorHandlers(): void {
    // Handle unhandled promise rejections
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const error = new Error(`Unhandled promise rejection: ${event.reason}`);
      this.handleError(error);
    };
    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);

    // Handle global errors
    this.errorHandler = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      this.handleError(error);
    };
    window.addEventListener('error', this.errorHandler);
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    // Type assertion for performance.memory (Chrome-specific API)
    const perfMemory = (performance as any).memory;
    if (perfMemory) {
      this.metrics.memoryUsage = perfMemory.usedJSHeapSize;
    }
  }

  /**
   * Update all metrics
   */
  private updateMetrics(): void {
    this.monitorMemoryUsage();
    this.metrics.lastUpdate = new Date();

    // Measure network latency (simplified)
    this.measureNetworkLatency();
  }

  /**
   * Measure network latency
   */
  private async measureNetworkLatency(): Promise<void> {
    const start = performance.now();
    try {
      // Simple ping to measure network latency
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
      this.metrics.networkLatency = performance.now() - start;
    } catch {
      this.metrics.networkLatency = -1; // Network error
    }
  }

  /**
   * Handle errors and update metrics
   */
  private handleError(error: Error): void {
    this.metrics.errorCount++;

    // Notify error listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in stability monitor listener:', listenerError);
      }
    });

    // Log error for debugging
    console.warn('Stability Monitor - Error detected:', error);
  }

  /**
   * Check system stability and trigger alerts if needed
   */
  private checkStability(): void {
    const alerts: string[] = [];

    // Check memory usage
    if (this.metrics.memoryUsage > this.config.memoryThreshold) {
      alerts.push(`High memory usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    // Check error count
    if (this.metrics.errorCount > this.config.errorThreshold) {
      alerts.push(`High error count: ${this.metrics.errorCount}`);
    }

    // Check performance
    if (this.metrics.renderTime > this.config.performanceThreshold) {
      alerts.push(`Slow render time: ${this.metrics.renderTime}ms`);
    }

    // Log alerts
    if (alerts.length > 0) {
      console.warn('Stability Monitor - Alerts:', alerts);
    }
  }

  /**
   * Record render time for performance monitoring
   */
  public recordRenderTime(duration: number): void {
    this.metrics.renderTime = duration;
  }

  /**
   * Get current stability metrics
   */
  public getMetrics(): StabilityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get stability report
   */
  public getStabilityReport(): {
    isStable: boolean;
    alerts: string[];
    metrics: StabilityMetrics;
  } {
    const alerts: string[] = [];

    if (this.metrics.memoryUsage > this.config.memoryThreshold) {
      alerts.push('Memory usage is high');
    }

    if (this.metrics.errorCount > this.config.errorThreshold) {
      alerts.push('Error rate is high');
    }

    if (this.metrics.renderTime > this.config.performanceThreshold) {
      alerts.push('Performance is degraded');
    }

    return {
      isStable: alerts.length === 0,
      alerts,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Add error listener
   */
  public addErrorListener(listener: (error: Error) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  public removeErrorListener(listener: (error: Error) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Reset error count
   */
  public resetErrorCount(): void {
    this.metrics.errorCount = 0;
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Remove event listeners
    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
      this.unhandledRejectionHandler = null;
    }
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
      this.errorHandler = null;
    }
  }
}

// Export singleton instance
export const stabilityMonitor = new StabilityMonitor();

// Export default for convenience
export default stabilityMonitor;

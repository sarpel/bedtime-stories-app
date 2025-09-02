import { logger } from '@/utils/logger';
import { ErrorRecoveryManager, ErrorContext } from './errorRecoveryManager';
import { ResourceMonitor, SystemResources } from './resourceMonitor';
import { AudioBufferManager } from './audioBufferManager';
import { PowerManager } from './powerManager';
import { PiZeroOptimizer } from './piZeroOptimizer';

// System integration and coordination for Pi Zero 2W
export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  services: {
    stt: 'active' | 'degraded' | 'failed';
    wakeWord: 'active' | 'degraded' | 'failed';
    audio: 'active' | 'degraded' | 'failed';
    network: 'active' | 'degraded' | 'failed';
  };
  resources: {
    memory: 'normal' | 'warning' | 'critical';
    cpu: 'normal' | 'warning' | 'critical';
    power: 'normal' | 'warning' | 'critical';
  };
  lastCheck: number;
  uptime: number;
}

export interface SystemConfiguration {
  enableAutoOptimization: boolean;
  healthCheckIntervalMs: number;
  degradedModeThreshold: number;
  criticalModeThreshold: number;
  autoRecoveryEnabled: boolean;
  performanceMonitoring: boolean;
  adaptivePowerManagement: boolean;
}

export class SystemIntegrationManager {
  private static instance: SystemIntegrationManager;
  private errorRecovery: ErrorRecoveryManager;
  private resourceMonitor: ResourceMonitor;
  private audioBufferManager: AudioBufferManager | null = null;
  private powerManager: PowerManager | null = null;
  private piZeroOptimizer: PiZeroOptimizer | null = null;
  
  private systemHealth: SystemHealth;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();
  private serviceCallbacks: Array<(health: SystemHealth) => void> = [];
  
  private readonly config: SystemConfiguration = {
    enableAutoOptimization: true,
    healthCheckIntervalMs: 5000, // 5 seconds for Pi Zero 2W
    degradedModeThreshold: 0.7,
    criticalModeThreshold: 0.9,
    autoRecoveryEnabled: true,
    performanceMonitoring: true,
    adaptivePowerManagement: true
  };

  constructor() {
    if (SystemIntegrationManager.instance) {
      return SystemIntegrationManager.instance;
    }
    SystemIntegrationManager.instance = this;
    
    this.errorRecovery = ErrorRecoveryManager.getInstance();
    this.resourceMonitor = ResourceMonitor.getInstance();
    
    // Initialize system health
    this.systemHealth = {
      overall: 'healthy',
      services: {
        stt: 'active',
        wakeWord: 'active',
        audio: 'active',
        network: 'active'
      },
      resources: {
        memory: 'normal',
        cpu: 'normal',
        power: 'normal'
      },
      lastCheck: Date.now(),
      uptime: 0
    };

    this.initialize();
  }

  static getInstance(): SystemIntegrationManager {
    return new SystemIntegrationManager();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize sub-managers
      await this.initializeSubManagers();
      
      // Set up error recovery callbacks
      this.setupErrorRecoveryCallbacks();
      
      // Set up resource monitoring
      this.setupResourceMonitoring();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      logger.info('System integration manager initialized', 'SystemIntegrationManager', {
        config: this.config,
        managers: {
          errorRecovery: !!this.errorRecovery,
          resourceMonitor: !!this.resourceMonitor,
          audioBuffer: !!this.audioBufferManager,
          powerManager: !!this.powerManager,
          piZeroOptimizer: !!this.piZeroOptimizer
        }
      });
      
    } catch (error) {
      logger.error('Failed to initialize system integration manager', 'SystemIntegrationManager', {
        error: (error as Error)?.message
      });
      throw error;
    }
  }

  private async initializeSubManagers(): Promise<void> {
    try {
      // Initialize audio buffer manager
      this.audioBufferManager = new AudioBufferManager({
        maxBufferSize: 1536, // Conservative for Pi Zero 2W
        targetLatency: 120, // Slightly higher for stability
        compressionEnabled: true,
        adaptiveBuffering: true
      });

      // Initialize power manager  
      this.powerManager = new PowerManager({
        initialMode: 'balanced',
        batteryMonitoring: true,
        thermalProtection: true,
        adaptiveScaling: true
      });

      await this.powerManager.initialize();

      // Initialize Pi Zero optimizer
      this.piZeroOptimizer = PiZeroOptimizer.getInstance();
      await this.piZeroOptimizer.setOptimizationProfile('balanced');

      logger.debug('Sub-managers initialized successfully', 'SystemIntegrationManager');
      
    } catch (error) {
      logger.warn('Some sub-managers failed to initialize', 'SystemIntegrationManager', {
        error: (error as Error)?.message
      });
      // Continue without failing - graceful degradation
    }
  }

  private setupErrorRecoveryCallbacks(): void {
    this.errorRecovery.onRecovery((context: ErrorContext, recovered: boolean) => {
      // Update service health based on error recovery
      this.updateServiceHealth(context.service, recovered ? 'active' : 'degraded');
      
      // Trigger system optimization if needed
      if (!recovered && this.config.enableAutoOptimization) {
        this.triggerSystemOptimization(context.service, context.severity);
      }

      logger.debug('Error recovery callback processed', 'SystemIntegrationManager', {
        service: context.service,
        recovered,
        severity: context.severity
      });
    });
  }

  private setupResourceMonitoring(): void {
    if (this.config.performanceMonitoring) {
      this.resourceMonitor.startMonitoring(2000); // 2-second intervals
      
      // Monitor resource warnings
      this.resourceMonitor.onWarning((warning: string, resources: SystemResources) => {
        this.updateResourceHealth(resources);
        
        // Trigger optimization on warnings
        if (this.config.enableAutoOptimization) {
          this.handleResourceWarning(warning, resources);
        }
      });

      // Monitor resource updates
      this.resourceMonitor.onResourceUpdate((resources: SystemResources) => {
        this.updateResourceHealth(resources);
      });
    }
  }

  private updateServiceHealth(service: string, status: 'active' | 'degraded' | 'failed'): void {
    if (service.includes('stt')) {
      this.systemHealth.services.stt = status;
    } else if (service.includes('wakeWord') || service.includes('wake')) {
      this.systemHealth.services.wakeWord = status;
    } else if (service.includes('audio')) {
      this.systemHealth.services.audio = status;
    } else if (service.includes('network') || service.includes('fetch')) {
      this.systemHealth.services.network = status;
    }

    this.updateOverallHealth();
  }

  private updateResourceHealth(resources: SystemResources): void {
    // Memory health
    if (resources.memory.percentage >= 90) {
      this.systemHealth.resources.memory = 'critical';
    } else if (resources.memory.percentage >= 75) {
      this.systemHealth.resources.memory = 'warning';
    } else {
      this.systemHealth.resources.memory = 'normal';
    }

    // CPU health
    if (resources.cpu.usage >= 85) {
      this.systemHealth.resources.cpu = 'critical';
    } else if (resources.cpu.usage >= 70) {
      this.systemHealth.resources.cpu = 'warning';
    } else {
      this.systemHealth.resources.cpu = 'normal';
    }

    // Power health (if power manager available)
    if (this.powerManager) {
      const powerStatus = this.powerManager.getStatus();
      if (powerStatus.batteryLevel < 15 || powerStatus.thermalThrottling) {
        this.systemHealth.resources.power = 'critical';
      } else if (powerStatus.batteryLevel < 30 || powerStatus.currentMode === 'power-saver') {
        this.systemHealth.resources.power = 'warning';
      } else {
        this.systemHealth.resources.power = 'normal';
      }
    }

    this.updateOverallHealth();
  }

  private updateOverallHealth(): void {
    const healthValues = [
      ...Object.values(this.systemHealth.services),
      ...Object.values(this.systemHealth.resources)
    ];

    const criticalCount = healthValues.filter(v => v === 'critical' || v === 'failed').length;
    const warningCount = healthValues.filter(v => v === 'warning' || v === 'degraded').length;

    if (criticalCount > 0) {
      this.systemHealth.overall = 'critical';
    } else if (warningCount >= 2) {
      this.systemHealth.overall = 'degraded';
    } else {
      this.systemHealth.overall = 'healthy';
    }

    this.systemHealth.lastCheck = Date.now();
    this.systemHealth.uptime = Date.now() - this.startTime;
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);

    logger.debug('Health monitoring started', 'SystemIntegrationManager', {
      interval: this.config.healthCheckIntervalMs
    });
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Update uptime
      this.systemHealth.uptime = Date.now() - this.startTime;
      
      // Check if system needs optimization
      if (this.systemHealth.overall !== 'healthy' && this.config.enableAutoOptimization) {
        await this.triggerSystemOptimization('health-check', 'medium');
      }

      // Notify callbacks
      this.notifyHealthCallbacks();

      logger.debug('Health check completed', 'SystemIntegrationManager', {
        overall: this.systemHealth.overall,
        uptime: Math.floor(this.systemHealth.uptime / 1000) + 's'
      });

    } catch (error) {
      logger.warn('Health check failed', 'SystemIntegrationManager', {
        error: (error as Error)?.message
      });
    }
  }

  private async triggerSystemOptimization(source: string, severity: string): Promise<void> {
    try {
      logger.info('Triggering system optimization', 'SystemIntegrationManager', {
        source,
        severity,
        currentHealth: this.systemHealth.overall
      });

      // Memory optimization
      if (this.systemHealth.resources.memory !== 'normal' && this.audioBufferManager) {
        // Optimize audio buffers
        this.audioBufferManager.updateConfig({
          maxBufferSize: Math.max(1024, this.audioBufferManager.getConfig().maxBufferSize * 0.8)
        });
      }

      // Power optimization
      if (this.systemHealth.resources.power !== 'normal' && this.powerManager) {
        const currentMode = this.powerManager.getStatus().currentMode;
        if (currentMode === 'performance') {
          await this.powerManager.setMode('balanced');
        } else if (currentMode === 'balanced' && this.systemHealth.resources.power === 'critical') {
          await this.powerManager.setMode('power-saver');
        }
      }

      // CPU optimization - reduce non-critical operations
      if (this.systemHealth.resources.cpu !== 'normal') {
        // Emit CPU optimization event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cpu-optimization-required', {
            detail: { severity, source }
          }));
        }
      }

    } catch (error) {
      logger.error('System optimization failed', 'SystemIntegrationManager', {
        source,
        error: (error as Error)?.message
      });
    }
  }

  private async handleResourceWarning(warning: string, resources: SystemResources): Promise<void> {
    logger.warn('Resource warning detected', 'SystemIntegrationManager', {
      warning,
      memoryUsage: resources.memory.percentage,
      cpuUsage: resources.cpu.usage
    });

    // Apply immediate optimizations based on warning type
    if (warning.includes('memory') && this.audioBufferManager) {
      // Reduce buffer sizes
      this.audioBufferManager.updateConfig({
        maxBufferSize: Math.max(512, this.audioBufferManager.getConfig().maxBufferSize * 0.7)
      });
    }

    if (warning.includes('CPU') && this.powerManager) {
      // Switch to power-saver mode to reduce CPU load
      const status = this.powerManager.getStatus();
      if (status.currentMode === 'performance') {
        await this.powerManager.setMode('balanced');
      }
    }
  }

  private notifyHealthCallbacks(): void {
    this.serviceCallbacks.forEach(callback => {
      try {
        callback(this.systemHealth);
      } catch (error) {
        logger.warn('Health callback failed', 'SystemIntegrationManager', {
          error: (error as Error)?.message
        });
      }
    });
  }

  // Public API methods

  // Get current system health
  getSystemHealth(): SystemHealth {
    return { ...this.systemHealth };
  }

  // Register health callback
  onHealthUpdate(callback: (health: SystemHealth) => void): () => void {
    this.serviceCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.serviceCallbacks.indexOf(callback);
      if (index > -1) {
        this.serviceCallbacks.splice(index, 1);
      }
    };
  }

  // Manual system optimization trigger
  async optimizeSystem(): Promise<void> {
    await this.triggerSystemOptimization('manual', 'medium');
  }

  // Get system statistics
  getSystemStats(): {
    health: SystemHealth;
    resources: SystemResources | null;
    errorStats: any;
    audioBufferStats: any;
    powerStats: any;
  } {
    return {
      health: this.getSystemHealth(),
      resources: this.resourceMonitor ? this.resourceMonitor.getRecentPerformanceMetrics() as any : null,
      errorStats: this.errorRecovery.getErrorStats(),
      audioBufferStats: this.audioBufferManager ? {
        totalMemoryUsage: this.audioBufferManager.getTotalMemoryUsage(),
        config: this.audioBufferManager.getConfig()
      } : null,
      powerStats: this.powerManager ? this.powerManager.getStatus() : null,
      piZeroStats: this.piZeroOptimizer ? this.piZeroOptimizer.getSystemStatus() : null
    };
  }

  // Update system configuration
  updateConfig(newConfig: Partial<SystemConfiguration>): void {
    Object.assign(this.config, newConfig);
    
    // Apply configuration changes
    if (newConfig.healthCheckIntervalMs && this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.startHealthMonitoring();
    }

    logger.info('System configuration updated', 'SystemIntegrationManager', {
      config: this.config
    });
  }

  // Get current configuration
  getConfig(): SystemConfiguration {
    return { ...this.config };
  }

  // Emergency shutdown sequence
  async emergencyShutdown(): Promise<void> {
    try {
      logger.warn('Emergency shutdown initiated', 'SystemIntegrationManager');

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Cleanup managers in reverse order
      if (this.powerManager) {
        await this.powerManager.cleanup();
      }

      if (this.audioBufferManager) {
        this.audioBufferManager.cleanup();
      }

      this.resourceMonitor.cleanup();
      this.errorRecovery.cleanup();

      // Clear callbacks
      this.serviceCallbacks = [];

      logger.info('Emergency shutdown completed', 'SystemIntegrationManager');

    } catch (error) {
      logger.error('Emergency shutdown failed', 'SystemIntegrationManager', {
        error: (error as Error)?.message
      });
    }
  }

  // Graceful cleanup
  async cleanup(): Promise<void> {
    try {
      logger.info('System integration manager cleanup started', 'SystemIntegrationManager');

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Cleanup sub-managers
      if (this.piZeroOptimizer) {
        this.piZeroOptimizer.cleanup();
        this.piZeroOptimizer = null;
      }

      if (this.powerManager) {
        await this.powerManager.cleanup();
        this.powerManager = null;
      }

      if (this.audioBufferManager) {
        this.audioBufferManager.cleanup();
        this.audioBufferManager = null;
      }

      if (this.resourceMonitor) {
        this.resourceMonitor.cleanup();
      }

      if (this.errorRecovery) {
        this.errorRecovery.cleanup();
      }

      // Clear callbacks
      this.serviceCallbacks = [];

      logger.info('System integration manager cleanup completed', 'SystemIntegrationManager');

    } catch (error) {
      logger.error('System integration manager cleanup failed', 'SystemIntegrationManager', {
        error: (error as Error)?.message
      });
    }
  }
}
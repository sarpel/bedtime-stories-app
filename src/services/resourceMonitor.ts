import { logger } from '@/utils/logger';

// Resource monitoring and optimization for Pi Zero 2W
export interface SystemResources {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  audio: {
    activeContexts: number;
    bufferSize: number;
  };
  stt: {
    isActive: boolean;
    model: string;
    requestCount: number;
  };
  wakeWord: {
    isActive: boolean;
    model: string;
    sensitivity: number;
  };
}

export interface ResourceLimits {
  memoryWarning: number; // MB
  memoryCritical: number; // MB
  cpuWarning: number; // %
  cpuCritical: number; // %
  audioBufferMax: number; // samples
  maxConcurrentSTT: number;
}

export class ResourceMonitor {
  private static instance: ResourceMonitor;
  private monitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private resourceCallbacks: Array<(resources: SystemResources) => void> = [];
  private warningCallbacks: Array<(warning: string, resources: SystemResources) => void> = [];
  
  // Pi Zero 2W optimized limits
  private readonly limits: ResourceLimits = {
    memoryWarning: 400, // MB - 80% of 512MB
    memoryCritical: 460, // MB - 90% of 512MB
    cpuWarning: 70, // % - sustainable load
    cpuCritical: 85, // % - near capacity
    audioBufferMax: 4096, // samples
    maxConcurrentSTT: 1 // Only one STT request at a time
  };

  private lastResources: SystemResources | null = null;
  private performanceHistory: Array<{ timestamp: number; resources: SystemResources }> = [];
  private maxHistoryEntries = 60; // Keep 1 minute of history (1 entry per second)

  constructor() {
    if (ResourceMonitor.instance) {
      return ResourceMonitor.instance;
    }
    ResourceMonitor.instance = this;
  }

  static getInstance(): ResourceMonitor {
    return new ResourceMonitor();
  }

  // Start monitoring system resources
  startMonitoring(intervalMs: number = 1000): void {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkResources();
    }, intervalMs);

    logger.info('Resource monitoring started for Pi Zero 2W', 'ResourceMonitor', {
      interval: intervalMs,
      limits: this.limits
    });
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.monitoring = false;
    logger.debug('Resource monitoring stopped', 'ResourceMonitor');
  }

  // Get current system resources
  async getCurrentResources(): Promise<SystemResources> {
    const memory = this.getMemoryUsage();
    const cpu = await this.getCPUUsage();
    const audio = this.getAudioContextInfo();
    const stt = this.getSTTStatus();
    const wakeWord = this.getWakeWordStatus();

    return {
      memory,
      cpu,
      audio,
      stt,
      wakeWord
    };
  }

  private getMemoryUsage(): SystemResources['memory'] {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      // Chrome/Edge specific
      const perfMemory = (performance as any).memory;
      const used = perfMemory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      const total = perfMemory.totalJSHeapSize / (1024 * 1024);
      
      return {
        used: Math.round(used),
        total: Math.round(total),
        percentage: Math.round((used / total) * 100)
      };
    } else {
      // Fallback estimation based on Pi Zero 2W specs
      const estimatedUsed = 120; // Base app + STT services
      const total = 512; // Pi Zero 2W total RAM
      
      return {
        used: estimatedUsed,
        total: total,
        percentage: Math.round((estimatedUsed / total) * 100)
      };
    }
  }

  private async getCPUUsage(): Promise<SystemResources['cpu']> {
    // Web browsers don't provide direct CPU usage access
    // Estimate based on active services and recent performance
    let estimatedUsage = 15; // Base usage

    // Add usage estimates for active services
    if (this.getSTTStatus().isActive) {
      estimatedUsage += 10; // STT processing
    }
    
    if (this.getWakeWordStatus().isActive) {
      estimatedUsage += 5; // Wake word monitoring
    }

    // Check recent performance drops as CPU usage indicator
    const recentPerformance = this.getRecentPerformanceMetrics();
    if (recentPerformance.avgResponseTime > 2000) {
      estimatedUsage += 15; // High response times indicate CPU load
    }

    return {
      usage: Math.min(estimatedUsage, 100)
    };
  }

  private getAudioContextInfo(): SystemResources['audio'] {
    const activeContexts = this.countActiveAudioContexts();
    const bufferSize = this.estimateAudioBufferSize();

    return {
      activeContexts,
      bufferSize
    };
  }

  private countActiveAudioContexts(): number {
    // Count active audio contexts (rough estimation)
    let count = 0;
    
    // Check if wake word detector is using audio context
    if (this.getWakeWordStatus().isActive) count++;
    
    // Check if STT is using audio context
    if (this.getSTTStatus().isActive) count++;

    return count;
  }

  private estimateAudioBufferSize(): number {
    // Estimate current audio buffer size based on active services
    let bufferSize = 0;
    
    if (this.getWakeWordStatus().isActive) {
      bufferSize += 512; // Porcupine frame size
    }
    
    if (this.getSTTStatus().isActive) {
      bufferSize += 4096; // STT recording buffer
    }

    return bufferSize;
  }

  private getSTTStatus(): SystemResources['stt'] {
    // This would be injected by the STT service
    // For now, return default values
    return {
      isActive: false,
      model: 'gpt-4o-mini-transcribe',
      requestCount: 0
    };
  }

  private getWakeWordStatus(): SystemResources['wakeWord'] {
    // This would be injected by the wake word service
    // For now, return default values
    return {
      isActive: false,
      model: 'hey-elsa.ppn',
      sensitivity: 0.7
    };
  }

  private async checkResources(): Promise<void> {
    try {
      const resources = await this.getCurrentResources();
      this.lastResources = resources;

      // Add to history
      this.addToHistory(resources);

      // Check for warnings/critical levels
      this.checkResourceLimits(resources);

      // Notify callbacks
      this.resourceCallbacks.forEach(callback => {
        try {
          callback(resources);
        } catch (error) {
          logger.warn('Resource callback error', 'ResourceMonitor', { 
            error: (error as Error)?.message 
          });
        }
      });

    } catch (error) {
      logger.error('Resource monitoring check failed', 'ResourceMonitor', { 
        error: (error as Error)?.message 
      });
    }
  }

  private addToHistory(resources: SystemResources): void {
    this.performanceHistory.push({
      timestamp: Date.now(),
      resources: { ...resources }
    });

    // Keep history size manageable
    if (this.performanceHistory.length > this.maxHistoryEntries) {
      this.performanceHistory.shift();
    }
  }

  private checkResourceLimits(resources: SystemResources): void {
    const warnings: string[] = [];

    // Memory checks
    if (resources.memory.used >= this.limits.memoryCritical) {
      warnings.push(`Critical memory usage: ${resources.memory.used}MB (${resources.memory.percentage}%)`);
      this.triggerMemoryOptimization();
    } else if (resources.memory.used >= this.limits.memoryWarning) {
      warnings.push(`High memory usage: ${resources.memory.used}MB (${resources.memory.percentage}%)`);
    }

    // CPU checks
    if (resources.cpu.usage >= this.limits.cpuCritical) {
      warnings.push(`Critical CPU usage: ${resources.cpu.usage}%`);
      this.triggerCPUOptimization();
    } else if (resources.cpu.usage >= this.limits.cpuWarning) {
      warnings.push(`High CPU usage: ${resources.cpu.usage}%`);
    }

    // Audio buffer checks
    if (resources.audio.bufferSize >= this.limits.audioBufferMax) {
      warnings.push(`Large audio buffer: ${resources.audio.bufferSize} samples`);
      this.optimizeAudioBuffers();
    }

    // Notify warning callbacks
    warnings.forEach(warning => {
      logger.warn(warning, 'ResourceMonitor', { resources });
      this.warningCallbacks.forEach(callback => {
        try {
          callback(warning, resources);
        } catch (error) {
          logger.warn('Warning callback error', 'ResourceMonitor', { 
            error: (error as Error)?.message 
          });
        }
      });
    });
  }

  // Optimization triggers
  private triggerMemoryOptimization(): void {
    logger.info('Triggering memory optimization', 'ResourceMonitor');
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }

    // Clear old performance history
    this.performanceHistory = this.performanceHistory.slice(-30);

    // Suggest pausing non-critical services
    this.emit('optimize-memory', { action: 'pause-non-critical' });
  }

  private triggerCPUOptimization(): void {
    logger.info('Triggering CPU optimization', 'ResourceMonitor');
    
    // Reduce processing frequency
    this.emit('optimize-cpu', { action: 'reduce-frequency' });
  }

  private optimizeAudioBuffers(): void {
    logger.info('Optimizing audio buffers', 'ResourceMonitor');
    
    // Suggest reducing buffer sizes
    this.emit('optimize-audio', { action: 'reduce-buffers' });
  }

  // Event system for optimization triggers
  private emit(event: string, data: any): void {
    // Simple event emission for optimization triggers
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`resource-${event}`, { detail: data }));
    }
  }

  // Get performance metrics
  getRecentPerformanceMetrics(): {
    avgMemoryUsage: number;
    avgCPUUsage: number;
    avgResponseTime: number;
    trendMemory: 'rising' | 'stable' | 'falling';
    trendCPU: 'rising' | 'stable' | 'falling';
  } {
    if (this.performanceHistory.length < 2) {
      return {
        avgMemoryUsage: 0,
        avgCPUUsage: 0,
        avgResponseTime: 1000,
        trendMemory: 'stable',
        trendCPU: 'stable'
      };
    }

    const recent = this.performanceHistory.slice(-10); // Last 10 entries
    const avgMemory = recent.reduce((sum, entry) => sum + entry.resources.memory.used, 0) / recent.length;
    const avgCPU = recent.reduce((sum, entry) => sum + entry.resources.cpu.usage, 0) / recent.length;
    
    // Simple trend calculation
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    
    const firstAvgMemory = firstHalf.reduce((sum, entry) => sum + entry.resources.memory.used, 0) / firstHalf.length;
    const secondAvgMemory = secondHalf.reduce((sum, entry) => sum + entry.resources.memory.used, 0) / secondHalf.length;
    
    const firstAvgCPU = firstHalf.reduce((sum, entry) => sum + entry.resources.cpu.usage, 0) / firstHalf.length;
    const secondAvgCPU = secondHalf.reduce((sum, entry) => sum + entry.resources.cpu.usage, 0) / secondHalf.length;

    return {
      avgMemoryUsage: Math.round(avgMemory),
      avgCPUUsage: Math.round(avgCPU),
      avgResponseTime: 1500, // Placeholder - would measure actual response times
      trendMemory: secondAvgMemory > firstAvgMemory * 1.1 ? 'rising' : 
                   secondAvgMemory < firstAvgMemory * 0.9 ? 'falling' : 'stable',
      trendCPU: secondAvgCPU > firstAvgCPU * 1.1 ? 'rising' : 
                secondAvgCPU < firstAvgCPU * 0.9 ? 'falling' : 'stable'
    };
  }

  // Callback management
  onResourceUpdate(callback: (resources: SystemResources) => void): () => void {
    this.resourceCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.resourceCallbacks.indexOf(callback);
      if (index > -1) {
        this.resourceCallbacks.splice(index, 1);
      }
    };
  }

  onWarning(callback: (warning: string, resources: SystemResources) => void): () => void {
    this.warningCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.warningCallbacks.indexOf(callback);
      if (index > -1) {
        this.warningCallbacks.splice(index, 1);
      }
    };
  }

  // Get current status
  getStatus(): {
    isMonitoring: boolean;
    lastCheck: number | null;
    limits: ResourceLimits;
    historySize: number;
  } {
    return {
      isMonitoring: this.monitoring,
      lastCheck: this.lastResources ? Date.now() : null,
      limits: { ...this.limits },
      historySize: this.performanceHistory.length
    };
  }

  // Update resource limits (for different Pi models)
  updateLimits(newLimits: Partial<ResourceLimits>): void {
    Object.assign(this.limits, newLimits);
    logger.info('Resource limits updated', 'ResourceMonitor', { 
      limits: this.limits 
    });
  }

  // Cleanup
  cleanup(): void {
    this.stopMonitoring();
    this.resourceCallbacks = [];
    this.warningCallbacks = [];
    this.performanceHistory = [];
  }
}
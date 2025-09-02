import { logger } from '@/utils/logger';

// Pi Zero 2W specific optimizations and hardware-specific configurations
export interface PiZeroHardwareSpec {
  cpu: {
    cores: number;
    architecture: string;
    baseFrequency: number; // MHz
    maxFrequency: number; // MHz
    thermalThrottle: number; // °C
  };
  memory: {
    totalRAM: number; // MB
    totalSwap: number; // MB
    pageCacheTarget: number; // MB
  };
  audio: {
    maxSampleRate: number; // Hz
    maxChannels: number;
    dmaBufferSize: number; // bytes
  };
  network: {
    wifiCapable: boolean;
    ethernetCapable: boolean;
    bluetoothCapable: boolean;
  };
}

export interface OptimizationProfile {
  name: string;
  description: string;
  cpuGovernor: 'performance' | 'powersave' | 'ondemand' | 'conservative';
  memoryStrategy: 'aggressive' | 'balanced' | 'conservative';
  audioOptimization: boolean;
  networkOptimization: boolean;
  swapConfiguration: {
    swappiness: number; // 0-100
    cacheRatio: number; // 0.0-1.0
  };
}

export class PiZeroOptimizer {
  private static instance: PiZeroOptimizer;
  private hardwareSpec: PiZeroHardwareSpec;
  private currentProfile: OptimizationProfile;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private performanceHistory: Array<{ timestamp: number; metrics: any }> = [];
  
  // Pi Zero 2W hardware specification
  private readonly piZero2WSpec: PiZeroHardwareSpec = {
    cpu: {
      cores: 4,
      architecture: 'ARM Cortex-A53',
      baseFrequency: 1000, // 1GHz
      maxFrequency: 1000, // No overclocking by default
      thermalThrottle: 80 // Conservative thermal throttling
    },
    memory: {
      totalRAM: 512, // 512MB
      totalSwap: 512, // 512MB swap file recommended
      pageCacheTarget: 100 // Keep 100MB for page cache
    },
    audio: {
      maxSampleRate: 48000, // 48kHz max, 16kHz for voice
      maxChannels: 2, // Stereo capable
      dmaBufferSize: 4096 // Small DMA buffers for low latency
    },
    network: {
      wifiCapable: true,
      ethernetCapable: false, // Pi Zero 2W has no ethernet
      bluetoothCapable: true
    }
  };

  // Optimization profiles for different use cases
  private readonly profiles: Record<string, OptimizationProfile> = {
    'performance': {
      name: 'Performance',
      description: 'Maximum performance for responsive STT and TTS',
      cpuGovernor: 'performance',
      memoryStrategy: 'aggressive',
      audioOptimization: true,
      networkOptimization: false,
      swapConfiguration: {
        swappiness: 10, // Low swappiness for performance
        cacheRatio: 0.6 // 60% cache for better response
      }
    },
    'balanced': {
      name: 'Balanced',
      description: 'Balance between performance and power consumption',
      cpuGovernor: 'ondemand',
      memoryStrategy: 'balanced',
      audioOptimization: true,
      networkOptimization: true,
      swapConfiguration: {
        swappiness: 30, // Moderate swappiness
        cacheRatio: 0.4 // Balanced cache usage
      }
    },
    'power-saver': {
      name: 'Power Saver',
      description: 'Minimize power consumption for battery operation',
      cpuGovernor: 'powersave',
      memoryStrategy: 'conservative',
      audioOptimization: false,
      networkOptimization: true,
      swapConfiguration: {
        swappiness: 60, // Higher swappiness to reduce memory pressure
        cacheRatio: 0.2 // Minimal cache to save memory
      }
    },
    'minimal': {
      name: 'Minimal',
      description: 'Absolute minimal resource usage',
      cpuGovernor: 'powersave',
      memoryStrategy: 'conservative',
      audioOptimization: false,
      networkOptimization: false,
      swapConfiguration: {
        swappiness: 100, // Maximum swappiness
        cacheRatio: 0.1 // Minimal cache usage
      }
    }
  };

  constructor() {
    if (PiZeroOptimizer.instance) {
      return PiZeroOptimizer.instance;
    }
    PiZeroOptimizer.instance = this;
    
    this.hardwareSpec = this.piZero2WSpec;
    this.currentProfile = this.profiles['balanced'];
    
    this.initialize();
  }

  static getInstance(): PiZeroOptimizer {
    return new PiZeroOptimizer();
  }

  private async initialize(): Promise<void> {
    try {
      // Detect actual hardware if possible
      await this.detectHardware();
      
      // Apply initial optimizations
      await this.applyOptimizations();
      
      // Start monitoring
      this.startOptimizationMonitoring();
      
      logger.info('Pi Zero 2W optimizer initialized', 'PiZeroOptimizer', {
        profile: this.currentProfile.name,
        hardwareSpec: this.hardwareSpec
      });
      
    } catch (error) {
      logger.error('Failed to initialize Pi Zero optimizer', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }
  }

  private async detectHardware(): Promise<void> {
    try {
      // In browser environment, we'll use the default Pi Zero 2W spec
      // In a real Pi Zero environment, you would read from /proc/cpuinfo, /proc/meminfo, etc.
      
      // Browser-based hardware detection (limited)
      if (typeof navigator !== 'undefined') {
        const memory = (navigator as any).deviceMemory;
        if (memory) {
          // Adjust memory if device memory is detected (in GB)
          this.hardwareSpec.memory.totalRAM = memory * 1024; // Convert to MB
          logger.debug('Detected device memory', 'PiZeroOptimizer', { memory });
        }

        const cores = navigator.hardwareConcurrency;
        if (cores) {
          this.hardwareSpec.cpu.cores = cores;
          logger.debug('Detected CPU cores', 'PiZeroOptimizer', { cores });
        }
      }

      logger.debug('Hardware detection completed', 'PiZeroOptimizer', {
        detectedSpec: this.hardwareSpec
      });
      
    } catch (error) {
      logger.warn('Hardware detection failed, using defaults', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }
  }

  private async applyOptimizations(): Promise<void> {
    try {
      // Apply memory optimizations
      await this.optimizeMemoryUsage();
      
      // Apply audio optimizations
      if (this.currentProfile.audioOptimization) {
        await this.optimizeAudioPerformance();
      }
      
      // Apply network optimizations
      if (this.currentProfile.networkOptimization) {
        await this.optimizeNetworkPerformance();
      }
      
      // Apply browser-specific optimizations
      await this.optimizeBrowserPerformance();
      
      logger.info('Pi Zero optimizations applied', 'PiZeroOptimizer', {
        profile: this.currentProfile.name
      });
      
    } catch (error) {
      logger.error('Failed to apply optimizations', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }
  }

  private async optimizeMemoryUsage(): Promise<void> {
    try {
      // Browser memory management
      if (typeof window !== 'undefined') {
        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }

        // Suggest memory pressure reduction
        window.dispatchEvent(new CustomEvent('memory-optimization', {
          detail: {
            strategy: this.currentProfile.memoryStrategy,
            target: this.hardwareSpec.memory.totalRAM * 0.7 // Target 70% usage
          }
        }));

        // Clear performance observer entries if available
        if (typeof PerformanceObserver !== 'undefined') {
          try {
            performance.clearMeasures?.();
            performance.clearMarks?.();
          } catch (e) {
            // Ignore errors
          }
        }
      }

      logger.debug('Memory optimization applied', 'PiZeroOptimizer', {
        strategy: this.currentProfile.memoryStrategy,
        targetRAM: this.hardwareSpec.memory.totalRAM
      });
      
    } catch (error) {
      logger.warn('Memory optimization failed', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }
  }

  private async optimizeAudioPerformance(): Promise<void> {
    try {
      // Audio buffer optimization for Pi Zero 2W
      const audioConfig = {
        sampleRate: 16000, // Voice optimized
        bufferSize: this.hardwareSpec.audio.dmaBufferSize,
        latencyHint: 'playback', // Prioritize smooth playback
        echoCancellation: false, // Disable for performance
        noiseSuppression: false, // Disable for performance
        autoGainControl: false // Disable for performance
      };

      // Emit audio optimization event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('audio-optimization', {
          detail: audioConfig
        }));
      }

      logger.debug('Audio optimization applied', 'PiZeroOptimizer', {
        config: audioConfig
      });
      
    } catch (error) {
      logger.warn('Audio optimization failed', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }
  }

  private async optimizeNetworkPerformance(): Promise<void> {
    try {
      // Network optimization for Pi Zero 2W WiFi
      const networkConfig = {
        timeout: 10000, // 10s timeout for Pi Zero WiFi
        retries: 3,
        compression: true,
        keepAlive: true,
        maxConcurrent: 2 // Limit concurrent requests
      };

      // Emit network optimization event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('network-optimization', {
          detail: networkConfig
        }));
      }

      logger.debug('Network optimization applied', 'PiZeroOptimizer', {
        config: networkConfig
      });
      
    } catch (error) {
      logger.warn('Network optimization failed', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }
  }

  private async optimizeBrowserPerformance(): Promise<void> {
    try {
      // Browser-specific optimizations for embedded systems
      if (typeof window !== 'undefined') {
        // Disable animations if performance profile is power-saver or minimal
        if (['power-saver', 'minimal'].includes(this.currentProfile.name)) {
          document.documentElement.style.setProperty('--animation-duration', '0ms');
          document.documentElement.style.setProperty('--transition-duration', '0ms');
        }

        // Set viewport optimizations
        const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
        if (viewport) {
          viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no, shrink-to-fit=no';
        }

        // Disable smooth scrolling for performance
        document.documentElement.style.scrollBehavior = 'auto';

        // Optimize rendering
        document.documentElement.style.setProperty('image-rendering', 'pixelated');
        document.documentElement.style.setProperty('backface-visibility', 'hidden');
      }

      logger.debug('Browser optimization applied', 'PiZeroOptimizer');
      
    } catch (error) {
      logger.warn('Browser optimization failed', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }
  }

  private startOptimizationMonitoring(): void {
    // Monitor performance every 10 seconds
    this.optimizationInterval = setInterval(() => {
      this.monitorPerformance();
    }, 10000);

    logger.debug('Optimization monitoring started', 'PiZeroOptimizer');
  }

  private async monitorPerformance(): Promise<void> {
    try {
      // Collect performance metrics
      const metrics = await this.collectPerformanceMetrics();
      
      // Add to history
      this.performanceHistory.push({
        timestamp: Date.now(),
        metrics
      });

      // Keep history manageable (last 60 entries = 10 minutes)
      if (this.performanceHistory.length > 60) {
        this.performanceHistory = this.performanceHistory.slice(-60);
      }

      // Check if optimization adjustments are needed
      await this.adjustOptimizations(metrics);
      
    } catch (error) {
      logger.warn('Performance monitoring failed', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }
  }

  private async collectPerformanceMetrics(): Promise<any> {
    const metrics: any = {};

    try {
      // Memory metrics (if available)
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const perfMemory = (performance as any).memory;
        metrics.memory = {
          used: Math.round(perfMemory.usedJSHeapSize / (1024 * 1024)), // MB
          total: Math.round(perfMemory.totalJSHeapSize / (1024 * 1024)), // MB
          limit: Math.round(perfMemory.jsHeapSizeLimit / (1024 * 1024)) // MB
        };
      }

      // Network metrics (if available)
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const connection = (navigator as any).connection;
        metrics.network = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        };
      }

      // Timing metrics
      if (typeof performance !== 'undefined') {
        metrics.timing = {
          navigation: performance.timing ? {
            loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
            domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
          } : null
        };
      }

    } catch (error) {
      logger.debug('Some metrics collection failed', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }

    return metrics;
  }

  private async adjustOptimizations(metrics: any): Promise<void> {
    try {
      let profileChanged = false;

      // Auto-adjust based on memory pressure
      if (metrics.memory) {
        const memoryUsage = (metrics.memory.used / metrics.memory.total) * 100;
        
        if (memoryUsage > 85 && this.currentProfile.name !== 'minimal') {
          await this.setOptimizationProfile('minimal');
          profileChanged = true;
        } else if (memoryUsage > 70 && this.currentProfile.name === 'performance') {
          await this.setOptimizationProfile('balanced');
          profileChanged = true;
        } else if (memoryUsage < 50 && this.currentProfile.name === 'minimal') {
          await this.setOptimizationProfile('balanced');
          profileChanged = true;
        }
      }

      // Auto-adjust based on network conditions
      if (metrics.network && this.currentProfile.networkOptimization) {
        const rtt = metrics.network.rtt;
        if (rtt > 500) { // High latency
          // Suggest network optimizations
          window.dispatchEvent(new CustomEvent('network-latency-warning', {
            detail: { rtt, suggestion: 'Consider reducing concurrent requests' }
          }));
        }
      }

      if (profileChanged) {
        logger.info('Auto-adjusted optimization profile', 'PiZeroOptimizer', {
          newProfile: this.currentProfile.name,
          reason: 'Performance metrics',
          metrics
        });
      }
      
    } catch (error) {
      logger.warn('Optimization adjustment failed', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }
  }

  // Public API methods

  async setOptimizationProfile(profileName: string): Promise<boolean> {
    try {
      const profile = this.profiles[profileName];
      if (!profile) {
        logger.warn('Unknown optimization profile', 'PiZeroOptimizer', { profileName });
        return false;
      }

      this.currentProfile = profile;
      await this.applyOptimizations();

      logger.info('Optimization profile changed', 'PiZeroOptimizer', {
        profile: profileName,
        description: profile.description
      });

      return true;
    } catch (error) {
      logger.error('Failed to set optimization profile', 'PiZeroOptimizer', {
        profileName,
        error: (error as Error)?.message
      });
      return false;
    }
  }

  getOptimizationProfiles(): Record<string, OptimizationProfile> {
    return { ...this.profiles };
  }

  getCurrentProfile(): OptimizationProfile {
    return { ...this.currentProfile };
  }

  getHardwareSpec(): PiZeroHardwareSpec {
    return { ...this.hardwareSpec };
  }

  getPerformanceHistory(): Array<{ timestamp: number; metrics: any }> {
    return [...this.performanceHistory];
  }

  // Get optimization recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Memory recommendations
    if (this.performanceHistory.length > 0) {
      const latest = this.performanceHistory[this.performanceHistory.length - 1];
      if (latest.metrics.memory) {
        const usage = (latest.metrics.memory.used / latest.metrics.memory.total) * 100;
        if (usage > 80) {
          recommendations.push('Consider switching to minimal profile to reduce memory usage');
        }
        if (usage < 40 && this.currentProfile.name === 'power-saver') {
          recommendations.push('Memory usage is low, consider balanced profile for better performance');
        }
      }
    }

    // Audio recommendations
    if (!this.currentProfile.audioOptimization) {
      recommendations.push('Enable audio optimization for better STT/TTS performance');
    }

    // Network recommendations
    if (this.hardwareSpec.network.wifiCapable && !this.currentProfile.networkOptimization) {
      recommendations.push('Enable network optimization for better WiFi performance');
    }

    return recommendations;
  }

  // Manual memory cleanup
  async performMemoryCleanup(): Promise<void> {
    try {
      // Force garbage collection
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }

      // Clear caches
      this.performanceHistory = this.performanceHistory.slice(-30); // Keep only last 30 entries

      // Emit cleanup event
      window.dispatchEvent(new CustomEvent('memory-cleanup-requested', {
        detail: { source: 'PiZeroOptimizer' }
      }));

      logger.info('Manual memory cleanup performed', 'PiZeroOptimizer');
      
    } catch (error) {
      logger.error('Memory cleanup failed', 'PiZeroOptimizer', {
        error: (error as Error)?.message
      });
    }
  }

  // Get system status
  getSystemStatus(): {
    profile: string;
    hardware: PiZeroHardwareSpec;
    recommendations: string[];
    lastMetrics: any;
  } {
    return {
      profile: this.currentProfile.name,
      hardware: this.hardwareSpec,
      recommendations: this.getOptimizationRecommendations(),
      lastMetrics: this.performanceHistory.length > 0 
        ? this.performanceHistory[this.performanceHistory.length - 1].metrics 
        : null
    };
  }

  // Cleanup
  cleanup(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    this.performanceHistory = [];

    logger.info('Pi Zero optimizer cleaned up', 'PiZeroOptimizer');
  }
}
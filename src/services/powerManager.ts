import { logger } from '@/utils/logger';

// Power management for Pi Zero 2W - optimize battery life and thermal performance
export interface PowerState {
  mode: 'performance' | 'balanced' | 'power-saver' | 'sleep';
  cpuThrottling: boolean;
  audioProcessing: 'full' | 'reduced' | 'minimal';
  networkActivity: 'normal' | 'reduced' | 'minimal';
  wakeWordSensitivity: 'high' | 'medium' | 'low';
  screenBrightness?: number; // 0-100
}

export interface PowerMetrics {
  estimatedBatteryLife: number; // hours
  thermalState: 'normal' | 'warm' | 'hot';
  cpuFrequency: number; // MHz
  powerConsumption: number; // Watts (estimated)
  activeServices: string[];
  uptime: number; // minutes
}

export interface PowerOptimizationConfig {
  batteryThreshold: number; // % - switch to power saver mode
  thermalThreshold: number; // °C - throttle performance
  idleTimeoutMs: number; // Switch to sleep mode after idle
  aggressivePowerSaving: boolean;
  adaptiveBrightness: boolean;
}

export class PowerManager {
  private static instance: PowerManager;
  private currentState: PowerState;
  private config: PowerOptimizationConfig;
  private idleTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private powerCallbacks: Array<(state: PowerState) => void> = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Pi Zero 2W power profiles
  private readonly powerProfiles: Record<PowerState['mode'], PowerState> = {
    performance: {
      mode: 'performance',
      cpuThrottling: false,
      audioProcessing: 'full',
      networkActivity: 'normal',
      wakeWordSensitivity: 'high',
      screenBrightness: 100
    },
    balanced: {
      mode: 'balanced',
      cpuThrottling: false,
      audioProcessing: 'full',
      networkActivity: 'normal',
      wakeWordSensitivity: 'medium',
      screenBrightness: 80
    },
    'power-saver': {
      mode: 'power-saver',
      cpuThrottling: true,
      audioProcessing: 'reduced',
      networkActivity: 'reduced',
      wakeWordSensitivity: 'low',
      screenBrightness: 60
    },
    sleep: {
      mode: 'sleep',
      cpuThrottling: true,
      audioProcessing: 'minimal',
      networkActivity: 'minimal',
      wakeWordSensitivity: 'medium', // Keep wake word active
      screenBrightness: 10
    }
  };

  private readonly defaultConfig: PowerOptimizationConfig = {
    batteryThreshold: 20, // Switch to power saver at 20%
    thermalThreshold: 65, // Throttle at 65°C
    idleTimeoutMs: 300000, // 5 minutes idle timeout
    aggressivePowerSaving: false,
    adaptiveBrightness: true
  };

  constructor(config?: Partial<PowerOptimizationConfig>) {
    if (PowerManager.instance) {
      return PowerManager.instance;
    }

    this.config = { ...this.defaultConfig, ...config };
    this.currentState = this.powerProfiles.balanced; // Start in balanced mode
    
    this.setupActivityTracking();
    this.startIdleTimer();

    PowerManager.instance = this;
    
    logger.info('Power manager initialized for Pi Zero 2W', 'PowerManager', {
      initialMode: this.currentState.mode,
      config: this.config
    });
  }

  static getInstance(): PowerManager {
    return new PowerManager();
  }

  // Switch to a specific power mode
  switchToPowerMode(mode: PowerState['mode'], reason?: string): void {
    if (mode === this.currentState.mode) {
      return; // Already in requested mode
    }

    const previousMode = this.currentState.mode;
    this.currentState = { ...this.powerProfiles[mode] };

    logger.info('Power mode switched', 'PowerManager', {
      from: previousMode,
      to: mode,
      reason: reason || 'manual'
    });

    // Apply power optimizations
    this.applyPowerOptimizations();

    // Notify callbacks
    this.notifyStateChange();
  }

  // Apply power optimizations based on current state
  private applyPowerOptimizations(): void {
    try {
      // CPU throttling
      if (this.currentState.cpuThrottling) {
        this.enableCPUThrottling();
      } else {
        this.disableCPUThrottling();
      }

      // Audio processing optimization
      this.optimizeAudioProcessing();

      // Network activity optimization
      this.optimizeNetworkActivity();

      // Wake word sensitivity adjustment
      this.adjustWakeWordSensitivity();

      // Screen brightness (if applicable)
      if (this.currentState.screenBrightness !== undefined) {
        this.adjustScreenBrightness(this.currentState.screenBrightness);
      }

    } catch (error) {
      logger.error('Failed to apply power optimizations', 'PowerManager', {
        error: (error as Error)?.message,
        mode: this.currentState.mode
      });
    }
  }

  // Enable CPU throttling for power saving
  private enableCPUThrottling(): void {
    // In a browser environment, we can't directly control CPU frequency
    // But we can reduce processing intensity
    
    // Reduce timer frequencies
    this.optimizeTimerFrequencies(true);
    
    // Emit event for components to reduce their processing
    this.emitPowerEvent('cpu-throttle-enabled', {
      reduceProcessing: true,
      maxCPUUsage: 50 // Target 50% max CPU usage
    });

    logger.debug('CPU throttling enabled', 'PowerManager');
  }

  // Disable CPU throttling
  private disableCPUThrottling(): void {
    this.optimizeTimerFrequencies(false);
    
    this.emitPowerEvent('cpu-throttle-disabled', {
      reduceProcessing: false,
      maxCPUUsage: 100
    });

    logger.debug('CPU throttling disabled', 'PowerManager');
  }

  // Optimize timer frequencies based on power mode
  private optimizeTimerFrequencies(reduce: boolean): void {
    const multiplier = reduce ? 2 : 1; // Double intervals to reduce frequency
    
    // This would affect various timers in the application
    this.emitPowerEvent('optimize-timers', {
      multiplier,
      mode: this.currentState.mode
    });
  }

  // Optimize audio processing for power saving
  private optimizeAudioProcessing(): void {
    const audioOptimization = {
      bufferSize: this.getOptimalBufferSize(),
      sampleRate: this.getOptimalSampleRate(),
      compressionEnabled: this.currentState.audioProcessing !== 'full',
      processingInterval: this.getAudioProcessingInterval()
    };

    this.emitPowerEvent('optimize-audio', audioOptimization);

    logger.debug('Audio processing optimized', 'PowerManager', {
      mode: this.currentState.audioProcessing,
      ...audioOptimization
    });
  }

  // Get optimal buffer size based on power mode
  private getOptimalBufferSize(): number {
    switch (this.currentState.audioProcessing) {
      case 'minimal': return 1024;
      case 'reduced': return 2048;
      case 'full': 
      default: return 4096;
    }
  }

  // Get optimal sample rate for power mode
  private getOptimalSampleRate(): number {
    switch (this.currentState.audioProcessing) {
      case 'minimal': return 8000;  // Lower quality but less processing
      case 'reduced': return 16000; // Standard voice quality
      case 'full': 
      default: return 16000; // Keep at 16kHz for compatibility
    }
  }

  // Get audio processing interval
  private getAudioProcessingInterval(): number {
    switch (this.currentState.audioProcessing) {
      case 'minimal': return 200; // 200ms intervals
      case 'reduced': return 100; // 100ms intervals
      case 'full': 
      default: return 50; // 50ms intervals
    }
  }

  // Optimize network activity
  private optimizeNetworkActivity(): void {
    const networkOptimization = {
      batchRequests: this.currentState.networkActivity !== 'normal',
      requestTimeout: this.getNetworkTimeout(),
      maxConcurrentRequests: this.getMaxConcurrentRequests(),
      compressionEnabled: true
    };

    this.emitPowerEvent('optimize-network', networkOptimization);

    logger.debug('Network activity optimized', 'PowerManager', {
      mode: this.currentState.networkActivity,
      ...networkOptimization
    });
  }

  // Get network timeout based on power mode
  private getNetworkTimeout(): number {
    switch (this.currentState.networkActivity) {
      case 'minimal': return 30000; // 30s timeout
      case 'reduced': return 15000; // 15s timeout
      case 'normal':
      default: return 10000; // 10s timeout
    }
  }

  // Get max concurrent requests
  private getMaxConcurrentRequests(): number {
    switch (this.currentState.networkActivity) {
      case 'minimal': return 1;
      case 'reduced': return 2;
      case 'normal':
      default: return 4;
    }
  }

  // Adjust wake word sensitivity for power saving
  private adjustWakeWordSensitivity(): void {
    const sensitivityValue = this.getSensitivityValue(this.currentState.wakeWordSensitivity);
    
    this.emitPowerEvent('adjust-wake-word', {
      sensitivity: sensitivityValue,
      mode: this.currentState.wakeWordSensitivity
    });

    logger.debug('Wake word sensitivity adjusted', 'PowerManager', {
      level: this.currentState.wakeWordSensitivity,
      value: sensitivityValue
    });
  }

  // Convert sensitivity level to numerical value
  private getSensitivityValue(level: 'high' | 'medium' | 'low'): number {
    switch (level) {
      case 'high': return 0.9;
      case 'medium': return 0.7;
      case 'low': return 0.5;
    }
  }

  // Adjust screen brightness (if applicable)
  private adjustScreenBrightness(brightness: number): void {
    // In a web environment, this might control CSS filters or theme brightness
    this.emitPowerEvent('adjust-brightness', {
      brightness: Math.max(10, Math.min(100, brightness))
    });

    logger.debug('Screen brightness adjusted', 'PowerManager', { brightness });
  }

  // Setup activity tracking to detect idle periods
  private setupActivityTracking(): void {
    if (typeof window !== 'undefined') {
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const updateActivity = () => {
        this.recordActivity();
      };

      activityEvents.forEach(event => {
        window.addEventListener(event, updateActivity, { passive: true });
      });
    }
  }

  // Record user activity
  recordActivity(): void {
    this.lastActivity = Date.now();
    
    // If we're in sleep mode, wake up to balanced mode
    if (this.currentState.mode === 'sleep') {
      this.switchToPowerMode('balanced', 'user-activity');
    }

    // Reset idle timer
    this.resetIdleTimer();
  }

  // Start idle timer
  private startIdleTimer(): void {
    this.resetIdleTimer();
  }

  // Reset idle timer
  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.handleIdleTimeout();
    }, this.config.idleTimeoutMs);
  }

  // Handle idle timeout
  private handleIdleTimeout(): void {
    const idleTime = Date.now() - this.lastActivity;
    
    if (idleTime >= this.config.idleTimeoutMs) {
      // Switch to power saver or sleep mode based on current state
      if (this.currentState.mode === 'performance' || this.currentState.mode === 'balanced') {
        this.switchToPowerMode('power-saver', 'idle-timeout');
      } else if (this.currentState.mode === 'power-saver') {
        this.switchToPowerMode('sleep', 'extended-idle');
      }
    }
  }

  // Start power monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.monitorPowerConditions();
    }, 30000); // Check every 30 seconds

    logger.info('Power monitoring started', 'PowerManager');
  }

  // Stop power monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;

    logger.debug('Power monitoring stopped', 'PowerManager');
  }

  // Monitor power conditions and adjust automatically
  private async monitorPowerConditions(): Promise<void> {
    try {
      const metrics = await this.getPowerMetrics();
      
      // Check battery level (if available)
      if (this.isBatteryLow()) {
        if (this.currentState.mode !== 'power-saver' && this.currentState.mode !== 'sleep') {
          this.switchToPowerMode('power-saver', 'low-battery');
        }
      }

      // Check thermal conditions
      if (metrics.thermalState === 'hot') {
        if (this.currentState.mode === 'performance') {
          this.switchToPowerMode('balanced', 'thermal-protection');
        }
      } else if (metrics.thermalState === 'warm' && this.config.aggressivePowerSaving) {
        if (this.currentState.mode === 'performance') {
          this.switchToPowerMode('balanced', 'thermal-prevention');
        }
      }

    } catch (error) {
      logger.warn('Power condition monitoring failed', 'PowerManager', {
        error: (error as Error)?.message
      });
    }
  }

  // Check if battery is low (web environment doesn't provide this)
  private isBatteryLow(): boolean {
    // In a real Pi Zero 2W implementation, this would check actual battery level
    // For web environment, we'll return false
    return false;
  }

  // Get current power metrics
  async getPowerMetrics(): Promise<PowerMetrics> {
    const uptime = typeof performance !== 'undefined' 
      ? performance.now() / 60000 // Convert to minutes
      : Date.now() / 60000;

    return {
      estimatedBatteryLife: this.estimateBatteryLife(),
      thermalState: this.estimateThermalState(),
      cpuFrequency: this.estimateCPUFrequency(),
      powerConsumption: this.estimatePowerConsumption(),
      activeServices: this.getActiveServices(),
      uptime: Math.round(uptime)
    };
  }

  // Estimate battery life based on current usage
  private estimateBatteryLife(): number {
    // Rough estimates for Pi Zero 2W with 2500mAh battery
    const basePowerConsumption = this.estimatePowerConsumption();
    const batteryCapacityWh = 9.25; // 2500mAh * 3.7V / 1000
    
    return batteryCapacityWh / basePowerConsumption;
  }

  // Estimate thermal state
  private estimateThermalState(): PowerMetrics['thermalState'] {
    // In web environment, we can't get actual temperature
    // Estimate based on performance and activity
    const activeServices = this.getActiveServices();
    
    if (activeServices.length > 3 && this.currentState.mode === 'performance') {
      return 'warm';
    }
    
    return 'normal';
  }

  // Estimate CPU frequency
  private estimateCPUFrequency(): number {
    // Pi Zero 2W base frequency is 1000MHz
    const baseFreq = 1000;
    
    if (this.currentState.cpuThrottling) {
      return Math.round(baseFreq * 0.7); // Throttled to 70%
    }
    
    return baseFreq;
  }

  // Estimate power consumption
  private estimatePowerConsumption(): number {
    let basePower = 1.2; // Base Pi Zero 2W consumption in watts
    
    // Add consumption for active services
    const activeServices = this.getActiveServices();
    
    if (activeServices.includes('wake-word')) {
      basePower += 0.3;
    }
    
    if (activeServices.includes('stt-active')) {
      basePower += 0.5;
    }
    
    if (activeServices.includes('audio-processing')) {
      basePower += 0.2;
    }

    // Apply power mode multiplier
    switch (this.currentState.mode) {
      case 'performance': return basePower * 1.0;
      case 'balanced': return basePower * 0.85;
      case 'power-saver': return basePower * 0.7;
      case 'sleep': return basePower * 0.5;
    }
  }

  // Get list of currently active services
  private getActiveServices(): string[] {
    const services: string[] = [];
    
    // This would be populated by actual service status
    // For now, return estimated services based on power mode
    if (this.currentState.mode !== 'sleep') {
      services.push('audio-processing');
    }
    
    if (this.currentState.wakeWordSensitivity !== 'low') {
      services.push('wake-word');
    }
    
    return services;
  }

  // Emit power management events
  private emitPowerEvent(eventType: string, data: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`power-${eventType}`, { detail: data }));
    }
  }

  // Notify state change to callbacks
  private notifyStateChange(): void {
    this.powerCallbacks.forEach(callback => {
      try {
        callback(this.currentState);
      } catch (error) {
        logger.warn('Power state callback error', 'PowerManager', {
          error: (error as Error)?.message
        });
      }
    });
  }

  // Subscribe to power state changes
  onPowerStateChange(callback: (state: PowerState) => void): () => void {
    this.powerCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.powerCallbacks.indexOf(callback);
      if (index > -1) {
        this.powerCallbacks.splice(index, 1);
      }
    };
  }

  // Get current power state
  getCurrentState(): PowerState {
    return { ...this.currentState };
  }

  // Update power configuration
  updateConfig(newConfig: Partial<PowerOptimizationConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    logger.info('Power configuration updated', 'PowerManager', {
      oldConfig,
      newConfig: this.config
    });

    // Restart idle timer if timeout changed
    if (newConfig.idleTimeoutMs) {
      this.resetIdleTimer();
    }
  }

  // Get current configuration
  getConfig(): PowerOptimizationConfig {
    return { ...this.config };
  }

  // Force power mode (override automatic management)
  forcePowerMode(mode: PowerState['mode'], durationMs?: number): void {
    this.switchToPowerMode(mode, 'forced');
    
    // If duration specified, revert after timeout
    if (durationMs) {
      setTimeout(() => {
        this.switchToPowerMode('balanced', 'force-timeout');
      }, durationMs);
    }
  }

  // Cleanup and shutdown
  cleanup(): void {
    try {
      this.stopMonitoring();
      
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
      
      this.powerCallbacks = [];
      
      logger.info('Power manager cleaned up', 'PowerManager');

    } catch (error) {
      logger.error('Power manager cleanup failed', 'PowerManager', {
        error: (error as Error)?.message
      });
    }
  }
}
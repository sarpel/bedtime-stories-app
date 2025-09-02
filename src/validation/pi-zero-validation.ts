import { SystemIntegrationManager } from '@/services/systemIntegrationManager';
import { PiZeroOptimizer } from '@/services/piZeroOptimizer';
import { ResourceMonitor } from '@/services/resourceMonitor';
import { AudioBufferManager } from '@/services/audioBufferManager';
import { ErrorRecoveryManager } from '@/services/errorRecoveryManager';
import { EnhancedSTTService } from '@/services/wakeWordDetector';
import { GPT4oMiniSTTService } from '@/services/sttService';
import { logger } from '@/utils/logger';

// Pi Zero 2W Validation and Performance Benchmarking Suite
export class PiZeroValidator {
  private systemManager: SystemIntegrationManager;
  private piZeroOptimizer: PiZeroOptimizer;
  private resourceMonitor: ResourceMonitor;
  private results: ValidationResults = {
    hardware: {},
    performance: {},
    optimization: {},
    integration: {},
    memory: {},
    power: {},
    audio: {},
    errors: [],
    passed: false,
    timestamp: new Date().toISOString()
  };

  constructor() {
    this.systemManager = SystemIntegrationManager.getInstance();
    this.piZeroOptimizer = PiZeroOptimizer.getInstance();
    this.resourceMonitor = ResourceMonitor.getInstance();
  }

  async runFullValidation(): Promise<ValidationResults> {
    try {
      logger.info('Starting Pi Zero 2W Validation Suite', 'PiZeroValidator');

      // Hardware validation
      await this.validateHardwareConstraints();

      // Performance benchmarks
      await this.runPerformanceBenchmarks();

      // Optimization validation
      await this.validateOptimizations();

      // Integration testing
      await this.validateSystemIntegration();

      // Memory usage validation
      await this.validateMemoryUsage();

      // Power management validation
      await this.validatePowerManagement();

      // Audio system validation
      await this.validateAudioSystem();

      // Calculate overall result
      this.calculateOverallResult();

      logger.info('Pi Zero 2W Validation Complete', 'PiZeroValidator', {
        passed: this.results.passed,
        errors: this.results.errors.length
      });

      return this.results;

    } catch (error) {
      this.results.errors.push({
        component: 'Validation Suite',
        error: (error as Error)?.message || 'Unknown error',
        severity: 'critical'
      });

      logger.error('Validation suite failed', 'PiZeroValidator', {
        error: (error as Error)?.message
      });

      return this.results;
    }
  }

  private async validateHardwareConstraints(): Promise<void> {
    logger.info('Validating hardware constraints', 'PiZeroValidator');

    try {
      const hardwareSpec = this.piZeroOptimizer.getHardwareSpec();

      this.results.hardware = {
        totalRAM: hardwareSpec.memory.totalRAM,
        cpuCores: hardwareSpec.cpu.cores,
        architecture: hardwareSpec.cpu.architecture,
        maxSampleRate: hardwareSpec.audio.maxSampleRate,
        networkCapabilities: {
          wifi: hardwareSpec.network.wifiCapable,
          bluetooth: hardwareSpec.network.bluetoothCapable,
          ethernet: hardwareSpec.network.ethernetCapable
        }
      };

      // Validate RAM constraints
      if (hardwareSpec.memory.totalRAM !== 512) {
        this.results.errors.push({
          component: 'Hardware',
          error: `Expected 512MB RAM, detected ${hardwareSpec.memory.totalRAM}MB`,
          severity: 'warning'
        });
      }

      // Validate CPU constraints
      if (hardwareSpec.cpu.cores < 4) {
        this.results.errors.push({
          component: 'Hardware',
          error: `Expected 4 CPU cores, detected ${hardwareSpec.cpu.cores}`,
          severity: 'warning'
        });
      }

      // Validate audio capabilities
      if (hardwareSpec.audio.maxSampleRate < 16000) {
        this.results.errors.push({
          component: 'Hardware',
          error: `Insufficient audio sample rate: ${hardwareSpec.audio.maxSampleRate}Hz`,
          severity: 'critical'
        });
      }

      logger.debug('Hardware validation completed', 'PiZeroValidator', this.results.hardware);

    } catch (error) {
      this.results.errors.push({
        component: 'Hardware Validation',
        error: (error as Error)?.message || 'Hardware validation failed',
        severity: 'critical'
      });
    }
  }

  private async runPerformanceBenchmarks(): Promise<void> {
    logger.info('Running performance benchmarks', 'PiZeroValidator');

    try {
      const benchmarks: any = {};

      // System initialization benchmark
      const initStart = performance.now();
      await this.systemManager.optimizeSystem();
      benchmarks.systemInitTime = performance.now() - initStart;

      // Resource monitoring benchmark
      const resourceStart = performance.now();
      const resources = await this.resourceMonitor.getCurrentResources();
      benchmarks.resourceMonitorTime = performance.now() - resourceStart;

      // Audio buffer creation benchmark
      const audioStart = performance.now();
      const audioManager = new AudioBufferManager({
        maxBufferSize: 2048,
        targetLatency: 100,
        sampleRate: 16000,
        channels: 1,
        compressionEnabled: true
      });
      audioManager.createBuffer('test-buffer');
      benchmarks.audioBufferCreateTime = performance.now() - audioStart;
      audioManager.cleanup();

      // STT service initialization benchmark
      const sttStart = performance.now();
      const sttService = new GPT4oMiniSTTService({
        model: 'gpt-4o-mini-transcribe',
        language: 'tr',
        responseFormat: 'verbose_json'
      });
      benchmarks.sttInitTime = performance.now() - sttStart;

      // Memory optimization benchmark
      const memoryStart = performance.now();
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
      benchmarks.memoryOptimizationTime = performance.now() - memoryStart;

      this.results.performance = {
        ...benchmarks,
        targets: {
          systemInitTime: 1000, // <1s
          resourceMonitorTime: 100, // <100ms
          audioBufferCreateTime: 50, // <50ms
          sttInitTime: 500, // <500ms
          memoryOptimizationTime: 200 // <200ms
        }
      };

      // Validate performance targets
      Object.keys(benchmarks).forEach(key => {
        const target = (this.results.performance as any).targets[key];
        const actual = benchmarks[key];

        if (target && actual > target) {
          this.results.errors.push({
            component: 'Performance',
            error: `${key}: ${actual.toFixed(2)}ms exceeds target ${target}ms`,
            severity: 'warning'
          });
        }
      });

      logger.debug('Performance benchmarks completed', 'PiZeroValidator', benchmarks);

    } catch (error) {
      this.results.errors.push({
        component: 'Performance Benchmarks',
        error: (error as Error)?.message || 'Benchmarking failed',
        severity: 'critical'
      });
    }
  }

  private async validateOptimizations(): Promise<void> {
    logger.info('Validating system optimizations', 'PiZeroValidator');

    try {
      const systemStatus = this.piZeroOptimizer.getSystemStatus();
      const profiles = this.piZeroOptimizer.getOptimizationProfiles();

      this.results.optimization = {
        currentProfile: systemStatus.profile,
        availableProfiles: Object.keys(profiles),
        recommendations: systemStatus.recommendations,
        lastMetrics: systemStatus.lastMetrics
      };

      // Test profile switching
      const profileTests = ['performance', 'balanced', 'power-saver', 'minimal'];
      const profileSwitchTimes: Record<string, number> = {};

      for (const profile of profileTests) {
        const switchStart = performance.now();
        const success = await this.piZeroOptimizer.setOptimizationProfile(profile);
        profileSwitchTimes[profile] = performance.now() - switchStart;

        if (!success) {
          this.results.errors.push({
            component: 'Optimization',
            error: `Failed to switch to ${profile} profile`,
            severity: 'warning'
          });
        }
      }

      (this.results.optimization as any).profileSwitchTimes = profileSwitchTimes;

      // Validate recommendations
      const recommendations = this.piZeroOptimizer.getOptimizationRecommendations();
      if (recommendations.length > 5) {
        this.results.errors.push({
          component: 'Optimization',
          error: `Too many optimization recommendations: ${recommendations.length}`,
          severity: 'warning'
        });
      }

      // Reset to balanced profile
      await this.piZeroOptimizer.setOptimizationProfile('balanced');

      logger.debug('Optimization validation completed', 'PiZeroValidator', this.results.optimization);

    } catch (error) {
      this.results.errors.push({
        component: 'Optimization Validation',
        error: (error as Error)?.message || 'Optimization validation failed',
        severity: 'critical'
      });
    }
  }

  private async validateSystemIntegration(): Promise<void> {
    logger.info('Validating system integration', 'PiZeroValidator');

    try {
      const systemStats = this.systemManager.getSystemStats();
      const systemHealth = this.systemManager.getSystemHealth();

      this.results.integration = {
        systemHealth: systemHealth.overall,
        serviceStatus: systemHealth.services,
        resourceStatus: systemHealth.resources,
        uptime: systemHealth.uptime,
        managersPresent: {
          errorRecovery: !!systemStats.errorStats,
          audioBuffer: !!systemStats.audioBufferStats,
          power: false, // Power management removed
          piZero: !!systemStats.piZeroStats
        }
      };

      // Validate critical services
      if (systemHealth.overall === 'critical') {
        this.results.errors.push({
          component: 'System Integration',
          error: 'System health is critical',
          severity: 'critical'
        });
      }

      // Check service statuses
      Object.entries(systemHealth.services).forEach(([service, status]) => {
        if (status === 'failed') {
          this.results.errors.push({
            component: 'System Integration',
            error: `Service ${service} has failed`,
            severity: 'critical'
          });
        }
      });

      // Validate error recovery
      const errorStats = systemStats.errorStats;
      if (errorStats && errorStats.recoveryRate < 80) {
        this.results.errors.push({
          component: 'System Integration',
          error: `Low error recovery rate: ${errorStats.recoveryRate}%`,
          severity: 'warning'
        });
      }

      logger.debug('System integration validation completed', 'PiZeroValidator', this.results.integration);

    } catch (error) {
      this.results.errors.push({
        component: 'System Integration',
        error: (error as Error)?.message || 'Integration validation failed',
        severity: 'critical'
      });
    }
  }

  private async validateMemoryUsage(): Promise<void> {
    logger.info('Validating memory usage', 'PiZeroValidator');

    try {
      const systemStats = this.systemManager.getSystemStats();
      const audioBufferStats = systemStats.audioBufferStats;

      // Get memory information
      let memoryInfo: any = {};
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const perfMemory = (performance as any).memory;
        memoryInfo = {
          used: Math.round(perfMemory.usedJSHeapSize / (1024 * 1024)), // MB
          total: Math.round(perfMemory.totalJSHeapSize / (1024 * 1024)), // MB
          limit: Math.round(perfMemory.jsHeapSizeLimit / (1024 * 1024)) // MB
        };
      }

      this.results.memory = {
        browserHeap: memoryInfo,
        audioBufferUsage: audioBufferStats?.totalMemoryUsage || 0,
        totalEstimatedUsage: (memoryInfo.used || 0) + Math.round((audioBufferStats?.totalMemoryUsage || 0) / (1024 * 1024)),
        target: 35, // <35MB additional for STT features
        piZeroLimit: 512 // Pi Zero 2W total RAM
      };

      // Validate memory constraints
      const additionalMemory = Math.round((audioBufferStats?.totalMemoryUsage || 0) / (1024 * 1024));
      if (additionalMemory > 35) {
        this.results.errors.push({
          component: 'Memory Usage',
          error: `Additional memory usage ${additionalMemory}MB exceeds 35MB target`,
          severity: 'warning'
        });
      }

      // Validate total usage doesn't exceed Pi Zero limits
      if (memoryInfo.used && memoryInfo.used > 400) { // 80% of 512MB
        this.results.errors.push({
          component: 'Memory Usage',
          error: `High memory usage: ${memoryInfo.used}MB (${Math.round(memoryInfo.used/512*100)}%)`,
          severity: 'warning'
        });
      }

      // Test memory cleanup
      const cleanupStart = performance.now();
      await this.piZeroOptimizer.performMemoryCleanup();
      const cleanupTime = performance.now() - cleanupStart;

      (this.results.memory as any).cleanupTime = cleanupTime;

      if (cleanupTime > 1000) { // >1s is too slow
        this.results.errors.push({
          component: 'Memory Usage',
          error: `Memory cleanup took ${cleanupTime.toFixed(2)}ms (>1s)`,
          severity: 'warning'
        });
      }

      logger.debug('Memory validation completed', 'PiZeroValidator', this.results.memory);

    } catch (error) {
      this.results.errors.push({
        component: 'Memory Validation',
        error: (error as Error)?.message || 'Memory validation failed',
        severity: 'critical'
      });
    }
  }

  private async validatePowerManagement(): Promise<void> {
    logger.info('Skipping power management validation (power management removed)', 'PiZeroValidator');

    // Set default power results since power management is removed
    this.results.power = {
      currentMode: 'normal',
      batteryLevel: 100, // No battery management needed
      thermalThrottling: false,
      activityLevel: 50,
      modeSwitchTimes: {},
      powerSavingsEnabled: false
    };

    logger.debug('Power management validation skipped (feature removed)', 'PiZeroValidator');
  }

  private async validateAudioSystem(): Promise<void> {
    logger.info('Validating audio system', 'PiZeroValidator');

    try {
      // Test audio buffer manager
      const audioManager = new AudioBufferManager({
        maxBufferSize: 2048,
        targetLatency: 100,
        sampleRate: 16000,
        channels: 1,
        compressionEnabled: true,
        adaptiveBuffering: true
      });

      // Create test buffers
      const bufferIds = ['stt-buffer', 'wake-word-buffer', 'playback-buffer'];
      const bufferCreationTimes: Record<string, number> = {};

      for (const bufferId of bufferIds) {
        const createStart = performance.now();
        const success = audioManager.createBuffer(bufferId, 1024);
        bufferCreationTimes[bufferId] = performance.now() - createStart;

        if (!success) {
          this.results.errors.push({
            component: 'Audio System',
            error: `Failed to create buffer: ${bufferId}`,
            severity: 'critical'
          });
        }
      }

      // Test audio data processing
      const testAudioData = new Float32Array(512).map(() => Math.random() * 0.1 - 0.05);

      const processStart = performance.now();
      for (const bufferId of bufferIds) {
        audioManager.addAudioData(bufferId, testAudioData);
      }
      const processTime = performance.now() - processStart;

      // Test data retrieval
      const retrievalStart = performance.now();
      const retrievedData = audioManager.getAudioData('stt-buffer', 1);
      const retrievalTime = performance.now() - retrievalStart;

      // Get buffer statistics
      const bufferStats = audioManager.getBufferStats();
      const totalMemory = audioManager.getTotalMemoryUsage();

      this.results.audio = {
        bufferCreationTimes,
        audioProcessingTime: processTime,
        audioRetrievalTime: retrievalTime,
        totalMemoryUsage: totalMemory,
        bufferStatistics: bufferStats,
        compressionEnabled: audioManager.getConfig().compressionEnabled,
        adaptiveBufferingEnabled: audioManager.getConfig().adaptiveBuffering
      };

      // Validate audio performance
      if (processTime > 100) { // >100ms is too slow
        this.results.errors.push({
          component: 'Audio System',
          error: `Audio processing too slow: ${processTime.toFixed(2)}ms`,
          severity: 'warning'
        });
      }

      if (retrievalTime > 50) { // >50ms is too slow
        this.results.errors.push({
          component: 'Audio System',
          error: `Audio retrieval too slow: ${retrievalTime.toFixed(2)}ms`,
          severity: 'warning'
        });
      }

      // Validate memory usage
      if (totalMemory > 5 * 1024 * 1024) { // >5MB
        this.results.errors.push({
          component: 'Audio System',
          error: `Audio buffer memory usage too high: ${Math.round(totalMemory / (1024 * 1024))}MB`,
          severity: 'warning'
        });
      }

      audioManager.cleanup();

      logger.debug('Audio system validation completed', 'PiZeroValidator', this.results.audio);

    } catch (error) {
      this.results.errors.push({
        component: 'Audio System',
        error: (error as Error)?.message || 'Audio validation failed',
        severity: 'critical'
      });
    }
  }

  private calculateOverallResult(): void {
    const criticalErrors = this.results.errors.filter(e => e.severity === 'critical').length;
    const warningErrors = this.results.errors.filter(e => e.severity === 'warning').length;

    // Pass criteria: No critical errors, and less than 5 warnings
    this.results.passed = criticalErrors === 0 && warningErrors < 5;

    logger.info('Validation Results Summary', 'PiZeroValidator', {
      passed: this.results.passed,
      criticalErrors,
      warningErrors,
      totalErrors: this.results.errors.length
    });
  }

  // Generate detailed validation report
  generateReport(): string {
    const report = `
# Pi Zero 2W Validation Report
Generated: ${this.results.timestamp}
Overall Result: ${this.results.passed ? '✅ PASSED' : '❌ FAILED'}

## Hardware Validation
- Total RAM: ${this.results.hardware.totalRAM}MB
- CPU Cores: ${this.results.hardware.cpuCores}
- Architecture: ${this.results.hardware.architecture}
- Audio Sample Rate: ${this.results.hardware.maxSampleRate}Hz

## Performance Benchmarks
${Object.entries(this.results.performance.targets || {}).map(([key, target]) =>
  `- ${key}: ${(this.results.performance as any)[key]?.toFixed(2)}ms (target: ${target}ms)`
).join('\n')}

## Memory Usage
- Browser Heap: ${this.results.memory.browserHeap?.used}MB / ${this.results.memory.browserHeap?.total}MB
- Audio Buffers: ${Math.round((this.results.memory.audioBufferUsage || 0) / (1024 * 1024))}MB
- Total Additional: ${this.results.memory.totalEstimatedUsage}MB (target: <${this.results.memory.target}MB)

## System Integration
- Overall Health: ${this.results.integration.systemHealth}
- Services: ${Object.entries(this.results.integration.serviceStatus || {}).map(([k, v]) => `${k}:${v}`).join(', ')}
- Uptime: ${Math.round((this.results.integration.uptime || 0) / 1000)}s

## Errors and Warnings
${this.results.errors.map(error =>
  `- [${error.severity.toUpperCase()}] ${error.component}: ${error.error}`
).join('\n')}

${this.results.errors.length === 0 ? 'No errors detected.' : ''}

## Recommendations
${this.results.optimization.recommendations?.map((rec: any) => `- ${rec}`).join('\n') || 'None'}
`;

    return report;
  }
}

// Validation result interfaces
export interface ValidationResults {
  hardware: any;
  performance: any;
  optimization: any;
  integration: any;
  memory: any;
  power: any;
  audio: any;
  errors: Array<{
    component: string;
    error: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
  passed: boolean;
  timestamp: string;
}

// Export validation runner function for external use
export async function runPiZeroValidation(): Promise<ValidationResults> {
  const validator = new PiZeroValidator();
  return await validator.runFullValidation();
}

// Export report generator
export async function generateValidationReport(): Promise<string> {
  const validator = new PiZeroValidator();
  const results = await validator.runFullValidation();
  return validator.generateReport();
}

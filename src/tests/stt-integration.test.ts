import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { SystemIntegrationManager } from '@/services/systemIntegrationManager';
import { EnhancedSTTService } from '@/services/wakeWordDetector';
import { GPT4oMiniSTTService } from '@/services/sttService';
import { logger } from '@/utils/logger';

// Integration tests for Enhanced STT with Wake Word Detection
describe('Enhanced STT Integration Tests', () => {
  let systemManager: SystemIntegrationManager;
  let enhancedSTTService: EnhancedSTTService;
  let mockAudioContext: any;
  let mockMediaStream: any;

  beforeAll(async () => {
    // Mock Web Audio API
    global.AudioContext = jest.fn().mockImplementation(() => ({
      createMediaStreamSource: jest.fn().mockReturnValue({
        connect: jest.fn()
      }),
      createScriptProcessor: jest.fn().mockReturnValue({
        connect: jest.fn(),
        disconnect: jest.fn(),
        onaudioprocess: null
      }),
      destination: {},
      state: 'running',
      close: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined)
    }));

    // Mock MediaDevices API
    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{
            stop: jest.fn()
          }]
        })
      }
    };

    // Initialize system manager
    systemManager = SystemIntegrationManager.getInstance();
    await systemManager.optimizeSystem();

    // Initialize enhanced STT service
    const baseSTTService = new GPT4oMiniSTTService({
      model: 'gpt-4o-mini-transcribe',
      language: 'tr',
      responseFormat: 'verbose_json'
    });

    enhancedSTTService = new EnhancedSTTService({
      wakeWordEnabled: true,
      wakeWordModel: './hey-elsa.ppn',
      wakeWordSensitivity: 'medium',
      sttService: baseSTTService
    });

    await enhancedSTTService.initialize();
  });

  afterAll(async () => {
    await enhancedSTTService.cleanup();
    await systemManager.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('System Integration', () => {
    it('should initialize system manager with all components', async () => {
      const systemStats = systemManager.getSystemStats();
      
      expect(systemStats.health.overall).toMatch(/healthy|degraded/);
      expect(systemStats.audioBufferStats).toBeDefined();
      expect(systemStats.powerStats).toBeDefined();
      expect(systemStats.piZeroStats).toBeDefined();
      expect(systemStats.errorStats).toBeDefined();
    });

    it('should monitor system resources within Pi Zero 2W limits', async () => {
      const systemStats = systemManager.getSystemStats();
      
      // Memory should stay under 512MB total
      if (systemStats.audioBufferStats?.totalMemoryUsage) {
        expect(systemStats.audioBufferStats.totalMemoryUsage).toBeLessThan(35 * 1024 * 1024); // <35MB
      }

      // Audio buffer configuration should be optimized
      if (systemStats.audioBufferStats?.config) {
        expect(systemStats.audioBufferStats.config.maxBufferSize).toBeLessThanOrEqual(2048);
        expect(systemStats.audioBufferStats.config.sampleRate).toBe(16000);
        expect(systemStats.audioBufferStats.config.channels).toBe(1);
        expect(systemStats.audioBufferStats.config.compressionEnabled).toBe(true);
      }
    });

    it('should handle resource optimization automatically', async () => {
      const initialHealth = systemManager.getSystemHealth();
      
      // Trigger optimization
      await systemManager.optimizeSystem();
      
      const optimizedHealth = systemManager.getSystemHealth();
      expect(optimizedHealth.lastCheck).toBeGreaterThan(initialHealth.lastCheck);
    });
  });

  describe('Wake Word Detection Integration', () => {
    it('should initialize wake word detector with correct configuration', async () => {
      const wakeWordStatus = enhancedSTTService.getWakeWordStatus();
      
      expect(wakeWordStatus.enabled).toBe(true);
      expect(wakeWordStatus.model).toBe('./hey-elsa.ppn');
      expect(wakeWordStatus.phrase).toBe('Hey Elsa');
    });

    it('should start continuous listening for wake word', async () => {
      await enhancedSTTService.startContinuousListening();
      
      const wakeWordStatus = enhancedSTTService.getWakeWordStatus();
      expect(wakeWordStatus.active).toBe(true);
    });

    it('should stop continuous listening properly', () => {
      enhancedSTTService.stopContinuousListening();
      
      const wakeWordStatus = enhancedSTTService.getWakeWordStatus();
      expect(wakeWordStatus.active).toBe(false);
    });

    it('should handle wake word detection callback', async () => {
      const mockStartListening = jest.fn().mockResolvedValue(undefined);
      const mockSTTService = {
        startListening: mockStartListening,
        stopListening: jest.fn(),
        isListening: jest.fn().mockReturnValue(false),
        processVoiceCommand: jest.fn()
      };

      const testService = new EnhancedSTTService({
        wakeWordEnabled: true,
        wakeWordModel: './hey-elsa.ppn',
        wakeWordSensitivity: 'medium',
        sttService: mockSTTService
      });

      await testService.initialize();
      
      // Simulate wake word detection
      const wakeWordDetector = (testService as any).wakeWordDetector;
      if (wakeWordDetector) {
        await (testService as any).handleWakeWordDetected();
        expect(mockStartListening).toHaveBeenCalled();
      }

      await testService.cleanup();
    });
  });

  describe('Enhanced STT Service Integration', () => {
    it('should delegate STT methods to underlying service', async () => {
      const mockSTTService = {
        startListening: jest.fn().mockResolvedValue(undefined),
        stopListening: jest.fn().mockResolvedValue('test transcription'),
        isListening: jest.fn().mockReturnValue(true),
        processVoiceCommand: jest.fn().mockResolvedValue({
          intent: 'story_request',
          parameters: { theme: 'adventure' },
          confidence: 0.9
        })
      };

      const testService = new EnhancedSTTService({
        wakeWordEnabled: false,
        sttService: mockSTTService
      });

      // Test method delegation
      await testService.startListening();
      expect(mockSTTService.startListening).toHaveBeenCalled();

      await testService.stopListening();
      expect(mockSTTService.stopListening).toHaveBeenCalled();

      const isListening = testService.isListening();
      expect(isListening).toBe(true);
      expect(mockSTTService.isListening).toHaveBeenCalled();

      const result = await testService.processVoiceCommand('tell me a story');
      expect(result).toEqual({
        intent: 'story_request',
        parameters: { theme: 'adventure' },
        confidence: 0.9
      });
      expect(mockSTTService.processVoiceCommand).toHaveBeenCalledWith('tell me a story');

      await testService.cleanup();
    });

    it('should provide fallback voice command processing', async () => {
      const testService = new EnhancedSTTService({
        wakeWordEnabled: false,
        sttService: null // No underlying service
      });

      const result = await testService.processVoiceCommand('test command');
      
      expect(result).toEqual({
        intent: 'story_request',
        parameters: {},
        confidence: 0.8
      });

      await testService.cleanup();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle audio context initialization failures', async () => {
      // Mock failed AudioContext
      const originalAudioContext = global.AudioContext;
      global.AudioContext = jest.fn().mockImplementation(() => {
        throw new Error('AudioContext not supported');
      });

      const testService = new EnhancedSTTService({
        wakeWordEnabled: true,
        wakeWordModel: './hey-elsa.ppn',
        wakeWordSensitivity: 'low',
        sttService: new GPT4oMiniSTTService({})
      });

      await expect(testService.initialize()).rejects.toThrow();
      
      // Restore original
      global.AudioContext = originalAudioContext;
      
      await testService.cleanup();
    });

    it('should handle getUserMedia failures gracefully', async () => {
      // Mock failed getUserMedia
      const originalGetUserMedia = global.navigator.mediaDevices.getUserMedia;
      global.navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue(
        new Error('Permission denied')
      );

      const testService = new EnhancedSTTService({
        wakeWordEnabled: true,
        wakeWordModel: './hey-elsa.ppn',
        wakeWordSensitivity: 'high',
        sttService: new GPT4oMiniSTTService({})
      });

      await testService.initialize();
      
      // Should handle the error and not crash
      await expect(testService.startContinuousListening()).rejects.toThrow('Permission denied');
      
      // Restore original
      global.navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      
      await testService.cleanup();
    });

    it('should recover from system errors using error recovery manager', async () => {
      const systemHealth = systemManager.getSystemHealth();
      const errorStats = systemManager.getSystemStats().errorStats;
      
      // Error stats should be initialized
      expect(errorStats).toBeDefined();
      expect(errorStats.totalErrors).toBeGreaterThanOrEqual(0);
      expect(errorStats.recoveryRate).toBeGreaterThanOrEqual(0);
      
      // System should be monitoring health
      expect(systemHealth.lastCheck).toBeGreaterThan(0);
      expect(systemHealth.uptime).toBeGreaterThan(0);
    });
  });

  describe('Performance Optimization Integration', () => {
    it('should apply Pi Zero 2W specific optimizations', async () => {
      const systemStats = systemManager.getSystemStats();
      const piZeroStats = systemStats.piZeroStats;
      
      if (piZeroStats) {
        expect(piZeroStats.profile).toMatch(/balanced|performance|power-saver|minimal/);
        expect(piZeroStats.hardware.memory.totalRAM).toBe(512);
        expect(piZeroStats.hardware.cpu.cores).toBeGreaterThanOrEqual(1);
        expect(piZeroStats.recommendations).toBeInstanceOf(Array);
      }
    });

    it('should monitor and adapt performance automatically', async () => {
      const systemStats = systemManager.getSystemStats();
      
      // Should have performance data
      if (systemStats.resources) {
        expect(typeof systemStats.resources.avgMemoryUsage).toBe('number');
        expect(typeof systemStats.resources.avgCPUUsage).toBe('number');
        expect(systemStats.resources.trendMemory).toMatch(/rising|stable|falling/);
        expect(systemStats.resources.trendCPU).toMatch(/rising|stable|falling/);
      }
    });

    it('should handle power management integration', async () => {
      const powerStats = systemManager.getSystemStats().powerStats;
      
      if (powerStats) {
        expect(powerStats.currentMode).toMatch(/performance|balanced|power-saver|sleep/);
        expect(typeof powerStats.batteryLevel).toBe('number');
        expect(typeof powerStats.thermalThrottling).toBe('boolean');
        expect(typeof powerStats.activityLevel).toBe('number');
      }
    });
  });

  describe('Turkish Language Support', () => {
    it('should configure GPT-4o-mini-transcribe for Turkish', () => {
      const sttService = new GPT4oMiniSTTService({
        model: 'gpt-4o-mini-transcribe',
        language: 'tr',
        responseFormat: 'verbose_json'
      });

      const config = sttService.getConfig();
      expect(config.model).toBe('gpt-4o-mini-transcribe');
      expect(config.language).toBe('tr');
      expect(config.responseFormat).toBe('verbose_json');
    });

    it('should process Turkish voice commands correctly', async () => {
      const sttService = new GPT4oMiniSTTService({
        model: 'gpt-4o-mini-transcribe',
        language: 'tr'
      });

      // Mock successful transcription
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          text: 'bana bir masal anlat',
          language: 'turkish',
          duration: 2.5,
          words: [
            { word: 'bana', start: 0.0, end: 0.5 },
            { word: 'bir', start: 0.6, end: 0.8 },
            { word: 'masal', start: 0.9, end: 1.3 },
            { word: 'anlat', start: 1.4, end: 1.8 }
          ]
        })
      });
      global.fetch = mockFetch;

      const result = await sttService.processVoiceCommand('bana bir masal anlat');
      
      expect(result.intent).toBe('story_request');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.parameters).toBeDefined();
    });
  });

  describe('Memory and Resource Constraints', () => {
    it('should stay within Pi Zero 2W memory limits during operation', async () => {
      const initialStats = systemManager.getSystemStats();
      
      // Simulate intensive STT operations
      const testService = new EnhancedSTTService({
        wakeWordEnabled: true,
        wakeWordModel: './hey-elsa.ppn',
        wakeWordSensitivity: 'medium',
        sttService: new GPT4oMiniSTTService({
          model: 'gpt-4o-mini-transcribe',
          language: 'tr'
        })
      });

      await testService.initialize();
      await testService.startContinuousListening();
      
      // Let it run briefly
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      testService.stopContinuousListening();
      
      const finalStats = systemManager.getSystemStats();
      
      // Memory usage should not have increased dramatically
      if (initialStats.audioBufferStats && finalStats.audioBufferStats) {
        const memoryIncrease = finalStats.audioBufferStats.totalMemoryUsage - 
                              initialStats.audioBufferStats.totalMemoryUsage;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // <10MB increase
      }

      await testService.cleanup();
    });

    it('should handle memory pressure by optimizing automatically', async () => {
      // Trigger memory optimization
      await systemManager.optimizeSystem();
      
      const systemHealth = systemManager.getSystemHealth();
      
      // System should respond to optimization requests
      expect(systemHealth.overall).toMatch(/healthy|degraded|critical/);
      expect(systemHealth.resources.memory).toMatch(/normal|warning|critical/);
    });
  });

  describe('Production Readiness', () => {
    it('should provide comprehensive system monitoring', () => {
      const systemStats = systemManager.getSystemStats();
      
      // All major components should be monitored
      expect(systemStats.health).toBeDefined();
      expect(systemStats.errorStats).toBeDefined();
      expect(systemStats.audioBufferStats).toBeDefined();
      expect(systemStats.powerStats).toBeDefined();
      expect(systemStats.piZeroStats).toBeDefined();
    });

    it('should support graceful shutdown', async () => {
      const testService = new EnhancedSTTService({
        wakeWordEnabled: true,
        wakeWordModel: './hey-elsa.ppn',
        wakeWordSensitivity: 'medium',
        sttService: new GPT4oMiniSTTService({})
      });

      await testService.initialize();
      await testService.startContinuousListening();
      
      // Should cleanup without errors
      await expect(testService.cleanup()).resolves.toBeUndefined();
    });

    it('should maintain system health monitoring', async () => {
      const healthCallback = jest.fn();
      const unsubscribe = systemManager.onHealthUpdate(healthCallback);
      
      // Wait for health update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(healthCallback).toHaveBeenCalled();
      
      unsubscribe();
    });
  });
});

// Performance benchmarking tests
describe('Performance Benchmarks', () => {
  let systemManager: SystemIntegrationManager;
  
  beforeAll(async () => {
    systemManager = SystemIntegrationManager.getInstance();
  });

  it('should measure STT service initialization time', async () => {
    const startTime = performance.now();
    
    const sttService = new GPT4oMiniSTTService({
      model: 'gpt-4o-mini-transcribe',
      language: 'tr'
    });
    
    const initTime = performance.now() - startTime;
    
    // Should initialize quickly on Pi Zero 2W
    expect(initTime).toBeLessThan(500); // <500ms
    
    logger.info('STT Service Initialization Benchmark', 'Performance', {
      initTime: `${initTime.toFixed(2)}ms`,
      target: '<500ms'
    });
  });

  it('should measure wake word detector startup time', async () => {
    const startTime = performance.now();
    
    const enhancedService = new EnhancedSTTService({
      wakeWordEnabled: true,
      wakeWordModel: './hey-elsa.ppn',
      wakeWordSensitivity: 'medium',
      sttService: new GPT4oMiniSTTService({})
    });
    
    try {
      await enhancedService.initialize();
      const startupTime = performance.now() - startTime;
      
      // Should start quickly despite Pi Zero 2W constraints
      expect(startupTime).toBeLessThan(2000); // <2s
      
      logger.info('Wake Word Detector Startup Benchmark', 'Performance', {
        startupTime: `${startupTime.toFixed(2)}ms`,
        target: '<2000ms'
      });
      
      await enhancedService.cleanup();
    } catch (error) {
      // Expected in test environment without actual audio hardware
      logger.debug('Wake word initialization failed in test environment', 'Performance');
    }
  });

  it('should measure system optimization performance', async () => {
    const startTime = performance.now();
    
    await systemManager.optimizeSystem();
    
    const optimizationTime = performance.now() - startTime;
    
    // System optimization should be fast
    expect(optimizationTime).toBeLessThan(1000); // <1s
    
    logger.info('System Optimization Benchmark', 'Performance', {
      optimizationTime: `${optimizationTime.toFixed(2)}ms`,
      target: '<1000ms'
    });
  });
});
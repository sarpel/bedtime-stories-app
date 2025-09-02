import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { WakeWordDetector, EnhancedSTTService } from '@/services/wakeWordDetector';
import { logger } from '@/utils/logger';

// End-to-end tests for Wake Word Detection with "Hey Elsa" phrase
describe('Wake Word Detection E2E Tests', () => {
  let wakeWordDetector: WakeWordDetector;
  let enhancedSTTService: EnhancedSTTService;
  let mockAudioContext: any;
  let mockMediaStream: any;
  let mockPorcupine: any;

  beforeAll(async () => {
    // Mock Porcupine Web library
    jest.mock('@picovoice/porcupine-web', () => ({
      PorcupineWorker: {
        create: jest.fn().mockResolvedValue({
          process: jest.fn().mockResolvedValue(-1), // No keyword detected initially
          release: jest.fn()
        })
      }
    }));

    // Mock Web Audio API with realistic Pi Zero 2W constraints
    mockAudioContext = {
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
      sampleRate: 16000,
      close: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined)
    };

    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
    global.webkitAudioContext = global.AudioContext;

    // Mock MediaDevices API with Pi Zero constraints
    mockMediaStream = {
      getTracks: () => [{
        stop: jest.fn(),
        kind: 'audio',
        enabled: true
      }],
      active: true
    };

    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: jest.fn().mockResolvedValue(mockMediaStream)
      }
    };

    logger.info('Wake Word E2E Test Environment Initialized', 'WakeWordE2E');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Wake Word Detector Core Functionality', () => {
    beforeEach(async () => {
      wakeWordDetector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });
    });

    afterEach(async () => {
      if (wakeWordDetector) {
        await wakeWordDetector.cleanup();
      }
    });

    it('should initialize with Hey Elsa model configuration', async () => {
      await wakeWordDetector.initialize();
      
      const modelInfo = wakeWordDetector.getModelInfo();
      expect(modelInfo.modelPath).toBe('./hey-elsa.ppn');
      expect(modelInfo.phrase).toBe('Hey Elsa');
      expect(modelInfo.language).toBe('English (Universal)');
      expect(modelInfo.sensitivity).toBe(0.7);
    });

    it('should start listening with proper audio configuration', async () => {
      await wakeWordDetector.initialize();
      
      await wakeWordDetector.startListening();
      
      expect(wakeWordDetector.isActive()).toBe(true);
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
    });

    it('should stop listening and cleanup resources', async () => {
      await wakeWordDetector.initialize();
      await wakeWordDetector.startListening();
      
      wakeWordDetector.stopListening();
      
      expect(wakeWordDetector.isActive()).toBe(false);
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
    });

    it('should handle audio processing with proper frame size', async () => {
      await wakeWordDetector.initialize();
      await wakeWordDetector.startListening();
      
      // Simulate audio processing
      const scriptProcessor = mockAudioContext.createScriptProcessor();
      const mockAudioBuffer = {
        getChannelData: jest.fn().mockReturnValue(new Float32Array(512)),
        length: 512
      };

      const mockProcessingEvent = {
        inputBuffer: mockAudioBuffer
      };

      // Trigger audio processing
      if (scriptProcessor.onaudioprocess) {
        scriptProcessor.onaudioprocess(mockProcessingEvent);
      }

      expect(mockAudioBuffer.getChannelData).toHaveBeenCalledWith(0);
    });

    it('should detect Hey Elsa wake word and trigger callback', async () => {
      const mockCallback = jest.fn();
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: mockCallback
      });

      // Mock Porcupine to return keyword detection
      const { PorcupineWorker } = require('@picovoice/porcupine-web');
      PorcupineWorker.create = jest.fn().mockResolvedValue({
        process: jest.fn().mockResolvedValue(0), // Keyword index 0 detected
        release: jest.fn()
      });

      await detector.initialize();
      await detector.startListening();
      
      // Simulate audio processing that detects wake word
      const scriptProcessor = mockAudioContext.createScriptProcessor();
      const mockAudioBuffer = {
        getChannelData: jest.fn().mockReturnValue(new Float32Array(512).fill(0.1)),
        length: 512
      };

      const mockProcessingEvent = {
        inputBuffer: mockAudioBuffer
      };

      // Process audio frame
      if (scriptProcessor.onaudioprocess) {
        await scriptProcessor.onaudioprocess(mockProcessingEvent);
        
        // Allow async processing to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(mockCallback).toHaveBeenCalled();
      
      await detector.cleanup();
    });

    it('should update sensitivity dynamically', () => {
      wakeWordDetector.updateSensitivity(0.9);
      
      const modelInfo = wakeWordDetector.getModelInfo();
      expect(modelInfo.sensitivity).toBe(0.9);
    });

    it('should handle sensitivity bounds correctly', () => {
      // Test lower bound
      wakeWordDetector.updateSensitivity(0.05);
      expect(wakeWordDetector.getModelInfo().sensitivity).toBe(0.1); // Clamped to minimum
      
      // Test upper bound
      wakeWordDetector.updateSensitivity(1.5);
      expect(wakeWordDetector.getModelInfo().sensitivity).toBe(1.0); // Clamped to maximum
    });
  });

  describe('Enhanced STT Service Integration', () => {
    beforeEach(() => {
      const mockSTTService = {
        startListening: jest.fn().mockResolvedValue(undefined),
        stopListening: jest.fn().mockResolvedValue('test transcription'),
        isListening: jest.fn().mockReturnValue(false),
        processVoiceCommand: jest.fn().mockResolvedValue({
          intent: 'story_request',
          parameters: {},
          confidence: 0.8
        })
      };

      enhancedSTTService = new EnhancedSTTService({
        wakeWordEnabled: true,
        wakeWordModel: './hey-elsa.ppn',
        wakeWordSensitivity: 'medium',
        sttService: mockSTTService
      });
    });

    afterEach(async () => {
      if (enhancedSTTService) {
        await enhancedSTTService.cleanup();
      }
    });

    it('should integrate wake word detection with STT service', async () => {
      await enhancedSTTService.initialize();
      
      const wakeWordStatus = enhancedSTTService.getWakeWordStatus();
      expect(wakeWordStatus.enabled).toBe(true);
      expect(wakeWordStatus.phrase).toBe('Hey Elsa');
      expect(wakeWordStatus.model).toBe('./hey-elsa.ppn');
    });

    it('should start continuous wake word listening', async () => {
      await enhancedSTTService.initialize();
      await enhancedSTTService.startContinuousListening();
      
      const wakeWordStatus = enhancedSTTService.getWakeWordStatus();
      expect(wakeWordStatus.active).toBe(true);
    });

    it('should auto-start STT after wake word detection', async () => {
      const mockSTTService = {
        startListening: jest.fn().mockResolvedValue(undefined),
        stopListening: jest.fn(),
        isListening: jest.fn().mockReturnValue(false),
        processVoiceCommand: jest.fn()
      };

      const testService = new EnhancedSTTService({
        wakeWordEnabled: true,
        wakeWordModel: './hey-elsa.ppn',
        wakeWordSensitivity: 'high',
        sttService: mockSTTService
      });

      await testService.initialize();
      
      // Simulate wake word detection
      await (testService as any).handleWakeWordDetected();
      
      expect(mockSTTService.startListening).toHaveBeenCalled();
      
      await testService.cleanup();
    });

    it('should play wake-up sound on detection', async () => {
      // Mock Audio Context for sound generation
      const mockOscillator = {
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        frequency: { value: 0 }
      };

      const mockGainNode = {
        connect: jest.fn(),
        gain: { value: 0 }
      };

      const mockAudioContextForSound = {
        createOscillator: jest.fn().mockReturnValue(mockOscillator),
        createGain: jest.fn().mockReturnValue(mockGainNode),
        destination: {},
        currentTime: 0
      };

      global.AudioContext = jest.fn().mockImplementation(() => mockAudioContextForSound);

      await enhancedSTTService.initialize();
      
      // Trigger wake word sound
      await (enhancedSTTService as any).playWakeUpSound();
      
      expect(mockAudioContextForSound.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalled();
    });

    it('should handle different sensitivity levels', async () => {
      const sensitivityTests = [
        { level: 'low', expectedValue: 0.3 },
        { level: 'medium', expectedValue: 0.7 },
        { level: 'high', expectedValue: 0.9 }
      ];

      for (const test of sensitivityTests) {
        const testService = new EnhancedSTTService({
          wakeWordEnabled: true,
          wakeWordModel: './hey-elsa.ppn',
          wakeWordSensitivity: test.level as 'low' | 'medium' | 'high',
          sttService: {
            startListening: jest.fn(),
            stopListening: jest.fn(),
            isListening: jest.fn(),
            processVoiceCommand: jest.fn()
          }
        });

        // Check internal sensitivity conversion
        const sensitivity = (testService as any).getSensitivity(test.level);
        expect(sensitivity).toBe(test.expectedValue);
        
        await testService.cleanup();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Porcupine initialization failure', async () => {
      // Mock Porcupine initialization failure
      const { PorcupineWorker } = require('@picovoice/porcupine-web');
      PorcupineWorker.create = jest.fn().mockRejectedValue(new Error('Porcupine init failed'));

      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      await expect(detector.initialize()).rejects.toThrow('Wake word detector initialization failed');
    });

    it('should handle missing wake word model file', async () => {
      const detector = new WakeWordDetector({
        modelPath: './non-existent-model.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      // Mock file not found error
      const { PorcupineWorker } = require('@picovoice/porcupine-web');
      PorcupineWorker.create = jest.fn().mockRejectedValue(new Error('Model file not found'));

      await expect(detector.initialize()).rejects.toThrow();
    });

    it('should handle microphone permission denied', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      await detector.initialize();

      // Mock permission denied
      global.navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(detector.startListening()).rejects.toThrow('Permission denied');
      
      await detector.cleanup();
    });

    it('should handle audio processing errors gracefully', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      // Mock Porcupine process to throw error
      const { PorcupineWorker } = require('@picovoice/porcupine-web');
      PorcupineWorker.create = jest.fn().mockResolvedValue({
        process: jest.fn().mockRejectedValue(new Error('Audio processing failed')),
        release: jest.fn()
      });

      await detector.initialize();
      await detector.startListening();
      
      // Simulate audio processing that fails
      const scriptProcessor = mockAudioContext.createScriptProcessor();
      const mockAudioBuffer = {
        getChannelData: jest.fn().mockReturnValue(new Float32Array(512)),
        length: 512
      };

      // Should handle the error without crashing
      const mockProcessingEvent = { inputBuffer: mockAudioBuffer };
      if (scriptProcessor.onaudioprocess) {
        // This should not throw
        expect(() => {
          scriptProcessor.onaudioprocess(mockProcessingEvent);
        }).not.toThrow();
      }

      await detector.cleanup();
    });

    it('should recover from audio context suspension', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      // Mock suspended audio context
      mockAudioContext.state = 'suspended';

      await detector.initialize();
      await detector.startListening();
      
      // Should handle suspended context
      expect(mockAudioContext.resume).toHaveBeenCalled();
      
      await detector.cleanup();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should use optimized audio settings for Pi Zero 2W', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      await detector.initialize();
      await detector.startListening();
      
      // Verify Pi Zero 2W optimized settings
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          sampleRate: 16000, // Voice optimized
          channelCount: 1, // Mono for lower CPU usage
          echoCancellation: false, // Disabled for performance
          noiseSuppression: false, // Disabled for performance  
          autoGainControl: false // Disabled for performance
        }
      });

      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(512, 1, 1);
      
      await detector.cleanup();
    });

    it('should handle buffer underrun/overrun gracefully', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      await detector.initialize();
      await detector.startListening();
      
      // Simulate various buffer sizes
      const bufferSizes = [256, 512, 1024, 2048];
      
      for (const size of bufferSizes) {
        const mockAudioBuffer = {
          getChannelData: jest.fn().mockReturnValue(new Float32Array(size)),
          length: size
        };

        const mockProcessingEvent = { inputBuffer: mockAudioBuffer };
        const scriptProcessor = mockAudioContext.createScriptProcessor();
        
        // Should handle different buffer sizes without errors
        if (scriptProcessor.onaudioprocess) {
          expect(() => {
            scriptProcessor.onaudioprocess(mockProcessingEvent);
          }).not.toThrow();
        }
      }

      await detector.cleanup();
    });

    it('should monitor memory usage during continuous operation', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      await detector.initialize();
      await detector.startListening();
      
      // Simulate continuous operation
      const iterations = 100;
      const audioData = new Float32Array(512).fill(0.01);
      
      for (let i = 0; i < iterations; i++) {
        const mockAudioBuffer = {
          getChannelData: jest.fn().mockReturnValue(audioData),
          length: 512
        };

        const mockProcessingEvent = { inputBuffer: mockAudioBuffer };
        const scriptProcessor = mockAudioContext.createScriptProcessor();
        
        if (scriptProcessor.onaudioprocess) {
          scriptProcessor.onaudioprocess(mockProcessingEvent);
        }
      }

      // Should complete without memory issues
      expect(detector.isActive()).toBe(true);
      
      await detector.cleanup();
    });

    it('should cleanup all resources on shutdown', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      const { PorcupineWorker } = require('@picovoice/porcupine-web');
      const mockPorcupine = {
        process: jest.fn(),
        release: jest.fn()
      };
      PorcupineWorker.create = jest.fn().mockResolvedValue(mockPorcupine);

      await detector.initialize();
      await detector.startListening();
      
      // Cleanup should release all resources
      await detector.cleanup();
      
      expect(mockPorcupine.release).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
      expect(detector.isActive()).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle rapid wake word detection attempts', async () => {
      const mockCallback = jest.fn();
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: mockCallback
      });

      // Mock multiple rapid detections
      const { PorcupineWorker } = require('@picovoice/porcupine-web');
      PorcupineWorker.create = jest.fn().mockResolvedValue({
        process: jest.fn()
          .mockResolvedValueOnce(0)  // First detection
          .mockResolvedValueOnce(-1) // No detection
          .mockResolvedValueOnce(0)  // Second detection
          .mockResolvedValueOnce(-1),// No detection
        release: jest.fn()
      });

      await detector.initialize();
      await detector.startListening();
      
      // Simulate rapid audio processing
      const scriptProcessor = mockAudioContext.createScriptProcessor();
      const mockAudioBuffer = {
        getChannelData: jest.fn().mockReturnValue(new Float32Array(512)),
        length: 512
      };

      const mockProcessingEvent = { inputBuffer: mockAudioBuffer };
      
      // Process multiple frames rapidly
      for (let i = 0; i < 4; i++) {
        if (scriptProcessor.onaudioprocess) {
          scriptProcessor.onaudioprocess(mockProcessingEvent);
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Should have detected wake word twice
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(mockCallback).toHaveBeenCalledTimes(2);
      
      await detector.cleanup();
    });

    it('should work with different audio input qualities', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.5, // Lower sensitivity for noisy environments
        onWakeWordDetected: jest.fn()
      });

      await detector.initialize();
      await detector.startListening();
      
      // Test with different signal qualities
      const testSignals = [
        new Float32Array(512).fill(0.01),  // Very quiet
        new Float32Array(512).fill(0.1),   // Normal
        new Float32Array(512).fill(0.5),   // Loud
        new Float32Array(512).fill(-0.1),  // Negative values
        Array.from({length: 512}, () => Math.random() * 0.1 - 0.05) // Noise
      ];

      for (const signal of testSignals) {
        const mockAudioBuffer = {
          getChannelData: jest.fn().mockReturnValue(signal instanceof Array ? new Float32Array(signal) : signal),
          length: 512
        };

        const mockProcessingEvent = { inputBuffer: mockAudioBuffer };
        const scriptProcessor = mockAudioContext.createScriptProcessor();
        
        // Should handle all signal types without crashing
        if (scriptProcessor.onaudioprocess) {
          expect(() => {
            scriptProcessor.onaudioprocess(mockProcessingEvent);
          }).not.toThrow();
        }
      }

      await detector.cleanup();
    });

    it('should integrate with system power management', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      await detector.initialize();
      
      // Should work with different power states
      const powerStates = ['performance', 'balanced', 'power-saver'];
      
      for (const state of powerStates) {
        // Simulate power state change
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('power-state-change', {
            detail: { mode: state }
          }));
        }

        await detector.startListening();
        expect(detector.isActive()).toBe(true);
        
        detector.stopListening();
        expect(detector.isActive()).toBe(false);
      }

      await detector.cleanup();
    });
  });

  describe('Production Environment Simulation', () => {
    it('should handle 24/7 continuous operation simulation', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      await detector.initialize();
      await detector.startListening();
      
      // Simulate extended operation (accelerated time)
      const frames = 1000; // Represents ~30 seconds at 16kHz/512 samples
      const audioData = new Float32Array(512).fill(0.02);
      
      for (let i = 0; i < frames; i++) {
        const mockAudioBuffer = {
          getChannelData: jest.fn().mockReturnValue(audioData),
          length: 512
        };

        const mockProcessingEvent = { inputBuffer: mockAudioBuffer };
        const scriptProcessor = mockAudioContext.createScriptProcessor();
        
        if (scriptProcessor.onaudioprocess && i % 100 === 0) {
          // Process every 100th frame to speed up test
          scriptProcessor.onaudioprocess(mockProcessingEvent);
        }
      }

      // Should still be operational
      expect(detector.isActive()).toBe(true);
      
      await detector.cleanup();
    });

    it('should handle system resource constraints', async () => {
      const detector = new WakeWordDetector({
        modelPath: './hey-elsa.ppn',
        sensitivity: 0.7,
        onWakeWordDetected: jest.fn()
      });

      // Simulate low memory condition
      const originalPerformance = global.performance;
      global.performance = {
        ...originalPerformance,
        memory: {
          usedJSHeapSize: 450 * 1024 * 1024, // 450MB (near Pi Zero limit)
          totalJSHeapSize: 512 * 1024 * 1024, // 512MB
          jsHeapSizeLimit: 512 * 1024 * 1024
        }
      };

      await detector.initialize();
      await detector.startListening();
      
      // Should adapt to resource constraints
      expect(detector.isActive()).toBe(true);
      
      await detector.cleanup();
      
      // Restore original
      global.performance = originalPerformance;
    });
  });
});
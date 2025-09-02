import { logger } from '@/utils/logger';
import { PorcupineWorker } from '@picovoice/porcupine-web';

// Wake word detection configuration
interface WakeWordConfig {
  modelPath: string;
  sensitivity: number;
  onWakeWordDetected?: () => void;
  audioContext?: AudioContext;
}

interface WakeWordDetectionResult {
  keywordIndex: number;
  isKeyword: boolean;
}

// Wake Word Detector using actual Porcupine Web library
export class WakeWordDetector {
  private isListening = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private porcupine: PorcupineWorker | null = null;
  private config: WakeWordConfig;
  private frameLength = 512; // Porcupine standard frame length
  private sampleRate = 16000; // Porcupine standard sample rate
  private audioBuffer: Int16Array[] = []; // Buffer for audio processing

  constructor(config: WakeWordConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate
      });

      // Initialize Porcupine with hey-elsa.ppn model
      this.porcupine = await PorcupineWorker.create(
        import.meta.env.VITE_PICOVOICE_ACCESS_KEY || 'demo', // Use demo key if no API key provided
        [{
          label: 'hey-elsa',
          publicPath: this.config.modelPath,
          sensitivity: this.config.sensitivity
        }],
        (keywordIndex) => this.handleKeywordDetection(keywordIndex), // Detection callback
        { base64: '' } // Default model
      );

      logger.info('Wake word detector initialized with Porcupine', 'WakeWordDetector', {
        modelPath: this.config.modelPath,
        sensitivity: this.config.sensitivity,
        frameLength: this.frameLength,
        sampleRate: this.sampleRate,
        phrase: 'Hey Elsa'
      });

    } catch (error) {
      logger.error('Failed to initialize wake word detector', 'WakeWordDetector', {
        error: (error as Error)?.message
      });
      throw new Error('Wake word detector initialization failed: ' + (error as Error)?.message);
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening || !this.audioContext) {
      return;
    }

    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for audio processing
      this.scriptProcessor = this.audioContext.createScriptProcessor(this.frameLength, 1, 1);

      this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        // Note: We can't await in the onaudioprocess callback, so we'll handle async processing
        this.processAudioFrame(audioProcessingEvent.inputBuffer).catch(error => {
          logger.warn('Async audio processing error', 'WakeWordDetector', {
            error: (error as Error)?.message
          });
        });
      };

      // Connect audio pipeline
      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.isListening = true;

      logger.debug('Wake word detection started', 'WakeWordDetector', {
        phrase: 'Hey Elsa',
        sensitivity: this.config.sensitivity
      });

    } catch (error) {
      logger.error('Failed to start wake word detection', 'WakeWordDetector', {
        error: (error as Error)?.message
      });
      throw error;
    }
  }

  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    try {
      // Clean up audio resources
      if (this.scriptProcessor) {
        this.scriptProcessor.disconnect();
        this.scriptProcessor = null;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      this.isListening = false;
      this.audioBuffer = [];

      logger.debug('Wake word detection stopped', 'WakeWordDetector');

    } catch (error) {
      logger.warn('Error stopping wake word detection', 'WakeWordDetector', {
        error: (error as Error)?.message
      });
    }
  }

  /**
   * Handle keyword detection from Porcupine
   * Logic: Called when Porcupine detects the wake word
   */
  private handleKeywordDetection(detection: any): void {
    if (detection && detection.keywordIndex >= 0) {
      logger.debug('Wake word "Hey Elsa" detected by Porcupine!', 'WakeWordDetector', {
        confidence: this.config.sensitivity,
        keywordIndex: detection.keywordIndex,
        timestamp: new Date().toISOString()
      });

      this.onWakeWordDetected();
    }
  }

  private async processAudioFrame(inputBuffer: AudioBuffer): Promise<void> {
    if (!this.isListening || !this.porcupine) {
      return;
    }

    try {
      // Get audio data
      const audioData = inputBuffer.getChannelData(0);

      // Convert to the format expected by Porcupine (16-bit PCM)
      const pcmData = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        pcmData[i] = Math.round(audioData[i] * 32767);
      }

      // Process audio frame with actual Porcupine (detection handled by callback)
      await this.porcupine.process(pcmData);

    } catch (error) {
      logger.warn('Error processing audio frame with Porcupine', 'WakeWordDetector', {
        error: (error as Error)?.message
      });
    }
  }


  private onWakeWordDetected(): void {
    if (this.config.onWakeWordDetected) {
      this.config.onWakeWordDetected();
    }
  }

  // Get current listening status
  isActive(): boolean {
    return this.isListening;
  }

  // Update sensitivity
  updateSensitivity(sensitivity: number): void {
    this.config.sensitivity = Math.max(0.1, Math.min(1.0, sensitivity));
    logger.debug('Wake word sensitivity updated', 'WakeWordDetector', {
      sensitivity: this.config.sensitivity
    });
  }

  // Clean up resources
  cleanup(): void {
    this.stopListening();

    // Clean up Porcupine instance
    if (this.porcupine) {
      this.porcupine.release();
      this.porcupine = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Get model information
  getModelInfo(): {
    modelPath: string;
    phrase: string;
    language: string;
    sensitivity: number;
  } {
    return {
      modelPath: this.config.modelPath,
      phrase: 'Hey Elsa',
      language: 'English (Universal)',
      sensitivity: this.config.sensitivity
    };
  }
}

// Enhanced STT Service with Wake Word Detection
export class EnhancedSTTService {
  private wakeWordDetector: WakeWordDetector | undefined;
  private sttService: any; // Will be injected
  private wakeWordEnabled: boolean;

  constructor(settings: {
    wakeWordEnabled?: boolean;
    wakeWordModel?: string;
    wakeWordSensitivity?: 'low' | 'medium' | 'high';
    sttService: any;
  }) {
    this.wakeWordEnabled = settings.wakeWordEnabled || false;
    this.sttService = settings.sttService;

    if (this.wakeWordEnabled) {
      const sensitivity = this.getSensitivity(settings.wakeWordSensitivity || 'medium');

      this.wakeWordDetector = new WakeWordDetector({
        modelPath: settings.wakeWordModel || './hey-elsa.ppn',
        sensitivity,
        onWakeWordDetected: this.handleWakeWordDetected.bind(this)
      });
    } else {
      this.wakeWordDetector = undefined;
    }
  }

  async initialize(): Promise<void> {
    if (this.wakeWordEnabled && this.wakeWordDetector) {
      await this.wakeWordDetector.initialize();
    }
  }

  async startContinuousListening(): Promise<void> {
    if (this.wakeWordEnabled && this.wakeWordDetector) {
      await this.wakeWordDetector.startListening();
      logger.info('Enhanced STT: Continuous wake word listening started', 'EnhancedSTTService');
    }
  }

  stopContinuousListening(): void {
    if (this.wakeWordDetector) {
      this.wakeWordDetector.stopListening();
      logger.info('Enhanced STT: Continuous wake word listening stopped', 'EnhancedSTTService');
    }
  }

  private handleWakeWordDetected(): void {
    logger.debug('Enhanced STT: Wake word "Hey Elsa" detected', 'EnhancedSTTService');

    // Auto-start STT listening
    if (this.sttService && typeof this.sttService.startListening === 'function') {
      this.sttService.startListening().catch((error: Error) => {
        logger.error('Failed to start STT after wake word', 'EnhancedSTTService', {
          error: error.message
        });
      });
    }

    // Provide audio feedback (optional)
    this.playWakeUpSound();
  }

  private playWakeUpSound(): void {
    try {
      // Simple beep sound to indicate wake word detection
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Hz
      gainNode.gain.value = 0.1;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Ignore audio feedback errors
    }
  }

  private getSensitivity(level: 'low' | 'medium' | 'high'): number {
    const sensitivityMap = {
      'low': 0.3,
      'medium': 0.7,
      'high': 0.9
    };
    return sensitivityMap[level] || 0.7;
  }

  // Delegate methods to STT service
  async startListening(): Promise<void> {
    if (this.sttService && typeof this.sttService.startListening === 'function') {
      return this.sttService.startListening();
    }
  }

  async stopListening(): Promise<any> {
    if (this.sttService && typeof this.sttService.stopListening === 'function') {
      return this.sttService.stopListening();
    }
  }

  isListening(): boolean {
    if (this.sttService && typeof this.sttService.isListening === 'function') {
      return this.sttService.isListening();
    }
    return false;
  }

  // Delegate processVoiceCommand method
  async processVoiceCommand(text: string): Promise<any> {
    if (this.sttService && typeof this.sttService.processVoiceCommand === 'function') {
      return this.sttService.processVoiceCommand(text);
    }

    // Fallback basic implementation
    return {
      intent: 'story_request',
      parameters: {},
      confidence: 0.8
    };
  }

  // Get wake word status
  getWakeWordStatus(): {
    enabled: boolean;
    active: boolean;
    model: string;
    phrase: string;
  } {
    if (this.wakeWordDetector) {
      const modelInfo = this.wakeWordDetector.getModelInfo();
      return {
        enabled: this.wakeWordEnabled,
        active: this.wakeWordDetector.isActive(),
        model: modelInfo.modelPath,
        phrase: modelInfo.phrase
      };
    }

    return {
      enabled: false,
      active: false,
      model: '',
      phrase: ''
    };
  }

  // Clean up resources
  cleanup(): void {
    if (this.wakeWordDetector) {
      this.wakeWordDetector.cleanup();
    }

    if (this.sttService && typeof this.sttService.cleanup === 'function') {
      this.sttService.cleanup();
    }
  }
}

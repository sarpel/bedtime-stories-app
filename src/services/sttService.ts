import { config } from './configService';
import { logger } from '@/utils/logger';

// STT service interfaces
interface STTSettings {
  sttProvider?: string;
  openaiSTT?: {
    endpoint?: string;
    modelId?: string;
    apiKey?: string;
  };
  deepgramSTT?: {
    endpoint?: string;
    modelId?: string;
    apiKey?: string;
  };
  audioSettings?: {
    sampleRate?: number;
    channels?: number;
    bitDepth?: number;
    format?: string;
  };
}

interface OpenAISTTRequest {
  file: File;
  model: string;
  language?: string;
  response_format?: string;
  temperature?: number;
}

interface DeepgramSTTRequest {
  audio: ArrayBuffer;
  model: string;
  language: string;
  smart_format?: boolean;
  interim_results?: boolean;
}

interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
  duration?: number;
}

type ProgressCallback = (progress: number) => void;

// Audio recorder utility class
class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  constructor(private audioSettings: any) {}

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Kayıt zaten başlatılmış');
    }

    try {
      // Get microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.audioSettings.sampleRate || 16000,
          channelCount: this.audioSettings.channels || 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: this.getSupportedMimeType(),
        audioBitsPerSecond: this.audioSettings.bitDepth === 16 ? 128000 : 64000
      };

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

      logger.debug('Audio recording started', 'STTService', {
        sampleRate: this.audioSettings.sampleRate,
        channels: this.audioSettings.channels
      });
    } catch (error) {
      logger.error('Failed to start audio recording', 'STTService', { 
        error: (error as Error)?.message 
      });
      throw new Error('Mikrofon erişimi başarısız. Lütfen izin verin.');
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Kayıt başlatılmamış'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { 
          type: this.getSupportedMimeType() 
        });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm'; // Fallback
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }
}

// Main STT Service class
export class STTService {
  provider: string;
  endpoint: string;
  modelId: string;
  apiKey: string;
  audioSettings: any;
  audioRecorder: AudioRecorder;

  constructor(settings: STTSettings) {
    this.provider = settings.sttProvider || 'openai';

    if (this.provider === 'openai') {
      // OpenAI Whisper settings
      this.endpoint = settings.openaiSTT?.endpoint || '/api/stt'; // Backend proxy
      this.modelId = settings.openaiSTT?.modelId || 'whisper-1';
      this.apiKey = settings.openaiSTT?.apiKey || ''; // Backend handles API key
    } else if (this.provider === 'deepgram') {
      // Deepgram settings
      this.endpoint = settings.deepgramSTT?.endpoint || '/api/stt';
      this.modelId = settings.deepgramSTT?.modelId || 'nova-3';
      this.apiKey = settings.deepgramSTT?.apiKey || ''; // Backend handles API key
    }

    // Audio capture settings optimized for Pi Zero 2W
    this.audioSettings = {
      sampleRate: settings.audioSettings?.sampleRate || 16000,
      channels: settings.audioSettings?.channels || 1,
      bitDepth: settings.audioSettings?.bitDepth || 16,
      format: settings.audioSettings?.format || 'webm',
      // Raspberry Pi optimizations
      bufferSize: 4096,
      maxDuration: 30, // Maximum 30 seconds recording
      silenceThreshold: 0.01,
      ...settings.audioSettings
    };

    this.audioRecorder = new AudioRecorder(this.audioSettings);

    logger.debug('STT Service initialized', 'STTService', {
      provider: this.provider,
      modelId: this.modelId,
      audioSettings: this.audioSettings
    });
  }

  // Start voice recording
  async startListening(): Promise<void> {
    try {
      await this.audioRecorder.startRecording();
    } catch (error) {
      logger.error('Failed to start listening', 'STTService', { 
        error: (error as Error)?.message 
      });
      throw error;
    }
  }

  // Stop recording and transcribe
  async stopListening(onProgress?: ProgressCallback): Promise<TranscriptionResult> {
    try {
      onProgress?.(10);

      // Stop recording and get audio blob
      const audioBlob = await this.audioRecorder.stopRecording();
      onProgress?.(30);

      // Validate audio
      if (audioBlob.size === 0) {
        throw new Error('Ses kaydı boş. Lütfen tekrar deneyin.');
      }

      // Check duration (basic validation)
      if (audioBlob.size < 1000) { // Very small file, likely silence
        throw new Error('Çok kısa ses kaydı. Lütfen daha uzun konuşun.');
      }

      onProgress?.(50);

      // Transcribe audio
      const result = await this.transcribeAudio(audioBlob, onProgress);
      onProgress?.(100);

      return result;

    } catch (error) {
      logger.error('Failed to stop listening and transcribe', 'STTService', { 
        error: (error as Error)?.message 
      });
      throw error;
    }
  }

  // Transcribe audio file or blob
  async transcribeAudio(
    audioData: Blob | File, 
    onProgress?: ProgressCallback
  ): Promise<TranscriptionResult> {
    try {
      if (!this.modelId) {
        throw new Error('STT ayarları eksik. Lütfen model bilgisini kontrol edin.');
      }

      onProgress?.(20);

      // Prepare form data for backend
      const formData = new FormData();
      
      // Convert blob to file if needed
      const audioFile = audioData instanceof File ? 
        audioData : 
        new File([audioData], 'recording.webm', { type: audioData.type });

      formData.append('audio', audioFile);
      formData.append('provider', this.provider);
      formData.append('model', this.modelId);
      formData.append('language', 'tr'); // Turkish primary

      // Add provider-specific settings
      if (this.provider === 'openai') {
        formData.append('response_format', 'json');
        formData.append('temperature', '0.2'); // Lower temperature for better accuracy
      } else if (this.provider === 'deepgram') {
        formData.append('smart_format', 'true');
        formData.append('interim_results', 'false');
      }

      onProgress?.(40);

      logger.debug('Starting STT transcription', 'STTService', {
        provider: this.provider,
        model: this.modelId,
        fileSize: audioFile.size,
        fileType: audioFile.type
      });

      // Send to backend proxy
      const response = await fetch(this.endpoint, {
        method: 'POST',
        body: formData,
      });

      onProgress?.(80);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('STT API error', 'STTService', { 
          status: response.status, 
          error: errorText 
        });
        throw new Error(`STT API hatası (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      onProgress?.(95);

      // Extract transcription from response
      const result = this.extractTranscriptionFromResponse(data);
      onProgress?.(100);

      logger.debug('STT transcription completed', 'STTService', {
        text: result.text.substring(0, 100) + '...',
        confidence: result.confidence,
        duration: result.duration
      });

      return result;

    } catch (error) {
      logger.error('STT transcription failed', 'STTService', { 
        error: (error as Error)?.message 
      });
      throw error;
    }
  }

  // Extract transcription from different provider responses
  private extractTranscriptionFromResponse(data: any): TranscriptionResult {
    // OpenAI Whisper format
    if (data.text && typeof data.text === 'string') {
      return {
        text: data.text.trim(),
        confidence: data.confidence,
        language: data.language,
        duration: data.duration
      };
    }

    // Deepgram format
    if (data.results && data.results.channels) {
      const channel = data.results.channels[0];
      if (channel && channel.alternatives) {
        const alternative = channel.alternatives[0];
        return {
          text: alternative.transcript.trim(),
          confidence: alternative.confidence,
          language: data.results.language,
          duration: data.metadata?.duration
        };
      }
    }

    // Generic format
    if (data.transcript) {
      return {
        text: data.transcript.trim(),
        confidence: data.confidence,
        language: data.language,
        duration: data.duration
      };
    }

    // Azure format
    if (data.RecognitionStatus === 'Success' && data.DisplayText) {
      return {
        text: data.DisplayText.trim(),
        confidence: data.Confidence,
        language: data.Language,
        duration: data.Duration
      };
    }

    // Google format
    if (data.results && Array.isArray(data.results)) {
      const result = data.results[0];
      if (result && result.alternatives) {
        const alternative = result.alternatives[0];
        return {
          text: alternative.transcript.trim(),
          confidence: alternative.confidence,
          language: data.language_code,
          duration: data.total_billed_time
        };
      }
    }

    throw new Error('STT yanıtından metin çıkarılamadı. API yanıt formatını kontrol edin.');
  }

  // Check if microphone is available
  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      logger.warn('Microphone permission denied', 'STTService', { 
        error: (error as Error)?.message 
      });
      return false;
    }
  }

  // Get recording status
  isListening(): boolean {
    return this.audioRecorder.getRecordingStatus();
  }

  // Process voice commands for bedtime stories
  async processVoiceCommand(transcription: string): Promise<{
    intent: string;
    parameters: any;
    confidence: number;
  }> {
    const text = transcription.toLowerCase().trim();
    
    // Simple intent recognition for Turkish
    const intents = {
      // Story requests
      story_request: [
        'masal', 'hikaye', 'öykü', 'masal anlat', 'hikaye anlat', 
        'bir masal', 'masalı', 'hikayesi'
      ],
      // Story types
      fairy_tale: ['peri masalı', 'prenses', 'şehzade', 'cadı', 'büyü'],
      adventure: ['macera', 'kahraman', 'yolculuk', 'keşif'],
      educational: ['öğretici', 'eğitici', 'bilim', 'matematik', 'doğa'],
      animal: ['hayvan', 'kedi', 'köpek', 'kuş', 'balık', 'orman'],
      // Character requests
      character_request: ['karakter', 'kahraman', 'ana karakter'],
      // Audio controls
      play_story: ['oynat', 'çal', 'başlat', 'dinle'],
      pause_story: ['duraklat', 'durdur', 'bekle'],
      stop_story: ['bitir', 'kes', 'kapat'],
      // Settings
      settings: ['ayarlar', 'ayar', 'seçenekler', 'konfigürasyon'],
      help: ['yardım', 'nasıl', 'ne yapabilirim', 'komutlar']
    };

    let detectedIntent = 'unknown';
    let confidence = 0;
    const parameters: any = {};

    // Intent detection
    for (const [intent, keywords] of Object.entries(intents)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          detectedIntent = intent;
          confidence = 0.8; // Base confidence
          break;
        }
      }
      if (detectedIntent !== 'unknown') break;
    }

    // Extract parameters based on intent
    if (detectedIntent === 'story_request') {
      // Try to extract story type from the same text
      for (const [type, keywords] of Object.entries(intents)) {
        if (type.includes('_tale') || type === 'adventure' || type === 'educational' || type === 'animal') {
          for (const keyword of keywords) {
            if (text.includes(keyword)) {
              parameters.storyType = type;
              parameters.customTopic = keyword;
              break;
            }
          }
        }
      }

      // Extract character names (basic)
      const characterPatterns = [
        /(\w+) adında/g,
        /(\w+) isminde/g,
        /kahraman (\w+)/g
      ];

      for (const pattern of characterPatterns) {
        const match = pattern.exec(text);
        if (match) {
          parameters.characterName = match[1];
          confidence += 0.1;
          break;
        }
      }

      // Extract age if mentioned
      const ageMatch = text.match(/(\d+) yaş/);
      if (ageMatch) {
        parameters.age = parseInt(ageMatch[1]);
        confidence += 0.1;
      }
    }

    return {
      intent: detectedIntent,
      parameters,
      confidence: Math.min(confidence, 1.0)
    };
  }

  // Clean up resources
  cleanup(): void {
    try {
      if (this.audioRecorder) {
        this.audioRecorder.cleanup();
      }
    } catch (error) {
      logger.warn('STT cleanup failed', 'STTService', { 
        error: (error as Error)?.message 
      });
    }
  }
}
import { config } from "./configService";
import { logger } from "@/utils/logger";

// STT service interfaces
interface STTSettings {
  sttProvider?: string;
  model?: string; // Added for GPT-4o-mini-transcribe support
  language?: string; // Added for language support
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
  wakeWordEnabled?: boolean;
  wakeWordModel?: string;
  wakeWordSensitivity?: "low" | "medium" | "high";
  continuousListening?: boolean;
  responseFormat?: "json" | "verbose_json";
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
  segments?: any[]; // Word-level timing segments
  model?: string;
}

interface EnhancedTranscriptionResult extends TranscriptionResult {
  wordTimings?: any[];
  confidence: number;
}

type ProgressCallback = (progress: number) => void;

// Audio conversion utilities
class AudioConverter {
  /**
   * Convert WebM audio to WAV format for better OpenAI compatibility
   * Logic: Uses Web Audio API to decode and re-encode audio as WAV
   */
  static async convertToWav(audioBlob: Blob): Promise<Blob> {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Convert to WAV format
      const wavArrayBuffer = AudioConverter.audioBufferToWav(audioBuffer);

      // Close audio context to free resources
      audioContext.close();

      return new Blob([wavArrayBuffer], { type: "audio/wav" });
    } catch (error) {
      logger.warn(
        "Audio conversion failed, using original format",
        "AudioConverter",
        {
          error: (error as Error)?.message,
          originalType: audioBlob.type,
        },
      );
      // If conversion fails, return original blob
      return audioBlob;
    }
  }

  /**
   * Convert AudioBuffer to WAV format array buffer
   * Logic: Manually create WAV file headers and data
   */
  private static audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2; // 16-bit

    const arrayBuffer = new ArrayBuffer(
      44 + length * numberOfChannels * bytesPerSample,
    );
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * numberOfChannels * bytesPerSample, true);
    writeString(8, "WAVE");

    // fmt sub-chunk
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Sub-chunk size
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true); // Byte rate
    view.setUint16(32, numberOfChannels * bytesPerSample, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample

    // data sub-chunk
    writeString(36, "data");
    view.setUint32(40, length * numberOfChannels * bytesPerSample, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }
}

// Audio recorder utility class
class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private actualMimeType = ""; // Track the actual MIME type used

  constructor(private audioSettings: any) {}

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error("Kayıt zaten başlatılmış");
    }

    try {
      // Get microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.audioSettings.sampleRate || 16000, // Lower sample rate for Pi Zero 2W
          channelCount: this.audioSettings.channels || 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder with Pi Zero 2W optimizations
      const preferredMimeType = this.getSupportedMimeType();
      const options = {
        mimeType: preferredMimeType || undefined,
        // Use very low bitrate for Pi Zero 2W to minimize CPU load
        audioBitsPerSecond:
          preferredMimeType?.includes("webm")
            ? this.audioSettings.webmBitRate || 32000
            : undefined, // Low bitrate for WebM only
      };

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Store the actual MIME type that MediaRecorder is using
      this.actualMimeType = this.mediaRecorder.mimeType;

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

      logger.debug("Audio recording started", "STTService", {
        sampleRate: this.audioSettings.sampleRate,
        channels: this.audioSettings.channels,
        preferredMimeType: preferredMimeType,
        actualMimeType: this.actualMimeType,
      });
    } catch (error) {
      logger.error("Failed to start audio recording", "STTService", {
        error: (error as Error)?.message,
      });
      throw new Error("Mikrofon erişimi başarısız. Lütfen izin verin.");
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error("Kayıt başlatılmamış"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Use the actual MIME type that was used during recording
        const audioBlob = new Blob(this.audioChunks, {
          type: this.actualMimeType || "audio/webm",
        });

        logger.debug("Audio recording stopped", "AudioRecorder", {
          blobSize: audioBlob.size,
          blobType: audioBlob.type,
          chunksCount: this.audioChunks.length,
        });

        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  private getSupportedMimeType(): string {
    // Prioritize formats that OpenAI handles best for gpt-4o-mini-transcribe
    // Based on testing, let's try the most compatible formats first
    const types = [
      "audio/wav", // Universal compatibility
      "audio/mp4", // Good compatibility with OpenAI
      "audio/mpeg", // MP3 format, widely supported
      "audio/webm;codecs=opus", // Modern browsers, but last resort
      "audio/webm", // Fallback WebM
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        logger.info("Selected audio format for STT", "AudioRecorder", {
          mimeType: type,
          isSupported: true,
        });
        return type;
      }
    }

    // If nothing is supported, default to letting the browser choose
    logger.warn(
      "No preferred mime type supported, using browser default",
      "AudioRecorder",
    );
    return ""; // Let MediaRecorder choose
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.actualMimeType = "";
    this.isRecording = false;
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }
}

// Main STT Service class
export class STTService {
  provider: string;
  endpoint = "/api/stt";
  modelId = "whisper-1";
  apiKey = "";
  audioSettings: any;
  audioRecorder: AudioRecorder;

  constructor(settings: STTSettings) {
    this.provider = settings.sttProvider || "openai";

    if (this.provider === "openai") {
      // OpenAI settings - check for GPT-4o-mini-transcribe
      const modelId = settings.openaiSTT?.modelId || "whisper-1";
      if (modelId === "gpt-4o-mini-transcribe") {
        this.endpoint = "/api/stt/transcribe"; // New enhanced endpoint
        this.modelId = "gpt-4o-mini-transcribe";
      } else {
        this.endpoint = settings.openaiSTT?.endpoint || "/api/stt"; // Legacy endpoint
        this.modelId = modelId;
      }
      this.apiKey = settings.openaiSTT?.apiKey || ""; // Backend handles API key
    } else if (this.provider === "deepgram") {
      // Deepgram settings
      this.endpoint = settings.deepgramSTT?.endpoint || "/api/stt";
      this.modelId = settings.deepgramSTT?.modelId || "nova-3";
      this.apiKey = settings.deepgramSTT?.apiKey || ""; // Backend handles API key
    } else {
      throw new Error(`Unsupported STT provider: ${this.provider}`);
    }

    // Audio capture settings optimized for Pi Zero 2W (ARM Cortex-A53, 512MB RAM)
    this.audioSettings = {
      sampleRate: settings.audioSettings?.sampleRate || 8000, // Reduced from 16kHz to minimize CPU load
      channels: settings.audioSettings?.channels || 1,
      bitDepth: settings.audioSettings?.bitDepth || 16,
      format: settings.audioSettings?.format || "wav", // Prefer WAV for minimal CPU usage
      // Raspberry Pi Zero 2W specific optimizations
      bufferSize: 2048, // Smaller buffer for limited RAM
      maxDuration: 30, // Maximum 30 seconds recording
      silenceThreshold: 0.01,
      // WebM fallback settings (when WAV not supported)
      webmBitRate: 32000, // Very low bitrate to reduce CPU load
      ...settings.audioSettings,
    };

    this.audioRecorder = new AudioRecorder(this.audioSettings);

    logger.debug("STT Service initialized", "STTService", {
      provider: this.provider,
      modelId: this.modelId,
      audioSettings: this.audioSettings,
    });
  }

  // Start voice recording
  async startListening(): Promise<void> {
    try {
      await this.audioRecorder.startRecording();
    } catch (error) {
      logger.error("Failed to start listening", "STTService", {
        error: (error as Error)?.message,
      });
      throw error;
    }
  }

  // Stop recording and transcribe
  async stopListening(
    onProgress?: ProgressCallback,
  ): Promise<TranscriptionResult> {
    try {
      onProgress?.(10);

      // Stop recording and get audio blob
      const audioBlob = await this.audioRecorder.stopRecording();
      onProgress?.(30);

      // Validate audio
      if (audioBlob.size === 0) {
        throw new Error("Ses kaydı boş. Lütfen tekrar deneyin.");
      }

      // Check duration (basic validation)
      if (audioBlob.size < 1000) {
        // Very small file, likely silence
        throw new Error("Çok kısa ses kaydı. Lütfen daha uzun konuşun.");
      }

      onProgress?.(50);

      // Transcribe audio
      const result = await this.transcribeAudio(audioBlob, onProgress);
      onProgress?.(100);

      return result;
    } catch (error) {
      logger.error("Failed to stop listening and transcribe", "STTService", {
        error: (error as Error)?.message,
      });
      throw error;
    }
  }

  // Transcribe audio file or blob
  async transcribeAudio(
    audioData: Blob | File,
    onProgress?: ProgressCallback,
  ): Promise<TranscriptionResult> {
    try {
      if (!this.modelId) {
        throw new Error(
          "STT ayarları eksik. Lütfen model bilgisini kontrol edin.",
        );
      }

      onProgress?.(20);

      // Prepare form data for backend
      const formData = new FormData();

      // Convert blob to file if needed with proper MIME type handling
      let audioFile: File;
      if (audioData instanceof File) {
        audioFile = audioData;
      } else {
        // For recorded audio, ensure we have the correct MIME type and filename
        const originalMimeType = audioData.type || "audio/webm";
        const originalSize = audioData.size;

        logger.info("Original audio blob details", "STTService", {
          originalMimeType,
          originalSize,
          blobType: Object.prototype.toString.call(audioData),
        });

        // Convert audio to WAV for better OpenAI compatibility
        let finalBlob = audioData;
        let finalMimeType = originalMimeType;

        // For WebM or non-standard formats, convert to WAV
        if (
          originalMimeType.includes("webm") ||
          originalMimeType.includes("opus")
        ) {
          logger.info(
            "Converting audio to WAV for OpenAI compatibility",
            "STTService",
            {
              originalFormat: originalMimeType,
            },
          );

          try {
            // Convert to WAV format
            finalBlob = await AudioConverter.convertToWav(audioData);
            finalMimeType = "audio/wav";

            logger.info("Audio conversion successful", "STTService", {
              originalSize: originalSize,
              convertedSize: finalBlob.size,
              convertedType: finalMimeType,
            });
          } catch (conversionError) {
            logger.warn(
              "Audio conversion failed, using original format",
              "STTService",
              {
                error: (conversionError as Error)?.message,
              },
            );
            // Fallback to original format if conversion fails
            finalBlob = audioData;
            finalMimeType = originalMimeType;
          }
        }

        const extension = this.getFileExtension(finalMimeType);
        audioFile = new File([finalBlob], `recording${extension}`, {
          type: finalMimeType,
          lastModified: Date.now(),
        });
      }

      logger.info("Final audio file for transcription", "STTService", {
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileType: audioFile.type,
        provider: this.provider,
        model: this.modelId,
        endpoint: this.endpoint,
      });

      formData.append("audio", audioFile);
      formData.append("provider", this.provider);
      formData.append("model", this.modelId);
      formData.append("language", "tr"); // Turkish primary

      // Add provider-specific settings
      if (this.provider === "openai") {
        if (this.modelId === "gpt-4o-mini-transcribe") {
          formData.append("response_format", "json"); // Use 'json' format for gpt-4o-mini-transcribe
          formData.append("temperature", "0.1"); // Even lower for better accuracy
        } else {
          formData.append("response_format", "json");
          formData.append("temperature", "0.2"); // Lower temperature for better accuracy
        }
      } else if (this.provider === "deepgram") {
        formData.append("smart_format", "true");
        formData.append("interim_results", "false");
      }

      onProgress?.(40);

      logger.info("Starting STT transcription", "STTService", {
        provider: this.provider,
        model: this.modelId,
        endpoint: this.endpoint,
        fileSize: audioFile.size,
        fileType: audioFile.type,
        fileName: audioFile.name,
      });

      // Log FormData contents (for debugging)
      const formDataEntries: any = {};
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          formDataEntries[key] =
            `File: ${value.name} (${value.size} bytes, ${value.type})`;
        } else {
          formDataEntries[key] = value;
        }
      }
      logger.debug("FormData contents", "STTService", formDataEntries);

      // Send to backend proxy
      const response = await fetch(this.endpoint, {
        method: "POST",
        body: formData,
      });

      onProgress?.(80);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("STT API error", "STTService", {
          status: response.status,
          statusText: response.statusText,
          url: this.endpoint,
          error: errorText,
        });
        throw new Error(`STT API hatası (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      onProgress?.(95);

      // Extract transcription from response
      const result = this.extractTranscriptionFromResponse(data);
      onProgress?.(100);

      logger.debug("STT transcription completed", "STTService", {
        text: result.text.substring(0, 100) + "...",
        confidence: result.confidence,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      logger.error("STT transcription failed", "STTService", {
        error: (error as Error)?.message,
      });
      throw error;
    }
  }

  // Extract transcription from different provider responses
  private extractTranscriptionFromResponse(data: any): TranscriptionResult {
    // OpenAI GPT-4o-mini-transcribe enhanced format
    if (data.text && typeof data.text === "string") {
      return {
        text: data.text.trim(),
        confidence: data.confidence || 0.9, // GPT-4o-mini-transcribe typically high confidence
        language: data.language,
        duration: data.duration,
        segments: data.segments || [], // Word-level timing data
        model: data.model || this.modelId,
      };
    }

    // Deepgram format
    if (data.results?.channels) {
      const channel = data.results.channels[0];
      if (channel?.alternatives) {
        const alternative = channel.alternatives[0];
        return {
          text: alternative.transcript.trim(),
          confidence: alternative.confidence,
          language: data.results.language,
          duration: data.metadata?.duration,
        };
      }
    }

    // Generic format
    if (data.transcript) {
      return {
        text: data.transcript.trim(),
        confidence: data.confidence,
        language: data.language,
        duration: data.duration,
      };
    }

    // Azure format
    if (data.RecognitionStatus === "Success" && data.DisplayText) {
      return {
        text: data.DisplayText.trim(),
        confidence: data.Confidence,
        language: data.Language,
        duration: data.Duration,
      };
    }

    // Google format
    if (data.results && Array.isArray(data.results)) {
      const result = data.results[0];
      if (result?.alternatives) {
        const alternative = result.alternatives[0];
        return {
          text: alternative.transcript.trim(),
          confidence: alternative.confidence,
          language: data.language_code,
          duration: data.total_billed_time,
        };
      }
    }

    throw new Error(
      "STT yanıtından metin çıkarılamadı. API yanıt formatını kontrol edin.",
    );
  }

  // Check if microphone is available
  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      logger.warn("Microphone permission denied", "STTService", {
        error: (error as Error)?.message,
      });
      return false;
    }
  }

  // Get recording status
  isListening(): boolean {
    return this.audioRecorder.getRecordingStatus();
  }

  // Helper method to get file extension from MIME type
  private getFileExtension(mimeType: string): string {
    switch (mimeType.toLowerCase()) {
      case "audio/wav":
      case "audio/wave":
        return ".wav";
      case "audio/mp3":
      case "audio/mpeg":
        return ".mp3";
      case "audio/mp4":
      case "audio/m4a":
        return ".m4a";
      case "audio/webm":
      case "audio/webm;codecs=opus":
        return ".webm";
      case "audio/ogg":
      case "audio/ogg;codecs=opus":
        return ".ogg";
      default:
        return ".webm"; // Default to webm for unknown formats
    }
  }

  // Process voice commands for bedtime stories
  async processVoiceCommand(transcription: string): Promise<{
    intent: string;
    parameters: any;
    confidence: number;
  }> {
    // Use the new Turkish intent recognition system
    const { processTurkishVoiceCommand } = await import(
      "@/utils/intentRecognition"
    );

    const result = processTurkishVoiceCommand(transcription);

    return {
      intent: result.intent,
      parameters: result.parameters,
      confidence: result.confidence,
    };
  }

  // Clean up resources
  cleanup(): void {
    try {
      if (this.audioRecorder) {
        this.audioRecorder.cleanup();
      }
    } catch (error) {
      logger.warn("STT cleanup failed", "STTService", {
        error: (error as Error)?.message,
      });
    }
  }
}

// Enhanced STT Service for GPT-4o-mini-transcribe
export class GPT4oMiniSTTService extends STTService {
  constructor(settings: STTSettings) {
    super({
      ...settings,
      sttProvider: "openai",
      openaiSTT: {
        ...settings.openaiSTT,
        modelId: "gpt-4o-mini-transcribe",
        endpoint: "/api/stt/transcribe",
      },
      responseFormat: "verbose_json",
    });
  }

  async transcribeAudio(
    audioData: Blob | File,
    onProgress?: ProgressCallback,
  ): Promise<EnhancedTranscriptionResult> {
    const result = await super.transcribeAudio(audioData, onProgress);

    // Enhanced result with word-level timing and higher confidence
    return {
      ...result,
      segments: result.segments || [],
      wordTimings: result.segments || [],
      confidence: result.confidence || 0.9,
      model: "gpt-4o-mini-transcribe",
    } as EnhancedTranscriptionResult;
  }

  // Check if this is using the enhanced model
  isEnhancedModel(): boolean {
    return this.modelId === "gpt-4o-mini-transcribe";
  }

  // Get model capabilities
  getModelCapabilities(): {
    supportsWordTiming: boolean;
    supportsHighAccuracy: boolean;
    supportsTurkish: boolean;
    maxContextWindow: number;
  } {
    if (this.isEnhancedModel()) {
      return {
        supportsWordTiming: true,
        supportsHighAccuracy: true,
        supportsTurkish: true,
        maxContextWindow: 16000, // tokens
      };
    }

    return {
      supportsWordTiming: false,
      supportsHighAccuracy: false,
      supportsTurkish: true,
      maxContextWindow: 8000,
    };
  }

  /**
   * Get current service configuration
   * Logic: Returns the configuration settings used by the service
   */
  getConfig(): STTSettings & { modelId: string } {
    return {
      sttProvider: this.provider,
      model: this.modelId,
      modelId: this.modelId,
      language: "tr", // Default to Turkish
      openaiSTT: {
        endpoint: this.endpoint,
        modelId: this.modelId,
        apiKey: this.apiKey,
      },
      audioSettings: this.audioSettings,
    };
  }
}

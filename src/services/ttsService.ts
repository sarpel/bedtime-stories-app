import { config } from './configService'
import { audioCache } from '../utils/cache'
import optimizedDatabaseService from './optimizedDatabaseService'
import { logger } from '../utils/logger'
// Audio quality imports kaldırıldı - basit sabit format kullanılacak

interface VoiceSettings {
  speed?: number
  pitch?: number
  volume?: number
  stability?: number
  similarityBoost?: number
}

interface TTSSettings {
  ttsProvider?: string
  voiceId?: string
  elevenlabs?: {
    endpoint?: string
    modelId?: string
    voiceId?: string
    apiKey?: string
  }
  geminiTTS?: {
    endpoint?: string
    modelId?: string
    voiceId?: string
    apiKey?: string
  }
  voiceSettings?: VoiceSettings
}

interface ElevenLabsRequest {
  text: string
  model_id: string
  language_code: string
  voice_settings: {
    similarity_boost: number
    use_speaker_boost: boolean
    stability: number
    style: number
    speed: number
  }
}

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string
    }>
  }>
  generationConfig: {
    responseModalities: string[]
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: string
        }
      }
    }
  }
}

interface OpenAIRequest {
  model: string
  input: string
  voice: string
  response_format: string
  speed: number
}

interface VoiceOption {
  id: string
  name: string
}

type ProgressCallback = (progress: number) => void

// TTS Service for audio generation
export class TTSService {
  provider: string
  endpoint: string
  modelId: string
  voiceId: string
  apiKey: string
  voiceSettings: VoiceSettings

  constructor(settings: TTSSettings) {
    this.provider = settings.ttsProvider || 'elevenlabs'

    if (this.provider === 'elevenlabs') {
      // ElevenLabs ayarları
      this.endpoint = settings.elevenlabs?.endpoint || config.elevenlabs.endpoint
      this.modelId = settings.elevenlabs?.modelId || config.elevenlabs.model
      this.voiceId = settings.elevenlabs?.voiceId || settings.voiceId || config.elevenlabs.voiceId
      this.apiKey = settings.elevenlabs?.apiKey || config.elevenlabs.apiKey
    } else if (this.provider === 'gemini') {
      // Gemini TTS ayarları
      this.endpoint = settings.geminiTTS?.endpoint || config.geminiTTS.endpoint
      this.modelId = settings.geminiTTS?.modelId || config.geminiTTS.model
      this.voiceId = settings.geminiTTS?.voiceId || config.geminiTTS.voiceId
      this.apiKey = settings.geminiTTS?.apiKey || config.geminiTTS.apiKey
    } else {
      // Default fallback
      this.endpoint = config.elevenlabs.endpoint
      this.modelId = config.elevenlabs.model
      this.voiceId = settings.voiceId || config.elevenlabs.voiceId
      this.apiKey = config.elevenlabs.apiKey
    }

    // Kullanıcı ses ayarları
    this.voiceSettings = settings.voiceSettings || {
      speed: 0.9,
      pitch: 1.0,
      volume: 0.75,
      stability: 0.5,
      similarityBoost: 0.5
    }
  }

  // Generate audio from text using custom TTS endpoint
  async generateAudio(text: string, onProgress?: ProgressCallback, storyId?: string | null): Promise<string> {
    console.log(`🎵 [TTSService Debug] generateAudio called`)
    console.log(`🎵 [TTSService Debug] - provider: ${this.provider}`)
    console.log(`🎵 [TTSService Debug] - modelId: ${this.modelId}`)
    console.log(`🎵 [TTSService Debug] - voiceId: ${this.voiceId}`)
    console.log(`🎵 [TTSService Debug] - text length: ${text?.length || 0}`)
    console.log(`🎵 [TTSService Debug] - storyId: ${storyId}`)
    console.log(`🎵 [TTSService Debug] - text preview: "${text?.substring(0, 100) || 'EMPTY'}"`)

    try {
      // Model kontrolü
      if (!this.modelId || !this.voiceId) {
        console.error(`🎵 [TTSService Debug] Missing settings - modelId: ${this.modelId}, voiceId: ${this.voiceId}`)
        throw new Error(`${this.provider} ayarları eksik. Lütfen model ve ses bilgilerini kontrol edin.`)
      }

      if (!text || text.trim().length === 0) {
        console.error(`🎵 [TTSService Debug] No text provided for TTS`)
        throw new Error('Seslendirilecek metin bulunamadı.')
      }

      // API anahtarını istemciden istemiyoruz; anahtarlar sunucu tarafında tutulur

      // Eğer storyId varsa, önce veritabanından ses dosyasını kontrol et
      if (storyId) {
        try {
          const story = await optimizedDatabaseService.getStory(storyId);
          if (story && story.audio && story.audio.file_name) {
            const audioUrl = optimizedDatabaseService.getAudioUrl(story.audio.file_name);
            if (audioUrl) {
              onProgress?.(100);
              return audioUrl;
            }
          }
        } catch (dbError) {
          // Reduced logging for Pi Zero - only log occasionally
          if (Math.random() < 0.1) {
            logger.warn('Veritabanından ses dosyası alınamadı, yeni ses oluşturuluyor', 'TTSService', { error: (dbError as Error)?.message });
          }
        }
      }

      // Önbellekten kontrol et
      const cacheKey = `${this.provider}-${this.voiceId}-${this.modelId}`
      const cachedAudioUrl = audioCache.getAudio(text, cacheKey, { voiceSettings: this.voiceSettings })

      if (cachedAudioUrl) {
        onProgress?.(100)
        return cachedAudioUrl
      }

      onProgress?.(10)

      // URL artık istemcide oluşturulmayacak; backend allow-list ile belirler

      const requestBody = this.prepareRequestBody(text)
      onProgress?.(30)

      const requestPayload = {
        provider: this.provider,
        modelId: this.modelId,
        voiceId: this.voiceId,
        requestBody: requestBody,
        storyId: storyId
      }

      console.log('🔊 [TTSService] Request payload:', requestPayload)

      // İstek relative backend yoluna yapılıyor (Vite proxy/prod aynı origin)
      const response = await fetch(`/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      })

      onProgress?.(60)

      console.log('🔊 [TTSService] Response status:', response.status)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`TTS API hatası (${response.status}): ${errorText}`)
      }

      const audioBlob = await response.blob()
      onProgress?.(90)

      const audioUrl = URL.createObjectURL(audioBlob)
      onProgress?.(100)

      // Önbellekle
      audioCache.setAudio(text, cacheKey, { voiceSettings: this.voiceSettings }, audioUrl)

      return audioUrl

    } catch (error) {
      logger.error('TTS audio generation failed', 'TTSService', { error: (error as Error)?.message })
      throw error
    }
  }

  // Prepare request body for different TTS providers
  prepareRequestBody(text: string): ElevenLabsRequest | GeminiRequest | OpenAIRequest {
    if (this.provider === 'elevenlabs') {
      return {
        text: text,
        model_id: this.modelId || 'eleven_turbo_v2_5',
        language_code: 'tr',
        voice_settings: {
          similarity_boost: this.voiceSettings?.similarityBoost || 0.75,
          use_speaker_boost: false,
          stability: this.voiceSettings?.stability || 0.75,
          style: 0.0,
          speed: this.voiceSettings?.speed || 0.9
        }
      }
    } else if (this.provider === 'gemini') {
      return {
        contents: [{
          parts: [{
            text: text
          }]
        }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voiceId || 'Zephyr'
              }
            }
          }
        }
      }
    }

    // OpenAI format fallback
    return {
      model: this.modelId,
      input: text,
      voice: this.voiceId || 'alloy',
      response_format: 'mp3',
      speed: this.voiceSettings?.speed || 1.0
    }
  }

  // Extract audio URL from different response formats
  extractAudioFromResponse(data: any): string {
    // Direct URL response
    if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('data:'))) {
      return data
    }

    // Object with URL field
    if (data.url) {
      return data.url
    }

    if (data.audio_url) {
      return data.audio_url
    }

    if (data.audioUrl) {
      return data.audioUrl
    }

    // Base64 audio data
    if (data.audio) {
      if (data.audio.startsWith('data:')) {
        return data.audio
      } else {
        // Assume it's base64 without data URL prefix
        return `data:audio/mpeg;base64,${data.audio}`
      }
    }

    if (data.audioContent) {
      return `data:audio/mpeg;base64,${data.audioContent}`
    }

    // Google Cloud TTS format
    if (data.audioContent) {
      return `data:audio/mpeg;base64,${data.audioContent}`
    }

    // ElevenLabs format - returns audio stream, not base64
    // Audio is handled as blob in generateAudio method

    throw new Error('TTS yanıtından ses dosyası çıkarılamadı. API yanıt formatını kontrol edin.')
  }

  // Clean up audio URL when done
  static cleanupAudioUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }

  // Get supported voice options for different providers
  static getVoiceOptions(endpoint: string): VoiceOption[] {
    if (endpoint.includes('openai') || endpoint.includes('audio/speech')) {
      return [
        { id: 'alloy', name: 'Alloy (Nötr)' },
        { id: 'echo', name: 'Echo (Erkek)' },
        { id: 'fable', name: 'Fable (İngiliz)' },
        { id: 'onyx', name: 'Onyx (Erkek)' },
        { id: 'nova', name: 'Nova (Kadın)' },
        { id: 'shimmer', name: 'Shimmer (Kadın)' }
      ]
    }

    if (endpoint.includes('elevenlabs') || endpoint.includes('api.elevenlabs.io')) {
      return [
        { id: 'xsGHrtxT5AdDzYXTQT0d', name: 'Gönül Filiz (Kadın)' },
        { id: 'tjK3OIAY4lI4rHe3Ig84', name: 'Dilara ŞEKERCİ GÜRAY (Kadın)' },
        { id: 'NNn9dv8zq2kUo7d3JSGG', name: 'Derya (Kadın)' },
        { id: 'NsFK0aDGLbVusA7tQfOB', name: 'Irem (Kadın)' },
        { id: 'KAGDtM2gzDrjWlUp2KNe', name: 'Deniz (Kadın)' }  // Added from your example
      ]
    }

    if (endpoint.includes('cognitiveservices') || endpoint.includes('azure')) {
      return [
        { id: 'tr-TR-EmelNeural', name: 'Emel (Kadın)' },
        { id: 'tr-TR-AhmetNeural', name: 'Ahmet (Erkek)' }
      ]
    }

    if (endpoint.includes('googleapis') || endpoint.includes('google')) {
      return [
        { id: 'tr-TR-Wavenet-A', name: 'Türkçe Kadın A' },
        { id: 'tr-TR-Wavenet-B', name: 'Türkçe Erkek B' },
        { id: 'tr-TR-Wavenet-C', name: 'Türkçe Kadın C' },
        { id: 'tr-TR-Wavenet-D', name: 'Türkçe Erkek D' },
        { id: 'tr-TR-Wavenet-E', name: 'Türkçe Kadın E' }
      ]
    }

    return [
      { id: 'default', name: 'Varsayılan Ses' }
    ]
  }
}

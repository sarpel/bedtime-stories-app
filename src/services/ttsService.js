import { config } from './configService.js'
import { audioCache } from '../utils/cache.js'
import optimizedDatabaseService from './optimizedDatabaseService.js'
// Audio quality imports kaldırıldı - basit sabit format kullanılacak

// TTS Service for audio generation
export class TTSService {
  constructor(settings) {
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
  async generateAudio(text, onProgress, storyId = null) {
    try {
      // Model kontrolü
      if (!this.modelId || !this.voiceId) {
        throw new Error(`${this.provider} ayarları eksik. Lütfen model ve ses bilgilerini kontrol edin.`)
      }

      if (!text || text.trim().length === 0) {
        throw new Error('Seslendirilecek metin bulunamadı.')
      }

  // API anahtarını istemciden istemiyoruz; anahtarlar sunucu tarafında tutulur

      // Eğer storyId varsa, önce veritabanından ses dosyasını kontrol et
      if (storyId) {
        try {
          const story = await optimizedDatabaseService.getStory(storyId);
          if (story && story.audio && story.audio.file_name) {
            const audioUrl = optimizedDatabaseService.getAudioUrl(story.audio.file_name);
            onProgress?.(100);
            return audioUrl;
          }
        } catch (dbError) {
          // Reduced logging for Pi Zero - only log occasionally
          if (Math.random() < 0.1) {
            console.warn('Veritabanından ses dosyası alınamadı, yeni ses oluşturuluyor:', dbError);
          }
        }
      }

      // Önbellekten kontrol et
      const cacheKey = `${this.provider}-${this.voiceId}-${this.modelId}`
      const cachedAudioUrl = audioCache.getAudio(text, cacheKey, this.voiceSettings)
      
      if (cachedAudioUrl) {
        onProgress?.(100)
        return cachedAudioUrl
      }

      onProgress?.(10)

  // URL artık istemcide oluşturulmayacak; backend allow-list ile belirler

      const requestBody = this.prepareRequestBody(text)
      onProgress?.(30)

      // İstek artık kendi backend sunucumuza (localhost:3001) yapılıyor
      const response = await fetch('http://localhost:3001/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: this.provider,
          modelId: this.modelId,
          voiceId: this.voiceId,
          requestBody: requestBody,
          storyId: storyId
        })
      })

      onProgress?.(60)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`TTS API hatası (${response.status}): ${errorText}`)
      }

      const audioBlob = await response.blob()
      onProgress?.(90)
      
      const audioUrl = URL.createObjectURL(audioBlob)
      onProgress?.(100)
      
      // Önbellekle
      audioCache.setAudio(text, cacheKey, this.voiceSettings, audioUrl)
      
      return audioUrl

    } catch (error) {
      console.error('TTS audio generation error:', error)
      throw error
    }
  }

  // Prepare request body for different TTS providers
  prepareRequestBody(text) {
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
          speechConfig: {
            voiceConfig: {
              name: this.voiceId || 'Puck',
              languageCode: 'tr-TR'
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
  extractAudioFromResponse(data) {
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
  static cleanupAudioUrl(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }

  // Get supported voice options for different providers
  static getVoiceOptions(endpoint) {
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


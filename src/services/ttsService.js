import { config } from './configService.js'
import { audioCache } from '@/utils/cache.js'
// Audio quality imports kaldırıldı - basit sabit format kullanılacak

// TTS Service for audio generation
export class TTSService {
  constructor(settings) {
    // Sabit ElevenLabs ayarları
    this.endpoint = config.elevenlabs.endpoint
    this.modelId = config.elevenlabs.model
    this.voiceId = settings.voiceId || config.elevenlabs.voiceId
    this.apiKey = config.elevenlabs.apiKey
    
    // Kullanıcı ses ayarları
    this.voiceSettings = settings.voiceSettings
    // Audio quality kaldırıldı - sabit format kullanılacak
  }

  // Generate audio from text using custom TTS endpoint
  async generateAudio(text, onProgress, storyId = null) {
    try {
      // Sabit model kontrolü
      if (!this.endpoint || !this.modelId || !this.voiceId) {
        throw new Error('ElevenLabs ayarları eksik. Lütfen .env dosyasını kontrol edin.')
      }

      if (!text || text.trim().length === 0) {
        throw new Error('Seslendirilecek metin bulunamadı.')
      }

      // API anahtarı kontrolü
      if (!this.apiKey || this.apiKey === 'your-elevenlabs-api-key-here') {
        throw new Error('ElevenLabs API anahtarı eksik veya geçersiz. Lütfen .env dosyasında ELEVENLABS_API_KEY değerini ayarlayın.')
      }

      // Eğer storyId varsa, önce veritabanından ses dosyasını kontrol et
      if (storyId) {
        try {
          const databaseService = (await import('./optimizedDatabaseService.js')).default;
          const story = await databaseService.getStory(storyId);
          if (story && story.audio && story.audio.file_name) {
            const audioUrl = databaseService.getAudioUrl(story.audio.file_name);
            onProgress?.(100);
            return audioUrl;
          }
        } catch (dbError) {
          console.warn('Veritabanından ses dosyası alınamadı, yeni ses oluşturuluyor:', dbError);
        }
      }

      // Önbellekten kontrol et
      const cachedAudioUrl = audioCache.getAudio(text, this.voiceId, this.voiceSettings)
      
      if (cachedAudioUrl) {
        onProgress?.(100)
        return cachedAudioUrl
      }

      onProgress?.(10)

      // --- Sabit audio format kullanımı ---
      // Karmaşık audio quality seçenekleri kaldırıldı
      // Sabit ve güvenilir format: mp3_44100_128 (standart kalite)
      const audioFormat = 'mp3_44100_128'
      const fullUrl = `${this.endpoint}/${this.voiceId}?output_format=${audioFormat}`;
      // --- Sabit format kullanımı sonu ---

      const requestBody = this.prepareRequestBody(text)
      onProgress?.(30)

      // İstek artık kendi backend sunucumuza (localhost:3001) yapılıyor
      const response = await fetch('http://localhost:3001/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Backend'e endpoint'i ve hazır requestBody'yi gönderiyoruz
        // DİKKAT: Backend'e artık birleştirilmiş ve tam olan URL'yi gönderiyoruz.
        body: JSON.stringify({
          endpoint: fullUrl, // Değişiklik burada!
          requestBody: requestBody,
          storyId: storyId // Story ID'si eklendi
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
      audioCache.setAudio(text, this.voiceId, this.voiceSettings, audioUrl)
      
      return audioUrl

    } catch (error) {
      console.error('TTS audio generation error:', error)
      throw error
    }
  }

  // Prepare request body for different TTS providers
  prepareRequestBody(text) {
    // OpenAI TTS format
    if (this.endpoint.includes('audio/speech') || this.endpoint.includes('v1/audio')) {
      return {
        model: this.modelId,
        input: text,
        voice: this.voiceId || 'alloy',
        response_format: 'mp3',
        speed: this.voiceSettings.speed || 1.0
      }
    }
    
		// ElevenLabs format - check both original endpoint and constructed URL
		if (this.endpoint.includes('elevenlabs') || this.endpoint.includes('v1/text-to-speech') || 
		    (this.endpoint && this.voiceId && this.endpoint.includes('api.elevenlabs.io'))) {
			return {
				text: text,
				model_id: this.modelId || 'eleven_turbo_v2_5',
				language_code: 'tr',
				voice_settings: {
					similarity_boost: 0.75,   // Yüksek benzerlik
					use_speaker_boost: false,   // Ses netliğini artırmak için bu ayar genellikle 'true' kalmalı
					stability: 0.75,          // Yüksek istikrar
					style: 0.0,               // Sıfır stil/vurgu
					speed: this.voiceSettings?.speed || 0.9  // Kullanıcının ayarladığı hız
				}
			}
		}

    // Azure Cognitive Services format
    if (this.endpoint.includes('cognitiveservices') || this.endpoint.includes('tts/cognitiveservices')) {
      return {
        text: text,
        voice: this.voiceId,
        outputFormat: 'audio-16khz-128kbitrate-mono-mp3',
        rate: this.voiceSettings.speed ? `${(this.voiceSettings.speed - 1) * 50}%` : '0%',
        pitch: this.voiceSettings.pitch ? `${(this.voiceSettings.pitch - 1) * 50}%` : '0%'
      }
    }

    // Google Cloud TTS format
    if (this.endpoint.includes('texttospeech') || this.endpoint.includes('googleapis')) {
      return {
        input: { text: text },
        voice: {
          languageCode: 'tr-TR',
          name: this.voiceId || 'tr-TR-Wavenet-E',
          ssmlGender: 'FEMALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: this.voiceSettings.speed || 1.0,
          pitch: this.voiceSettings.pitch ? (this.voiceSettings.pitch - 1) * 20 : 0,
          volumeGainDb: this.voiceSettings.volume ? (this.voiceSettings.volume - 0.5) * 20 : 0
        }
      }
    }

    // Generic/Custom format
    return {
      text: text,
      model: this.modelId,
      voice: this.voiceId,
      format: 'mp3',
      speed: this.voiceSettings.speed || 1.0,
      pitch: this.voiceSettings.pitch || 1.0,
      volume: this.voiceSettings.volume || 0.8
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


// TTS Service for audio generation
export class TTSService {
  constructor(settings) {
    this.endpoint = settings.ttsEndpoint
    this.modelId = settings.ttsModelId
    this.voiceId = settings.voiceId
    this.apiKey = settings.ttsApiKey
    this.voiceSettings = settings.voiceSettings
  }

  // Generate audio from text using custom TTS endpoint
  async generateAudio(text, onProgress) {
    try {
      // Validate settings
      if (!this.endpoint || !this.modelId || !this.apiKey) {
        throw new Error('TTS ayarları eksik. Lütfen ayarlar panelinden endpoint, model ID ve API anahtarını yapılandırın.')
      }

      if (!text || text.trim().length === 0) {
        throw new Error('Seslendirilecek metin bulunamadı.')
      }

      onProgress?.(10)

      // Prepare request based on common TTS API formats
      const requestBody = this.prepareRequestBody(text)
      
      onProgress?.(30)

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'BedtimeStories/1.0',
          'Accept': 'audio/mpeg, audio/wav, audio/ogg, application/json'
        },
        body: JSON.stringify(requestBody)
      })

      onProgress?.(60)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`TTS API hatası (${response.status}): ${errorText}`)
      }

      // Check if response is audio or JSON
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('audio/')) {
        // Direct audio response
        const audioBlob = await response.blob()
        onProgress?.(90)
        
        const audioUrl = URL.createObjectURL(audioBlob)
        onProgress?.(100)
        
        return audioUrl
      } else {
        // JSON response with audio URL or base64
        const data = await response.json()
        onProgress?.(80)
        
        const audioUrl = this.extractAudioFromResponse(data)
        onProgress?.(100)
        
        return audioUrl
      }

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
    
    // ElevenLabs format
    if (this.endpoint.includes('elevenlabs') || this.endpoint.includes('v1/text-to-speech')) {
      return {
        text: text,
        model_id: this.modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
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

    // ElevenLabs format (sometimes returns direct base64)
    if (typeof data === 'string' && data.length > 100) {
      return `data:audio/mpeg;base64,${data}`
    }

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

    if (endpoint.includes('elevenlabs')) {
      return [
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Kadın)' },
        { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Erkek)' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Erkek)' },
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Erkek)' }
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


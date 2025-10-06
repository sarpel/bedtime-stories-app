// Configuration service for environment variables and fixed models

// Production modunda backend proxy kullanılır - API anahtarları frontend'de tutulmaz
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production'

export const config = {
  // OpenAI Configuration - Production'da backend proxy kullan
  openai: {
    apiKey: isProduction ? '' : (import.meta.env.VITE_OPENAI_API_KEY || ''),
    model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-5-nano',
    endpoint: isProduction ? '/api/llm' : (import.meta.env.VITE_OPENAI_ENDPOINT || '/api/llm')
  },

  // ElevenLabs Configuration - Production'da backend proxy kullan
  elevenlabs: {
    apiKey: isProduction ? '' : (import.meta.env.VITE_ELEVENLABS_API_KEY || ''),
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'xsGHrtxT5AdDzYXTQT0d',
    model: import.meta.env.VITE_ELEVENLABS_MODEL || 'eleven_turbo_v2_5',
    endpoint: isProduction ? '/api/tts' : (import.meta.env.VITE_ELEVENLABS_ENDPOINT || '/api/tts')
  },

  // Gemini LLM Configuration - Production'da backend proxy kullan
  geminiLLM: {
    apiKey: isProduction ? '' : (import.meta.env.VITE_GEMINI_LLM_API_KEY || ''),
    model: import.meta.env.VITE_GEMINI_LLM_MODEL || 'gemini-2.5-flash-lite',
    endpoint: isProduction ? '/api/llm' : (import.meta.env.VITE_GEMINI_LLM_ENDPOINT || '/api/llm')
  },

  // Gemini TTS Configuration - Production'da backend proxy kullan
  geminiTTS: {
    apiKey: isProduction ? '' : (import.meta.env.VITE_GEMINI_TTS_API_KEY || ''),
    model: import.meta.env.VITE_GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
    voiceId: import.meta.env.VITE_GEMINI_TTS_VOICE || 'Zephyr',
    endpoint: isProduction ? '/api/tts' : (import.meta.env.VITE_GEMINI_TTS_ENDPOINT || '/api/tts')
  },

  // Backend Configuration
  backend: {
    url: import.meta.env.VITE_BACKEND_URL || ''
  }
}

// Validate required environment variables - Production'da backend kontrol eder
export const validateConfig = () => {
  const errors = []

  // Production'da API anahtarları backend'de tutuluyor
  if (!isProduction) {
    if (!config.openai.apiKey) {
      errors.push('OpenAI API anahtarı eksik (.env dosyasında VITE_OPENAI_API_KEY)')
    }

    if (!config.elevenlabs.apiKey) {
      errors.push('ElevenLabs API anahtarı eksik (.env dosyasında VITE_ELEVENLABS_API_KEY)')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Get default settings with configurable models
export const getDefaultSettings = () => ({
  // LLM Provider Selection
  llmProvider: 'openai', // 'openai' or 'gemini'

  // OpenAI LLM Settings
  openaiLLM: {
    endpoint: config.openai.endpoint,
    modelId: config.openai.model,
    apiKey: config.openai.apiKey
  },

  // Gemini LLM Settings
  geminiLLM: {
    endpoint: config.geminiLLM.endpoint,
    modelId: config.geminiLLM.model,
    apiKey: config.geminiLLM.apiKey
  },

  // Legacy LLM compatibility
  llmEndpoint: config.openai.endpoint,
  llmModelId: config.openai.model,
  llmApiKey: config.openai.apiKey,

  // TTS Provider Selection
  ttsProvider: 'elevenlabs', // 'elevenlabs' or 'gemini'

  // ElevenLabs Settings
  elevenlabs: {
    endpoint: config.elevenlabs.endpoint,
    modelId: config.elevenlabs.model,
    voiceId: config.elevenlabs.voiceId,
    apiKey: config.elevenlabs.apiKey
  },

  // Gemini TTS Settings
  geminiTTS: {
    endpoint: config.geminiTTS.endpoint,
    modelId: config.geminiTTS.model,
    voiceId: config.geminiTTS.voiceId,
    apiKey: config.geminiTTS.apiKey
  },

  // Legacy TTS compatibility
  ttsEndpoint: config.elevenlabs.endpoint,
  ttsModelId: config.elevenlabs.model,
  voiceId: config.elevenlabs.voiceId,
  ttsApiKey: config.elevenlabs.apiKey,

  // User Configurable Settings
  customPrompt: '5 yaşındaki bir türk kız çocuğu için uyku vaktinde okunmak üzere, uyku getirici ve kazanması istenen temel erdemleri de ders niteliğinde hikayelere iliştirecek şekilde masal yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.',
  customInstructions: '',
  storyLength: 'short',
  theme: 'system', // 'light', 'dark', or 'system'
  voiceSettings: {
    speed: 0.9,
    pitch: 1.0,
    volume: 0.75,
    stability: 0.5,
    similarityBoost: 0.5
  },
  llmSettings: {
    temperature: 0.9,
    maxTokens: 5000
  },
  sttSettings: {
    provider: 'openai',
    model: 'whisper-1',
    wakeWordEnabled: false,
    wakeWordModel: './hey-elsa.ppn',
    wakeWordSensitivity: 'medium',
    continuousListening: false,
    responseFormat: 'verbose_json',
    language: 'tr'
  }
})

// Check if configuration is ready - Production'da backend kontrol eder
export const isConfigReady = () => {
  // Production'da her zaman true döndür - backend kontrol edecek
  if (isProduction) {
    return true
  }

  const validation = validateConfig()
  return validation.isValid
}

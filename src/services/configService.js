// Configuration service for environment variables and fixed models

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
    endpoint: import.meta.env.VITE_OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions'
  },

  // ElevenLabs Configuration
  elevenlabs: {
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'xsGHrtxT5AdDzYXTQT0d',
    model: import.meta.env.VITE_ELEVENLABS_MODEL || 'eleven_turbo_v2_5',
    endpoint: import.meta.env.VITE_ELEVENLABS_ENDPOINT || 'https://api.elevenlabs.io/v1/text-to-speech'
  },

  // Gemini LLM Configuration
  geminiLLM: {
    apiKey: import.meta.env.VITE_GEMINI_LLM_API_KEY,
    model: import.meta.env.VITE_GEMINI_LLM_MODEL || 'gemini-2.0-flash-thinking-exp-1219',
    endpoint: import.meta.env.VITE_GEMINI_LLM_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/models'
  },

  // Gemini TTS Configuration
  geminiTTS: {
    apiKey: import.meta.env.VITE_GEMINI_TTS_API_KEY,
    model: import.meta.env.VITE_GEMINI_TTS_MODEL || 'gemini-2.0-flash-thinking-exp-1219',
    voiceId: import.meta.env.VITE_GEMINI_TTS_VOICE_ID || 'Puck',
    endpoint: import.meta.env.VITE_GEMINI_TTS_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/models'
  },

  // Backend Configuration
  backend: {
    url: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
  }
}

// Validate required environment variables
export const validateConfig = () => {
  const errors = []

  if (!config.openai.apiKey) {
    errors.push('OpenAI API anahtarı eksik (.env dosyasında VITE_OPENAI_API_KEY)')
  }

  if (!config.elevenlabs.apiKey) {
    errors.push('ElevenLabs API anahtarı eksik (.env dosyasında VITE_ELEVENLABS_API_KEY)')
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
  storyLength: 'medium',
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
  }
})

// Check if configuration is ready
export const isConfigReady = () => {
  const validation = validateConfig()
  return validation.isValid
}

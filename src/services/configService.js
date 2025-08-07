// Configuration service for environment variables and fixed models

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4.1-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  
  // ElevenLabs Configuration
  elevenlabs: {
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'xsGHrtxT5AdDzYXTQT0d',
    model: import.meta.env.VITE_ELEVENLABS_MODEL || 'eleven_turbo_v2_5',
    endpoint: 'https://api.elevenlabs.io/v1/text-to-speech'
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

// Get default settings with fixed models
export const getDefaultSettings = () => ({
  // LLM Settings (Fixed)
  llmEndpoint: config.openai.endpoint,
  llmModelId: config.openai.model,
  llmApiKey: config.openai.apiKey,
  
  // TTS Settings (Fixed)
  ttsEndpoint: config.elevenlabs.endpoint,
  ttsModelId: config.elevenlabs.model,
  voiceId: config.elevenlabs.voiceId,
  ttsApiKey: config.elevenlabs.apiKey,
  
  // User Configurable Settings
  customPrompt: '5 yaşındaki bir türk kız çocuğu için uyku vaktinde okunmak üzere, uyku getirici ve kazanması istenen temel erdemleri de ders niteliğinde hikayelere iliştirecek şekilde masal yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.',
  storyLength: 'medium',
  audioQuality: 'high', // Default to high quality
  backgroundMusic: 'none', // Default to no background music
  backgroundMusicVolume: 0.15, // Default background music volume
  voiceSettings: {
    speed: 0.9,
    pitch: 1.0,
    volume: 0.75
  },
  llmSettings: {
    temperature: 0.7,
    maxTokens: 600
  }
})

// Check if configuration is ready
export const isConfigReady = () => {
  const validation = validateConfig()
  return validation.isValid
}
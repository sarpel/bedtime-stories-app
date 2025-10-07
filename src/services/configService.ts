// Configuration service for environment variables and fixed models

/**
 * SECURITY ARCHITECTURE:
 * - API keys are NEVER stored in frontend code or environment variables
 * - All API requests MUST go through backend proxy endpoints (/api/llm, /api/tts)
 * - Backend reads API keys from backend/.env at runtime
 * - Frontend only stores non-sensitive configuration (models, voices, endpoints)
 *
 * WHY THIS MATTERS:
 * - Frontend env vars (VITE_*) are baked into the build at compile time
 * - Anyone can inspect the JavaScript bundle and extract API keys
 * - Different deployment environments would require rebuilding the entire app
 * - Backend proxy allows runtime configuration without rebuilding
 */

export const config = {
  // OpenAI Configuration - ALWAYS use backend proxy
  openai: {
    // API key is stored in backend/.env, NEVER exposed to frontend
    apiKey: "",
    model: import.meta.env.VITE_OPENAI_MODEL || "gpt-5-nano",
    // Always use relative proxy endpoint so it works on any domain
    endpoint: "/api/llm",
  },

  // ElevenLabs Configuration - ALWAYS use backend proxy
  elevenlabs: {
    // API key is stored in backend/.env, NEVER exposed to frontend
    apiKey: "",
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || "xsGHrtxT5AdDzYXTQT0d",
    model: import.meta.env.VITE_ELEVENLABS_MODEL || "eleven_turbo_v2_5",
    // Always use relative proxy endpoint so it works on any domain
    endpoint: "/api/tts",
  },

  // Gemini LLM Configuration - ALWAYS use backend proxy
  geminiLLM: {
    // API key is stored in backend/.env, NEVER exposed to frontend
    apiKey: "",
    model: import.meta.env.VITE_GEMINI_LLM_MODEL || "gemini-2.5-flash-lite",
    // Always use relative proxy endpoint so it works on any domain
    endpoint: "/api/llm",
  },

  // Gemini TTS Configuration - ALWAYS use backend proxy
  geminiTTS: {
    // API key is stored in backend/.env, NEVER exposed to frontend
    apiKey: "",
    model:
      import.meta.env.VITE_GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts",
    voiceId: import.meta.env.VITE_GEMINI_TTS_VOICE || "Zephyr",
    // Always use relative proxy endpoint so it works on any domain
    endpoint: "/api/tts",
  },

  // Backend Configuration
  // VITE_BACKEND_URL is only used for development when frontend/backend run on different ports
  // In production, they're served from the same origin, so relative URLs work
  backend: {
    url: import.meta.env.VITE_BACKEND_URL || "",
  },
};

/**
 * Validate required environment variables
 *
 * NOTE: API keys are validated by the backend, not the frontend.
 * Frontend validation only checks for configuration completeness.
 */
export const validateConfig = () => {
  const errors: string[] = [];

  // Frontend only validates non-sensitive configuration
  // API key validation happens on the backend where keys are actually stored

  // No validation needed here since all API keys are backend-only
  // The backend will return appropriate errors if keys are missing

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Get default settings with configurable models
export const getDefaultSettings = () => ({
  // LLM Provider Selection
  llmProvider: "gemini", // 'openai' or 'gemini'

  // OpenAI LLM Settings
  openaiLLM: {
    endpoint: config.openai.endpoint,
    modelId: config.openai.model,
    apiKey: config.openai.apiKey, // Always empty string, backend handles real key
  },

  // Gemini LLM Settings
  geminiLLM: {
    endpoint: config.geminiLLM.endpoint,
    modelId: config.geminiLLM.model,
    apiKey: config.geminiLLM.apiKey, // Always empty string, backend handles real key
  },

  // Legacy LLM compatibility
  llmEndpoint: config.geminiLLM.endpoint,
  llmModelId: config.geminiLLM.model,
  llmApiKey: config.geminiLLM.apiKey, // Always empty string, backend handles real key

  // TTS Provider Selection
  ttsProvider: "gemini", // 'elevenlabs' or 'gemini'

  // ElevenLabs Settings
  elevenlabs: {
    endpoint: config.elevenlabs.endpoint,
    modelId: config.elevenlabs.model,
    voiceId: config.elevenlabs.voiceId,
    apiKey: config.elevenlabs.apiKey, // Always empty string, backend handles real key
  },

  // Gemini TTS Settings
  geminiTTS: {
    endpoint: config.geminiTTS.endpoint,
    modelId: config.geminiTTS.model,
    voiceId: config.geminiTTS.voiceId,
    apiKey: config.geminiTTS.apiKey, // Always empty string, backend handles real key
  },

  // Legacy TTS compatibility
  ttsEndpoint: config.geminiTTS.endpoint,
  ttsModelId: config.geminiTTS.model,
  voiceId: config.geminiTTS.voiceId,
  ttsApiKey: config.geminiTTS.apiKey, // Always empty string, backend handles real key

  // User Configurable Settings
  customPrompt:
    "5 yaşındaki bir türk kız çocuğu için uyku vaktinde okunmak üzere, uyku getirici ve kazanması istenen temel erdemleri de ders niteliğinde hikayelere iliştirecek şekilde masal yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.",
  customInstructions: "",
  storyLength: "short",
  theme: "system", // 'light', 'dark', or 'system'
  voiceSettings: {
    speed: 0.9,
    pitch: 1.0,
    volume: 0.75,
    stability: 0.5,
    similarityBoost: 0.5,
  },
  llmSettings: {
    temperature: 0.9,
    maxTokens: 5000,
  },
  sttSettings: {
    provider: "openai",
    model: "whisper-1",
    wakeWordEnabled: false,
    wakeWordModel: "./hey-elsa.ppn",
    wakeWordSensitivity: "medium",
    continuousListening: false,
    responseFormat: "verbose_json",
    language: "tr",
  },
});

/**
 * Check if configuration is ready for use
 *
 * In the current architecture, API keys are managed by the backend,
 * so frontend configuration is always "ready". The backend will return
 * appropriate errors if API keys are missing or invalid.
 */
export const isConfigReady = () => {
  // Always return true - backend handles API key validation
  // Frontend configuration is always ready since it only contains
  // non-sensitive settings like models, voices, and proxy endpoints
  return true;
};

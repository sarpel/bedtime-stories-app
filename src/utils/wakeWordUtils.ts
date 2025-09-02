/**
 * Utility functions for Wake Word detection and platform compatibility
 */

export interface WakeWordValidationResult {
  isValid: boolean;
  platform: string;
  error?: string;
  suggestedAction?: string;
}

/**
 * Validates if the current environment can support wake word detection
 */
export function validateWakeWordEnvironment(): WakeWordValidationResult {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return {
      isValid: false,
      platform: 'server',
      error: 'Wake word detection is not available on server-side',
      suggestedAction: 'Wake word detection only works in browser environments'
    };
  }

  // Check for required Web APIs
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      isValid: false,
      platform: 'web-incompatible',
      error: 'Microphone access not available',
      suggestedAction: 'Enable microphone permissions or use a compatible browser'
    };
  }

  // Check for Web Audio API
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    return {
      isValid: false,
      platform: 'web-no-audio',
      error: 'Web Audio API not supported',
      suggestedAction: 'Use a modern browser that supports Web Audio API'
    };
  }

  return {
    isValid: true,
    platform: 'web'
  };
}

/**
 * Gets the expected .ppn file platform identifier for the current environment
 */
export function getExpectedPlatform(): string {
  const validation = validateWakeWordEnvironment();

  if (validation.isValid) {
    return 'Web (WASM)';
  }

  return validation.platform;
}

/**
 * Provides helpful error messages based on common wake word issues
 */
export function getWakeWordErrorGuidance(error: string): {
  userMessage: string;
  technicalDetails: string;
  suggestedActions: string[];
} {
  if (error.includes('INVALID_ARGUMENT') && error.includes('different platform')) {
    return {
      userMessage: 'The wake word model is not compatible with web browsers',
      technicalDetails: 'The .ppn file was created for a different platform (like mobile or desktop)',
      suggestedActions: [
        'Visit https://console.picovoice.ai/',
        'Create a new "Hey Elsa" wake word model',
        'Select "Web (WASM)" as the target platform',
        'Download and replace the hey-elsa.ppn file',
        'Or temporarily disable wake word detection'
      ]
    };
  }

  if (error.includes('Access key')) {
    return {
      userMessage: 'Invalid or missing Picovoice access key',
      technicalDetails: 'VITE_PICOVOICE_ACCESS_KEY is not configured or invalid',
      suggestedActions: [
        'Get your access key from https://console.picovoice.ai/',
        'Add VITE_PICOVOICE_ACCESS_KEY to your .env file',
        'Restart the development server'
      ]
    };
  }

  if (error.includes('microphone') || error.includes('getUserMedia')) {
    return {
      userMessage: 'Microphone access is required for wake word detection',
      technicalDetails: 'Browser denied microphone permissions or microphone is not available',
      suggestedActions: [
        'Allow microphone access when prompted',
        'Check browser permissions for this site',
        'Ensure a microphone is connected and working',
        'Try refreshing the page'
      ]
    };
  }

  // Generic error
  return {
    userMessage: 'Wake word detection encountered an error',
    technicalDetails: error,
    suggestedActions: [
      'Check browser console for more details',
      'Try refreshing the page',
      'Temporarily disable wake word detection',
      'Check if microphone permissions are granted'
    ]
  };
}

/**
 * Creates a user-friendly configuration object for wake word settings
 */
export interface WakeWordSettings {
  enabled: boolean;
  modelPath: string;
  sensitivity: 'low' | 'medium' | 'high';
  phrase: string;
  platformValid: boolean;
  errorGuidance?: ReturnType<typeof getWakeWordErrorGuidance>;
}

export function createWakeWordSettings(
  enabled: boolean = false,
  modelPath: string = './hey-elsa.ppn',
  sensitivity: 'low' | 'medium' | 'high' = 'medium'
): WakeWordSettings {
  const validation = validateWakeWordEnvironment();

  return {
    enabled: enabled && validation.isValid,
    modelPath,
    sensitivity,
    phrase: 'Hey Elsa',
    platformValid: validation.isValid,
    errorGuidance: validation.error ? getWakeWordErrorGuidance(validation.error) : undefined
  };
}

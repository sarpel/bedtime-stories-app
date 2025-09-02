import { useEffect, useState, useRef, useCallback } from 'react';
import { PorcupineWorker } from '@picovoice/porcupine-web';
import { WebVoiceProcessor } from '@picovoice/web-voice-processor';
import { logger } from '@/utils/logger';

/**
 * Custom hook for Porcupine wake word detection using Web SDK
 * Purpose: Provides a React-friendly interface to Porcupine wake word detection
 *
 * Logic Flow:
 * 1. Load .ppn file as ArrayBuffer and convert to base64
 * 2. Initialize PorcupineWorker with Web model
 * 3. Subscribe to WebVoiceProcessor for audio processing
 * 4. Handle wake word detection callbacks
 * 5. Manage listening state and error handling
 *
 * Key Changes from React SDK:
 * - Uses @picovoice/porcupine-web instead of @picovoice/porcupine-react
 * - Manually handles ArrayBuffer to base64 conversion
 * - Uses WebVoiceProcessor for audio subscription
 * - Implements proper cleanup and state management
 */

interface UsePorcupineWakeWordConfig {
  accessKey: string;
  keywordPath: string;
  sensitivity?: number;
  onWakeWordDetected?: () => void;
  enabled?: boolean;
}

interface UsePorcupineWakeWordReturn {
  isLoaded: boolean;
  isListening: boolean;
  error: string | null;
  keywordDetected: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  toggleListening: () => Promise<void>;
  resetKeywordDetected: () => void;
  clearCache: () => Promise<void>;
}

/**
 * Convert ArrayBuffer to base64 string
 * Logic: Required for Web SDK to process .ppn files
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const usePorcupineWakeWord = ({
  accessKey,
  keywordPath,
  sensitivity = 0.5,
  onWakeWordDetected,
  enabled = true
}: UsePorcupineWakeWordConfig): UsePorcupineWakeWordReturn => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywordDetected, setKeywordDetected] = useState(false);

  // Use refs to prevent double initialization and maintain instances
  const porcupineRef = useRef<PorcupineWorker | null>(null);
  const initializingRef = useRef(false);
  const subscribedRef = useRef(false);

  // Keyword detection callback
  const keywordDetectionCallback = useCallback((detection: any) => {
    logger.info('Wake word detected via Web SDK', 'usePorcupineWakeWord', {
      label: detection.label,
      confidence: detection.confidence
    });

    setKeywordDetected(true);

    if (onWakeWordDetected) {
      onWakeWordDetected();
    }
  }, [onWakeWordDetected]);

  // Clear browser cache for wake word models
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      logger.info('Clearing Porcupine wake word cache', 'usePorcupineWakeWord');

      // Stop listening if currently active
      if (isListening && porcupineRef.current) {
        await WebVoiceProcessor.unsubscribe(porcupineRef.current);
        setIsListening(false);
        subscribedRef.current = false;
      }

      // Release current Porcupine instance
      if (porcupineRef.current) {
        porcupineRef.current.release();
        porcupineRef.current.terminate();
        porcupineRef.current = null;
        setIsLoaded(false);
      }

      // Clear IndexedDB and Cache API
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();

        for (const db of databases) {
          if (db.name?.includes('porcupine') || db.name?.includes('picovoice')) {
            logger.info('Clearing Porcupine IndexedDB cache', 'usePorcupineWakeWord', {
              database: db.name
            });

            const deleteReq = indexedDB.deleteDatabase(db.name);
            await new Promise((resolve, reject) => {
              deleteReq.onsuccess = () => resolve(undefined);
              deleteReq.onerror = () => reject(deleteReq.error);
            });
          }
        }
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();

        for (const cacheName of cacheNames) {
          if (cacheName.includes('porcupine') || cacheName.includes('picovoice') || cacheName.includes('ppn')) {
            await caches.delete(cacheName);
          }
        }
      }

      logger.info('Porcupine cache cleared successfully', 'usePorcupineWakeWord');

    } catch (cacheError) {
      logger.error('Failed to clear Porcupine cache', 'usePorcupineWakeWord', {
        error: (cacheError as Error)?.message
      });
      throw cacheError;
    }
  }, [isListening]);

  // Initialize Porcupine
  const initializePorcupine = useCallback(async () => {
    if (initializingRef.current || !enabled || !accessKey) {
      return;
    }

    // Generate cache-busted URL for .ppn file
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const cacheBustedKeywordPath = `${keywordPath}?v=${timestamp}&r=${random}`;

    try {
      initializingRef.current = true;
      setError(null);

      logger.info('Initializing Porcupine Web SDK', 'usePorcupineWakeWord', {
        keywordPath,
        sensitivity,
        accessKey: accessKey.substring(0, 8) + '...'
      });

      // Fetch .ppn file as ArrayBuffer with no-cache
      const response = await fetch(cacheBustedKeywordPath, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch keyword file: ${response.status} ${response.statusText}`);
      }

      const ppnBuffer = await response.arrayBuffer();
      const keywordBase64 = arrayBufferToBase64(ppnBuffer);

      logger.debug('Keyword file loaded successfully', 'usePorcupineWakeWord', {
        size: ppnBuffer.byteLength,
        url: cacheBustedKeywordPath
      });

      // Create PorcupineWorker instance
      const porcupine = await PorcupineWorker.create(
        accessKey,
        [{
          base64: keywordBase64,
          label: 'hey-elsa'
        }],
        keywordDetectionCallback,
        { publicPath: '/porcupine/porcupine_params.pv' }
      );

      porcupineRef.current = porcupine;
      setIsLoaded(true);
      setError(null);

      logger.info('Porcupine Web SDK initialized successfully', 'usePorcupineWakeWord');

    } catch (initError) {
      const errorMessage = (initError as Error)?.message || 'Unknown error';

      // Check for platform compatibility error
      if (errorMessage.includes('INVALID_ARGUMENT') ||
          errorMessage.includes('incorrect format') ||
          errorMessage.includes('different platform') ||
          errorMessage.includes('Loading keyword file') ||
          errorMessage.includes('code `00000136`')) {

        const platformError = 'Platform compatibility error: The .ppn file may be cached or incompatible with Web (WASM). ' +
                             'Please ensure you have the correct Web (WASM) compatible .ppn file and try clearing cache.';
        setError(platformError);

        logger.error('Wake word model platform/cache issue', 'usePorcupineWakeWord', {
          error: errorMessage,
          solution: 'Use Web (WASM) compatible .ppn file and clear browser cache',
          url: 'https://console.picovoice.ai/',
          currentModelPath: keywordPath,
          cacheBustedPath: cacheBustedKeywordPath
        });
      } else {
        setError(errorMessage);

        logger.error('Failed to initialize Porcupine Web SDK', 'usePorcupineWakeWord', {
          error: errorMessage,
          keywordPath
        });
      }
    } finally {
      initializingRef.current = false;
    }
  }, [accessKey, keywordPath, sensitivity, enabled, keywordDetectionCallback]);

  // Start listening for wake words
  const startListening = useCallback(async (): Promise<void> => {
    if (!porcupineRef.current || !isLoaded) {
      throw new Error('Porcupine not initialized');
    }

    if (subscribedRef.current) {
      return; // Already subscribed
    }

    try {
      await WebVoiceProcessor.subscribe(porcupineRef.current);
      subscribedRef.current = true;
      setIsListening(true);

      logger.info('Started listening for wake words', 'usePorcupineWakeWord');
    } catch (startError) {
      logger.error('Failed to start wake word detection', 'usePorcupineWakeWord', {
        error: (startError as Error)?.message
      });
      throw startError;
    }
  }, [isLoaded]);

  // Stop listening for wake words
  const stopListening = useCallback(async (): Promise<void> => {
    if (!porcupineRef.current || !subscribedRef.current) {
      return; // Not subscribed
    }

    try {
      await WebVoiceProcessor.unsubscribe(porcupineRef.current);
      subscribedRef.current = false;
      setIsListening(false);

      logger.info('Stopped listening for wake words', 'usePorcupineWakeWord');
    } catch (stopError) {
      logger.error('Failed to stop wake word detection', 'usePorcupineWakeWord', {
        error: (stopError as Error)?.message
      });
      throw stopError;
    }
  }, []);

  // Toggle listening state
  const toggleListening = useCallback(async (): Promise<void> => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Reset keyword detected state
  const resetKeywordDetected = useCallback((): void => {
    setKeywordDetected(false);
  }, []);

  // Initialize when enabled
  useEffect(() => {
    if (enabled && accessKey && !porcupineRef.current && !initializingRef.current) {
      initializePorcupine();
    }
  }, [enabled, accessKey, initializePorcupine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (porcupineRef.current) {
        if (subscribedRef.current) {
          WebVoiceProcessor.unsubscribe(porcupineRef.current).catch((unsubError) => {
            logger.warn('Failed to unsubscribe during cleanup', 'usePorcupineWakeWord', {
              error: (unsubError as Error)?.message
            });
          });
        }

        porcupineRef.current.release();
        porcupineRef.current.terminate();
        porcupineRef.current = null;
      }
    };
  }, []);

  // Reset keyword detection after delay
  useEffect(() => {
    if (keywordDetected) {
      const timer = setTimeout(() => {
        setKeywordDetected(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [keywordDetected]);

  return {
    isLoaded,
    isListening,
    error,
    keywordDetected,
    startListening,
    stopListening,
    toggleListening,
    resetKeywordDetected,
    clearCache
  };
};

/**
 * Utility functions for managing Porcupine wake word cache issues
 * Purpose: Help clear browser cache and ensure fresh model files are loaded
 */

import { logger } from '@/utils/logger';

/**
 * Clear browser cache for Porcupine models
 * Logic: Attempts various methods to clear cached .ppn files
 */
export const clearPorcupineCache = async (): Promise<void> => {
  try {
    // Method 1: Clear IndexedDB where Porcupine stores cached models
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();

      for (const db of databases) {
        if (db.name?.includes('porcupine') || db.name?.includes('picovoice')) {
          logger.info('Clearing Porcupine IndexedDB cache', 'clearPorcupineCache', {
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

    // Method 2: Clear Cache API if available
    if ('caches' in window) {
      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
        if (cacheName.includes('porcupine') || cacheName.includes('picovoice') || cacheName.includes('ppn')) {
          logger.info('Clearing Porcupine Cache API', 'clearPorcupineCache', {
            cache: cacheName
          });

          await caches.delete(cacheName);
        }
      }
    }

    logger.info('Porcupine cache cleared successfully', 'clearPorcupineCache');

  } catch (error) {
    logger.warn('Failed to clear Porcupine cache', 'clearPorcupineCache', {
      error: (error as Error)?.message
    });
  }
};

/**
 * Generate cache-busted URL for wake word model
 * Logic: Adds timestamp and random component to ensure fresh load
 */
export const getCacheBustedModelPath = (originalPath: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const separator = originalPath.includes('?') ? '&' : '?';

  return `${originalPath}${separator}v=${timestamp}&r=${random}`;
};

/**
 * Check if browser supports required Porcupine features
 * Logic: Validates browser compatibility before attempting initialization
 */
export const checkPorcupineCompatibility = (): {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for required APIs
  if (!('MediaDevices' in window) || !navigator.mediaDevices?.getUserMedia) {
    issues.push('MediaDevices API not available');
    recommendations.push('Use a modern browser that supports microphone access');
  }

  if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
    issues.push('Web Audio API not available');
    recommendations.push('Update your browser to support Web Audio API');
  }

  if (!('Worker' in window)) {
    issues.push('Web Workers not available');
    recommendations.push('Web Workers are required for Porcupine - use a compatible browser');
  }

  if (!('WebAssembly' in window)) {
    issues.push('WebAssembly not available');
    recommendations.push('WebAssembly is required for Porcupine WASM - update your browser');
  }

  if (!('indexedDB' in window)) {
    issues.push('IndexedDB not available');
    recommendations.push('IndexedDB is used for model caching - enable it in browser settings');
  }

  const compatible = issues.length === 0;

  logger.debug('Porcupine compatibility check completed', 'checkPorcupineCompatibility', {
    compatible,
    issues,
    recommendations
  });

  return { compatible, issues, recommendations };
};

/**
 * Instructions for manual cache clearing
 * Logic: Provides user-friendly instructions for different browsers
 */
export const getCacheClearingInstructions = (): {
  general: string[];
  chrome: string[];
  firefox: string[];
  safari: string[];
  edge: string[];
} => {
  return {
    general: [
      'Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)',
      'Open Developer Tools and right-click the refresh button, select "Empty Cache and Hard Reload"',
      'Clear browser cache and cookies for this site',
      'Try opening the site in an incognito/private window'
    ],
    chrome: [
      'Press F12 to open DevTools',
      'Right-click the refresh button and select "Empty Cache and Hard Reload"',
      'Or go to Settings → Privacy and security → Clear browsing data',
      'Select "Cached images and files" and clear'
    ],
    firefox: [
      'Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)',
      'Select "Cache" and click "Clear Now"',
      'Or press Ctrl+F5 for hard refresh'
    ],
    safari: [
      'Press Cmd+Option+E to empty cache',
      'Or go to Develop menu → Empty Caches',
      'Then press Cmd+R to reload'
    ],
    edge: [
      'Press Ctrl+Shift+Delete',
      'Select "Cached images and files"',
      'Click "Clear now"'
    ]
  };
};

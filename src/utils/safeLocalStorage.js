/**
 * Safe localStorage wrapper with error handling
 * Optimized for Raspberry Pi Zero 2W with 512MB RAM
 * Prevents app crashes due to localStorage quota exceeded or access denied
 */

import { logger } from './logger.js'

const safeLocalStorage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : defaultValue
    } catch (error) {
      logger.warn(`localStorage.get(${key}) failed`, 'STORAGE', error)
      return defaultValue
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      logger.warn(`localStorage.set(${key}) failed`, 'STORAGE', error)
      
      // Try to clear some space if quota exceeded
      if (error.name === 'QuotaExceededError') {
        logger.info('localStorage quota exceeded, attempting cleanup')
        safeLocalStorage.cleanup()
        
        // Try again after cleanup
        try {
          localStorage.setItem(key, JSON.stringify(value))
          return true
        } catch (retryError) {
          logger.error('localStorage.set retry failed', 'STORAGE', retryError)
        }
      }
      
      return false
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      logger.warn(`localStorage.remove(${key}) failed`, 'STORAGE', error)
      return false
    }
  },

  clear: () => {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      logger.warn('localStorage.clear() failed', 'STORAGE', error)
      return false
    }
  },

  // Clean up old cache items and temporary data (more aggressive for Pi Zero)
  cleanup: () => {
    try {
      const keys = Object.keys(localStorage)
      const now = Date.now()
      let removedCount = 0
      
      keys.forEach(key => {
        try {
          // Remove old cache items (shorter TTL for Pi Zero)
          if (key.startsWith('cache-')) {
            const item = localStorage.getItem(key)
            if (item) {
              const parsed = JSON.parse(item)
              // Reduce cache TTL to 30 minutes for Pi Zero
              if (parsed.timestamp && (now - parsed.timestamp > 30 * 60 * 1000)) {
                localStorage.removeItem(key)
                removedCount++
              }
            }
          }
          
          // Remove temporary items older than 2 hours (reduced from 24h)
          if (key.startsWith('temp-')) {
            const item = localStorage.getItem(key)
            if (item) {
              const parsed = JSON.parse(item)
              if (parsed.timestamp && (now - parsed.timestamp > 2 * 60 * 60 * 1000)) {
                localStorage.removeItem(key)
                removedCount++
              }
            }
          }

          // Remove old analytics data (keep only last 24 hours)
          if (key.startsWith('analytics-')) {
            const item = localStorage.getItem(key)
            if (item) {
              const parsed = JSON.parse(item)
              if (parsed.timestamp && (now - parsed.timestamp > 24 * 60 * 60 * 1000)) {
                localStorage.removeItem(key)
                removedCount++
              }
            }
          }
        } catch {
          // If we can't parse an item, it's probably corrupted, remove it
          localStorage.removeItem(key)
          removedCount++
        }
      })
      
      logger.info(`localStorage cleanup completed, removed ${removedCount} items`)
    } catch (error) {
      logger.warn('localStorage cleanup failed', 'STORAGE', error)
    }
  },

  // Get current usage info (optimized calculations for Pi Zero)
  getUsageInfo: () => {
    try {
      let totalSize = 0
      const keys = Object.keys(localStorage)
      
      // Sample only first 50 keys for performance on Pi Zero
      const keysToCheck = keys.slice(0, 50)
      
      keysToCheck.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += value.length
        }
      })

      // Estimate total size based on sample
      const estimatedTotalSize = keys.length > 50 ? 
        (totalSize * keys.length / keysToCheck.length) : totalSize
      
      return {
        totalItems: keys.length,
        totalSizeBytes: estimatedTotalSize,
        totalSizeKB: Math.round(estimatedTotalSize / 1024),
        totalSizeMB: Math.round(estimatedTotalSize / (1024 * 1024) * 100) / 100,
        isEstimated: keys.length > 50
      }
    } catch (error) {
      logger.warn('localStorage.getUsageInfo() failed', 'STORAGE', error)
      return null
    }
  },

  // Pi Zero specific: Aggressive cleanup when memory is low
  emergencyCleanup: () => {
    try {
      const keys = Object.keys(localStorage)
      let removedCount = 0
      
      // Remove all cache and temp data
      keys.forEach(key => {
        if (key.startsWith('cache-') || 
            key.startsWith('temp-') || 
            key.startsWith('analytics-') ||
            key.includes('performance-') ||
            key.includes('log-')) {
          localStorage.removeItem(key)
          removedCount++
        }
      })
      
      logger.info(`Emergency cleanup completed, removed ${removedCount} items`)
      return removedCount
    } catch (error) {
      logger.error('Emergency cleanup failed', 'STORAGE', error)
      return 0
    }
  }
}

export default safeLocalStorage

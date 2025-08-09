/**
 * Safe localStorage wrapper with error handling
 * Prevents app crashes due to localStorage quota exceeded or access denied
 */

const safeLocalStorage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn(`localStorage.get(${key}) failed:`, error)
      return defaultValue
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.warn(`localStorage.set(${key}) failed:`, error)
      
      // Try to clear some space if quota exceeded
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting cleanup...')
        safeLocalStorage.cleanup()
        
        // Try again after cleanup
        try {
          localStorage.setItem(key, JSON.stringify(value))
          return true
        } catch (retryError) {
          console.error('localStorage.set retry failed:', retryError)
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
      console.warn(`localStorage.remove(${key}) failed:`, error)
      return false
    }
  },

  clear: () => {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.warn('localStorage.clear() failed:', error)
      return false
    }
  },

  // Clean up old cache items and temporary data
  cleanup: () => {
    try {
      const keys = Object.keys(localStorage)
      const now = Date.now()
      
      keys.forEach(key => {
        try {
          // Remove old cache items
          if (key.startsWith('cache-')) {
            const item = localStorage.getItem(key)
            if (item) {
              const parsed = JSON.parse(item)
              if (parsed.timestamp && (now - parsed.timestamp > parsed.ttl)) {
                localStorage.removeItem(key)
              }
            }
          }
          
          // Remove temporary items older than 24 hours
          if (key.startsWith('temp-')) {
            const item = localStorage.getItem(key)
            if (item) {
              const parsed = JSON.parse(item)
              if (parsed.timestamp && (now - parsed.timestamp > 24 * 60 * 60 * 1000)) {
                localStorage.removeItem(key)
              }
            }
          }
        } catch {
          // If we can't parse an item, it's probably corrupted, remove it
          localStorage.removeItem(key)
        }
      })
      
      console.log('localStorage cleanup completed')
    } catch (error) {
      console.warn('localStorage cleanup failed:', error)
    }
  },

  // Get current usage info
  getUsageInfo: () => {
    try {
      let totalSize = 0
      const keys = Object.keys(localStorage)
      
      keys.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += value.length
        }
      })
      
      return {
        totalItems: keys.length,
        totalSizeBytes: totalSize,
        totalSizeKB: Math.round(totalSize / 1024),
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
      }
    } catch (error) {
      console.warn('localStorage.getUsageInfo() failed:', error)
      return null
    }
  }
}

export default safeLocalStorage

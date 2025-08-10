/**
 * Memory Pressure Detection for Raspberry Pi Zero 2W
 * Monitors memory usage and triggers cleanup when approaching 512MB limit
 */

import { logger } from './logger.js'
import safeLocalStorage from './safeLocalStorage.js'

class MemoryPressureMonitor {
  constructor() {
    this.isMonitoring = false
    this.checkInterval = null
    this.warningThreshold = 85 // 85% memory usage triggers warning
    this.criticalThreshold = 95 // 95% triggers emergency cleanup
    this.maxHeapSize = 0
    this.lastCleanup = 0
    this.cleanupCooldown = 30000 // 30 seconds between cleanups
  }

  startMonitoring() {
    if (this.isMonitoring) return
    this.isMonitoring = true

    // Check memory every 15 seconds for Pi Zero
    this.checkInterval = setInterval(() => {
      this.checkMemoryPressure()
    }, 15000)

    logger.info('Memory pressure monitor started for Pi Zero 2W')
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.isMonitoring = false
    logger.info('Memory pressure monitor stopped')
  }

  checkMemoryPressure() {
    try {
      const memoryInfo = this.getMemoryInfo()
      
      if (!memoryInfo) return

      const { usagePercent, totalHeap } = memoryInfo
      
      // Update max heap size tracking
      if (totalHeap > this.maxHeapSize) {
        this.maxHeapSize = totalHeap
      }

      // Critical memory pressure - emergency cleanup
      if (usagePercent >= this.criticalThreshold) {
        this.handleCriticalMemoryPressure(usagePercent)
      }
      // Warning level memory pressure
      else if (usagePercent >= this.warningThreshold) {
        this.handleWarningMemoryPressure(usagePercent)
      }

    } catch (error) {
      logger.error('Memory pressure check failed', 'MEMORY', error)
    }
  }

  getMemoryInfo() {
    try {
      // Use performance.memory if available (Chrome/Edge)
      if (typeof performance !== 'undefined' && performance.memory) {
        const mem = performance.memory
        const usagePercent = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100
        
        return {
          usedHeap: mem.usedJSHeapSize,
          totalHeap: mem.totalJSHeapSize,
          heapLimit: mem.jsHeapSizeLimit,
          usagePercent,
          source: 'performance.memory'
        }
      }

      // Fallback estimation based on typical Pi Zero constraints
      // This is rough estimation when performance.memory is not available
      const estimatedUsage = this.estimateMemoryUsage()
      return {
        usedHeap: estimatedUsage.used,
        totalHeap: estimatedUsage.total,
        heapLimit: estimatedUsage.limit,
        usagePercent: (estimatedUsage.used / estimatedUsage.limit) * 100,
        source: 'estimation'
      }

    } catch (error) {
      logger.warn('Failed to get memory info', 'MEMORY', error)
      return null
    }
  }

  estimateMemoryUsage() {
    // Rough estimation for Pi Zero 2W with 512MB RAM
    // Browser typically gets ~200-300MB of that
    const estimatedLimit = 200 * 1024 * 1024 // 200MB estimated browser limit
    const storageInfo = safeLocalStorage.getUsageInfo()
    const storageSize = storageInfo ? storageInfo.totalSizeBytes : 0
    
    // Very rough estimation based on DOM elements and storage
    const domElements = document.querySelectorAll('*').length
    const estimatedDOMMemory = domElements * 100 // ~100 bytes per DOM element estimate
    const estimatedUsed = estimatedDOMMemory + storageSize + (10 * 1024 * 1024) // +10MB base
    
    return {
      used: Math.min(estimatedUsed, estimatedLimit),
      total: estimatedLimit,
      limit: estimatedLimit
    }
  }

  handleWarningMemoryPressure(usagePercent) {
    logger.warn(`Memory pressure warning: ${usagePercent.toFixed(1)}% usage`)
    
    // Gentle cleanup without disrupting user experience
    this.performLightCleanup()
    
    // Notify user if needed
    this.notifyMemoryPressure('warning', usagePercent)
  }

  handleCriticalMemoryPressure(usagePercent) {
    logger.error(`Critical memory pressure: ${usagePercent.toFixed(1)}% usage`)
    
    const now = Date.now()
    
    // Prevent too frequent cleanups
    if (now - this.lastCleanup < this.cleanupCooldown) {
      return
    }

    this.lastCleanup = now
    
    // Aggressive cleanup
    this.performAggressiveCleanup()
    
    // Notify user
    this.notifyMemoryPressure('critical', usagePercent)
  }

  performLightCleanup() {
    try {
      // Clear old localStorage cache
      safeLocalStorage.cleanup()
      
      // Force garbage collection if available (Chrome DevTools)
      if (typeof window !== 'undefined' && window.gc) {
        window.gc()
      }
      
      logger.debug('Light memory cleanup completed')
    } catch (error) {
      logger.warn('Light cleanup failed', 'CLEANUP', error)
    }
  }

  performAggressiveCleanup() {
    try {
      // Emergency cleanup
      safeLocalStorage.emergencyCleanup()
      
      // Clear all caches
      this.clearAllCaches()
      
      // Remove unnecessary DOM elements
      this.cleanupDOM()
      
      // Force garbage collection if available
      if (typeof window !== 'undefined' && window.gc) {
        window.gc()
      }
      
      logger.info('Aggressive memory cleanup completed')
    } catch (error) {
      logger.error('Aggressive cleanup failed', 'CLEANUP', error)
    }
  }

  clearAllCaches() {
    try {
      // Clear browser caches if supported
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name)
          })
        })
      }
      
      // Clear any application-specific caches
      if (typeof window !== 'undefined' && window.audioCache) {
        window.audioCache.clear()
      }
      
    } catch (error) {
      logger.warn('Cache clearing failed', 'CLEANUP', error)
    }
  }

  cleanupDOM() {
    try {
      // Remove hidden or unnecessary elements
      const hiddenElements = document.querySelectorAll('[hidden], .hidden')
      hiddenElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
      
      // Clean up detached event listeners (helps GC)
      const scripts = document.querySelectorAll('script[data-cleanup="true"]')
      scripts.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      })
      
    } catch (error) {
      logger.warn('DOM cleanup failed', 'CLEANUP', error)
    }
  }

  notifyMemoryPressure(level, usagePercent) {
    const message = level === 'critical' 
      ? `Kritik bellek durumu: %${usagePercent.toFixed(1)}. Temizlik yapılıyor...`
      : `Yüksek bellek kullanımı: %${usagePercent.toFixed(1)}`
    
    // Show user notification
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification(message, level)
    }
    
    // Dispatch custom event for components to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memoryPressure', {
        detail: { level, usagePercent, message }
      }))
    }
  }

  getMemoryStatus() {
    const memoryInfo = this.getMemoryInfo()
    
    return {
      isMonitoring: this.isMonitoring,
      memoryInfo,
      thresholds: {
        warning: this.warningThreshold,
        critical: this.criticalThreshold
      },
      lastCleanup: this.lastCleanup,
      maxHeapSize: this.maxHeapSize
    }
  }
}

// Create singleton instance
const memoryPressureMonitor = new MemoryPressureMonitor()

export default memoryPressureMonitor

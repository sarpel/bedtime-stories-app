/**
 * Application Stability Monitor
 * Uygulamanın kararlılığını izler ve otomatik iyileştirmeler önerir
 */

class StabilityMonitor {
  constructor() {
    this.errorCount = 0
    this.warningCount = 0
    this.lastCleanup = Date.now()
    this.performanceIssues = []
    this.isMonitoring = false
    
    // Sayfa yüklendiğinde başlat
    if (typeof window !== 'undefined') {
      this.startMonitoring()
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return
    this.isMonitoring = true

    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError('javascript_error', event.error?.message || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })

    // Unhandled promise rejection handler  
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('unhandled_promise_rejection', event.reason?.message || 'Promise rejected', {
        reason: event.reason
      })
    })

    // Performance monitoring
    this.monitorPerformance()

    // Automatic cleanup
    this.scheduleCleanup()

    console.log('🛡️ Stability Monitor started')
  }

  handleError(type, message, details = {}) {
    this.errorCount++
    
    console.error(`🚨 StabilityMonitor: ${type}`, message, details)

    // Error tracking
    const errorData = {
      type,
      message,
      details,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    // Store recent errors
    const recentErrors = this.getRecentErrors()
    recentErrors.push(errorData)
    
    // Keep only last 10 errors
    if (recentErrors.length > 10) {
      recentErrors.shift()
    }
    
    try {
      localStorage.setItem('app-stability-errors', JSON.stringify(recentErrors))
    } catch {
      console.warn('Failed to store error data')
    }

    // Auto-recovery actions
    this.attemptRecovery(type, message)
  }

  attemptRecovery(errorType, message) {
    try {
      // Memory-related recovery
      if (message.includes('out of memory') || message.includes('Maximum call stack')) {
        console.log('🔧 Attempting memory recovery...')
        this.performEmergencyCleanup()
      }

      // Storage-related recovery
      if (message.includes('QuotaExceededError') || message.includes('localStorage')) {
        console.log('🔧 Attempting storage recovery...')
        this.performStorageCleanup()
      }

      // Network-related recovery
      if (message.includes('fetch') || message.includes('network') || errorType.includes('api')) {
        console.log('🔧 Network error detected, checking connectivity...')
        this.checkNetworkConnectivity()
      }

    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError)
    }
  }

  performEmergencyCleanup() {
    try {
      // Clear temporary data
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('temp-') || key.startsWith('cache-')) {
          localStorage.removeItem(key)
        }
      })

      // Force garbage collection if available
      if (window.gc) {
        window.gc()
      }

      console.log('✅ Emergency cleanup completed')
    } catch (error) {
      console.error('Emergency cleanup failed:', error)
    }
  }

  performStorageCleanup() {
    try {
      // Import safe localStorage utility
      import('../utils/safeLocalStorage.js').then(({ default: safeLocalStorage }) => {
        safeLocalStorage.cleanup()
        console.log('✅ Storage cleanup completed')
      })
    } catch (error) {
      console.error('Storage cleanup failed:', error)
    }
  }

  checkNetworkConnectivity() {
    if (navigator.onLine === false) {
      console.warn('🌐 Network is offline')
      // Show offline notification if needed
      this.showNotification('⚠️ İnternet bağlantısı kesildi', 'warning')
    } else {
      // Test with a simple fetch
    } else {
      // Use a more reliable endpoint or the current origin
      fetch(window.location.origin, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          console.log('🌐 Network connectivity confirmed')
        })
        .catch((error) => {
          console.warn('🌐 Network connectivity issues detected:', error.message)
          this.showNotification('⚠️ İnternet bağlantısında sorun var', 'warning')
        })
    }
  }

  monitorPerformance() {
    // Monitor memory usage
    if (typeof performance !== 'undefined' && performance.memory) {
      this.memoryCheckInterval = setInterval(() => {
        const memoryUsage = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
        
        if (memoryUsage > 85) {
          console.warn(`🧠 High memory usage: ${memoryUsage.toFixed(1)}%`)
          this.performanceIssues.push({
            type: 'high_memory',
            value: memoryUsage,
            timestamp: Date.now()
          })
          
          // Auto cleanup at 90%
          if (memoryUsage > 90) {
            this.performEmergencyCleanup()
          }
        }
      }, 30000) // Check every 30 seconds
    }
  }

  scheduleCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      
      // Cleanup every 10 minutes
      if (now - this.lastCleanup > 10 * 60 * 1000) {
        this.performStorageCleanup()
        this.lastCleanup = now
      }
    }, 60000) // Check every minute
  }

  showNotification(message, type = 'info') {
    // Simple console notification for now
    // Can be extended to show UI notifications
    console.log(`📢 ${type.toUpperCase()}: ${message}`)
  }

  getRecentErrors() {
    try {
      const errors = localStorage.getItem('app-stability-errors')
      return errors ? JSON.parse(errors) : []
    } catch {
      return []
    }
  }

  getStabilityReport() {
    return {
      errorCount: this.errorCount,
      warningCount: this.warningCount,
      performanceIssues: this.performanceIssues.slice(-5), // Last 5 issues
      recentErrors: this.getRecentErrors(),
      isHealthy: this.errorCount < 5 && this.warningCount < 10
    }
  }

  reset() {
    this.errorCount = 0
    this.warningCount = 0
    this.performanceIssues = []
    
    // Clear intervals
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    try {
      localStorage.removeItem('app-stability-errors')
    } catch {
      console.warn('Failed to clear error storage')
    }
    console.log('🔄 Stability Monitor reset')
  }

  // Stop monitoring and clean up
  stopMonitoring() {
    this.isMonitoring = false
    
    // Clear intervals
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    console.log('🛡️ Stability Monitor stopped')
  }
}

// Global instance
const stabilityMonitor = new StabilityMonitor()

export default stabilityMonitor

/**
 * Stability Monitor - Optimized for Raspberry Pi Zero 2W
 * Reduced memory usage and logging for 512MB RAM constraint
 */

// Extend the global Performance interface to include memory property
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

import { stabilityLogger } from './logger.ts'
import safeLocalStorage from './safeLocalStorage.ts'

interface ErrorDetails {
  filename?: string
  lineno?: number
  colno?: number
  reason?: any
}

interface ErrorData {
  type: string
  message: string
  details: ErrorDetails
  timestamp: number
  url?: string
  userAgent?: string
}

interface PerformanceIssue {
  type: string
  value: number
  timestamp: number
}

interface StabilityReport {
  errorCount: number
  warningCount: number
  performanceIssues: PerformanceIssue[]
  recentErrors: ErrorData[]
  isHealthy: boolean
}

class StabilityMonitor {
  errorCount: number
  warningCount: number
  performanceIssues: PerformanceIssue[]
  lastCleanup: number
  isMonitoring: boolean
  memoryCheckInterval: number | null
  cleanupInterval: number | null
  maxErrors: number
  maxPerformanceIssues: number

  constructor() {
    this.errorCount = 0
    this.warningCount = 0
    this.performanceIssues = []
    this.lastCleanup = Date.now()
    this.isMonitoring = false
    this.memoryCheckInterval = null
    this.cleanupInterval = null
    this.maxErrors = 20 // Reduced for Pi Zero
    this.maxPerformanceIssues = 10 // Reduced for Pi Zero
  }

  startMonitoring() {
    if (this.isMonitoring) return
    this.isMonitoring = true

    // Global error handler
    if (typeof window !== 'undefined') {
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
    }

    // Performance monitoring (less frequent for Pi Zero)
    this.monitorPerformance()

    // Automatic cleanup (more frequent for Pi Zero)
    this.scheduleCleanup()

    stabilityLogger.info('Stability Monitor started (Pi Zero optimized)')
  }

  handleError(type: string, message: string, details: ErrorDetails = {}): void {
    this.errorCount++

    stabilityLogger.error(`${type}: ${message}`, 'ERROR_HANDLER', details)

    // Error tracking (limited to prevent memory buildup)
    const errorData: ErrorData = {
      type,
      message,
      details,
      timestamp: Date.now(),
      url: (typeof window !== 'undefined' && window.location?.href) ? window.location.href : undefined,
      userAgent: (typeof navigator !== 'undefined' ? navigator.userAgent : undefined)
    }

    // Store recent errors (reduced limit for Pi Zero)
    const recentErrors = this.getRecentErrors()
    recentErrors.push(errorData)

    // Keep only last 5 errors for Pi Zero memory constraints
    if (recentErrors.length > 5) {
      recentErrors.shift()
    }

    try {
      localStorage.setItem('app-stability-errors', JSON.stringify(recentErrors))
    } catch {
      stabilityLogger.warn('Failed to store error data - storage full')
    }

    // Auto-recovery actions
    this.attemptRecovery(type, message)
  }

  attemptRecovery(errorType: string, message: string): void {
    try {
      // Memory-related recovery (more aggressive for Pi Zero)
      if (message.includes('out of memory') || message.includes('Maximum call stack')) {
        stabilityLogger.info('Attempting memory recovery (Pi Zero mode)')
        this.performEmergencyCleanup()
      }

      // Storage-related recovery
      if (message.includes('QuotaExceededError') || message.includes('localStorage')) {
        stabilityLogger.info('Attempting storage recovery')
        this.performStorageCleanup()
      }

      // Network-related recovery
      if (message.includes('fetch') || message.includes('network') || errorType.includes('api')) {
        stabilityLogger.info('Network error detected, checking connectivity')
        this.checkNetworkConnectivity()
      }

    } catch (recoveryError) {
      stabilityLogger.error('Recovery attempt failed', 'RECOVERY', recoveryError)
    }
  }

  performEmergencyCleanup(): void {
    try {
      // Clear temporary data
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('temp-') || key.startsWith('cache-')) {
          localStorage.removeItem(key)
        }
      })

      stabilityLogger.info('Emergency cleanup completed')
    } catch (error) {
      stabilityLogger.error('Emergency cleanup failed', 'CLEANUP', error)
    }
  }

  performStorageCleanup(): void {
    try {
      // Use statically imported safeLocalStorage
      safeLocalStorage.cleanup()
      stabilityLogger.info('Storage cleanup completed')
    } catch (error) {
      stabilityLogger.error('Storage cleanup failed', 'CLEANUP', error)
    }
  }

  checkNetworkConnectivity(): void {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      stabilityLogger.warn('Network is offline')
      return
    }

    // Simple connectivity check
    fetch('/health', { method: 'HEAD' })
      .then(() => {
        stabilityLogger.debug('Network connectivity confirmed')
      })
      .catch(() => {
        stabilityLogger.warn('Network connectivity issues detected')
      })
  }

  monitorPerformance(): void {
    // Monitor memory usage (less frequent for Pi Zero - every 60 seconds)
    if (typeof performance !== 'undefined' && performance.memory) {
      this.memoryCheckInterval = window.setInterval(() => {
        const memoryUsage = (performance.memory!.usedJSHeapSize / performance.memory!.jsHeapSizeLimit) * 100

        if (memoryUsage > 70) { // Lowered threshold for Pi Zero
          stabilityLogger.warn(`High memory usage: ${memoryUsage.toFixed(1)}%`)
          this.performanceIssues.push({
            type: 'high_memory',
            value: memoryUsage,
            timestamp: Date.now()
          })

          // Keep limited performance issues
          if (this.performanceIssues.length > this.maxPerformanceIssues) {
            this.performanceIssues.shift()
          }

          // Auto cleanup at 85% for Pi Zero
          if (memoryUsage > 85) {
            this.performEmergencyCleanup()
          }
        }
      }, 60000) // Check every 60 seconds for Pi Zero
    }
  }

  scheduleCleanup(): void {
    this.cleanupInterval = window.setInterval(() => {
      const now = Date.now()

      // Cleanup every 5 minutes for Pi Zero
      if (now - this.lastCleanup > 5 * 60 * 1000) {
        this.performStorageCleanup()
        this.lastCleanup = now
      }
    }, 60000) // Check every minute
  }

  showNotification(message: string, type: string = 'info'): void {
    // Simple notification system optimized for Pi Zero
    stabilityLogger.info(`${type.toUpperCase()}: ${message}`)
  }

  getRecentErrors(): ErrorData[] {
    try {
      const errors = localStorage.getItem('app-stability-errors')
      return errors ? JSON.parse(errors) : []
    } catch {
      return []
    }
  }

  getStabilityReport(): StabilityReport {
    return {
      errorCount: this.errorCount,
      warningCount: this.warningCount,
      performanceIssues: this.performanceIssues.slice(-3), // Last 3 issues for Pi Zero
      recentErrors: this.getRecentErrors(),
      isHealthy: this.errorCount < 3 && this.warningCount < 5 // Stricter for Pi Zero
    }
  }

  reset(): void {
    this.errorCount = 0
    this.warningCount = 0
    this.performanceIssues = []

    // Clear intervals
    if (this.memoryCheckInterval) {
      window.clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
    }

    if (this.cleanupInterval) {
      window.clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    try {
      localStorage.removeItem('app-stability-errors')
    } catch {
      stabilityLogger.warn('Failed to clear error storage')
    }
    stabilityLogger.info('Stability Monitor reset')
  }

  // Stop monitoring and clean up
  stopMonitoring(): void {
    this.isMonitoring = false

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    stabilityLogger.info('Stability Monitor stopped')
  }
}

// Create singleton instance
const stabilityMonitor = new StabilityMonitor()

export default stabilityMonitor

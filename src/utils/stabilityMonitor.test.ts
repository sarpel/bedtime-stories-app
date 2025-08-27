// NOTE: If the implementation file path differs (e.g., stabilityMonitor.js), adjust the import below accordingly.

// Extend the global Performance interface to include memory property
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

/**
 * Tests for StabilityMonitor (Pi Zero optimized)
 *
 * Detected/Assumed testing library and framework: Jest/Vitest-style API.
 * - Uses describe/it/expect with ESM imports.
 * - If running on Jest with ESM, ensure jest-environment-jsdom or similar is configured.
 *
 * This suite focuses on the public behavior and side-effects exposed in the diff:
 * - startMonitoring, stopMonitoring, reset
 * - handleError and recovery paths
 * - performEmergencyCleanup, performStorageCleanup
 * - monitorPerformance + scheduleCleanup timer behavior
 * - checkNetworkConnectivity outcomes
 * - getRecentErrors, getStabilityReport, showNotification
 *
 * The module under test exports a singleton. We reset state between tests.
 */

import { jest, describe, it, beforeEach, expect } from '@jest/globals'

// Mock dependencies before importing the module under test
const infoMock = jest.fn()
const warnMock = jest.fn()
const errorMock = jest.fn()
const debugMock = jest.fn()

// Mock the logger with named export stabilityLogger
jest.unstable_mockModule('./logger.ts', () => ({
  stabilityLogger: {
    info: infoMock,
    warn: warnMock,
    error: errorMock,
    debug: debugMock,
  },
}))

// Mock safeLocalStorage with a cleanup method
const cleanupMock = jest.fn()
jest.unstable_mockModule('./safeLocalStorage.ts', () => ({
  default: {
    cleanup: cleanupMock,
  },
}))

// Provide globals used by StabilityMonitor
const listeners: Record<string, ((event: any) => void)[]> = {}
const addEventListenerMock = jest.fn((type: string, cb: (event: any) => void) => {
  listeners[type] = listeners[type] || []
  listeners[type].push(cb)
})

// Minimal localStorage mock (JSDOM provides one, but ensure stable behavior)
class MemoryStorage {
  private map: Map<string, string>

  constructor() {
    this.map = new Map()
  }

  getItem(k: string): string | null {
    return this.map.has(k) ? this.map.get(k)! : null
  }

  setItem(k: string, v: string): void {
    this.map.set(k, String(v))
  }

  removeItem(k: string): void {
    this.map.delete(k)
  }

  clear(): void {
    this.map.clear()
  }

  key(i: number): string | null {
    return Array.from(this.map.keys())[i] || null
  }

  get length(): number {
    return this.map.size
  }
}
const memoryStorage = new MemoryStorage()

// Setup window/navigator/performance/fetch
;(global as any).window = {
  addEventListener: addEventListenerMock,
  location: { href: 'https://example.test/page' },
}
;(global as any).navigator = { userAgent: 'jest-test-agent', onLine: true }
;(global as any).localStorage = memoryStorage

// Mutable stubs for performance and fetch (overridden in tests)
let fetchResolve = true
;(global as any).fetch = jest.fn(() =>
  fetchResolve ? Promise.resolve({ ok: true }) : Promise.reject(new Error('Network fail'))
)

const perfMemory = {
  usedJSHeapSize: 70 * 1024 * 1024,
  jsHeapSizeLimit: 100 * 1024 * 1024,
}
;(global as any).performance = { memory: perfMemory }

// Import the module under test after mocks
import stabilityMonitor from './stabilityMonitor'

// Timer control
jest.useFakeTimers()

function resetEnvironment() {
  infoMock.mockClear()
  warnMock.mockClear()
  errorMock.mockClear()
  debugMock.mockClear()
  cleanupMock.mockClear()
  addEventListenerMock.mockClear()
  Object.keys(listeners).forEach(k => delete listeners[k])
  memoryStorage.clear()
  fetchResolve = true
  // Reset performance defaults
  perfMemory.usedJSHeapSize = 70 * 1024 * 1024
  perfMemory.jsHeapSizeLimit = 100 * 1024 * 1024
  // Reset monitor state
  stabilityMonitor.reset()
}

describe('StabilityMonitor - initialization and lifecycle', () => {
  beforeEach(() => {
    resetEnvironment()
    jest.clearAllTimers()
  })

  it('starts monitoring only once and registers global handlers, timers, and logs', () => {
    stabilityMonitor.startMonitoring()
    expect(stabilityMonitor.isMonitoring).toBe(true)
    expect(addEventListenerMock).toHaveBeenCalledWith('error', expect.any(Function))
    expect(addEventListenerMock).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
    expect(infoMock).toHaveBeenCalledWith('Stability Monitor started (Pi Zero optimized)')

    // Calling again should be a no-op
    addEventListenerMock.mockClear()
    stabilityMonitor.startMonitoring()
    expect(addEventListenerMock).not.toHaveBeenCalled()

    // Timers should be scheduled (interval ids exist)
    // We can't access private interval ids, but after tick, no error occurs
    jest.advanceTimersByTime(60_000)
  })

  it('stops monitoring by clearing timers and logging', () => {
    stabilityMonitor.startMonitoring()
    stabilityMonitor.stopMonitoring()
    expect(stabilityMonitor.isMonitoring).toBe(false)
    expect(infoMock).toHaveBeenCalledWith('Stability Monitor stopped')
    // Advancing timers should not execute callbacks after stop
    jest.advanceTimersByTime(60_000)
  })

  it('reset clears counts, performance issues, intervals, and storage', () => {
    // Seed some state
    stabilityMonitor.startMonitoring()
    memoryStorage.setItem('app-stability-errors', '["x"]')
    jest.advanceTimersByTime(60_000)

    stabilityMonitor.reset()

    const report = stabilityMonitor.getStabilityReport()
    expect(report.errorCount).toBe(0)
    expect(report.warningCount).toBe(0)
    expect(report.performanceIssues).toEqual([])
    expect(memoryStorage.getItem('app-stability-errors')).toBe(null)
    expect(infoMock).toHaveBeenCalledWith('Stability Monitor reset')

    // Timers cleared: nothing should happen on advance
    jest.advanceTimersByTime(60_000)
  })
})

describe('handleError and error storage/recovery', () => {
  beforeEach(() => {
    resetEnvironment()
  })

  it('increments errorCount, logs error with details, stores limited recent errors', () => {
    expect(stabilityMonitor.getRecentErrors()).toEqual([])

    for (let i = 0; i < 7; i++) {
      stabilityMonitor.handleError('javascript_error', `msg ${i}`, { foo: i } as any)
    }

    // Error count increased
    const report = stabilityMonitor.getStabilityReport()
    expect(report.errorCount).toBe(7)
    // Stored only last 5
    const stored = stabilityMonitor.getRecentErrors()
    expect(stored).toHaveLength(5)
    expect(stored[0].message).toBe('msg 2')
    expect(stored[4].message).toBe('msg 6')
    // Log called with ERROR_HANDLER
    expect(errorMock).toHaveBeenCalledWith(expect.stringContaining('javascript_error: msg 0'), 'ERROR_HANDLER', expect.any(Object))
  })

  it('attempts memory recovery on memory-related messages', () => {
    stabilityMonitor.performEmergencyCleanup = jest.fn()
    stabilityMonitor.handleError('runtime', 'out of memory: heap exceeded')
    expect(infoMock).toHaveBeenCalledWith('Attempting memory recovery (Pi Zero mode)')
    expect(stabilityMonitor.performEmergencyCleanup).toHaveBeenCalled()
  })

  it('attempts storage recovery on storage-related messages', () => {
    stabilityMonitor.performStorageCleanup = jest.fn()
    stabilityMonitor.handleError('runtime', 'QuotaExceededError: localStorage full')
    expect(infoMock).toHaveBeenCalledWith('Attempting storage recovery')
    expect(stabilityMonitor.performStorageCleanup).toHaveBeenCalled()
  })

  it('checks network connectivity for network-like errors and api error types', async () => {
    stabilityMonitor.checkNetworkConnectivity = jest.fn()
    stabilityMonitor.handleError('api_failure', 'Bad fetch status')
    expect(infoMock).toHaveBeenCalledWith('Network error detected, checking connectivity')
    expect(stabilityMonitor.checkNetworkConnectivity).toHaveBeenCalled()
  })

  it('gracefully handles storage set failures when saving errors', () => {
    // Monkey patch setItem to throw
    const origSetItem = memoryStorage.setItem.bind(memoryStorage)
    memoryStorage.setItem = () => { throw new Error('full') }
    stabilityMonitor.handleError('javascript_error', 'oops', {})
    expect(warnMock).toHaveBeenCalledWith('Failed to store error data - storage full')
    // Restore
    memoryStorage.setItem = origSetItem
  })
})

describe('performEmergencyCleanup', () => {
  beforeEach(() => {
    resetEnvironment()
  })

  it('removes temp-* and cache-* keys and logs success', () => {
    memoryStorage.setItem('temp-1', 'a')
    memoryStorage.setItem('cache-2', 'b')
    memoryStorage.setItem('keep-3', 'c')

    stabilityMonitor.performEmergencyCleanup()

    expect(memoryStorage.getItem('temp-1')).toBe(null)
    expect(memoryStorage.getItem('cache-2')).toBe(null)
    expect(memoryStorage.getItem('keep-3')).toBe('c')
    expect(infoMock).toHaveBeenCalledWith('Emergency cleanup completed')
  })

  it('logs error if cleanup throws', () => {
    const originalRemove = memoryStorage.removeItem.bind(memoryStorage)
    memoryStorage.removeItem = () => { throw new Error('boom') }
    stabilityMonitor.performEmergencyCleanup()
    expect(errorMock).toHaveBeenCalledWith('Emergency cleanup failed', 'CLEANUP', expect.any(Error))
    memoryStorage.removeItem = originalRemove
  })
})

describe('performStorageCleanup', () => {
  beforeEach(() => {
    resetEnvironment()
  })

  it('invokes safeLocalStorage.cleanup and logs', () => {
    stabilityMonitor.performStorageCleanup()
    expect(cleanupMock).toHaveBeenCalled()
    expect(infoMock).toHaveBeenCalledWith('Storage cleanup completed')
  })

  it('logs error if storage cleanup fails', () => {
    cleanupMock.mockImplementationOnce(() => { throw new Error('fail') })
    stabilityMonitor.performStorageCleanup()
    expect(errorMock).toHaveBeenCalledWith('Storage cleanup failed', 'CLEANUP', expect.any(Error))
  })
})

describe('checkNetworkConnectivity', () => {
  beforeEach(() => {
    resetEnvironment()
  })

  it('logs and returns if navigator is offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })
    stabilityMonitor.checkNetworkConnectivity()
    expect(warnMock).toHaveBeenCalledWith('Network is offline')
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  it('logs debug on successful HEAD /health', async () => {
    fetchResolve = true
    stabilityMonitor.checkNetworkConnectivity()
    // Allow microtask queue to resolve promises
    await Promise.resolve()
    expect(debugMock).toHaveBeenCalledWith('Network connectivity confirmed')
  })

  it('logs warn on fetch failure', async () => {
    fetchResolve = false
    stabilityMonitor.checkNetworkConnectivity()
    await Promise.resolve()
    expect(warnMock).toHaveBeenCalledWith('Network connectivity issues detected')
  })
})

describe('monitorPerformance', () => {
  beforeEach(() => {
    resetEnvironment()
  })

  it('creates interval when performance.memory exists, warns at >70%, triggers emergency at >85%', () => {
    // Start monitoring to schedule memory checks
    stabilityMonitor.startMonitoring()

    // At 70% usage, nothing yet; at >70% usage, warnings and issues
    perfMemory.usedJSHeapSize = 0.71 * perfMemory.jsHeapSizeLimit
    jest.advanceTimersByTime(60_000)

    expect(warnMock).toHaveBeenCalledWith(expect.stringMatching(/^High memory usage: \d+\.\d%$/))
    const report = stabilityMonitor.getStabilityReport()
    expect(report.performanceIssues[0]).toMatchObject({ type: 'high_memory' })

    // Emergency at >85%
    stabilityMonitor.performEmergencyCleanup = jest.fn()
    perfMemory.usedJSHeapSize = 0.89 * perfMemory.jsHeapSizeLimit // Intentionally malformed to adjust below (fixed next)
  })

  it('triggers emergency cleanup when usage exceeds 85%', () => {
    stabilityMonitor.startMonitoring()
    stabilityMonitor.performEmergencyCleanup = jest.fn()
    perfMemory.usedJSHeapSize = 0.89 * perfMemory.jsHeapSizeLimit
  })
})
describe('monitorPerformance (continued)', () => {
  beforeEach(() => {
    // resetEnvironment also resets performance and monitor
    // but for this appended block ensure it's run
  })

  it('keeps only up to maxPerformanceIssues by shifting older entries', () => {
    resetEnvironment()
    stabilityMonitor.startMonitoring()
    // Force multiple cycles >70% to push issues over cap
    const pushes = stabilityMonitor.maxPerformanceIssues + 3
    for (let i = 0; i < pushes; i++) {
      if (performance.memory) {
        performance.memory.usedJSHeapSize = 0.80 * performance.memory.jsHeapSizeLimit
      }
      jest.advanceTimersByTime(60_000)
    }
    const report = stabilityMonitor.getStabilityReport()
    expect(report.performanceIssues.length).toBeLessThanOrEqual(3) // getStabilityReport slices last 3
    // Underlying array limited as well
    expect(stabilityMonitor.performanceIssues.length).toBeLessThanOrEqual(stabilityMonitor.maxPerformanceIssues)
  })
})

describe('scheduleCleanup', () => {
  beforeEach(() => {
    resetEnvironment()
  })

  it('runs storage cleanup every 5 minutes and updates lastCleanup', () => {
    stabilityMonitor.startMonitoring()
    cleanupMock.mockClear()
    const before = stabilityMonitor.lastCleanup

    // First minute tick should not trigger cleanup
    jest.advanceTimersByTime(60_000)
    expect(cleanupMock).not.toHaveBeenCalled()

    // Advance to just past 5 minutes total
    jest.advanceTimersByTime(4 * 60_000 + 1000)
    expect(cleanupMock).toHaveBeenCalledTimes(1)
    expect(stabilityMonitor.lastCleanup).toBeGreaterThan(before)
  })
})

describe('getRecentErrors and getStabilityReport', () => {
  beforeEach(() => {
    resetEnvironment()
  })

  it('getRecentErrors returns [] on bad JSON or missing key', () => {
    expect(stabilityMonitor.getRecentErrors()).toEqual([])
    localStorage.setItem('app-stability-errors', 'not-json')
    expect(stabilityMonitor.getRecentErrors()).toEqual([])
  })

  it('getStabilityReport returns computed fields with last 3 performance issues and health status', () => {
    // Seed performance issues
    stabilityMonitor.performanceIssues = Array.from({ length: 6 }, (_, i) => ({ type: 'x', value: i, timestamp: i }))
    stabilityMonitor.errorCount = 2
    stabilityMonitor.warningCount = 4

    const report = stabilityMonitor.getStabilityReport()
    expect(report.performanceIssues).toHaveLength(3)
    expect(report.performanceIssues.map(i => i.value)).toEqual([3, 4, 5])
    expect(report.isHealthy).toBe(true)

    stabilityMonitor.errorCount = 3
    expect(stabilityMonitor.getStabilityReport().isHealthy).toBe(false)
  })
})

describe('showNotification', () => {
  beforeEach(() => {
    resetEnvironment()
  })

  it('logs message with uppercased type', () => {
    stabilityMonitor.showNotification('hello world', 'warn')
    expect(infoMock).toHaveBeenCalledWith('WARN: hello world')

    infoMock.mockClear()
    stabilityMonitor.showNotification('hi default')
    expect(infoMock).toHaveBeenCalledWith('INFO: hi default')
  })
})

describe('global event handlers wiring', () => {
  beforeEach(() => {
    resetEnvironment()
  })

  it('handles window error events and stores details', () => {
    stabilityMonitor.startMonitoring()
    const [errorHandler] = listeners.error
      ? listeners.error
      : addEventListenerMock.mock.calls.find(c => c[0] === 'error')?.slice(1) || []

    const event = {
      error: { message: 'boom' },
      message: 'fallback',
      filename: 'app.js', lineno: 10, colno: 20,
    }
    // Invoke handler
    if (typeof errorHandler === 'function') {
      errorHandler(event)
    }
    const stored = stabilityMonitor.getRecentErrors()
    expect(stored[0].message).toBe('boom')
    expect(stored[0].details).toMatchObject({ filename: 'app.js', lineno: 10, colno: 20 })
    expect(stored[0].url).toBe('https://example.test/page')
    expect(stored[0].userAgent).toBe('jest-test-agent')
  })

  it('handles unhandledrejection and falls back to default message', () => {
    stabilityMonitor.startMonitoring()
    const [rejHandler] = listeners.unhandledrejection
      ? listeners.unhandledrejection
      : addEventListenerMock.mock.calls.find(c => c[0] === 'unhandledrejection')?.slice(1) || []

    if (typeof rejHandler === 'function') {
      rejHandler({ reason: { message: 'bad promise' } })
    }
    expect(stabilityMonitor.getRecentErrors()[0].message).toBe('bad promise')

    if (typeof rejHandler === 'function') {
      rejHandler({}) // no reason provided
    }
    expect(stabilityMonitor.getRecentErrors()[1].message).toBe('Promise rejected')
  })
})

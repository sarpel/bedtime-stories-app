import { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * Virtual Scrolling and Lazy Loading Hook
 * Büyük listeleri verimli şekilde göstermek için optimize edilmiş hook
 */
export function useVirtualizedList<T>(items: T[] = [], itemHeight: number = 60, containerHeight: number = 400) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerRef, setContainerRef] = useState(null)

  const visibleItems = useMemo(() => {
    if (!items.length) return { startIndex: 0, endIndex: 0, visibleItems: [] }

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2) // 2 extra items for buffer
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 4 // 4 extra items for buffer
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount)

    return {
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex + 1),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }, [items, itemHeight, containerHeight, scrollTop])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop)
  }, [])

  return {
    ...visibleItems,
    containerRef,
    setContainerRef,
    handleScroll
  }
}

/**
 * Progressive Loading Hook
 * Veriyi aşamalı olarak yüklemek için kullanılır
 */
export function useProgressiveLoading(items = [], batchSize = 20, delay = 100) {
  const [displayedItems, setDisplayedItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    if (items.length === 0) {
      setDisplayedItems([])
      setHasMore(false)
      return
    }

    // İlk batch'i hemen göster
    setDisplayedItems(items.slice(0, batchSize))
    setHasMore(items.length > batchSize)
  }, [items, batchSize])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)

    // Simulate async loading delay
    await new Promise(resolve => setTimeout(resolve, delay))

    const currentLength = displayedItems.length
    const nextBatch = items.slice(currentLength, currentLength + batchSize)

    setDisplayedItems(prev => [...prev, ...nextBatch])
    setHasMore(currentLength + batchSize < items.length)
    setIsLoading(false)
  }, [items, displayedItems.length, batchSize, isLoading, hasMore, delay])

  return {
    displayedItems,
    isLoading,
    hasMore,
    loadMore
  }
}

/**
 * Debounced Search Hook
 * Arama performansını artırmak için debounce uygular
 */
export function useDebouncedSearch(searchTerm: string, delay: number = 300) {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, delay)

    return () => clearTimeout(handler)
  }, [searchTerm, delay])

  return debouncedTerm
}

/**
 * Memory Usage Monitoring Hook
 * Bellek kullanımını izler ve uyarı verir
 */
export function useMemoryMonitor(threshold: number = 50) { // MB
  const [memoryUsage, setMemoryUsage] = useState(0)
  const [isHighMemory, setIsHighMemory] = useState(false)

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (typeof performance !== 'undefined' && (performance as any).memory) {
      intervalId = setInterval(() => {
        const usage = (performance as any).memory.usedJSHeapSize / (1024 * 1024) // MB
        setMemoryUsage(Math.round(usage * 100) / 100)
        setIsHighMemory(usage > threshold)
      }, 5000) // Her 5 saniyede kontrol et
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [threshold])

  return {
    memoryUsage,
    isHighMemory
  }
}

/**
 * Cache Management Hook
 * Önbellek temizlik ve yönetimi için kullanılır
 */
export function useCacheManager() {
  const clearOldCache = useCallback(() => {
    // localStorage'daki eski cache'leri temizle
    const now = Date.now()
    const keys = Object.keys(localStorage)

    keys.forEach(key => {
      if (key.startsWith('cache-')) {
        try {
          const itemStr = localStorage.getItem(key)
          if (itemStr) {
            const item = JSON.parse(itemStr)
            if (item && item.timestamp && (now - item.timestamp > item.ttl)) {
              localStorage.removeItem(key)
            }
          }
        } catch {
          // Geçersiz cache item'ı sil
          localStorage.removeItem(key)
        }
      }
    })
  }, [])

  const getCacheSize = useCallback(() => {
    let totalSize = 0
    const keys = Object.keys(localStorage)

    keys.forEach(key => {
      const item = localStorage.getItem(key)
      if (item) {
        totalSize += item.length
      }
    })

    return Math.round(totalSize / 1024) // KB
  }, [])

  useEffect(() => {
    // Sayfa yüklendiğinde eski cache'leri temizle
    clearOldCache()

    // Her 10 dakikada bir temizle
    const intervalId = setInterval(clearOldCache, 10 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [clearOldCache])

  return {
    clearOldCache,
    getCacheSize
  }
}

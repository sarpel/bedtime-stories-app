import { apiResponseCache } from '@/utils/cache.js'

interface Story {
  id?: string | number
  story: string
  story_text?: string
  story_type?: string
  custom_topic?: string | null
  created_at?: string
  audio?: {
    file_name: string
  }
  audioUrl?: string | null
  is_favorite?: boolean | number
}

/**
 * Optimize edilmiş Database Service
 * - Query caching
 * - Batch operations
 * - Connection pooling
 * - Performance monitoring
 */

const API_BASE_URL = '/api'

class OptimizedDatabaseService {
  queryCache: any;
  pendingRequests: Map<string, Promise<any>>;
  performanceMetrics: {
    queryCount: number;
    cacheHits: number;
    cacheMisses: number;
    averageQueryTime: number;
  };

  constructor() {
    this.queryCache = apiResponseCache
    this.pendingRequests = new Map() // Duplicate request prevention
    this.performanceMetrics = {
      queryCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0
    }
  }

  // Cached fetch with duplicate request prevention
  async cachedFetch(url: string, options: any = {}, cacheKey: string | null = null, cacheTTL = 300000) {
    const startTime = Date.now()
    const key = cacheKey || `${url}:${JSON.stringify(options)}`
    if (import.meta.env?.DEV) {
      console.log('[DB] cachedFetch:start', { url, hasBody: !!options.body, cacheKey: key })
    }

    // Check cache first
    const cached = this.queryCache.get(key)
    if (cached) {
      this.performanceMetrics.cacheHits++
      console.log('[DB] cachedFetch:cacheHit', { url, cacheKey: key })
      return cached
    }

    // Check if same request is already pending
    if (this.pendingRequests.has(key)) {
      console.log('[DB] cachedFetch:pendingJoin', { url, cacheKey: key })
      return this.pendingRequests.get(key)
    }

    // Make the request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 10 second timeout

    const requestPromise = fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal,
      ...options
    }).then(async response => {
      clearTimeout(timeoutId)
      this.performanceMetrics.queryCount++
      this.performanceMetrics.cacheMisses++

      const queryTime = Date.now() - startTime
      this.performanceMetrics.averageQueryTime =
        (this.performanceMetrics.averageQueryTime + queryTime) / 2

      console.log('[DB] cachedFetch:response', { url, status: response.status, ms: queryTime })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()

      // Cache the result
      this.queryCache.set(key, data, cacheTTL)
      this.pendingRequests.delete(key)

      console.log('[DB] cachedFetch:success', { url, cacheKey: key })

      return data
    }).catch(error => {
      clearTimeout(timeoutId)
      this.pendingRequests.delete(key)
      console.log('[DB] cachedFetch:error', { url, message: error?.message })
      throw error
    })

    this.pendingRequests.set(key, requestPromise)
    return requestPromise
  }

  // Get all stories with optimizations
  async getAllStories(useCache = true) {
    const cacheKey = 'all-stories'

    if (!useCache) {
      this.queryCache.delete(cacheKey)
    }

    return this.cachedFetch(
      `${API_BASE_URL}/stories`,
      {},
      cacheKey,
      180000 // 3 minutes cache for story list
    )
  }

  // Get stories by type with caching
  async getStoriesByType(storyType: string, useCache = true) {
    const cacheKey = `stories-by-type:${storyType}`

    if (!useCache) {
      this.queryCache.delete(cacheKey)
    }

    // Backend route is /api/stories/type/:storyType
    return this.cachedFetch(
      `${API_BASE_URL}/stories/type/${encodeURIComponent(storyType)}`,
      {},
      cacheKey,
      300000 // 5 minutes cache
    )
  }

  // Get single story with caching
  async getStory(id: string, useCache = true) {
    const cacheKey = `story:${id}`

    if (!useCache) {
      this.queryCache.delete(cacheKey)
    }

    return this.cachedFetch(
      `${API_BASE_URL}/stories/${id}`,
      {},
      cacheKey,
      600000 // 10 minutes cache for individual stories
    )
  }

  // Batch create stories
  async createStories(storiesData: any) {
    const response = await fetch(`${API_BASE_URL}/stories/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stories: storiesData })
    })

    if (!response.ok) {
      throw new Error(`Batch create failed: ${response.status}`)
    }

    // Invalidate relevant caches
    this.invalidateStoryCaches()

    return response.json()
  }

  // Create story with cache invalidation
  async createStory(storyText: string, storyType: string, customTopic: string | null = null) {
    console.log('OptimizedDatabaseService.createStory called with:');
    console.log('storyText:', typeof storyText, storyText ? storyText.substring(0, 100) + '...' : 'null/undefined');
    console.log('storyType:', typeof storyType, storyType);
    console.log('customTopic:', typeof customTopic, customTopic);

    const requestBody = {
      storyText: storyText,
      storyType: storyType,
      customTopic: customTopic
    };

    console.log('Request body to send:', JSON.stringify(requestBody, null, 2));

    console.log('[DB] createStory:request', { url: `${API_BASE_URL}/stories` })
    const response = await fetch(`${API_BASE_URL}/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Story creation failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('[DB] createStory:success', { id: result?.id })

    // Invalidate relevant caches
    this.invalidateStoryCaches()

    return result
  }

  // Update story with cache invalidation
  async updateStory(id: string, storyText: string, storyType: string, customTopic: string | null = null) {
    console.log('[DB] updateStory:request', { id })
    const response = await fetch(`${API_BASE_URL}/stories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyText: storyText,
        storyType: storyType,
        customTopic: customTopic
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Story update failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('[DB] updateStory:success', { id })

    // Invalidate specific caches
    this.queryCache.delete(`story:${id}`)
    this.invalidateStoryCaches()

    return result
  }

  // Delete story with cache invalidation
  async deleteStory(id: string) {
    console.log('[DB] deleteStory:request', { id })
    try {
      const response = await fetch(`${API_BASE_URL}/stories/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DB] deleteStory:fetch_error_response', { status: response.status, errorText });
        throw new Error(`Story deletion failed: ${response.status} - ${errorText}`);
      }

      // Invalidate specific caches
      this.queryCache.delete(`story:${id}`)
      this.invalidateStoryCaches()

      const result = await response.json()
      console.log('[DB] deleteStory:success', { id })
      return result
    } catch (error) {
      console.error('[DB] deleteStory:fetch_exception', { message: (error as Error).message, error });
      throw error;
    }
  }

  // Batch delete stories
  async deleteStories(ids: string[]) {
    const response = await fetch(`${API_BASE_URL}/stories/batch`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })

    if (!response.ok) {
      throw new Error(`Batch delete failed: ${response.status}`)
    }

    // Invalidate specific caches
    ids.forEach((id: string) => this.queryCache.delete(`story:${id}`))
    this.invalidateStoryCaches()

    return response.json()
  }

  // Update story favorite status
  async updateStoryFavorite(id: string, isFavorite: boolean) {
    const response = await fetch(`${API_BASE_URL}/stories/${id}/favorite`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: isFavorite })
    })

    if (!response.ok) {
      throw new Error(`Favorite update failed: ${response.status}`)
    }

    // Invalidate specific caches
    this.queryCache.delete(`story:${id}`)
    this.invalidateStoryCaches()

    return response.json()
  }

  // Get recent stories with caching
  async getRecentStories(limit = 10) {
    const cacheKey = `recent-stories:${limit}`

    return this.cachedFetch(
      `${API_BASE_URL}/stories?limit=${limit}&sort=recent`,
      {},
      cacheKey,
      120000 // 2 minutes cache for recent stories
    )
  }

  // Get favorite stories with caching
  async getFavoriteStories() {
    const cacheKey = 'favorite-stories'

    return this.cachedFetch(
      `${API_BASE_URL}/stories?favorites=true`,
      {},
      cacheKey,
      300000 // 5 minutes cache
    )
  }

  // Search stories with caching
  async searchStories(query: string, options: any = {}) {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`

    const searchParams = new URLSearchParams({
      q: query,
      ...options
    })

    return this.cachedFetch(
      `${API_BASE_URL}/stories/search?${searchParams}`,
      {},
      cacheKey,
      600000 // 10 minutes cache for search results
    )
  }

  // Audio operations
  getAudioUrl(fileName: string) {
    if (!fileName) return null
    // Static audio files are served at /audio (not under /api)
    return `/audio/${fileName}`
  }

  // Cache management
  invalidateStoryCaches() {
    // Remove all story-related caches
    const keysToDelete: string[] = []

    // Collect cache keys to delete
    this.queryCache.cache.forEach((_: any, key: string) => {
      if (key.startsWith('all-stories') ||
        key.startsWith('stories-by-type') ||
        key.startsWith('recent-stories') ||
        key.startsWith('favorite-stories')) {
        keysToDelete.push(key)
      }
    })

    // Delete the keys
    keysToDelete.forEach((key: string) => this.queryCache.delete(key))
  }

  clearAllCaches() {
    this.queryCache.clear()
    this.pendingRequests.clear()
  }

  // Performance monitoring
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheStats: this.queryCache.getStats()
    }
  }

  // Preload commonly accessed data
  async preloadCommonData() {
    try {
      // Preload recent stories
      await this.getRecentStories(20)

      // Preload favorite stories
      await this.getFavoriteStories()

      console.log('Common data preloaded successfully')
    } catch (error) {
      console.error('Failed to preload common data:', error)
    }
  }

  // Migration helper - localStorage'daki verileri veritabanına taşı
  async migrateFromLocalStorage() {
    try {
      const localStorageData = localStorage.getItem('bedtime-stories-history')
      if (!localStorageData) {
        console.log('Taşınacak localStorage verisi bulunamadı.')
        return { migrated: 0, skipped: 0, errors: 0 }
      }

      const stories = JSON.parse(localStorageData)
      let migrated = 0
      let skipped = 0
      let errors = 0

      console.log(`${stories.length} masal localStorage'dan veritabanına taşınacak...`)

      for (const story of stories) {
        try {
          // Masalın zaten var olup olmadığını kontrol et
          const existingStories: Story[] = await this.getAllStories(false) // No cache for migration
          const exists = existingStories.some((existing: Story) =>
            existing.story_text === story.story &&
            existing.story_type === story.storyType
          )

          if (exists) {
            skipped++
            continue
          }

          // Yeni masal oluştur
          await this.createStory(story.story, story.storyType, story.customTopic)
          migrated++

          console.log(`Masal taşındı: ${story.storyType}`)
        } catch (error) {
          console.error('Masal taşıma hatası:', error)
          errors++
        }
      }

      return { migrated, skipped, errors }
    } catch (error) {
      console.error('Migration hatası:', error)
      throw error
    }
  }
}

// Singleton instance
export const optimizedDatabaseService = new OptimizedDatabaseService()
export default optimizedDatabaseService

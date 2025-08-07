// Önbellekleme sistemi - Performance Optimized

class Cache {
  constructor(maxSize = 100) { // Daha fazla öğe saklayalım
    this.cache = new Map()
    this.maxSize = maxSize
    this.hitCount = 0
    this.missCount = 0
  }

  // Öğe ekle - Performans iyileştirmeleri
  set(key, value, ttl = 3600000) { // Varsayılan 1 saat TTL
    const item = {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now()
    }
    
    this.cache.set(key, item)
    this.cleanup()
  }

  // Öğe getir - Hit/miss tracking ile
  get(key) {
    const item = this.cache.get(key)
    
    if (!item) {
      this.missCount++
      return null
    }
    
    // TTL kontrolü
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      this.missCount++
      return null
    }
    
    // Hit tracking
    this.hitCount++
    item.accessCount++
    item.lastAccess = Date.now()
    
    return item.value
  }

  // Öğe var mı kontrol et
  has(key) {
    return this.get(key) !== null
  }

  // Öğe sil
  delete(key) {
    return this.cache.delete(key)
  }

  // Tüm önbelleği temizle
  clear() {
    this.cache.clear()
    this.hitCount = 0
    this.missCount = 0
  }

  // Akıllı temizlik - LRU + Access count algoritması
  cleanup() {
    if (this.cache.size <= this.maxSize) return
    
    const entries = Array.from(this.cache.entries())
    const now = Date.now()
    
    // Önce süresi dolmuş öğeleri temizle
    const expiredItems = entries.filter(([, item]) => 
      now - item.timestamp > item.ttl
    )
    expiredItems.forEach(([key]) => this.cache.delete(key))
    
    // Hala boyut sınırını aşıyorsak, LRU + usage algoritması uygula
    if (this.cache.size > this.maxSize) {
      const remainingEntries = Array.from(this.cache.entries())
      
      // Score hesapla: accessCount / (süreyiBaşından/saats)
      const scored = remainingEntries.map(([key, item]) => ({
        key,
        score: item.accessCount / ((now - item.timestamp) / 3600000 + 1)
      }))
      
      // En düşük score'lu öğeleri sil
      scored
        .sort((a, b) => a.score - b.score)
        .slice(0, this.cache.size - this.maxSize)
        .forEach(({ key }) => this.cache.delete(key))
    }
  }

  // Geliştirilmiş istatistikler
  getStats() {
    const totalRequests = this.hitCount + this.missCount
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests * 100).toFixed(2) : 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
      memoryUsage: this.getMemoryUsage()
    }
  }
  
  // Yaklaşık bellek kullanımı hesapla
  getMemoryUsage() {
    let totalSize = 0
    this.cache.forEach((item, key) => {
      totalSize += key.length * 2 // Unicode characters are 2 bytes
      totalSize += JSON.stringify(item.value).length * 2
    })
    return Math.round(totalSize / 1024) // KB
  }
}

// Global önbellek instance'ları - Farklı türlerde içerik için optimize edilmiş
export const mainCache = new Cache(200) // Ana cache instance
export const storyContentCache = new Cache(200) // Masallar için büyük cache
export const audioContentCache = new Cache(50)  // Ses dosyaları için orta cache 
export const apiResponseCache = new Cache(100)   // API çağrıları için cache

// Masal önbellekleme için özel fonksiyonlar
export const storyCache = {
  // Masal önbellekleme anahtarı oluştur
  createKey(storyType, customTopic, settings) {
    const settingsHash = JSON.stringify({
      temperature: settings.llmSettings?.temperature,
      maxTokens: settings.llmSettings?.maxTokens,
      customPrompt: settings.customPrompt
    })
    return `story:${storyType}:${customTopic || 'default'}:${settingsHash}`
  },

  // Masalı önbellekle
  setStory(storyType, customTopic, settings, story) {
    const key = this.createKey(storyType, customTopic, settings)
    storyContentCache.set(key, story, 1800000) // 30 dakika TTL
  },

  // Önbellekten masal getir
  getStory(storyType, customTopic, settings) {
    const key = this.createKey(storyType, customTopic, settings)
    return storyContentCache.get(key)
  },

  // Masal önbellekte var mı kontrol et
  hasStory(storyType, customTopic, settings) {
    const key = this.createKey(storyType, customTopic, settings)
    return storyContentCache.has(key)
  },
  
  // Cache istatistikleri
  getStats() {
    return storyContentCache.getStats()
  },
  
  // Cache temizle
  clear() {
    storyContentCache.clear()
  }
}

// Ses önbellekleme için özel fonksiyonlar  
export const audioCache = {
  // Ses önbellekleme anahtarı oluştur
  createKey(text, voiceId, settings) {
    const settingsHash = JSON.stringify({
      speed: settings.voiceSettings?.speed,
      pitch: settings.voiceSettings?.pitch,
      volume: settings.voiceSettings?.volume
    })
    return `audio:${voiceId}:${text.substring(0, 100)}:${settingsHash}`
  },

  // Ses dosyasını önbellekle
  setAudio(text, voiceId, settings, audioUrl) {
    const key = this.createKey(text, voiceId, settings)
    audioContentCache.set(key, audioUrl, 7200000) // 2 saat TTL
  },

  // Önbellekten ses dosyası getir
  getAudio(text, voiceId, settings) {
    const key = this.createKey(text, voiceId, settings)
    return audioContentCache.get(key)
  },

  // Ses dosyası önbellekte var mı kontrol et
  hasAudio(text, voiceId, settings) {
    const key = this.createKey(text, voiceId, settings)
    return audioContentCache.has(key)
  },
  
  // Cache istatistikleri
  getStats() {
    return audioContentCache.getStats()
  },
  
  // Cache temizle
  clear() {
    audioContentCache.clear()
  }
}
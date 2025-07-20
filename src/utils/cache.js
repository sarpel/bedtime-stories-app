// Önbellekleme sistemi

class Cache {
  constructor() {
    this.cache = new Map()
    this.maxSize = 50 // Maksimum 50 öğe sakla
  }

  // Öğe ekle
  set(key, value, ttl = 3600000) { // Varsayılan 1 saat TTL
    const item = {
      value,
      timestamp: Date.now(),
      ttl
    }
    
    this.cache.set(key, item)
    this.cleanup()
  }

  // Öğe getir
  get(key) {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }
    
    // TTL kontrolü
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
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
  }

  // Boyut kontrolü ve temizlik
  cleanup() {
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries())
      
      // En eski öğeleri sil
      entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.cache.size - this.maxSize)
        .forEach(([key]) => this.cache.delete(key))
    }
  }

  // Önbellek istatistikleri
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    }
  }
}

// Global önbellek instance'ı
export const cache = new Cache()

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
    cache.set(key, story, 1800000) // 30 dakika TTL
  },

  // Önbellekten masal getir
  getStory(storyType, customTopic, settings) {
    const key = this.createKey(storyType, customTopic, settings)
    return cache.get(key)
  },

  // Masal önbellekte var mı kontrol et
  hasStory(storyType, customTopic, settings) {
    const key = this.createKey(storyType, customTopic, settings)
    return cache.has(key)
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
    cache.set(key, audioUrl, 7200000) // 2 saat TTL
  },

  // Önbellekten ses dosyası getir
  getAudio(text, voiceId, settings) {
    const key = this.createKey(text, voiceId, settings)
    return cache.get(key)
  },

  // Ses dosyası önbellekte var mı kontrol et
  hasAudio(text, voiceId, settings) {
    const key = this.createKey(text, voiceId, settings)
    return cache.has(key)
  }
}
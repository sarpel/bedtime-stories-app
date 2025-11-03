// Önbellekleme sistemi - Performance Optimized

interface CacheItem {
  value: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: string;
  hitCount: number;
  missCount: number;
  memoryUsage: number;
}

interface LLMSettings {
  temperature?: number;
  maxTokens?: number;
  customPrompt?: string;
}

interface VoiceSettings {
  speed?: number;
  pitch?: number;
  volume?: number;
}

interface StorySettings {
  llmSettings?: LLMSettings;
  customPrompt?: string;
}

interface AudioSettings {
  voiceSettings?: VoiceSettings;
}

class Cache {
  cache: Map<string, CacheItem>;
  maxSize: number;
  hitCount: number;
  missCount: number;

  constructor(maxSize: number = 100) {
    // Daha fazla öğe saklayalım
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hitCount = 0;
    this.missCount = 0;
  }

  // Öğe ekle - Performans iyileştirmeleri
  set(key: string, value: any, ttl: number = 3600000): void {
    // Varsayılan 1 saat TTL
    const item: CacheItem = {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now(),
    };

    this.cache.set(key, item);
    this.cleanup();
  }

  // Öğe getir - Hit/miss tracking ile
  get(key: string): any {
    const item = this.cache.get(key);

    if (!item) {
      this.missCount++;
      return null;
    }

    // TTL kontrolü
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Hit tracking
    this.hitCount++;
    item.accessCount++;
    item.lastAccess = Date.now();

    return item.value;
  }

  // Öğe var mı kontrol et
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Öğe sil
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Tüm önbelleği temizle
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  // Akıllı temizlik - LRU + Access count algoritması
  cleanup(): void {
    if (this.cache.size <= this.maxSize) return;

    const entries = Array.from(this.cache.entries());
    const now = Date.now();

    // Önce süresi dolmuş öğeleri temizle
    const expiredItems = entries.filter(
      ([, item]: [string, CacheItem]) => now - item.timestamp > item.ttl,
    );
    expiredItems.forEach(([key]: [string, CacheItem]) =>
      this.cache.delete(key),
    );

    // Hala boyut sınırını aşıyorsak, LRU + usage algoritması uygula
    if (this.cache.size > this.maxSize) {
      const remainingEntries = Array.from(this.cache.entries());

      // Score hesapla: accessCount / (süreyiBaşından/saats)
      const scored = remainingEntries.map(
        ([key, item]: [string, CacheItem]) => ({
          key,
          score: item.accessCount / ((now - item.timestamp) / 3600000 + 1),
        }),
      );

      // En düşük score'lu öğeleri sil
      scored
        .sort((a, b) => a.score - b.score)
        .slice(0, this.cache.size - this.maxSize)
        .forEach(({ key }) => this.cache.delete(key));
    }
  }

  // Geliştirilmiş istatistikler
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate:
        totalRequests > 0
          ? ((this.hitCount / totalRequests) * 100).toFixed(2)
          : "0",
      hitCount: this.hitCount,
      missCount: this.missCount,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  // Yaklaşık bellek kullanımı hesapla
  getMemoryUsage(): number {
    let totalSize = 0;
    this.cache.forEach((item: CacheItem, key: string) => {
      totalSize += key.length * 2; // Unicode characters are 2 bytes
      totalSize += JSON.stringify(item.value).length * 2;
    });
    return Math.round(totalSize / 1024); // KB
  }
}

// Global önbellek instance'ları - Farklı türlerde içerik için optimize edilmiş
export const mainCache = new Cache(200); // Ana cache instance
export const storyContentCache = new Cache(200); // Masallar için büyük cache
export const audioContentCache = new Cache(50); // Ses dosyaları için orta cache
export const apiResponseCache = new Cache(100); // API çağrıları için cache

// Masal önbellekleme için özel fonksiyonlar
export const storyCache = {
  // Masal önbellekleme anahtarı oluştur
  createKey(
    storyType: string,
    customTopic: string | null,
    settings: StorySettings,
  ): string {
    const settingsHash = JSON.stringify({
      temperature: settings.llmSettings?.temperature,
      maxTokens: settings.llmSettings?.maxTokens,
      customPrompt: settings.customPrompt,
    });
    return `story:${storyType}:${customTopic || "default"}:${settingsHash}`;
  },

  // Masalı önbellekle
  setStory(
    storyType: string,
    customTopic: string | null,
    settings: StorySettings,
    story: string,
  ): void {
    const key = this.createKey(storyType, customTopic, settings);
    storyContentCache.set(key, story, 1800000); // 30 dakika TTL
  },

  // Önbellekten masal getir
  getStory(
    storyType: string,
    customTopic: string | null,
    settings: StorySettings,
  ): string | null {
    const key = this.createKey(storyType, customTopic, settings);
    return storyContentCache.get(key);
  },

  // Masal önbellekte var mı kontrol et
  hasStory(
    storyType: string,
    customTopic: string | null,
    settings: StorySettings,
  ): boolean {
    const key = this.createKey(storyType, customTopic, settings);
    return storyContentCache.has(key);
  },

  // Cache istatistikleri
  getStats(): CacheStats {
    return storyContentCache.getStats();
  },

  // Cache temizle
  clear(): void {
    storyContentCache.clear();
  },
};

// Ses önbellekleme için özel fonksiyonlar
export const audioCache = {
  // Ses önbellekleme anahtarı oluştur
  createKey(text: string, voiceId: string, settings: AudioSettings): string {
    const settingsHash = JSON.stringify({
      speed: settings.voiceSettings?.speed,
      pitch: settings.voiceSettings?.pitch,
      volume: settings.voiceSettings?.volume,
    });
    return `audio:${voiceId}:${text.substring(0, 100)}:${settingsHash}`;
  },

  // Ses dosyasını önbellekle
  setAudio(
    text: string,
    voiceId: string,
    settings: AudioSettings,
    audioUrl: string,
  ): void {
    const key = this.createKey(text, voiceId, settings);
    audioContentCache.set(key, audioUrl, 7200000); // 2 saat TTL
  },

  // Önbellekten ses dosyası getir
  getAudio(
    text: string,
    voiceId: string,
    settings: AudioSettings,
  ): string | null {
    const key = this.createKey(text, voiceId, settings);
    return audioContentCache.get(key);
  },

  // Ses dosyası önbellekte var mı kontrol et
  hasAudio(text: string, voiceId: string, settings: AudioSettings): boolean {
    const key = this.createKey(text, voiceId, settings);
    return audioContentCache.has(key);
  },

  // Cache istatistikleri
  getStats(): CacheStats {
    return audioContentCache.getStats();
  },

  // Cache temizle
  clear(): void {
    audioContentCache.clear();
  },
};

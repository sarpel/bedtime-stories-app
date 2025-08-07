import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx'
import { 
  BarChart3, 
  Database, 
  Zap, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { useMemoryMonitor, useCacheManager } from '@/hooks/usePerformance.js'
import { storyCache, audioCache, apiResponseCache } from '@/utils/cache.js'

/**
 * Performance Monitoring Dashboard Component
 * Performans metrikleri ve cache yönetimi için
 */
export default function PerformanceMonitor({ onClose }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const { memoryUsage, isHighMemory } = useMemoryMonitor()
  const { clearOldCache, getCacheSize } = useCacheManager()
  
  // Cache stats
  const [cacheStats, setCacheStats] = useState({
    story: { size: 0, hitRate: 0, memoryUsage: 0 },
    audio: { size: 0, hitRate: 0, memoryUsage: 0 },
    api: { size: 0, hitRate: 0, memoryUsage: 0 }
  })
  
  useEffect(() => {
    const updateStats = () => {
      setCacheStats({
        story: storyCache.getStats(),
        audio: audioCache.getStats(),
        api: apiResponseCache.getStats()
      })
    }
    
    updateStats()
    const interval = setInterval(updateStats, 2000) // Update every 2 seconds
    
    return () => clearInterval(interval)
  }, [refreshKey])
  
  const handleClearCache = (cacheType) => {
    switch (cacheType) {
      case 'story':
        storyCache.clear()
        break
      case 'audio':
        audioCache.clear()
        break
      case 'api':
        apiResponseCache.clear()
        break
      case 'all':
        storyCache.clear()
        audioCache.clear()
        apiResponseCache.clear()
        clearOldCache()
        break
    }
    setRefreshKey(prev => prev + 1)
  }
  
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  const getTotalCacheSize = () => {
    return cacheStats.story.memoryUsage + 
           cacheStats.audio.memoryUsage + 
           cacheStats.api.memoryUsage
  }
  
  const getOverallHitRate = () => {
    const totalHits = 
      (cacheStats.story.hitCount || 0) +
      (cacheStats.audio.hitCount || 0) +
      (cacheStats.api.hitCount || 0)
    
    const totalRequests = 
      totalHits +
      (cacheStats.story.missCount || 0) +
      (cacheStats.audio.missCount || 0) +
      (cacheStats.api.missCount || 0)
    
    return totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(1) : 0
  }
  
  const getMemoryStatusColor = () => {
    if (memoryUsage > 100) return 'text-red-600'
    if (memoryUsage > 50) return 'text-yellow-600'
    return 'text-green-600'
  }
  
  const getMemoryStatusIcon = () => {
    if (isHighMemory) return <AlertTriangle className="h-4 w-4 text-red-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performans Monitörü
          </SheetTitle>
          <SheetDescription>
            Uygulama performansı ve önbellek durumu
          </SheetDescription>
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">{/* Memory Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Bellek Kullanımı
                {getMemoryStatusIcon()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">JS Heap</span>
                    <span className={`text-sm font-mono ${getMemoryStatusColor()}`}>
                      {memoryUsage} MB
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(memoryUsage * 2, 100)} 
                    className="h-2" 
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">LocalStorage</span>
                    <span className="text-sm font-mono">
                      {getCacheSize()} KB
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(getCacheSize() / 50, 100)} 
                    className="h-2" 
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Cache Efficiency</span>
                    <span className="text-sm font-mono text-green-600">
                      {getOverallHitRate()}%
                    </span>
                  </div>
                  <Progress 
                    value={getOverallHitRate()} 
                    className="h-2" 
                  />
                </div>
              </div>
              
              {isHighMemory && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Yüksek Bellek Kullanımı</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Önbellek temizliği yapmanız önerilir.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cache Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Önbellek İstatistikleri
                </CardTitle>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleClearCache('all')}
                  className="gap-2"
                >
                  <Trash2 className="h-3 w-3" />
                  Tümünü Temizle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Story Cache */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Masal Cache</h4>
                    <Badge variant="outline">
                      {cacheStats.story.size} items
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Hit Rate:</span>
                      <span className="font-mono">{cacheStats.story.hitRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory:</span>
                      <span className="font-mono">{cacheStats.story.memoryUsage} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hits:</span>
                      <span className="font-mono">{cacheStats.story.hitCount || 0}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => handleClearCache('story')}
                  >
                    Temizle
                  </Button>
                </div>

                {/* Audio Cache */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Ses Cache</h4>
                    <Badge variant="outline">
                      {cacheStats.audio.size} items
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Hit Rate:</span>
                      <span className="font-mono">{cacheStats.audio.hitRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory:</span>
                      <span className="font-mono">{cacheStats.audio.memoryUsage} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hits:</span>
                      <span className="font-mono">{cacheStats.audio.hitCount || 0}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => handleClearCache('audio')}
                  >
                    Temizle
                  </Button>
                </div>

                {/* API Cache */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">API Cache</h4>
                    <Badge variant="outline">
                      {cacheStats.api.size} items
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Hit Rate:</span>
                      <span className="font-mono">{cacheStats.api.hitRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory:</span>
                      <span className="font-mono">{cacheStats.api.memoryUsage} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hits:</span>
                      <span className="font-mono">{cacheStats.api.hitCount || 0}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => handleClearCache('api')}
                  >
                    Temizle
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Tips */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-4 w-4" />
                Performans İpuçları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-sm text-blue-800 mb-1">Önbellek Optimizasyonu</h5>
                  <p className="text-xs text-blue-700">
                    Hit rate %80'in üzerinde olmalıdır. Düşükse, cache TTL ayarlarını kontrol edin.
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h5 className="font-medium text-sm text-green-800 mb-1">Bellek Yönetimi</h5>
                  <p className="text-xs text-green-700">
                    Bellek kullanımı 50MB'ın üzerindeyse, kullanılmayan önbellekleri temizleyin.
                  </p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <h5 className="font-medium text-sm text-purple-800 mb-1">Veri Yönetimi</h5>
                  <p className="text-xs text-purple-700">
                    Toplam cache boyutu: {getTotalCacheSize()} KB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}

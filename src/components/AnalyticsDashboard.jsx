import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Volume2,
  Heart,
  AlertTriangle,
  Clock,
  Target,
  Activity,
  Download,
  RefreshCw,
  X
} from 'lucide-react'
import analyticsService from '@/services/analyticsService.js'
import { getStoryTypeName } from '@/utils/storyTypes.js'

export default function AnalyticsDashboard({ onClose }) {
  const [overview, setOverview] = useState(null)
  const [storyTypePopularity, setStoryTypePopularity] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const panelRef = useRef(null)

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const timeRangeOptions = [
    { value: '1d', label: 'Son 24 Saat' },
    { value: '7d', label: 'Son 7 Gün' },
    { value: '30d', label: 'Son 30 Gün' },
    { value: '90d', label: 'Son 90 Gün' }
  ]

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [overviewData, popularityData] = await Promise.all([
        analyticsService.getUsageOverview(),
        analyticsService.getStoryTypePopularity(selectedTimeRange)
      ])

      setOverview(overviewData)
      setStoryTypePopularity(popularityData)
    } catch (error) {
      console.error('Analytics yüklenirken hata:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedTimeRange])

  useEffect(() => {
    loadAnalyticsData()
  }, [selectedTimeRange, loadAnalyticsData])

  const handleTimeRangeChange = (newRange) => {
    setSelectedTimeRange(newRange)
  }

  const exportData = () => {
    try {
      const data = {
        overview,
        storyTypePopularity,
        timeRange: selectedTimeRange,
        exportedAt: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bedtime-stories-analytics-${selectedTimeRange}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Veri dışa aktarılırken hata:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2">
        <Card ref={panelRef} className="w-full max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-hidden scrollbar-thin border shadow-lg">
          <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b p-3 z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Analitik - Yükleniyor...
              </CardTitle>
              <Button variant="outline" onClick={onClose} size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-xs">Yükleniyor...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2">
        <Card ref={panelRef} className="w-full max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-hidden scrollbar-thin border shadow-lg">
          <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b p-3 z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Analitik
              </CardTitle>
              <Button variant="outline" onClick={onClose} size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Henüz analitik veri yok</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2">
      <Card ref={panelRef} className="w-full max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-hidden scrollbar-thin border shadow-lg">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b p-3 z-10">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Analitik
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={loadAnalyticsData} size="sm" disabled={isLoading} className="h-8 px-3">
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button variant="outline" onClick={exportData} size="sm" className="h-7 px-2">
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="outline" onClick={onClose} size="sm" className="h-7 px-2">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Time Range Selector - Kompakt */}
          <div className="flex gap-1 mt-1">
            {timeRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedTimeRange === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeRangeChange(option.value)}
                className="text-xs h-6 px-2"
              >
                {option.label.replace('Son ', '')}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-2">{/* Son güncelleme bilgisi kaldırıldı - yer tasarrufu */}
          <Tabs defaultValue="overview" className="space-y-2">
            <TabsList className="grid w-full grid-cols-4 h-7 text-xs">
              <TabsTrigger value="overview" className="text-xs">Genel</TabsTrigger>
              <TabsTrigger value="stories" className="text-xs">Masallar</TabsTrigger>
              <TabsTrigger value="audio" className="text-xs">Ses</TabsTrigger>
              <TabsTrigger value="errors" className="text-xs">Hatalar</TabsTrigger>
            </TabsList>

            {/* Overview Tab - Kompakt kart boyutları */}
            <TabsContent value="overview" className="space-y-2">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <Card className="p-2">
                  <div className="flex items-center justify-between space-y-0">
                    <div className="text-xs font-medium">Oturum</div>
                    <Users className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-bold">{overview.totalSessions}</div>
                </Card>

                <Card className="p-2">
                  <div className="flex items-center justify-between space-y-0">
                    <div className="text-xs font-medium">Masal</div>
                    <BookOpen className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-bold">{overview.story.total}</div>
                </Card>

                <Card className="p-2">
                  <div className="flex items-center justify-between space-y-0">
                    <div className="text-xs font-medium">Sesli</div>
                    <Volume2 className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-bold">{overview.audio.totalGenerated}</div>
                </Card>

                <Card className="p-2">
                  <div className="flex items-center justify-between space-y-0">
                    <div className="text-xs font-medium">Favori</div>
                    <Heart className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-bold">{overview.favorites.netFavorites}</div>
                </Card>
              </div>

              {/* Başarı Oranları - Kompakt */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <Card className="p-2">
                  <div className="text-xs font-medium mb-1">Masal Başarı: {overview.story.successRate}%</div>
                  <Progress value={overview.story.successRate} className="h-1" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>✓{overview.story.successful}</span>
                    <span>✗{overview.story.failed}</span>
                  </div>
                </Card>

                <Card className="p-2">
                  <div className="text-xs font-medium mb-1">Ses Başarı: {overview.audio.audioSuccessRate}%</div>
                  <Progress value={overview.audio.audioSuccessRate} className="h-1" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>✓{overview.audio.successfulGenerated}</span>
                    <span>✗{overview.audio.totalGenerated - overview.audio.successfulGenerated}</span>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Stories Tab - Kompakt */}
            <TabsContent value="stories" className="space-y-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <Card className="p-2">
                  <div className="text-xs font-medium mb-2">Popüler Türler</div>
                  <div className="space-y-1">
                    {storyTypePopularity.length > 0 ? (
                      storyTypePopularity.slice(0, 5).map((item, index) => (
                        <div key={item.type} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs px-1 py-0">#{index + 1}</Badge>
                            <span className="truncate">{getStoryTypeName(item.type)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{item.count}</span>
                            <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${(item.count / storyTypePopularity[0].count) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">Henüz veri yok</p>
                    )}
                  </div>
                </Card>

                <Card className="p-2">
                  <div className="text-xs font-medium mb-2">Performans</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Ort. Süre</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">
                          {overview.story.avgDuration > 0 ? `${(overview.story.avgDuration / 1000).toFixed(1)}s` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Başarılı</span>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-green-500" />
                        <span className="font-medium text-green-600">{overview.story.successful}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Başarısız</span>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span className="font-medium text-red-600">{overview.story.failed}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Audio Tab - Kompakt */}
            <TabsContent value="audio" className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Card className="p-2">
                  <div className="text-xs font-medium">Ses Oluşturma</div>
                  <div className="text-lg font-bold">{overview.audio.totalGenerated}</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">✓{overview.audio.successfulGenerated}</span>
                    <span className="text-red-600">✗{overview.audio.totalGenerated - overview.audio.successfulGenerated}</span>
                  </div>
                </Card>

                <Card className="p-2">
                  <div className="text-xs font-medium">Dinleme</div>
                  <div className="text-lg font-bold">{overview.audio.totalPlays}</div>
                  <div className="text-xs text-muted-foreground">
                    Tamamlanan: {overview.audio.completions}
                  </div>
                </Card>

                <Card className="p-2">
                  <div className="text-xs font-medium">Tamamlama</div>
                  <div className="text-lg font-bold">{overview.audio.completionRate}%</div>
                  <Progress value={overview.audio.completionRate} className="h-1 mt-1" />
                </Card>
              </div>
            </TabsContent>

            {/* Errors Tab - Kompakt */}
            <TabsContent value="errors" className="space-y-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <Card className="p-2">
                  <div className="text-xs font-medium mb-1">Toplam Hata</div>
                  <div className="text-lg font-bold text-red-600">{overview.errors.totalErrors}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedTimeRange === '1d' && '24 saatte'}
                    {selectedTimeRange === '7d' && '7 günde'}
                    {selectedTimeRange === '30d' && '30 günde'}
                    {selectedTimeRange === '90d' && '90 günde'}
                  </div>
                </Card>

                <Card className="p-2">
                  <div className="text-xs font-medium mb-1">Hata Türleri</div>
                  <div className="space-y-1">
                    {overview.errors.errorTypes.length > 0 ? (
                      overview.errors.errorTypes.slice(0, 3).map((error) => (
                        <div key={error.type} className="flex items-center justify-between text-xs">
                          <span className="capitalize truncate">{error.type}</span>
                          <Badge variant="destructive" className="text-xs px-1">{error.count}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">Hata yok! 🎉</p>
                    )}
                  </div>
                </Card>
              </div>

              {overview.errors.totalErrors === 0 && (
                <Card className="p-3">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🎉</div>
                    <div className="text-xs font-medium">Harika! Hiç hata yok</div>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

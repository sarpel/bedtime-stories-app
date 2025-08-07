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
  const [lastUpdated, setLastUpdated] = useState(new Date())
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
      setLastUpdated(new Date())
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
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card ref={panelRef} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  Analitik Panosu
                </CardTitle>
                <CardDescription>
                  Analitik veriler yükleniyor...
                </CardDescription>
              </div>
              <Button variant="outline" onClick={onClose} size="sm">
                <X className="h-4 w-4 mr-2" />
                Kapat
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="ml-3">Analitik veriler yükleniyor...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card ref={panelRef} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  Analitik Panosu
                </CardTitle>
                <CardDescription>
                  Uygulama kullanım istatistikleri ve performans metrikleri
                </CardDescription>
              </div>
              <Button variant="outline" onClick={onClose} size="sm">
                <X className="h-4 w-4 mr-2" />
                Kapat
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Henüz analitik veri yok</p>
              <p className="text-sm text-muted-foreground mt-2">
                Uygulama kullanıldıkça veriler burada görünecek
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card ref={panelRef} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Analitik Panosu
              </CardTitle>
              <CardDescription>
                Uygulama kullanım istatistikleri ve performans metrikleri
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadAnalyticsData} size="sm" disabled={isLoading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Yenile
              </Button>
              <Button variant="outline" onClick={exportData} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Dışa Aktar
              </Button>
              <Button variant="outline" onClick={onClose} size="sm">
                <X className="h-4 w-4 mr-2" />
                Kapat
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Time Range Selector */}
          <div className="flex gap-2 mb-6">
          {timeRangeOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedTimeRange === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeRangeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2 mt-4 mb-4">
          <Button variant="outline" size="sm" onClick={loadAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground mb-4">
          Son güncelleme: {lastUpdated.toLocaleString('tr-TR')}
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="stories">Masal İstatistikleri</TabsTrigger>
            <TabsTrigger value="audio">Ses İstatistikleri</TabsTrigger>
            <TabsTrigger value="errors">Hata Analizi</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Oturum</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.totalSessions}</div>
                  <p className="text-xs text-muted-foreground">
                    Benzersiz kullanım oturumları
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Masal</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.story.total}</div>
                  <p className="text-xs text-muted-foreground">
                    Oluşturulan masallar
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ses Oluşturma</CardTitle>
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.audio.totalGenerated}</div>
                  <p className="text-xs text-muted-foreground">
                    Seslendirilen masallar
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Favori Masallar</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.favorites.netFavorites}</div>
                  <p className="text-xs text-muted-foreground">
                    Favorilere eklenen
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Success Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Masal Oluşturma Başarı Oranı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Başarı Oranı</span>
                      <span>{overview.story.successRate}%</span>
                    </div>
                    <Progress value={overview.story.successRate} className="h-2" />
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                      <div>Başarılı: {overview.story.successful}</div>
                      <div>Başarısız: {overview.story.failed}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Ses Oluşturma Başarı Oranı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Başarı Oranı</span>
                      <span>{overview.audio.audioSuccessRate}%</span>
                    </div>
                    <Progress value={overview.audio.audioSuccessRate} className="h-2" />
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                      <div>Başarılı: {overview.audio.successfulGenerated}</div>
                      <div>Başarısız: {overview.audio.totalGenerated - overview.audio.successfulGenerated}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>          {/* Stories Tab */}
          <TabsContent value="stories" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Popüler Masal Türleri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {storyTypePopularity.length > 0 ? (
                      storyTypePopularity.slice(0, 5).map((item, index) => (
                        <div key={item.type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="text-sm">{getStoryTypeName(item.type)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{item.count}</div>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary"
                                style={{ 
                                  width: `${(item.count / storyTypePopularity[0].count) * 100}%` 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Henüz veri yok</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Performans Metrikleri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ortalama Oluşturma Süresi</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {overview.story.avgDuration > 0 
                            ? `${(overview.story.avgDuration / 1000).toFixed(1)}s`
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Toplam Başarılı Masal</span>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">
                          {overview.story.successful}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Başarısız Denemeler</span>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600">
                          {overview.story.failed}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Audio Tab */}
          <TabsContent value="audio" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Ses Oluşturma</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{overview.audio.totalGenerated}</div>
                    <p className="text-xs text-muted-foreground">Toplam deneme</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-green-600">Başarılı: {overview.audio.successfulGenerated}</span>
                      <span className="text-red-600">
                        Başarısız: {overview.audio.totalGenerated - overview.audio.successfulGenerated}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Dinleme İstatistikleri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{overview.audio.totalPlays}</div>
                    <p className="text-xs text-muted-foreground">Toplam oynatma</p>
                    <div className="text-xs text-muted-foreground">
                      Tamamlanan: {overview.audio.completions}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tamamlama Oranı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{overview.audio.completionRate}%</div>
                    <Progress value={overview.audio.completionRate} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Masalını sonuna kadar dinleme oranı
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Toplam Hata Sayısı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-red-600">
                      {overview.errors.totalErrors}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedTimeRange === '1d' && 'Son 24 saatte'}
                      {selectedTimeRange === '7d' && 'Son 7 günde'}
                      {selectedTimeRange === '30d' && 'Son 30 günde'}
                      {selectedTimeRange === '90d' && 'Son 90 günde'}
                      {' '}yaşanan hata sayısı
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Hata Türleri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {overview.errors.errorTypes.length > 0 ? (
                      overview.errors.errorTypes.slice(0, 5).map((error) => (
                        <div key={error.type} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{error.type}</span>
                          <Badge variant="destructive">{error.count}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Hata yok! 🎉</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {overview.errors.totalErrors === 0 && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-lg font-medium mb-2">Harika! Hiç hata yok</h3>
                    <p className="text-muted-foreground">
                      Seçtiğiniz zaman aralığında hiçbir hata kaydedilmedi.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
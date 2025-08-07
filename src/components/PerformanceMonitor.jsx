import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { X, Monitor, Cpu, HardDrive, Clock } from 'lucide-react';

const PerformanceMonitor = ({ isOpen, onClose }) => {
  const [performanceData, setPerformanceData] = useState({
    memoryUsage: 0,
    cacheSize: 0,
    loadTime: 0,
    apiCalls: 0,
    errors: 0
  });

  const [cacheStats, setCacheStats] = useState({
    totalItems: 0,
    hitRate: 85,
    missRate: 15,
    size: '2.4 MB'
  });

  const [recentLogs, setRecentLogs] = useState([
    { id: 1, time: '14:30:25', type: 'info', message: 'Hikaye başarıyla oluşturuldu' },
    { id: 2, time: '14:29:18', type: 'warning', message: 'TTS yanıt süresi yavaş' },
    { id: 3, time: '14:28:45', type: 'error', message: 'API bağlantı hatası' },
    { id: 4, time: '14:27:32', type: 'info', message: 'Önbellek temizlendi' }
  ]);

  useEffect(() => {
    if (isOpen) {
      // Mock performance data güncellemesi
      const interval = setInterval(() => {
        setPerformanceData(prev => ({
          memoryUsage: Math.floor(Math.random() * 100),
          cacheSize: Math.floor(Math.random() * 50) + 10,
          loadTime: Math.floor(Math.random() * 1000) + 500,
          apiCalls: prev.apiCalls + Math.floor(Math.random() * 3),
          errors: prev.errors + (Math.random() > 0.9 ? 1 : 0)
        }));
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const clearCache = () => {
    setCacheStats(prev => ({
      ...prev,
      totalItems: 0,
      size: '0 MB'
    }));
    
    setRecentLogs(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Önbellek başarıyla temizlendi'
    }, ...prev.slice(0, 9)]);
  };

  const refreshStats = () => {
    setPerformanceData({
      memoryUsage: Math.floor(Math.random() * 100),
      cacheSize: Math.floor(Math.random() * 50) + 10,
      loadTime: Math.floor(Math.random() * 1000) + 500,
      apiCalls: Math.floor(Math.random() * 100),
      errors: Math.floor(Math.random() * 10)
    });
    
    setRecentLogs(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Performans verileri yenilendi'
    }, ...prev.slice(0, 9)]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Performans İzleyici
              </CardTitle>
              <CardDescription>
                Uygulama performansını ve sistem kaynaklarını izleyin
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Bellek Kullanımı</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{performanceData.memoryUsage}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${performanceData.memoryUsage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Önbellek Boyutu</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{performanceData.cacheSize} MB</div>
                  <div className="text-sm text-muted-foreground">
                    İsabet Oranı: %{cacheStats.hitRate}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Yükleme Süresi</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{performanceData.loadTime}ms</div>
                  <Badge variant={performanceData.loadTime > 1000 ? "destructive" : "secondary"}>
                    {performanceData.loadTime > 1000 ? "Yavaş" : "Normal"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* API Stats */}
          <div>
            <h3 className="text-lg font-semibold mb-4">API İstatistikleri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Toplam API Çağrısı</span>
                    <Badge variant="outline">{performanceData.apiCalls}</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Hata Sayısı</span>
                    <Badge variant={performanceData.errors > 5 ? "destructive" : "secondary"}>
                      {performanceData.errors}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Cache Management */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Önbellek Yönetimi</h3>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={refreshStats}>
                  Yenile
                </Button>
                <Button variant="destructive" size="sm" onClick={clearCache}>
                  Önbelleği Temizle
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.totalItems}</div>
                <div className="text-sm text-muted-foreground">Öğe Sayısı</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.hitRate}%</div>
                <div className="text-sm text-muted-foreground">İsabet Oranı</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.missRate}%</div>
                <div className="text-sm text-muted-foreground">Kaçırma Oranı</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.size}</div>
                <div className="text-sm text-muted-foreground">Boyut</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Recent Logs */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Son Sistem Günlükleri</h3>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground font-mono">
                      {log.time}
                    </span>
                    <Badge 
                      variant={
                        log.type === 'error' ? 'destructive' : 
                        log.type === 'warning' ? 'secondary' : 
                        'outline'
                      }
                      className="text-xs"
                    >
                      {log.type.toUpperCase()}
                    </Badge>
                    <span className="text-sm flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;

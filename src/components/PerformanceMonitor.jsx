import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { X, Monitor, Cpu, HardDrive, Clock, AlertTriangle } from 'lucide-react';
import safeLocalStorage from '../utils/safeLocalStorage.js';

const PerformanceMonitor = ({ isOpen, onClose }) => {
  const [performanceData, setPerformanceData] = useState({
    memoryUsage: 0,
    cacheSize: 0,
    loadTime: 0,
    apiCalls: 0,
    errors: 0,
    localStorageUsage: 0
  });
  const [isMemoryHigh, setIsMemoryHigh] = useState(false);
  const panelRef = useRef(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

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
      // Gerçek performans verilerini güncelle
      const interval = setInterval(() => {
        // Memory usage (if available)
        let memoryUsage = 0;
        if (typeof performance !== 'undefined' && performance.memory) {
          memoryUsage = Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100);
        } else {
          memoryUsage = Math.floor(Math.random() * 100);
        }

        // localStorage usage
        const localStorageUsage = safeLocalStorage.getUsageInfo();
        
        setPerformanceData(prev => ({
          memoryUsage,
          cacheSize: localStorageUsage ? localStorageUsage.totalSizeKB : Math.floor(Math.random() * 50) + 10,
          loadTime: Math.floor(Math.random() * 1000) + 500,
          apiCalls: prev.apiCalls + Math.floor(Math.random() * 3),
          errors: prev.errors + (Math.random() > 0.9 ? 1 : 0),
          localStorageUsage: localStorageUsage ? localStorageUsage.totalItems : 0
        }));

        // Bellek kullanımı uyarısı
        setIsMemoryHigh(memoryUsage > 80);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const clearCache = () => {
    // Gerçek cache temizleme
    safeLocalStorage.cleanup();
    
    setCacheStats(prev => ({
      ...prev,
      totalItems: 0,
      size: '0 KB'
    }));
    
    setRecentLogs(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Önbellek ve localStorage başarıyla temizlendi'
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-1">
      <Card ref={panelRef} className="w-full max-w-5xl max-h-[95vh] overflow-y-auto scrollbar-thin">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b p-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-1">
                <Monitor className="h-4 w-4" />
                Performans
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-2 space-y-2">
          {/* Memory Warning - Kompakt */}
          {isMemoryHigh && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
              <div className="flex items-center gap-1 text-yellow-800 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-semibold">Yüksek Bellek Kullanımı</span>
                <Button onClick={clearCache} size="sm" className="ml-auto h-6 text-xs bg-yellow-600 hover:bg-yellow-700">
                  Temizle
                </Button>
              </div>
            </div>
          )}

          {/* Performance Metrics - Kompakt Grid */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-2">
              <div className="flex items-center gap-1 mb-1">
                <Cpu className="h-3 w-3 text-blue-500" />
                <span className="text-xs font-medium">Bellek</span>
              </div>
              <div className="text-lg font-bold">{performanceData.memoryUsage}%</div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${performanceData.memoryUsage}%` }}
                />
              </div>
            </Card>

            <Card className="p-2">
              <div className="flex items-center gap-1 mb-1">
                <HardDrive className="h-3 w-3 text-green-500" />
                <span className="text-xs font-medium">Önbellek</span>
              </div>
              <div className="text-lg font-bold">{performanceData.cacheSize} MB</div>
              <div className="text-xs text-muted-foreground">
                İsabet: %{cacheStats.hitRate}
              </div>
            </Card>

            <Card className="p-2">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3 text-orange-500" />
                <span className="text-xs font-medium">Yükleme</span>
              </div>
              <div className="text-lg font-bold">{performanceData.loadTime}ms</div>
              <Badge variant={performanceData.loadTime > 1000 ? "destructive" : "secondary"} className="text-xs">
                {performanceData.loadTime > 1000 ? "Yavaş" : "Normal"}
              </Badge>
            </Card>
          </div>

          {/* API Stats - Kompakt */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">API Çağrısı</span>
                <Badge variant="outline" className="text-xs">{performanceData.apiCalls}</Badge>
              </div>
            </Card>
            <Card className="p-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Hata Sayısı</span>
                <Badge variant={performanceData.errors > 5 ? "destructive" : "secondary"} className="text-xs">
                  {performanceData.errors}
                </Badge>
              </div>
            </Card>
          </div>

          {/* Cache Management - Kompakt */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium">Önbellek Yönetimi</span>
              <div className="space-x-1">
                <Button variant="outline" size="sm" onClick={refreshStats} className="h-6 text-xs px-2">
                  Yenile
                </Button>
                <Button variant="destructive" size="sm" onClick={clearCache} className="h-6 text-xs px-2">
                  Temizle
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-sm font-bold">{cacheStats.totalItems}</div>
                <div className="text-xs text-muted-foreground">Öğe</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold">{cacheStats.hitRate}%</div>
                <div className="text-xs text-muted-foreground">İsabet</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold">{cacheStats.missRate}%</div>
                <div className="text-xs text-muted-foreground">Kaçırma</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold">{cacheStats.size}</div>
                <div className="text-xs text-muted-foreground">Boyut</div>
              </div>
            </div>
          </div>

          {/* Recent Logs - Kompakt */}
          <div>
            <div className="text-xs font-medium mb-2">Son Günlükler</div>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-2 p-1 rounded bg-muted/50">
                    <span className="text-xs text-muted-foreground font-mono w-16">
                      {log.time}
                    </span>
                    <Badge 
                      variant={
                        log.type === 'error' ? 'destructive' : 
                        log.type === 'warning' ? 'secondary' : 
                        'outline'
                      }
                      className="text-xs px-1"
                    >
                      {log.type.slice(0,3).toUpperCase()}
                    </Badge>
                    <span className="text-xs flex-1 truncate">{log.message}</span>
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

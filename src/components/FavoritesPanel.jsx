import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import AudioControls from './AudioControls.jsx';
import {
  Heart,
  Trash2,
  Play,
  Volume2,
  Clock,
  Calendar,
  Sparkles,
  X,
} from 'lucide-react';
import { getStoryTypeName } from '@/utils/storyTypes.js';

export default function FavoritesPanel({
  favorites,
  onRemove,
  onClose,
  // Audio control props
  audioIsPlaying,
  audioIsPaused,
  audioProgress,
  audioDuration,
  audioVolume,
  audioIsMuted,
  audioPlaybackRate,
  audioCurrentStoryId,
  playAudio,
  stopAudio,
  audioToggleMute,
  setVolumeLevel,
  setPlaybackSpeed,
  seekTo,
}) {
  const panelRef = useRef(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReadingTime = (text) => {
    const wordsPerMinute = 150;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-2 sm:p-4">
      <Card ref={panelRef} className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg sm:text-2xl flex items-center gap-2">
                <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Favori Masallarım
              </CardTitle>
              <CardDescription className="text-sm">
                Beğendiğin masalları burada saklayabilirsin ({favorites.length} masal)
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onClose} size="sm" className="px-2 sm:px-3">
              <X className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Kapat</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          {favorites.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Heart className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-medium mb-2">Henüz favori masalın yok</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Masalları beğendiğinde kalp ikonuna tıklayarak favorilere ekleyebilirsin
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(95vh-150px)] sm:h-[calc(90vh-200px)]">
              <div className="space-y-2 sm:space-y-1">
                {favorites.map((favorite, index) => (
                  // # Yorum: key, sarmalayıcı div'e taşındı.
                  <div key={favorite.id}>
                    <div className="border rounded-lg hover:shadow-md transition-shadow p-3 sm:p-2">
                      <div className="space-y-2 sm:space-y-1">
                        {/* Başlık satırı - masal türü, süre, tarih ve kaldır butonu */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5">
                              {getStoryTypeName(favorite.storyType)}
                            </Badge>
                            {favorite.customTopic && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 max-w-20 truncate">
                                {favorite.customTopic}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs flex items-center gap-1 px-1.5 py-0.5 h-5">
                              <Clock className="h-2.5 w-2.5" />
                              {getReadingTime(favorite.story)}dk
                            </Badge>
                            <Badge variant="outline" className="text-xs flex items-center gap-1 px-1.5 py-0.5 h-5">
                              <Calendar className="h-2.5 w-2.5" />
                              {formatDate(favorite.createdAt)}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRemove(favorite.id)}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive h-6 px-2 w-full sm:w-auto"
                          >
                            <Trash2 className="h-2.5 w-2.5 mr-1" />
                            Kaldır
                          </Button>
                        </div>

                        {/* Masal içeriği ve audio controls */}
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                          <p className="text-xs sm:text-sm text-muted-foreground leading-tight line-clamp-3 sm:line-clamp-2 overflow-hidden flex-1">
                            {favorite.story.substring(0, 120)}...
                          </p>

                          {/* Audio controls eğer varsa */}
                          {favorite.audioUrl && (
                            <div className="flex-shrink-0 w-full sm:w-auto">
                              <AudioControls
                                storyId={favorite.id}
                                audioUrl={favorite.audioUrl}
                                isPlaying={audioIsPlaying}
                                isPaused={audioIsPaused}
                                progress={audioProgress}
                                duration={audioDuration}
                                volume={audioVolume}
                                isMuted={audioIsMuted}
                                playbackRate={audioPlaybackRate}
                                currentStoryId={audioCurrentStoryId}
                                onPlay={playAudio}
                                onStop={stopAudio}
                                onToggleMute={audioToggleMute}
                                onVolumeChange={setVolumeLevel}
                                onPlaybackSpeedChange={setPlaybackSpeed}
                                onSeek={seekTo}
                                size="xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* # Yorum: Separator, kartın dışına, ait olduğu yere taşındı. */}
                    {index < favorites.length - 1 && <Separator className="my-0.5" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
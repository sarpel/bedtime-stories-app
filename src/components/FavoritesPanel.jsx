import { useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import AudioControls from './AudioControls.jsx';
import {
  Heart,
  Trash2,
  Volume2,
  Play,
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

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-1">
      <Card ref={panelRef} className="w-full max-w-md sm:max-w-lg max-h-[95vh] overflow-y-auto scrollbar-thin">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b p-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-1">
                <Heart className="h-4 w-4 text-primary" />
                Favoriler ({favorites.length})
              </CardTitle>
            </div>
            <Button variant="outline" onClick={onClose} size="sm" className="h-7 px-2">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-2">
          {favorites.length === 0 ? (
            <div className="text-center py-4">
              <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm font-medium mb-1">Henüz favori masalın yok</div>
              <p className="text-muted-foreground text-xs">
                Masalları beğendiğinde kalp ikonuna tıklayarak favorilere ekleyebilirsin
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-1">
                {favorites.map((favorite, index) => (
                  <div key={favorite.id}>
                    <div className="border rounded p-2">
                      <div className="space-y-2">
                        {/* 1. Satır: Başlık, Tür, Tarih (Sol) + Aksiyon Butonları (Sağ) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <h3 className="text-sm font-medium truncate">{favorite.title || 'Özel Masal'}</h3>
                            <Badge variant="secondary" className="text-xs px-1 py-0 h-4 flex-shrink-0">
                              {getStoryTypeName(favorite.storyType)}
                            </Badge>
                            <Badge variant="outline" className="text-xs px-1 py-0 h-4 flex-shrink-0">
                              <Calendar className="h-2 w-2 mr-0.5" />
                              {formatDate(favorite.createdAt)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRemove(favorite.id)}
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive h-6 px-1.5 text-xs"
                            >
                              <Trash2 className="h-3 w-3 mr-0.5" />
                              Sil
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => playAudio(favorite.id, favorite.audioUrl)}
                              className="h-6 px-1.5 text-xs"
                              disabled={!favorite.audioUrl}
                            >
                              <Volume2 className="h-3 w-3 mr-0.5" />
                              Seslendir
                            </Button>
                          </div>
                        </div>

                        {/* 2. Satır: Önizleme (Sol) + Ses Kontrolleri (Sağ) */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-muted-foreground leading-tight line-clamp-2 flex-1">
                            {favorite.story.substring(0, 120)}...
                          </p>
                          {favorite.audioUrl && (
                            <div className="flex-shrink-0">
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
                    {index < favorites.length - 1 && <div className="h-px bg-border my-0.5" />}
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

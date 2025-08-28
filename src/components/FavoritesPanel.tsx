import { useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import AudioControls from './AudioControls';
import {
  Heart,
  Trash2,
  Volume2,
  Calendar,
  X,
} from 'lucide-react';
import { getStoryTypeName } from '@/utils/storyTypes.js';

// Favorite story interface
interface Favorite {
  id: string;
  story?: string;
  story_text?: string;
  story_type?: string;
  storyType?: string;
  custom_topic?: string | null;
  customTopic?: string | null;
  created_at?: string;
  createdAt?: string;
  audioUrl?: string | null;
  title?: string; // Add title property
}

// FavoritesPanel props interface
interface FavoritesPanelProps {
  favorites: Favorite[];
  onRemove: (id: string) => void;
  onClose: () => void;
  // Audio control props
  audioIsPlaying: boolean;
  audioIsPaused: boolean;
  audioProgress: number;
  audioDuration: number;
  audioVolume: number;
  audioIsMuted: boolean;
  audioPlaybackRate: number;
  audioCurrentStoryId: string;
  playAudio: (audioUrl: string, storyId: string) => void;
  stopAudio: () => void;
  audioToggleMute: () => void;
  setVolumeLevel: (volume: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  seekTo: (time: number) => void;
}

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
}: FavoritesPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const formatDate = (dateString: string | undefined) => {
    const date = new Date(dateString || Date.now());
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-1">
      <div ref={panelRef}>
        <Card className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg max-h-[95vh] overflow-y-auto scrollbar-thin">
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
                {favorites.map((favorite) => (
                  <Card key={favorite.id} className="p-2">
                    <div className="space-y-1">
                      {/* Başlık satırı - StoryManagementPanel ile aynı layout */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <span className="font-medium text-xs truncate max-w-[24ch]">{favorite.title || 'Özel Masal'}</span>
                          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                            {getStoryTypeName(favorite.storyType || favorite.story_type || '')}
                          </Badge>
                          {(favorite.custom_topic || favorite.customTopic) && (
                            <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                              {favorite.custom_topic || favorite.customTopic}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-2 w-2" />
                            {new Date((favorite.created_at || favorite.createdAt || Date.now())).toLocaleDateString('tr-TR')}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Audio Controls - StoryManagementPanel ile aynı */}
                          {favorite.audioUrl && (
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
                              onPause={() => {}} // Add missing onPause prop
                              onStop={stopAudio}
                              onToggleMute={audioToggleMute}
                              onVolumeChange={setVolumeLevel}
                              onPlaybackSpeedChange={setPlaybackSpeed}
                              onSeek={seekTo}
                              size="xs"
                              showAdvanced={false}
                            />
                          )}

                          {/* Generate Audio Button for stories without audio */}
                          {!favorite.audioUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => playAudio('', favorite.id)}
                              disabled={true}
                              className="h-5 px-1 text-xs"
                              title="Ses dosyası bulunamadı"
                            >
                              <Volume2 className="h-2 w-2 mr-1" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-6 w-6 p-0 hover:bg-destructive/10"
                            title="Favorilerden çıkar"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (window.confirm('Bu masalı favorilerden çıkarmak istediğinizden emin misiniz?')) {
                                onRemove(favorite.id)
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Masal içeriği - StoryManagementPanel ile aynı */}
                      <p className="text-xs text-muted-foreground line-clamp-1 leading-tight">
                        {(favorite.story || favorite.story_text || '').substring(0, 100)}...
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

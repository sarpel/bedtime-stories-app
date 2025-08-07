import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'
import AudioControls from './AudioControls.jsx'
import { 
  Heart, 
  Trash2, 
  Play, 
  Volume2, 
  Clock, 
  Calendar,
  Sparkles,
  X
} from 'lucide-react'
import { getStoryTypeName } from '@/utils/storyTypes.js'

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
  seekTo
  // onDownload, onBookmark kaldırıldı - çalışmayan özellikler
}) {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReadingTime = (text) => {
    const wordsPerMinute = 150
    const words = text.trim().split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return minutes
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Favori Masallarım
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Beğendiğin masalları burada saklayabilirsin
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-3">
          {favorites.length === 0 ? (
            <div className="p-8 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Henüz favori masalın yok</h3>
              <p className="text-muted-foreground">
                Masalları beğendiğinde kalp ikonuna tıklayarak favorilere ekleyebilirsin
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(95vh-120px)]">
              <div className="space-y-0.5">
                {favorites.map((favorite) => (
                  <Card key={favorite.id} className="hover:shadow-sm transition-shadow border-muted/40">
                    <CardContent className="p-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 leading-none">
                              {getStoryTypeName(favorite.storyType)}
                            </Badge>
                            {favorite.customTopic && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 leading-none">{favorite.customTopic}</Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 leading-none">
                              {getReadingTime(favorite.story)} dk
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                              {formatDate(favorite.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
                            {favorite.story.substring(0, 80)}...
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-0.5 shrink-0">
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
                              onStop={stopAudio}
                              onToggleMute={audioToggleMute}
                              onVolumeChange={setVolumeLevel}
                              onPlaybackSpeedChange={setPlaybackSpeed}
                              onSeek={seekTo}
                              // onDownload, onBookmark kaldırıldı - çalışmayan özellikler
                              size="sm"
                            />
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRemove(favorite.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            title="Favorilerden kaldır"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  )
}
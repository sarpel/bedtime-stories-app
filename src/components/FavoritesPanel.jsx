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
  audioCurrentStoryId,
  playAudio,
  stopAudio,
  audioToggleMute,
  setVolumeLevel,
  seekTo
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Heart className="h-6 w-6 text-red-500" />
                Favori Masallarım
              </CardTitle>
              <CardDescription>
                Beğendiğin masalları burada saklayabilirsin
              </CardDescription>
            </div>
            <Button onClick={onClose} variant="outline" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {favorites.length === 0 ? (
            <div className="p-8 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Henüz favori masalın yok</h3>
              <p className="text-muted-foreground">
                Masalları beğendiğinde kalp ikonuna tıklayarak favorilere ekleyebilirsin
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(90vh-120px)]">
              <div className="p-6 space-y-4">
                {favorites.map((favorite) => (
                  <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {getStoryTypeName(favorite.storyType)}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getReadingTime(favorite.story)} dk
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(favorite.createdAt)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {favorite.story.substring(0, 150)}...
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
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
                              currentStoryId={audioCurrentStoryId}
                              onPlay={playAudio}
                              onStop={stopAudio}
                              onToggleMute={audioToggleMute}
                              onVolumeChange={setVolumeLevel}
                              onSeek={seekTo}
                              size="sm"
                            />
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRemove(favorite.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {favorite.customTopic && (
                          <span className="block mb-1">
                            Özel Konu: {favorite.customTopic}
                          </span>
                        )}
                        <span>
                          {favorite.audioUrl ? 'Ses dosyası mevcut' : 'Ses dosyası yok'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
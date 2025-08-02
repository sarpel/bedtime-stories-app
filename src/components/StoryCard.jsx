import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { 
  Heart, 
  Share2, 
  Download, 
  Copy, 
  Volume2, 
  Clock, 
  BookOpen,
  Sparkles,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  X
} from 'lucide-react'
import { getStoryTypeName } from '@/utils/storyTypes.js'
import { shareStory, shareToSocialMedia, downloadStory } from '@/utils/share.js'

export default function StoryCard({ 
  story, 
  storyType, 
  customTopic = '',
  isGenerating, 
  progress, 
  audioUrl, 
  isPlaying, 
  audioProgress,
  audioDuration,
  onPlayAudio, 
  onPauseAudio, 
  onStopAudio, 
  onToggleMute, 
  isMuted,
  isFavorite,
  onToggleFavorite,
  onClearStory
}) {
  const [copied, setCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(story)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Kopyalama başarısız:', error)
    }
  }

  const handleShare = async () => {
    const result = await shareStory(story, storyType, customTopic)
    if (result.success && result.method === 'clipboard') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    downloadStory(story, storyType)
  }

  const handleSocialShare = (platform) => {
    shareToSocialMedia(story, storyType, platform)
    setShowShareMenu(false)
  }



  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getReadingTime = (text) => {
    const wordsPerMinute = 150
    const words = text.trim().split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return minutes
  }

  return (
    <Card className="mb-8 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Senin Masalın
              {isGenerating && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              )}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Türkçe</Badge>
              <Badge variant="outline">5 Yaş</Badge>
              <Badge variant="outline">Uyku Vakti</Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {getStoryTypeName(storyType)}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getReadingTime(story)} dk okuma
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFavorite}
              className={isFavorite ? 'text-red-500 hover:text-red-600' : ''}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg p-2 z-10 min-w-[200px]">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Paylaş
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    İndir
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={handleCopy}
                  >
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </Button>
                  <div className="border-t my-1" />
                  <div className="text-xs text-muted-foreground px-2 py-1">
                    Sosyal Medya
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={() => handleSocialShare('twitter')}
                  >
                    Twitter
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={() => handleSocialShare('whatsapp')}
                  >
                    WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Yükleme Durumu */}
        {isGenerating && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              Masal oluşturuluyor...
            </div>
            {progress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>İlerleme</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Masal İçeriği */}
        {!isGenerating && story && (
          <div className="space-y-4">
            <div className="relative">
              <Textarea
                value={story}
                readOnly
                className="min-h-[300px] text-base leading-relaxed resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                placeholder="Masalın burada görünecek..."
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearStory}
                className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                title="Metni temizle"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Aksiyon Butonları */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              {audioUrl && (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={isPlaying ? onPauseAudio : onPlayAudio}
                    size="sm"
                    variant="outline"
                  >
                    {isPlaying ? 'Duraklat' : 'Oynat'}
                  </Button>
                  <Button onClick={onStopAudio} size="sm" variant="outline">
                    Durdur
                  </Button>
                  <Button onClick={onToggleMute} size="sm" variant="outline">
                    {isMuted ? 'Sesi Aç' : 'Sustur'}
                  </Button>
                  {audioDuration > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(audioDuration * audioProgress / 100)} / {formatDuration(audioDuration)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Ses Progress */}
            {audioUrl && audioDuration > 0 && (
              <div className="space-y-2">
                <Progress value={audioProgress} className="h-1" />
              </div>
            )}
          </div>
        )}

        {/* Hata Durumu */}
        {!isGenerating && !story && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Henüz bir masal oluşturulmadı</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
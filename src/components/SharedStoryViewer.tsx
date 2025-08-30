import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Clock,
  Calendar,
  Share2,
  ArrowLeft,
  AlertCircle,
  Heart
} from 'lucide-react'
import { getStoryTypeName } from '@/utils/storyTypes'
import sharingService from '@/services/sharingService'
import AudioControls from '@/components/AudioControls'

// Story interface for type safety
interface Story {
  id?: string;
  story_text: string;
  story_type: string;
  custom_topic?: string | null;
  created_at: string;
  audio?: string | null;
}

export default function SharedStoryViewer() {
  const { shareId } = useParams()
  const navigate = useNavigate()

  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    const loadSharedStory = async () => {
      if (!shareId) {
        setError('Geçersiz paylaşım bağlantısı')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await sharingService.getSharedStory(shareId)

        if (result.success) {
          setStory(result.story)

          // Ses dosyası varsa URL'ini ayarla
          if (result.story.audio) {
            setAudioUrl(sharingService.getSharedAudioUrl(shareId))
          }
        } else {
          setError(result.error || 'Masal bulunamadı')
        }
      } catch (err) {
        console.error('Paylaşılan masal yükleme hatası:', err)
        setError('Masal yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    loadSharedStory()
  }, [shareId])

  const handleShareStory = async () => {
    if (!story) return

    const shareUrl = window.location.href

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Bedtime Story',
          text: `${getStoryTypeName(story.story_type)} Masalı`,
          url: shareUrl
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        // Basit bir feedback göster
        const button = document.querySelector('#share-button') as HTMLButtonElement | null
        if (button) {
          const originalText = button.textContent
          button.textContent = 'Kopyalandı!'
          setTimeout(() => {
            button.textContent = originalText
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Paylaşım hatası:', error)
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getReadingTime = (text: string): number => {
    const wordsPerMinute = 150
    const words = text.trim().split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return minutes
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Masal yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Masal Bulunamadı
            </CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/') } className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Ana Sayfa
          </Button>

          <Button
            id="share-button"
            variant="outline"
            onClick={handleShareStory}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Paylaş
          </Button>
        </div>

        {/* Story Card */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Paylaşılan Masal
                </CardTitle>

                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="secondary">
                    {story ? getStoryTypeName(story.story_type) : 'Bilinmiyor'}
                  </Badge>
                  {story?.custom_topic && (
                    <Badge variant="outline">
                      {story.custom_topic}
                    </Badge>
                  )}
                  {story?.audio && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Volume2 className="h-3 w-3" />
                      Sesli
                    </Badge>
                  )}
                </div>

                <CardDescription className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {story ? formatDate(story.created_at) : 'Bilinmiyor'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    ~{story ? getReadingTime(story.story_text) : 0} dk okuma
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Audio Controls */}
            {audioUrl && (
              <div className="mb-6">
                <AudioControls
                  storyId={story?.id || 'shared'}
                  audioUrl={audioUrl}
                  isPlaying={isPlaying}
                  isPaused={!isPlaying}
                  progress={audioProgress}
                  duration={audioDuration}
                  volume={1}
                  isMuted={isMuted}
                  playbackRate={1}
                  currentStoryId={story?.id || 'shared'}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onStop={() => {
                    setIsPlaying(false)
                    setAudioProgress(0)
                  }}
                  onToggleMute={() => setIsMuted(!isMuted)}
                  onVolumeChange={() => {}}
                  onPlaybackSpeedChange={() => {}}
                  onSeek={() => {}}
                  showAdvanced={false}
                />
              </div>
            )}

            {/* Story Text */}
            <div className="prose prose-lg max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {story?.story_text || 'Masal metni bulunamadı'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-muted-foreground text-sm">
          <p>Bu masal Bedtime Stories App ile oluşturulmuştur.</p>
          <Button
            variant="link"
            onClick={() => navigate('/')}
            className="text-sm p-0 h-auto mt-2"
          >
            Kendi masalınızı oluşturun
          </Button>
        </div>
      </div>
    </div>
  )
}

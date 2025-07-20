import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Moon, Settings, Sparkles, Heart, AlertCircle } from 'lucide-react'
import SettingsPanel from './components/Settings.jsx'
import StoryTypeSelector from './components/StoryTypeSelector.jsx'
import StoryCard from './components/StoryCard.jsx'
import FavoritesPanel from './components/FavoritesPanel.jsx'
import { LLMService } from './services/llmService.js'
import { TTSService } from './services/ttsService.js'
import { getStoryTypeName } from './utils/storyTypes.js'
import { getDefaultSettings, isConfigReady, validateConfig } from './services/configService.js'
import { useFavorites } from './hooks/useFavorites.js'
import { useStoryHistory } from './hooks/useStoryHistory.js'
import './App.css'

function App() {
  const [story, setStory] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [selectedStoryType, setSelectedStoryType] = useState('animals')
  const [customTopic, setCustomTopic] = useState('')
  const [error, setError] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const audioRef = useRef(null)

  const [settings, setSettings] = useState(getDefaultSettings())
  
  // Favori masallar hook'u
  const { favorites, toggleFavorite, removeFavorite, isFavorite } = useFavorites()
  
  // Masal geçmişi hook'u
  const { addToHistory, updateStoryAudio } = useStoryHistory()

  const generateStory = async () => {
    setIsGenerating(true)
    setStory('')
    setProgress(0)
    setError('')
    
    try {
      const llmService = new LLMService(settings)
      
      const story = await llmService.generateStory((progressValue) => {
        setProgress(progressValue)
      }, selectedStoryType, customTopic)
      
      setStory(story)
      
      // Masal geçmişine ekle
      addToHistory({
        story,
        storyType: selectedStoryType,
        customTopic
      })
    } catch (error) {
      console.error('Story generation failed:', error)
      
      // Show user-friendly error message
      let errorMessage = 'Masal oluşturulurken bir hata oluştu.'
      
      if (error.message.includes('OpenAI ayarları eksik')) {
        errorMessage = 'OpenAI API anahtarı eksik. Lütfen .env dosyasını kontrol edin.'
      } else if (error.message.includes('API hatası')) {
        errorMessage = 'OpenAI API\'sine bağlanırken hata oluştu. Lütfen internet bağlantınızı ve API anahtarınızı kontrol edin.'
      } else if (error.message.includes('yanıtından masal metni çıkarılamadı')) {
        errorMessage = 'OpenAI yanıtı işlenirken hata oluştu. Lütfen tekrar deneyin.'
      }
      
      setError(errorMessage)
      
      // Try to generate a fallback story
      try {
        const llmService = new LLMService(settings)
        const fallbackStory = llmService.generateFallbackStory()
        setStory(fallbackStory)
      } catch {
        setStory('')
      }
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  const generateAudio = async () => {
    if (!story) return
    
    setIsGeneratingAudio(true)
    setProgress(0)
    setError('')
    
    try {
      const ttsService = new TTSService(settings)
      
      const audioUrl = await ttsService.generateAudio(story, (progressValue) => {
        setProgress(progressValue)
      })
      
      // Clean up previous audio URL
      if (audioRef.current && audioRef.current.src) {
        TTSService.cleanupAudioUrl(audioRef.current.src)
      }
      
      setAudioUrl(audioUrl)
      
      // Masal geçmişindeki ses dosyasını güncelle
      if (story) {
        updateStoryAudio(Date.now(), audioUrl)
      }
      
      // Set up audio element
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.volume = settings.voiceSettings.volume
        audioRef.current.muted = isMuted
      }
      
    } catch (error) {
      console.error('Audio generation failed:', error)
      
      // Show user-friendly error message
      let errorMessage = 'Ses oluşturulurken bir hata oluştu.'
      
      if (error.message.includes('ElevenLabs ayarları eksik')) {
        errorMessage = 'ElevenLabs API anahtarı eksik. Lütfen .env dosyasını kontrol edin.'
      } else if (error.message.includes('API hatası')) {
        errorMessage = 'ElevenLabs API\'sine bağlanırken hata oluştu. Lütfen internet bağlantınızı ve API anahtarınızı kontrol edin.'
      } else if (error.message.includes('ses dosyası çıkarılamadı')) {
        errorMessage = 'ElevenLabs yanıtı işlenirken hata oluştu. Lütfen tekrar deneyin.'
      }
      
      setError(errorMessage)
    } finally {
      setIsGeneratingAudio(false)
      setProgress(0)
    }
  }

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setAudioProgress(0)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }

    const handlePause = () => {
      setIsPlaying(false)
      setIsPaused(true)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [audioUrl])

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        TTSService.cleanupAudioUrl(audioUrl)
      }
    }
  }, [audioUrl])

  const playAudio = () => {
    if (audioRef.current) {
      if (isPaused) {
        audioRef.current.play()
        setIsPaused(false)
      } else {
        audioRef.current.play()
      }
      setIsPlaying(true)
    }
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setIsPaused(true)
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setIsPaused(false)
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Moon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Uyku Masalları</h1>
              <p className="text-sm text-muted-foreground">Bedtime Stories</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFavorites(true)}
              className="gap-2"
            >
              <Heart className="h-4 w-4" />
              Favoriler ({favorites.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Ayarlar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Story Type Selector */}
        <StoryTypeSelector
          selectedType={selectedStoryType}
          customTopic={customTopic}
          onTypeChange={setSelectedStoryType}
          onCustomTopicChange={setCustomTopic}
        />

        {/* Story Generation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Masal Oluştur
            </CardTitle>
            <CardDescription>
              Sana özel bir uyku masalı oluşturmak için butona tıkla
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button 
                onClick={generateStory}
                disabled={isGenerating}
                className="flex-1"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2" />
                    Masal Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Yeni Masal Oluştur
                  </>
                )}
              </Button>
              {story && (
                <Button 
                  onClick={generateAudio}
                  disabled={isGenerating || isGeneratingAudio}
                  variant="outline"
                  size="lg"
                >
                  {isGeneratingAudio ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2" />
                      Ses Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Seslendir
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {(isGenerating || isGeneratingAudio) && progress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {isGenerating ? 'Masal oluşturuluyor...' : 'Ses oluşturuluyor...'}
                  </span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Story Card */}
        <StoryCard
          story={story}
          storyType={selectedStoryType}
          isGenerating={isGenerating}
          isGeneratingAudio={isGeneratingAudio}
          progress={progress}
          audioUrl={audioUrl}
          isPlaying={isPlaying}
          isPaused={isPaused}
          audioProgress={audioProgress}
          audioDuration={audioDuration}
          onGenerateAudio={generateAudio}
          onPlayAudio={playAudio}
          onPauseAudio={pauseAudio}
          onStopAudio={stopAudio}
          onToggleMute={toggleMute}
          isMuted={isMuted}
          isFavorite={story ? isFavorite({ story, storyType: selectedStoryType }) : false}
          onToggleFavorite={() => {
            if (story) {
              toggleFavorite({ 
                story, 
                storyType: selectedStoryType, 
                customTopic,
                audioUrl 
              })
            }
          }}
        />



        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Favorites Panel */}
        {showFavorites && (
          <FavoritesPanel
            favorites={favorites}
            onRemove={removeFavorite}
            onPlay={(favorite) => {
              // TODO: Favori masalı yükle ve seslendir
              console.log('Favori masal oynatılıyor:', favorite)
            }}
            onClose={() => setShowFavorites(false)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Tatlı rüyalar dileriz 💙</p>
        </div>
      </footer>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}

export default App


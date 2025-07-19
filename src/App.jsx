import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Moon, Settings, Play, Pause, Square, Volume2, VolumeX, Sparkles, Heart } from 'lucide-react'
import SettingsPanel from './components/Settings.jsx'
import { LLMService } from './services/llmService.js'
import { TTSService } from './services/ttsService.js'
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
  const audioRef = useRef(null)

  const [settings, setSettings] = useState({
    llmEndpoint: '',
    llmModelId: '',
    llmApiKey: '',
    ttsEndpoint: '',
    ttsModelId: '',
    voiceId: '',
    ttsApiKey: '',
    customPrompt: '5 yaşındaki bir türk kız çocuğu için uyku vaktinde okunmak üzere, uyku getirici ve kazanması istenen temel erdemleri de ders niteliğinde hikayelere iliştirecek şekilde masal yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.',
    storyLength: 'medium',
    voiceSettings: {
      speed: 0.9,
      pitch: 1.0,
      volume: 0.75
    }
  })

  const generateStory = async () => {
    setIsGenerating(true)
    setStory('')
    setProgress(0)
    
    try {
      const llmService = new LLMService(settings)
      
      const story = await llmService.generateStory((progressValue) => {
        setProgress(progressValue)
      })
      
      setStory(story)
    } catch (error) {
      console.error('Story generation failed:', error)
      
      // Show user-friendly error message
      let errorMessage = 'Masal oluşturulurken bir hata oluştu.'
      
      if (error.message.includes('LLM ayarları eksik')) {
        errorMessage = 'LLM ayarları eksik. Lütfen ayarlar panelinden endpoint, model ID ve API anahtarını yapılandırın.'
      } else if (error.message.includes('API hatası')) {
        errorMessage = 'LLM API\'sine bağlanırken hata oluştu. Lütfen ayarları kontrol edin.'
      } else if (error.message.includes('yanıtından masal metni çıkarılamadı')) {
        errorMessage = 'LLM yanıtı işlenirken hata oluştu. API yanıt formatını kontrol edin.'
      }
      
      // Try to generate a fallback story
      try {
        const llmService = new LLMService(settings)
        const fallbackStory = llmService.generateFallbackStory()
        setStory(`${errorMessage}\n\nBu arada size güzel bir masal:\n\n${fallbackStory}`)
      } catch (fallbackError) {
        setStory(errorMessage + ' Lütfen ayarları kontrol edin ve tekrar deneyin.')
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
      
      if (error.message.includes('TTS ayarları eksik')) {
        errorMessage = 'TTS ayarları eksik. Lütfen ayarlar panelinden endpoint, model ID ve API anahtarını yapılandırın.'
      } else if (error.message.includes('API hatası')) {
        errorMessage = 'TTS API\'sine bağlanırken hata oluştu. Lütfen ayarları kontrol edin.'
      } else if (error.message.includes('ses dosyası çıkarılamadı')) {
        errorMessage = 'TTS yanıtı işlenirken hata oluştu. API yanıt formatını kontrol edin.'
      }
      
      alert(errorMessage)
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
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Welcome Card */}
        <Card className="mb-8 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/20 rounded-full">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl mb-2">Hoş Geldin, Küçük Prenses!</CardTitle>
            <CardDescription className="text-lg">
              Sana özel masallar oluşturmaya hazırım. Hangi konuda bir masal duymak istersin?
            </CardDescription>
          </CardHeader>
        </Card>

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

        {/* Story Display */}
        {story && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Senin Masalın</CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">Türkçe</Badge>
                <Badge variant="outline">5 Yaş</Badge>
                <Badge variant="outline">Uyku Vakti</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={story}
                readOnly
                className="min-h-[300px] text-base leading-relaxed resize-none"
                placeholder="Masalın burada görünecek..."
              />
            </CardContent>
          </Card>
        )}

        {/* Audio Player */}
        {audioUrl && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-primary" />
                Masal Dinle
              </CardTitle>
              <CardDescription>
                Masalını dinlemek için oynatma butonuna tıkla
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex gap-2">
                  {!isPlaying ? (
                    <Button onClick={playAudio} size="sm" disabled={!audioUrl}>
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={pauseAudio} size="sm">
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  <Button onClick={stopAudio} size="sm" variant="outline" disabled={!audioUrl}>
                    <Square className="h-4 w-4" />
                  </Button>
                  <Button onClick={toggleMute} size="sm" variant="outline" disabled={!audioUrl}>
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-1 flex justify-between">
                    <span>
                      {!audioUrl ? 'Ses dosyası hazır değil' : 
                       isPlaying ? 'Oynatılıyor...' : 
                       isPaused ? 'Duraklatıldı' : 'Hazır'}
                    </span>
                    {audioDuration > 0 && (
                      <span>
                        {Math.floor((audioDuration * audioProgress / 100) / 60)}:
                        {Math.floor((audioDuration * audioProgress / 100) % 60).toString().padStart(2, '0')} / 
                        {Math.floor(audioDuration / 60)}:
                        {Math.floor(audioDuration % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <Progress value={audioProgress} className="h-1" />
                </div>
              </div>
              <audio ref={audioRef} className="hidden" />
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Tatlı rüyalar dileriz 💙</p>
        </div>
      </footer>
    </div>
  )
}

export default App


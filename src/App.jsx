import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Moon, Settings, Sparkles, Heart, AlertCircle, Volume2, BookOpen, X } from 'lucide-react'
import SettingsPanel from './components/Settings.jsx'
import StoryTypeSelector from './components/StoryTypeSelector.jsx'
import StoryCard from './components/StoryCard.jsx'
import FavoritesPanel from './components/FavoritesPanel.jsx'
import StoryManagementPanel from './components/StoryManagementPanel.jsx'
import AudioControls from './components/AudioControls.jsx'
import { LLMService } from './services/llmService.js'
import { TTSService } from './services/ttsService.js'
import { getDefaultSettings } from './services/configService.js'
import { useFavorites } from './hooks/useFavorites.js'
import { useStoryHistory } from './hooks/useStoryHistory.js'
import { useStoryDatabase } from './hooks/useStoryDatabase.js'
import { useAudioPlayer } from './hooks/useAudioPlayer.js'
import { getStoryTypeLabel } from './utils/storyTypes.js'
import ApiKeyHelp from './components/ApiKeyHelp.jsx'
import './App.css'

function App() {
  const [story, setStory] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [selectedStoryType, setSelectedStoryType] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [error, setError] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [showApiKeyHelp, setShowApiKeyHelp] = useState(false)
  const [showStoryManagement, setShowStoryManagement] = useState(false)
  // Son oluşturulan masalın geçmiş ID'si
  const [currentStoryId, setCurrentStoryId] = useState(null)

  const [settings, setSettings] = useState(() => {
    // localStorage'dan ayarları yükle
    const savedSettings = localStorage.getItem('bedtime-stories-settings')
    if (savedSettings) {
      try {
        return { ...getDefaultSettings(), ...JSON.parse(savedSettings) }
      } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error)
        return getDefaultSettings()
      }
    }
    return getDefaultSettings()
  })
  
  // Ayarları localStorage'a kaydet
  const updateSettings = (newSettings) => {
    setSettings(newSettings)
    localStorage.setItem('bedtime-stories-settings', JSON.stringify(newSettings))
  }
  
  // Favori masallar hook'u
  const { favorites, toggleFavorite, removeFavorite, isFavorite } = useFavorites()
  
  // Masal geçmişi hook'u (localStorage için backward compatibility)
  const { history, addToHistory, updateStoryAudio, updateStory, removeFromHistory, clearHistory } = useStoryHistory()

  // Veritabanı hook'u (yeni sistem)
  const { 
    stories: dbStories, 
    createStory: createDbStory,
    updateStory: updateDbStory,
    deleteStory: deleteDbStory,
    getAudioUrl: getDbAudioUrl
  } = useStoryDatabase()

  // Audio player hook'u
  const {
    isPlaying: audioIsPlaying,
    isPaused: audioIsPaused,
    progress: audioProgress,
    duration: audioDuration,
    volume: audioVolume,
    isMuted: audioIsMuted,
    currentStoryId: audioCurrentStoryId,
    playAudio,
    stopAudio,
    toggleMute: audioToggleMute,
    setVolumeLevel,
    seekTo,
    audioRef: globalAudioRef
  } = useAudioPlayer()

  // Hybrid update function - veritabanı varsa onu kullan, yoksa localStorage
  const hybridUpdateStory = async (id, updates) => {
    try {
      // Eğer dbStories'te varsa veritabanından güncelle
      const dbStory = dbStories.find(s => s.id === id)
      if (dbStory) {
        await updateDbStory(id, updates.story, dbStory.story_type, updates.customTopic)
      } else {
        // Backward compatibility için localStorage
        updateStory(id, updates)
      }
    } catch (error) {
      console.error('Masal güncelleme hatası:', error)
      // Fallback to localStorage
      updateStory(id, updates)
    }
  }

  // Hybrid delete function
  const hybridDeleteStory = async (id) => {
    try {
      // Eğer dbStories'te varsa veritabanından sil
      const dbStory = dbStories.find(s => s.id === id)
      if (dbStory) {
        await deleteDbStory(id)
      } else {
        // Backward compatibility için localStorage
        removeFromHistory(id)
      }
    } catch (error) {
      console.error('Masal silme hatası:', error)
      // Fallback to localStorage
      removeFromHistory(id)
    }
  }

  const generateStory = async () => {
    // Hem selectedStoryType hem de customTopic boşsa masal oluşturma
    if (!selectedStoryType && !customTopic.trim()) {
      setError('Lütfen bir masal türü seçin veya özel bir konu yazın.')
      return
    }

    setIsGenerating(true)
    setStory('')
    setProgress(0)
    setError('')
    
    try {
      const llmService = new LLMService(settings)
      
      // Eğer customTopic varsa onu kullan, yoksa selectedStoryType kullan
      const storyTypeToUse = customTopic.trim() ? 'custom' : selectedStoryType
      const topicToUse = customTopic.trim() || ''
      
      const story = await llmService.generateStory((progressValue) => {
        setProgress(progressValue)
      }, storyTypeToUse, topicToUse)
      
      setStory(story)
      
      // Veritabanına kaydet
      try {
        const dbStory = await createDbStory(story, storyTypeToUse, topicToUse)
        setCurrentStoryId(dbStory.id)
        console.log('Masal veritabanına kaydedildi:', dbStory.id)
      } catch (dbError) {
        console.error('Veritabanına kaydetme hatası:', dbError)
        
        // Fallback olarak localStorage kullan
        const id = addToHistory({
          story,
          storyType: storyTypeToUse,
          customTopic: topicToUse
        })
        setCurrentStoryId(id)
      }
      
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
      
      // Story ID'si ile ses oluştur (veritabanına kaydedilir)
      const audioUrl = await ttsService.generateAudio(story, (progressValue) => {
        setProgress(progressValue)
      }, currentStoryId)
      
      setAudioUrl(audioUrl)
      
      // Backward compatibility için localStorage'a da kaydet
      if (currentStoryId) {
        updateStoryAudio(currentStoryId, audioUrl)
      }
      
    } catch (error) {
      console.error('Audio generation failed:', error)
      
      // Show user-friendly error message
      let errorMessage = 'Ses oluşturulurken bir hata oluştu.'
      
      if (error.message.includes('ElevenLabs ayarları eksik') || error.message.includes('API anahtarı eksik')) {
        errorMessage = 'ElevenLabs API anahtarı eksik. Lütfen .env dosyasında ELEVENLABS_API_KEY değerini ayarlayın.'
      } else if (error.message.includes('API hatası') || error.message.includes('401')) {
        errorMessage = 'ElevenLabs API anahtarı geçersiz. Lütfen ElevenLabs hesabınızdan doğru API anahtarını alın.'
      } else if (error.message.includes('ses dosyası çıkarılamadı')) {
        errorMessage = 'ElevenLabs yanıtı işlenirken hata oluştu. Lütfen tekrar deneyin.'
      }
      
      setError(errorMessage)
    } finally {
      setIsGeneratingAudio(false)
      setProgress(0)
    }
  }

  const clearStory = () => {
    setStory('')
    setAudioUrl('')
    setCurrentStoryId(null)
    setError('')
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
              onClick={() => setShowStoryManagement(true)}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Masal Yönetimi ({dbStories.length > 0 ? dbStories.length : history.length})
            </Button>
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
          onGenerateStory={generateStory}
          onGenerateAudio={generateAudio}
          isGenerating={isGenerating}
          isGeneratingAudio={isGeneratingAudio}
          story={story}
          progress={progress}
        />

        {/* Story Card */}
        <StoryCard
          story={story}
          storyType={selectedStoryType}
          customTopic={customTopic}
          isGenerating={isGenerating}
          progress={progress}
          audioUrl={audioUrl}
          onClearStory={clearStory}
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

        {/* Audio Controls for Generated Story */}
        {audioUrl && (
          <Card className="mb-8">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ses Kontrolleri</h3>
              </div>
              <div className="mt-4">
                <AudioControls
                  storyId={currentStoryId}
                  audioUrl={audioUrl}
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
                />
              </div>
            </CardContent>
          </Card>
        )}



        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
                {(error.includes('API anahtarı') || error.includes('ElevenLabs') || error.includes('OpenAI')) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowApiKeyHelp(true)}
                  >
                    Yardım Al
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Story Management Panel */}
        {showStoryManagement && (
          <StoryManagementPanel
            history={dbStories.length > 0 ? dbStories.map(dbStory => ({
              id: dbStory.id,
              story: dbStory.story_text,
              storyType: dbStory.story_type,
              customTopic: dbStory.custom_topic,
              createdAt: dbStory.created_at,
              audioUrl: dbStory.audio ? getDbAudioUrl(dbStory.audio.file_name) : null,
              audioGenerated: !!dbStory.audio
            })) : history}
            onUpdateStory={hybridUpdateStory}
            onDeleteStory={hybridDeleteStory}
            onClearHistory={clearHistory}
            onClose={() => setShowStoryManagement(false)}
            settings={settings}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
        )}

        {/* Settings Panel */}
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onSettingsChange={updateSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Favorites Panel */}
        {showFavorites && (
          <FavoritesPanel
            favorites={favorites}
            onRemove={removeFavorite}
            onClose={() => setShowFavorites(false)}
            // Audio control props
            audioIsPlaying={audioIsPlaying}
            audioIsPaused={audioIsPaused}
            audioProgress={audioProgress}
            audioDuration={audioDuration}
            audioVolume={audioVolume}
            audioIsMuted={audioIsMuted}
            audioCurrentStoryId={audioCurrentStoryId}
            playAudio={playAudio}
            stopAudio={stopAudio}
            audioToggleMute={audioToggleMute}
            setVolumeLevel={setVolumeLevel}
            seekTo={seekTo}
          />
        )}

        {/* API Key Help Panel */}
        {showApiKeyHelp && (
          <ApiKeyHelp onClose={() => setShowApiKeyHelp(false)} />
        )}

        {/* Story Management Section */}
        {(dbStories.length > 0 || history.length > 0) && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Masal Koleksiyonum
                  </CardTitle>
                  <CardDescription>
                    Kaydettiğiniz masalları yönetin, düzenleyin ve dinleyin
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowStoryManagement(true)}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Tümünü Yönet
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 max-h-64 overflow-y-auto">
                {(dbStories.length > 0 ? dbStories : history).slice(0, 3).map((story) => (
                  <div key={story.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {getStoryTypeLabel(story.story_type || story.storyType)}
                        </Badge>
                        {(story.custom_topic || story.customTopic) && (
                          <Badge variant="outline" className="text-xs">
                            {story.custom_topic || story.customTopic}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {(story.story_text || story.story).substring(0, 80)}...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(story.created_at || story.createdAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-3">
                      {/* Favorite Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite({
                          story: story.story_text || story.story,
                          storyType: story.story_type || story.storyType,
                          customTopic: story.custom_topic || story.customTopic,
                          audioUrl: story.audio ? getDbAudioUrl(story.audio.file_name) : story.audioUrl
                        })}
                        className={`h-8 w-8 p-0 ${
                          isFavorite({ 
                            story: story.story_text || story.story, 
                            storyType: story.story_type || story.storyType 
                          }) 
                          ? 'text-red-500 hover:text-red-600' 
                          : 'hover:text-red-500'
                        }`}
                        title="Favorilere ekle/çıkar"
                      >
                        <Heart className={`h-3 w-3 ${
                          isFavorite({ 
                            story: story.story_text || story.story, 
                            storyType: story.story_type || story.storyType 
                          }) 
                          ? 'fill-current' 
                          : ''
                        }`} />
                      </Button>
                      
                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => hybridDeleteStory(story.id)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        title="Masalı sil"
                      >
                        <X className="h-3 w-3" />
                      </Button>

                      {(story.audio || story.audioUrl) && (
                        <AudioControls
                          storyId={story.id}
                          audioUrl={story.audio ? getDbAudioUrl(story.audio.file_name) : story.audioUrl}
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
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setStory(story.story_text || story.story)
                          setSelectedStoryType(story.story_type || story.storyType)
                          setCustomTopic(story.custom_topic || story.customTopic || '')
                          const audioSrc = story.audio ? getDbAudioUrl(story.audio.file_name) : story.audioUrl;
                          if (audioSrc) {
                            setAudioUrl(audioSrc)
                          }
                        }}
                        className="h-8 w-8 p-0"
                        title="Masalı görüntüle"
                      >
                        <BookOpen className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(dbStories.length > 3 || history.length > 3) && (
                  <Button
                    variant="ghost"
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setShowStoryManagement(true)}
                  >
                    +{(dbStories.length > 0 ? dbStories.length : history.length) - 3} masal daha görüntüle
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Tatlı rüyalar dileriz 💙</p>
        </div>
      </footer>

      {/* Hidden Audio Element */}
      <audio ref={globalAudioRef} className="hidden" />
    </div>
  )
}

export default App


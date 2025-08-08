import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Moon, Settings, Sparkles, Heart, AlertCircle, Volume2, BookOpen, X, BarChart3, Zap } from 'lucide-react'
import SettingsPanel from './components/Settings.jsx'
import StoryCreator from './components/StoryCreator.jsx'
import FavoritesPanel from './components/FavoritesPanel.jsx'
import StoryManagementPanel from './components/StoryManagementPanel.jsx'
import AudioControls from './components/AudioControls.jsx'
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx'
import PerformanceMonitor from './components/PerformanceMonitor.jsx'
import StoryQueuePanel from './components/StoryQueuePanel.jsx'
import { LLMService } from './services/llmService.js'
import { TTSService } from './services/ttsService.js'
import { getDefaultSettings } from './services/configService.js'
import analyticsService from './services/analyticsService.js'
import useFavorites from './hooks/useFavorites.js'
import { useStoryHistory } from './hooks/useStoryHistory.js'
import { useStoryDatabase } from './hooks/useStoryDatabase.js'
import { useAudioPlayer } from './hooks/useAudioPlayer.js'
import { useIsMobile } from './hooks/use-mobile.js'
import ApiKeyHelp from './components/ApiKeyHelp.jsx'
import safeLocalStorage from './utils/safeLocalStorage.js'
import './App.css'

function App() {
  const isMobile = useIsMobile()
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
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false)
  // Son oluşturulan masalın geçmiş ID'si
  const [currentStoryId, setCurrentStoryId] = useState(null)

  const [settings, setSettings] = useState(() => {
    // localStorage'dan ayarları güvenli şekilde yükle
    const savedSettings = safeLocalStorage.get('bedtime-stories-settings')
    if (savedSettings) {
      try {
        return { ...getDefaultSettings(), ...savedSettings }
      } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error)
        return getDefaultSettings()
      }
    }
    return getDefaultSettings()
  })
  
  // Ayarları localStorage'a kaydet
  const updateSettings = (newSettings) => {
    try {
      console.log('🔧 App updateSettings:', newSettings)
      
      // State güncellemesi önce yap
      setSettings(newSettings)
      
      // localStorage'a kaydetme işlemini setTimeout ile ertele
      setTimeout(() => {
        const saved = safeLocalStorage.set('bedtime-stories-settings', newSettings)
        if (saved) {
          console.log('✅ Ayarlar localStorage\'a kaydedildi')
        } else {
          console.error('❌ localStorage kaydetme hatası')
          setError('Ayarlar kaydedilirken bir sorun oluştu, ancak değişiklikler geçerli.')
        }
      }, 0)
      
    } catch (error) {
      console.error('❌ App updateSettings error:', error)
      // Kritik hata durumunda da uygulamayı crash etme
      setError('Ayarlar güncellenirken hata oluştu')
    }
  }
  
  // Favori masallar hook'u
  const { 
    favorites, 
    toggleFavorite, 
    removeFavorite, 
    isFavorite, 
    refreshFavorites
  } = useFavorites()
  
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

  // Enhanced toggle favorite function with proper state management
  const handleToggleFavorite = async (storyData) => {
    try {
      console.log('🎯 App.jsx - Favori toggle başlatılıyor:', storyData)
      const result = await toggleFavorite(storyData)
      
      // Analytics: Track favorite action
      if (result && result.action && storyData.story) {
        const storyId = storyData.id || currentStoryId
        analyticsService.trackFavoriteAction(storyId, result.action)
      }
      
      console.log('🎯 App.jsx - Favori toggle tamamlandı:', result ? result.action : 'undefined')
      
      // toggleFavorite zaten state'i güncelliyor, gereksiz refresh yok
      console.log('🎯 App.jsx - Yeni favori sayısı:', favorites.length)
      
      return result
    } catch (error) {
      console.error('🎯 App.jsx - Favori toggle hatası:', error)
      return false
    }
  }

  // Audio player hook'u
  const {
    isPlaying: audioIsPlaying,
    isPaused: audioIsPaused,
    progress: audioProgress,
    duration: audioDuration,
    volume: audioVolume,
    isMuted: audioIsMuted,
    playbackRate: audioPlaybackRate,
    currentStoryId: audioCurrentStoryId,
    playAudio,
    stopAudio,
    toggleMute: audioToggleMute,
    setVolumeLevel,
    setPlaybackSpeed,
    seekTo,
    audioRef: globalAudioRef
  } = useAudioPlayer()

  // Advanced Audio Features kaldırıldı - çalışmayan download/bookmark özellikleri

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

  // Story text değişikliği için fonksiyon
  const handleStoryChange = (newStory) => {
    setStory(newStory)
    
    // Eğer mevcut bir story ID'si varsa, veritabanını güncelle
    if (currentStoryId) {
      hybridUpdateStory(currentStoryId, { 
        story: newStory, 
        customTopic 
      })
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
    
    const startTime = Date.now()
    
    try {
      const llmService = new LLMService(settings)
      
      // Eğer customTopic varsa onu kullan, yoksa selectedStoryType kullan
      const storyTypeToUse = customTopic.trim() ? 'custom' : selectedStoryType
      const topicToUse = customTopic.trim() || ''
      
      const story = await llmService.generateStory((progressValue) => {
        setProgress(progressValue)
      }, storyTypeToUse, topicToUse)
      
      setStory(story)
      
      // Analytics: Track successful story generation
      const duration = Date.now() - startTime
      analyticsService.trackStoryGeneration(storyTypeToUse, topicToUse, true, duration)
      
      // Veritabanına kaydet
      try {
        const dbStory = await createDbStory(story, storyTypeToUse, topicToUse)
        setCurrentStoryId(dbStory.id)
        console.log('Masal veritabanına kaydedildi:', dbStory.id)
        
        // Yeni story eklenmesi favorileri etkilemez, gereksiz refresh yok
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
      
      // Analytics: Track failed story generation
      const duration = Date.now() - startTime
      const storyTypeToUse = customTopic.trim() ? 'custom' : selectedStoryType
      const topicToUse = customTopic.trim() || ''
      analyticsService.trackStoryGeneration(storyTypeToUse, topicToUse, false, duration, error.message)
      analyticsService.trackError('story_generation', error.message, { storyType: storyTypeToUse, customTopic: topicToUse })
      
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
  
  // Generate audio for any story by ID (for Story Management Panel)
  const generateAudioForStory = async (storyId, storyText) => {
    if (!storyText) return
    
    setIsGeneratingAudio(true)
    setProgress(0)
    setError('')
    
    const startTime = Date.now()
    
    try {
      const ttsService = new TTSService(settings)
      
      // Story ID'si ile ses oluştur (veritabanına kaydedilir)
      const audioUrl = await ttsService.generateAudio(storyText, (progressValue) => {
        setProgress(progressValue)
      }, storyId)
      
      // Analytics: Track successful audio generation
      const duration = Date.now() - startTime
      analyticsService.trackAudioGeneration(storyId, settings.voiceId || 'default', true, duration)
      
      console.log('Audio generated for story:', storyId, audioUrl)
      
    } catch (error) {
      console.error('Audio generation failed for story:', storyId, error)
      
      // Analytics: Track failed audio generation
      const duration = Date.now() - startTime
      analyticsService.trackAudioGeneration(storyId, settings.voiceId || 'default', false, duration, error.message)
      analyticsService.trackError('audio_generation', error.message, { storyId })
      
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

  const generateAudio = async () => {
    if (!story) return
    
    setIsGeneratingAudio(true)
    setProgress(0)
    setError('')
    
    const startTime = Date.now()
    
    try {
      const ttsService = new TTSService(settings)
      
      // Story ID'si ile ses oluştur (veritabanına kaydedilir)
      const audioUrl = await ttsService.generateAudio(story, (progressValue) => {
        setProgress(progressValue)
      }, currentStoryId)
      
      setAudioUrl(audioUrl)
      
      // Analytics: Track successful audio generation
      const duration = Date.now() - startTime
      analyticsService.trackAudioGeneration(currentStoryId, settings.voiceId || 'default', true, duration)
      
      // Backward compatibility için localStorage'a da kaydet
      if (currentStoryId) {
        updateStoryAudio(currentStoryId, audioUrl)
      }
      
      // Ses dosyası eklenmesi favorileri etkilemez, gereksiz refresh yok
      
    } catch (error) {
      console.error('Audio generation failed:', error)
      
      // Analytics: Track failed audio generation
      const duration = Date.now() - startTime
      analyticsService.trackAudioGeneration(currentStoryId, settings.voiceId || 'default', false, duration, error.message)
      analyticsService.trackError('audio_generation', error.message, { storyId: currentStoryId })
      
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

  // Save story manually when user clicks save button
  const saveStory = async () => {
    if (!story) {
      setError('Kaydedilecek masal bulunamadı.')
      return
    }
    
    try {
      // Eğer zaten bir ID varsa güncelle, yoksa yeni oluştur
      if (currentStoryId) {
        // Zaten kaydedilmiş
        console.log('Masal zaten kaydedilmiş:', currentStoryId)
        // Kaydetme işlemi tamamlandı, ana menüye dön
        clearStory()
        return
      }
      
      // Yeni bir masal olarak kaydet
      const storyTypeToUse = customTopic.trim() ? 'custom' : selectedStoryType
      const topicToUse = customTopic.trim() || ''
      
      const dbStory = await createDbStory(story, storyTypeToUse, topicToUse)
      setCurrentStoryId(dbStory.id)
      console.log('Masal manuel olarak kaydedildi:', dbStory.id)
      
      // Favorileri refresh etme - restart prevention
      // refreshFavorites() // Bu satırı kaldırdık - manuel refresh'e gerek yok
      
      // Success feedback
      setError('') // Clear any previous errors
      
      // Kaydetme işlemi tamamlandı, ana menüye dön
      clearStory()
      
    } catch (dbError) {
      console.error('Manuel kaydetme hatası:', dbError)
      
      // Show user-friendly error
      setError('Masal kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.')
      
      // Fallback olarak localStorage kullan
      try {
        const id = addToHistory({
          story,
          storyType: selectedStoryType,
          customTopic
        })
        setCurrentStoryId(id)
        console.log('Masal localStorage\'a kaydedildi:', id)
        
        // Kaydetme başarılı, ana menüye dön
        clearStory()
        
      } catch (fallbackError) {
        console.error('localStorage fallback hatası:', fallbackError)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary/20 rounded-lg">
              <Moon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Uyku Masalları</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Bedtime Stories</p>
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStoryManagement(true)}
              className="gap-1 sm:gap-2 px-2 sm:px-3"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Masal Yönetimi ({dbStories.length > 0 ? dbStories.length : history.length})</span>
              <span className="sm:hidden">({dbStories.length > 0 ? dbStories.length : history.length})</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFavorites(true)}
              className="gap-1 sm:gap-2 px-2 sm:px-3"
            >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Favoriler ({favorites.length})</span>
              <span className="sm:hidden">({favorites.length})</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(true)}
              className="gap-1 sm:gap-2 px-2 sm:px-3"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analitik</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPerformanceMonitor(true)}
              className="gap-1 sm:gap-2 px-2 sm:px-3"
              title="Performans Monitörü"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Performans</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-1 sm:gap-2 px-2 sm:px-3"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Ayarlar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
        {/* Story Creator - Birleşik bileşen */}
        <StoryCreator
          selectedType={selectedStoryType}
          customTopic={customTopic}
          storyId={currentStoryId}
          onTypeChange={setSelectedStoryType}
          onCustomTopicChange={setCustomTopic}
          onGenerateStory={generateStory}
          onGenerateAudio={generateAudio}
          isGenerating={isGenerating}
          isGeneratingAudio={isGeneratingAudio}
          story={story}
          onStoryChange={handleStoryChange}
          progress={progress}
          audioUrl={audioUrl}
          isPlaying={audioIsPlaying}
          audioProgress={audioProgress}
          audioDuration={audioDuration}
          onPlayAudio={() => playAudio(currentStoryId, audioUrl)}
          onPauseAudio={stopAudio}
          onStopAudio={stopAudio}
          onToggleMute={audioToggleMute}
          isMuted={audioIsMuted}
          isFavorite={story ? isFavorite({ story, storyType: selectedStoryType }) : false}
          onToggleFavorite={async () => {
            if (story) {
              await handleToggleFavorite({ 
                story, 
                storyType: selectedStoryType, 
                customTopic,
                audioUrl 
              })
            }
          }}
          onClearStory={clearStory}
          onSaveStory={saveStory}
        />

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
            isOpen={showStoryManagement}
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
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
            onGenerateAudio={generateAudioForStory}
            isGeneratingAudio={isGeneratingAudio}
            // Audio control props
            audioIsPlaying={audioIsPlaying}
            audioIsPaused={audioIsPaused}
            audioProgress={audioProgress}
            audioDuration={audioDuration}
            audioVolume={audioVolume}
            audioIsMuted={audioIsMuted}
            audioPlaybackRate={audioPlaybackRate}
            audioCurrentStoryId={audioCurrentStoryId}
            playAudio={playAudio}
            stopAudio={stopAudio}
            audioToggleMute={audioToggleMute}
            setVolumeLevel={setVolumeLevel}
            setPlaybackSpeed={setPlaybackSpeed}
            seekTo={seekTo}
            getDbAudioUrl={getDbAudioUrl}
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
            onRemove={async (id) => {
              removeFavorite(id)
              await refreshFavorites()
            }}
            onClose={() => setShowFavorites(false)}
            // Audio control props
            audioIsPlaying={audioIsPlaying}
            audioIsPaused={audioIsPaused}
            audioProgress={audioProgress}
            audioDuration={audioDuration}
            audioVolume={audioVolume}
            audioIsMuted={audioIsMuted}
            audioPlaybackRate={audioPlaybackRate}
            audioCurrentStoryId={audioCurrentStoryId}
            playAudio={playAudio}
            stopAudio={stopAudio}
            audioToggleMute={audioToggleMute}
            setVolumeLevel={setVolumeLevel}
            setPlaybackSpeed={setPlaybackSpeed}
            seekTo={seekTo}
            // onDownload, onBookmark kaldırıldı - çalışmayan özellikler
          />
        )}

        {/* API Key Help Panel */}
        {showApiKeyHelp && (
          <ApiKeyHelp onClose={() => setShowApiKeyHelp(false)} />
        )}

        {/* Analytics Dashboard */}
        {showAnalytics && (
          <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
        )}

        {/* Performance Monitor */}
        {showPerformanceMonitor && (
          <PerformanceMonitor 
            isOpen={showPerformanceMonitor}
            onClose={() => setShowPerformanceMonitor(false)} 
          />
        )}

        {/* Story Queue Panel - Replace old story list */}
        {(dbStories.length > 0 || history.length > 0) && (
          <StoryQueuePanel
            stories={dbStories.length > 0 ? dbStories.map(dbStory => ({
              id: dbStory.id,
              story: dbStory.story_text,
              story_text: dbStory.story_text,
              storyType: dbStory.story_type,
              story_type: dbStory.story_type,
              customTopic: dbStory.custom_topic,
              custom_topic: dbStory.custom_topic,
              createdAt: dbStory.created_at,
              created_at: dbStory.created_at,
              audioUrl: dbStory.audio ? getDbAudioUrl(dbStory.audio.file_name) : null,
              audio: dbStory.audio,
              audioGenerated: !!dbStory.audio
            })) : history}
            onDeleteStory={hybridDeleteStory}
            onSelectStory={(story) => {
              setStory(story.story_text || story.story)
              setSelectedStoryType(story.story_type || story.storyType)
              setCustomTopic(story.custom_topic || story.customTopic || '')
              const audioSrc = story.audio ? getDbAudioUrl(story.audio.file_name) : story.audioUrl;
              if (audioSrc) {
                setAudioUrl(audioSrc)
              }
            }}
            onShowStoryManagement={() => setShowStoryManagement(true)}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
            onGenerateAudio={generateAudioForStory}
            isGeneratingAudio={isGeneratingAudio}
            // Audio control props
            audioIsPlaying={audioIsPlaying}
            audioIsPaused={audioIsPaused}
            audioProgress={audioProgress}
            audioDuration={audioDuration}
            audioVolume={audioVolume}
            audioIsMuted={audioIsMuted}
            audioPlaybackRate={audioPlaybackRate}
            audioCurrentStoryId={audioCurrentStoryId}
            playAudio={playAudio}
            stopAudio={stopAudio}
            audioToggleMute={audioToggleMute}
            setVolumeLevel={setVolumeLevel}
            setPlaybackSpeed={setPlaybackSpeed}
            seekTo={seekTo}
            getDbAudioUrl={getDbAudioUrl}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-8 sm:mt-16">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Tatlı rüyalar dileriz 💙</p>
          {isMobile && (
            <p className="mt-2 text-xs opacity-75">Mobil uyumlu tasarım</p>
          )}
        </div>
      </footer>

      {/* Hidden Audio Element */}
      <audio ref={globalAudioRef} className="hidden" />
    </div>
  )
}

export default App


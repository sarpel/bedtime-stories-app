import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Moon, Settings, Heart, AlertCircle, BookOpen, BarChart3, Play, Square, ListMusic, X, Search } from 'lucide-react'
import SettingsPanel from './components/Settings.jsx'
import StoryCreator from './components/StoryCreator.jsx'
import FavoritesPanel from './components/FavoritesPanel.jsx'
import StoryManagementPanel from './components/StoryManagementPanel.jsx'
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx'
import StoryQueuePanel from './components/StoryQueuePanel.jsx'
import SearchPanel from './components/SearchPanel.jsx'
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
// Pi Zero optimizations
import { logger } from './utils/logger.js'
import stabilityMonitor from './utils/stabilityMonitor.js'
import './App.css'
import { Toaster } from '@/components/ui/sonner.jsx'
import { toast } from 'sonner'
import { Story } from './utils/storyTypes'

// Import SettingsData from Settings component
interface SettingsData {
  llmProvider: string
  openaiLLM: {
    endpoint: string
    modelId: string
    apiKey: string
  }
  geminiLLM: {
    endpoint: string
    modelId: string
    apiKey: string
  }
  llmEndpoint: string
  llmModelId: string
  llmApiKey: string
  ttsProvider: string
  elevenlabs: {
    endpoint: string
    modelId: string
    voiceId: string
    apiKey: string
  }
  geminiTTS: {
    endpoint: string
    modelId: string
    voiceId: string
    apiKey: string
  }
  ttsEndpoint: string
  ttsModelId: string
  voiceId: string
  ttsApiKey: string
  customPrompt: string
  customInstructions: string
  storyLength: string
  theme: string
  voiceSettings: {
    speed: number
    pitch: number
    volume: number
    stability: number
    similarityBoost: number
  }
  llmSettings: {
    temperature: number
    maxTokens: number
  }
}

// AppState extends SettingsData with additional app-specific properties
interface AppState extends SettingsData {}

// TypeScript interfaces
interface RemotePlaybackState {
  playing: boolean;
  storyId?: string | number;
  file?: string;
}

function App() {
  const isMobile = useIsMobile()
  const [story, setStory] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false)
  const [selectedStoryType, setSelectedStoryType] = useState<string>('')
  const [customTopic, setCustomTopic] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [showFavorites, setShowFavorites] = useState<boolean>(false)
  const [showApiKeyHelp, setShowApiKeyHelp] = useState<boolean>(false)
  const [showStoryManagement, setShowStoryManagement] = useState<boolean>(false)
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false)
  const [showSearch, setShowSearch] = useState<boolean>(false)
  // Son oluşturulan masalın geçmiş ID'si
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null)
  // Remote playback state (StoryQueuePanel'den bubble up)
  const [remotePlayback, setRemotePlayback] = useState<RemotePlaybackState>({ playing: false })
  const [remoteProgressPct, setRemoteProgressPct] = useState<number>(0) // bilinmiyorsa animasyonlu placeholder
  const [showMiniPlayer, setShowMiniPlayer] = useState<boolean>(false)

  const [settings, setSettings] = useState<AppState>(() => {
    // localStorage'dan ayarları güvenli şekilde yükle
    const savedSettings = safeLocalStorage.get('bedtime-stories-settings')
    const defaults = getDefaultSettings()
    if (savedSettings) {
      try {
        // Derin birleştirme: iç içe objelerde varsayılanları koru
        return {
          ...defaults,
          ...savedSettings,
          openaiLLM: { ...defaults.openaiLLM, ...(savedSettings.openaiLLM || {}) },
          geminiLLM: { ...defaults.geminiLLM, ...(savedSettings.geminiLLM || {}) },
          elevenlabs: { ...defaults.elevenlabs, ...(savedSettings.elevenlabs || {}) },
          geminiTTS: { ...defaults.geminiTTS, ...(savedSettings.geminiTTS || {}) },
          llmSettings: { ...defaults.llmSettings, ...(savedSettings.llmSettings || {}) },
          voiceSettings: { ...defaults.voiceSettings, ...(savedSettings.voiceSettings || {}) }
        }
      } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error)
        return defaults
      }
    }
    return defaults
  })

  // Ayarları localStorage'a kaydet
  const updateSettings = (newSettings: AppState) => {
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

  // Tema uygulamasını yönet
  useEffect(() => {
    const applyTheme = (theme: string) => {
      const root = document.documentElement

      if (theme === 'dark') {
        root.classList.add('dark')
      } else if (theme === 'light') {
        root.classList.remove('dark')
      } else if (theme === 'system') {
        // Sistem temasını kontrol et
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleSystemThemeChange = (e: MediaQueryListEvent) => {
          if (e.matches) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
        }

        // İlk uygulama
        if (mediaQuery.matches) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }

        // Değişiklikleri dinle
        mediaQuery.addEventListener('change', handleSystemThemeChange)

        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
      }
    }

    const cleanup = applyTheme(settings.theme || 'system')
    return cleanup
  }, [settings.theme])


  // Favori masallar hook'u
  const {
    favorites,
    toggleFavorite,
    removeFavorite,
    isFavorite,
    refreshFavorites
  } = useFavorites()

  // Masal geçmişi hook'u (localStorage için backward compatibility)
  const { history, updateStoryAudio, updateStory, removeFromHistory, clearHistory } = useStoryHistory()

  // Veritabanı hook'u (yeni sistem)
  const {
    stories: dbStories,
    loadStories,
    createStory: createDbStory,
    updateStory: updateDbStory,
    deleteStory: deleteDbStory,
    getAudioUrl: getDbAudioUrl
  } = useStoryDatabase()

  // Enhanced toggle favorite function with proper state management
  const handleToggleFavorite = async (storyData: any) => {
    try {
      console.log('🎯 App.jsx - Favori toggle başlatılıyor:', storyData)
      const result = await toggleFavorite(storyData)

      // Analytics: Track favorite action
      if (result?.action && storyData.story) {
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
    pauseAudio,
    stopAudio,
    toggleMute: audioToggleMute,
    setVolumeLevel,
    setPlaybackSpeed,
    seekTo,
    setOnEnded
  } = useAudioPlayer()

  // Advanced Audio Features kaldırıldı - çalışmayan download/bookmark özellikleri

  // Hybrid update function - veritabanı varsa onu kullan, yoksa localStorage
  const hybridUpdateStory = async (id: string | number, updates: any) => {
    try {
      // Eğer dbStories'te varsa veritabanından güncelle
      const dbStory = dbStories.find(s => s.id === id)
      if (dbStory) {
        await updateDbStory(String(id), updates.story || '', dbStory.story_type || '', updates.customTopic || null)
      } else {
        // Backward compatibility için localStorage
        updateStory(Number(id), updates)
      }
    } catch (error) {
      console.error('Masal güncelleme hatası:', error)
      // Fallback to localStorage
      updateStory(Number(id), updates)
    }
  }

  // Initialize Pi Zero monitoring systems
  useEffect(() => {
    // Start monitoring systems optimized for Pi Zero 2W
    stabilityMonitor.startMonitoring()

    logger.info('Pi Zero 2W monitoring systems initialized')

    // Cleanup on unmount
    return () => {
      stabilityMonitor.stopMonitoring()
      logger.info('Pi Zero 2W monitoring systems cleaned up')
    }
  }, [])

  // Story text değişikliği için fonksiyon
  const handleStoryChange = (newStory: string) => {
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
  const hybridDeleteStory = async (id: string | number) => {
    try {
      console.log(`[App] hybridDeleteStory called with id: ${id}`);
      // Eğer dbStories'te varsa veritabanından sil
      const dbStory = dbStories.find(s => s.id === Number(id)); // Convert id to number for comparison
      console.log(`[App] hybridDeleteStory - dbStory found: ${!!dbStory}, id: ${id}`);
      if (dbStory) {
        await deleteDbStory(id) // This calls deleteStory from useStoryDatabase
      } else {
        // Backward compatibility için localStorage
        removeFromHistory(Number(id))
      }
    } catch (error) {
      console.error('Masal silme hatası:', error)
      // Fallback to localStorage
      removeFromHistory(Number(id))
    }
  }

  // Load stories when StoryManagementPanel is opened
  useEffect(() => {
    if (showStoryManagement) {
      console.log('[App] StoryManagementPanel opened, loading stories...');
      loadStories();
    }
  }, [showStoryManagement, loadStories]);

  const generateStory = async () => {
    // Hem selectedStoryType hem de customTopic boşsa masal oluşturma
    if (!selectedStoryType && !customTopic.trim()) {
      setError('Lütfen bir masal türü seçin veya özel bir konu yazın.')
      return
    }

    if (import.meta.env?.DEV) console.log('[App] generateStory:start', {
      selectedStoryType,
      customTopicLen: customTopic.length
    })
    setIsGenerating(true)
    setStory('')
    setProgress(0)
    setError('')

    const startTime = Date.now()

    try {
      // Initialize LLM Service with current settings
      const llmService = new LLMService(settings)
      if (import.meta.env?.DEV) console.log('[App] LLMService:created')

      // Eğer customTopic varsa onu kullan, yoksa selectedStoryType kullan
      const storyTypeToUse = customTopic.trim() ? 'custom' : selectedStoryType
      const topicToUse = customTopic.trim() || ''
      if (import.meta.env?.DEV) console.log('[App] request:prepared', { storyTypeToUse, topicToUseLen: topicToUse.length })

      let story = await llmService.generateStory((progressValue) => {
        setProgress(progressValue)
        if (import.meta.env?.DEV) console.log('[App] progress:', progressValue)
      }, storyTypeToUse, topicToUse)
      if (import.meta.env?.DEV) console.log('[App] response:received', { length: story?.length || 0 })

      // Validate story response
      if (!story || (typeof story === 'string' && story.trim().length < 50)) {
        throw new Error('LLM yanıtı çok kısa veya boş. API ayarlarını kontrol edin.')
      }

      setStory(story)
      if (import.meta.env?.DEV) console.log('[App] story:set', { length: story?.length || 0 })

      // Analytics: Track successful story generation
      const duration = Date.now() - startTime
      analyticsService.trackStoryGeneration(storyTypeToUse, topicToUse, true, duration)
      if (import.meta.env?.DEV) console.log('[App] analytics:storyGeneration:success', { duration })

      // Veritabanına kaydet
      try {
  const dbStory = await createDbStory(story, storyTypeToUse, topicToUse)
        setCurrentStoryId(dbStory.id ? String(dbStory.id) : null)
        console.log('Masal veritabanına kaydedildi:', dbStory.id)
        console.log('[App] db:createStory:success', { id: dbStory.id })

        // Show success toast after successful story creation and database save
        toast.success('Masal oluşturma tamamlandı', { description: 'Yeni masal hazır.' })

        // Yeni story eklenmesi favorileri etkilemez, gereksiz refresh yok
      } catch (dbError) {
        console.error('Veritabanına kaydetme hatası:', dbError)
        console.log('[App] db:createStory:error', { message: (dbError as Error)?.message })

        // Show error to user
        toast.error('Veritabanına kaydetme başarısız', {
          description: 'Masal oluşturuldu ancak kaydedilemedi.'
        })
      }

    } catch (error) {
      console.error('Story generation failed:', error)
      console.log('[App] generateStory:error', { message: (error as Error)?.message })

      // Analytics: Track failed story generation
      const duration = Date.now() - startTime
      const storyTypeToUse = customTopic.trim() ? 'custom' : selectedStoryType
      const topicToUse = customTopic.trim() || ''
      analyticsService.trackStoryGeneration(storyTypeToUse, topicToUse, false, duration, (error as Error).message)
      analyticsService.trackError('story_generation', (error as Error).message, { storyType: storyTypeToUse, customTopic: topicToUse })

      // Show user-friendly error message
      let errorMessage = 'Masal oluşturulurken bir hata oluştu.'

      if ((error as Error).message.includes('OpenAI ayarları eksik') || (error as Error).message.includes('API anahtarı eksik')) {
        errorMessage = 'Sunucu konfigürasyonu eksik. Lütfen sistem yöneticisine başvurun.'
      } else if ((error as Error).message.includes('API hatası') || (error as Error).message.includes('backend/.env')) {
        errorMessage = 'Sunucu ayarları eksik. Lütfen .env dosyasındaki API anahtarlarını kontrol edin.'
      } else if ((error as Error).message.includes('yanıtından masal metni çıkarılamadı')) {
        errorMessage = 'API yanıtı işlenirken hata oluştu. Lütfen tekrar deneyin.'
      }

      setError(errorMessage)

      // Clear story on error
      setStory('')
    } finally {
      setIsGenerating(false)
      setProgress(0)
      console.log('[App] generateStory:end', { totalMs: Date.now() - startTime })
    }
  }

  // Generate audio for any story by ID (for Story Management Panel)
  const generateAudioForStory = async (storyInput: any, storyTextParam: any) => {
    // Handle both story object and separate parameters for backward compatibility
    const storyId = typeof storyInput === 'object' ? storyInput.id : storyInput
    const storyText = typeof storyInput === 'object' ? (storyInput.story_text || storyInput.story) : storyTextParam

    console.log('🔊 [generateAudioForStory] Called with:', {
      inputType: typeof storyInput,
      storyId,
      hasStoryText: !!storyText,
      storyTextLength: storyText?.length
    })

    if (!storyText) {
      console.warn('🔊 [generateAudioForStory] No story text provided')
      return
    }

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

      // Hikayeleri yeniden yükle ki yeni audio bilgisi görünsün
      await loadStories()

      // Show success toast after successful audio generation
      toast.success('Ses oluşturma tamamlandı', { description: 'Ses dosyası kaydedildi.' })

    } catch (error) {
      console.error('Audio generation failed for story:', storyId, error)

      // Analytics: Track failed audio generation
      const duration = Date.now() - startTime
      analyticsService.trackAudioGeneration(storyId, settings.voiceId || 'default', false, duration, (error as Error).message)
      analyticsService.trackError('audio_generation', (error as Error).message, { storyId })

      // Show user-friendly error message
      let errorMessage = 'Ses oluşturulurken bir hata oluştu.'

      if ((error as Error).message.includes('ElevenLabs ayarları eksik') || (error as Error).message.includes('API anahtarı eksik') || (error as Error).message.includes('backend/.env')) {
        errorMessage = 'Sunucu konfigürasyonu eksik. Lütfen sistem yöneticisine başvurun.'
      } else if ((error as Error).message.includes('API hatası') || (error as Error).message.includes('401')) {
        errorMessage = 'TTS servisi yanıt vermiyor. Lütfen daha sonra tekrar deneyin.'
      } else if ((error as Error).message.includes('ses dosyası çıkarılamadı')) {
        errorMessage = 'Ses dosyası işlenirken hata oluştu. Lütfen tekrar deneyin.'
      }

      setError(errorMessage)
    } finally {
      setIsGeneratingAudio(false)
      setProgress(0)
    }
  }

  // Wrapper function for StoryManagementPanel compatibility
  const generateAudioForStoryWrapper = async (story: Story) => {
    const storyId = story.id ? String(story.id) : undefined
    const storyText = story.story_text || story.story
    await generateAudioForStory(storyId, storyText)
  }
  // Wrapper function for StoryQueuePanel compatibility
  const generateAudioForStoryId = async (storyId: string | number) => {
    // Find the story by ID to get the story text
    const foundStory = dbStories.find(s => s.id === storyId)
    if (foundStory) {
      const storyText = foundStory.story_text || foundStory.story
      await generateAudioForStory(String(storyId), storyText)
    }
  }
  // Wrapper function for StoryQueuePanel playAudio compatibility
  const playAudioWrapper = (audioUrl: string, storyId: string | number) => {
    playAudio(audioUrl, String(storyId))
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
      if (currentStoryId) {
        analyticsService.trackAudioGeneration(currentStoryId, settings.voiceId || 'default', true, duration)
      }

      // Backward compatibility için localStorage'a da kaydet
      if (currentStoryId) {
        updateStoryAudio(Number(currentStoryId), audioUrl)
      }

      // Ses dosyası eklenmesi favorileri etkilemez, gereksiz refresh yok

      // Show success toast after successful audio generation
      toast.success('Ses oluşturma tamamlandı', { description: 'Ses dosyası kaydedildi.' })

    } catch (error) {
      console.error('Audio generation failed:', error)

      // Analytics: Track failed audio generation
      const duration = Date.now() - startTime
      if (currentStoryId) {
        analyticsService.trackAudioGeneration(currentStoryId, settings.voiceId || 'default', false, duration, (error as Error).message)
        analyticsService.trackError('audio_generation', (error as Error).message, { storyId: currentStoryId })
      }

      // Show user-friendly error message
      let errorMessage = 'Ses oluşturulurken bir hata oluştu.'

      if ((error as Error).message.includes('ElevenLabs ayarları eksik') || (error as Error).message.includes('API anahtarı eksik') || (error as Error).message.includes('backend/.env')) {
        errorMessage = 'Sunucu konfigürasyonu eksik. Lütfen sistem yöneticisine başvurun.'
      } else if ((error as Error).message.includes('API hatası') || (error as Error).message.includes('401')) {
        errorMessage = 'TTS servisi yanıt vermiyor. Lütfen daha sonra tekrar deneyin.'
      } else if ((error as Error).message.includes('ses dosyası çıkarılamadı')) {
        errorMessage = 'Ses dosyası işlenirken hata oluştu. Lütfen tekrar deneyin.'
      }

      setError(errorMessage)
      toast.error('Ses oluşturma hatası', { description: 'Ses oluşturulamadı.' })
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
      setCurrentStoryId(String(dbStory.id))
      console.log('Masal manuel olarak kaydedildi:', dbStory.id)

      // Favorileri refresh etme - restart prevention
      // refreshFavorites() // Bu satırı kaldırdık - manuel refresh'e gerek yok

      // Success feedback
      setError('') // Clear any previous errors

      // Kaydetme işlemi tamamlandı, ana menüye dön
      clearStory()
      toast.success('Masal kaydedildi')

    } catch (dbError) {
      console.error('Manuel kaydetme hatası:', dbError)

      // Show user-friendly error
      setError('Masal kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.')

      // Show error to user
      toast.error('Masal kaydedilemedi', {
        description: 'Lütfen tekrar deneyin.'
      })
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-right" closeButton />
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
          <div className="flex gap-1 sm:gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="gap-1 px-2 h-8 text-xs"
            >
              <Search className="h-3 w-3" />
              <span className="hidden md:inline">Arama</span>
              <span className="md:hidden">Ara</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStoryManagement(true)}
              className="gap-1 px-2 h-8 text-xs"
            >
              <BookOpen className="h-3 w-3" />
              <span className="hidden md:inline">Masal Yönetimi</span>
              <span className="md:hidden">Masallar</span>
              <span className="text-xs">({dbStories.length > 0 ? dbStories.length : history.length})</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFavorites(true)}
              className="gap-1 px-2 h-8 text-xs"
            >
              <Heart className="h-3 w-3" />
              <span className="hidden md:inline">Favoriler</span>
              <span className="md:hidden">♥</span>
              <span className="text-xs">({favorites.length})</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(true)}
              className="gap-1 px-2 h-8 text-xs"
            >
              <BarChart3 className="h-3 w-3" />
              <span className="hidden lg:inline">Analitik</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-1 px-2 h-8 text-xs"
            >
              <Settings className="h-3 w-3" />
              <span className="hidden md:inline">Ayarlar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
        {/* Story Creator - Birleşik bileşen */}
        <StoryCreator
          selectedType={selectedStoryType}
          customTopic={customTopic}
          storyId={currentStoryId ?? undefined}
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
          onPlayAudio={() => currentStoryId && playAudio(audioUrl, currentStoryId)}
          onPauseAudio={pauseAudio}
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
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
            onGenerateAudio={generateAudioForStoryWrapper}
            isGeneratingAudio={isGeneratingAudio}
            // Audio control props
            audioIsPlaying={audioIsPlaying}
            audioIsPaused={audioIsPaused}
            audioProgress={audioProgress}
            audioDuration={audioDuration}
            audioVolume={audioVolume}
            audioIsMuted={audioIsMuted}
            audioPlaybackRate={audioPlaybackRate}
            audioCurrentStoryId={audioCurrentStoryId || ''}
            playAudio={playAudio}
            stopAudio={stopAudio}
            audioToggleMute={audioToggleMute}
            setVolumeLevel={setVolumeLevel}
            setPlaybackSpeed={setPlaybackSpeed}
            seekTo={seekTo}
            getDbAudioUrl={(fileName: string) => getDbAudioUrl(fileName) || ''}
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
            audioCurrentStoryId={audioCurrentStoryId || ''}
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

        {/* Search Panel */}
        {showSearch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <SearchPanel
              onClose={() => setShowSearch(false)}
              onStorySelect={(story) => {
                setStory(story.story_text || story.story || '')
                setSelectedStoryType(story.story_type || story.storyType || '')
                setCustomTopic(story.custom_topic || story.customTopic || '')
                setCurrentStoryId(String(story.id || ''))
              const audioSrc = story.audio?.file_name ? getDbAudioUrl(story.audio.file_name) : null;
                if (audioSrc) {
                  setAudioUrl(audioSrc)
                }
                setShowSearch(false)
                toast.success('Masal seçildi')
              }}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onDeleteStory={hybridDeleteStory}
            />
          </div>
        )}

        {/* Story Queue Panel - Replace old story list */}
        {(dbStories.length > 0 || history.length > 0) && (
          <StoryQueuePanel
            stories={dbStories.length > 0 ? dbStories.map(dbStory => ({
              id: dbStory.id,
              story: dbStory.story_text || '',
              story_text: dbStory.story_text || '',
              storyType: dbStory.story_type || '',
              story_type: dbStory.story_type || '',
              customTopic: dbStory.custom_topic ?? undefined,
              custom_topic: dbStory.custom_topic ?? undefined,
              createdAt: dbStory.created_at || '',
              created_at: dbStory.created_at || '',
              audioUrl: dbStory.audio ? getDbAudioUrl(dbStory.audio.file_name) : null,
              audio: dbStory.audio || undefined,
              audioGenerated: !!dbStory.audio
            })) : history.map(historyItem => ({
              id: historyItem.id,
              story: historyItem.story || '',
              story_text: historyItem.story || '',
              storyType: historyItem.storyType || '',
              story_type: historyItem.storyType || '',
              customTopic: historyItem.customTopic ?? undefined,
              custom_topic: historyItem.customTopic ?? undefined,
              createdAt: historyItem.createdAt || '',
              created_at: historyItem.createdAt || '',
              audioUrl: historyItem.audioUrl,
              audioGenerated: historyItem.audioGenerated
            }))}
            onUpdateStory={hybridUpdateStory}
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
            onGenerateAudio={generateAudioForStoryId}
            isGeneratingAudio={isGeneratingAudio}
            // Audio control props
            audioIsPlaying={audioIsPlaying}
            audioIsPaused={audioIsPaused}
            audioProgress={audioProgress}
            audioDuration={audioDuration}
            audioVolume={audioVolume}
            audioIsMuted={audioIsMuted}
            audioPlaybackRate={audioPlaybackRate}
            audioCurrentStoryId={audioCurrentStoryId || ''}
            playAudio={playAudioWrapper}
            stopAudio={stopAudio}
            audioToggleMute={audioToggleMute}
            setVolumeLevel={setVolumeLevel}
            setPlaybackSpeed={setPlaybackSpeed}
            seekTo={seekTo}
            getDbAudioUrl={(fileName: string) => getDbAudioUrl(fileName) || ''}
            setOnEnded={setOnEnded}
            onRemoteStatusChange={(st) => {
              setRemotePlayback(st)
              // Mini player görünürlüğü kontrolü
              if (st.playing) {
                setShowMiniPlayer(true)
              } else {
                setShowMiniPlayer(false)
                setRemoteProgressPct(0)
              }
            }}
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
      {/* useAudioPlayer kendi Audio nesnesini yönettiği için ekstra <audio> elemanı gerekmiyor */}

      {/* Remote Mini Player (uzaktan oynatma tetiklendiğinde) */}
      {showMiniPlayer && (
        <div className="fixed bottom-4 right-4 z-50 w-72 sm:w-80 bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg p-3 animate-in fade-in slide-in-from-bottom">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListMusic className="h-5 w-5 text-primary" />
              <div className="text-sm font-medium">
                {remotePlayback.playing ? 'Cihazda Oynatılıyor' : 'Oynatma Durdu'}
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    if (remotePlayback.storyId && dbStories.length > 0) {
                      const story = dbStories.find(s => s.id === remotePlayback.storyId)
                      if (story) {
                        const title = story.custom_topic || story.story_type || 'Masal'
                        return title.length > 30 ? title.substring(0, 30) + '...' : title
                      }
                    }
                    return remotePlayback.file ? remotePlayback.file.split('/').pop() : remotePlayback.playing ? 'Masal çalıyor...' : 'Hazır'
                  })()}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowMiniPlayer(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: remotePlayback.playing ? `${remoteProgressPct}%` : '0%' }}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  // Basit toggle: aynı endpoint
                  try {
                    if (remotePlayback.playing) {
                      await fetch('/api/play/stop', { method: 'POST' })
                    }
                  } finally {
                    // Status update manuel; StoryQueuePanel periyodik olarak zaten yenileyecek
                  }
                }}
                title={remotePlayback.playing ? 'Durdur' : 'Durdu'}
                disabled={!remotePlayback.playing}
              >
                {remotePlayback.playing ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMiniPlayer(false)}
              >Gizle</Button>
            </div>
            <span className="text-[10px] text-muted-foreground">Uzaktan oynatma</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

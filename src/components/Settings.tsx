import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Button } from '@/components/ui/button.jsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Brain, Volume2, MessageSquare, Save, RotateCcw, Settings as SettingsIcon, Mic, Package, Zap, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch.jsx'
import { getDefaultSettings } from '@/services/configService.js'
import VoiceSelector from './VoiceSelector.jsx'
// Audio quality ve background music imports kaldırıldı - sadece basit ayarlar

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
  sttSettings?: {
    provider: string
    model: string
    wakeWordEnabled: boolean
    wakeWordModel: string
    wakeWordSensitivity: string
    continuousListening: boolean
    responseFormat: string
    language: string
  }
}

interface SettingsProps {
  settings: SettingsData
  onSettingsChange: (settings: SettingsData) => void
  onClose: () => void
}

export default function Settings({ settings, onSettingsChange, onClose }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState<SettingsData>(settings)
  const panelRef = useRef<HTMLDivElement>(null)

  // Batch operations state
  const [batchStoryCount, setBatchStoryCount] = useState(3)
  const [selectedStoryTypes, setSelectedStoryTypes] = useState(['princess', 'unicorn'])
  const [isCreatingBatch, setIsCreatingBatch] = useState(false)
  const [isConvertingAudio, setIsConvertingAudio] = useState(false)
  const [batchStatus, setBatchStatus] = useState({ total: 0, recent: 0, favorites: 0, storiesWithoutAudio: 0 })
  const [audioConversionPriority, setAudioConversionPriority] = useState('recent')

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Settings panel dışındaki tıklamalarda panel'i kapat
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])


  const updateSetting = (path: string, value: any) => {
    try {
      console.log('🔧 Settings updateSetting:', path, value, localSettings)
      const newSettings = { ...localSettings }
      const keys = path.split('.')
      let current: any = newSettings

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value

      console.log('🔧 Settings newSettings:', newSettings)
      setLocalSettings(newSettings)
    } catch (error) {
      console.error('❌ Settings updateSetting error:', error, { path, value, localSettings })
    }
  }

  const handleSave = () => {
    onSettingsChange(localSettings)
    onClose()
  }

  const handleReset = () => {
    const defaultSettings = getDefaultSettings()
    setLocalSettings(defaultSettings)
  }

  // Fetch batch status
  useEffect(() => {
    const fetchBatchStatus = async () => {
      try {
        const response = await fetch('/api/batch/status')
        const data = await response.json()
        setBatchStatus(data.storiesWithoutAudio)
      } catch (error) {
        console.error('Batch status fetch failed:', error)
      }
    }
    fetchBatchStatus()
  }, [])

  // Batch story creation
  const handleBatchStoryCreation = async () => {
    if (selectedStoryTypes.length === 0) {
      alert('En az bir masal türü seçin!')
      return
    }

    setIsCreatingBatch(true)
    try {
      const response = await fetch('/api/batch/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: batchStoryCount,
          storyTypes: selectedStoryTypes,
          settings: localSettings
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`Başarılı! ${result.created} masal oluşturuldu, ${result.failed} hata.`)
        // Refresh batch status
        const statusResponse = await fetch('/api/batch/status')
        const statusData = await statusResponse.json()
        setBatchStatus(statusData.storiesWithoutAudio)
      } else {
        alert('Toplu masal oluşturma başarısız!')
      }
    } catch (error) {
      console.error('Batch story creation failed:', error)
      alert('Toplu masal oluşturma sırasında hata oluştu!')
    }
    setIsCreatingBatch(false)
  }

  // Batch audio conversion
  const handleBatchAudioConversion = async () => {
    setIsConvertingAudio(true)
    try {
      const response = await fetch('/api/batch/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: audioConversionPriority,
          provider: localSettings.ttsProvider || 'elevenlabs'
        })
      })

      const result = await response.json()

      if (result.success) {
        if (result.converted > 0) {
          alert(`Başarılı! ${result.converted} masal için ses oluşturuldu, ${result.failed} hata.`)
        } else {
          alert(result.message || 'Ses dönüştürülecek masal bulunamadı.')
        }
        // Refresh batch status
        const statusResponse = await fetch('/api/batch/status')
        const statusData = await statusResponse.json()
        setBatchStatus(statusData.storiesWithoutAudio)
      } else {
        alert('Toplu ses dönüştürme başarısız!')
      }
    } catch (error) {
      console.error('Batch audio conversion failed:', error)
      alert('Toplu ses dönüştürme sırasında hata oluştu!')
    }
    setIsConvertingAudio(false)
  }

  // Handle story type selection
  const handleStoryTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedStoryTypes([...selectedStoryTypes, type])
    } else {
      setSelectedStoryTypes(selectedStoryTypes.filter(t => t !== type))
    }
  }


  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-1">
      <div ref={panelRef}>
        <Card className="w-[600px] h-[500px] overflow-y-auto scrollbar-thin border shadow-lg">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b p-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Ayarlar</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} size="sm" className="h-8 px-3 text-xs">
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button onClick={onClose} variant="outline" size="sm" className="h-8 px-3 text-xs">
                İptal
              </Button>
              <Button onClick={handleSave} size="sm" className="h-8 px-3 text-xs">
                <Save className="h-3 w-3 mr-1" />
                Kaydet
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3">
          <Tabs defaultValue="llm" className="space-y-3">
            <TabsList className="grid w-full grid-cols-5 h-8">
              <TabsTrigger value="llm" className="flex items-center gap-1 text-xs">
                <Brain className="h-3 w-3" />
                <span className="hidden sm:inline">LLM</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-1 text-xs">
                <Volume2 className="h-3 w-3" />
                <span className="hidden sm:inline">Ses</span>
              </TabsTrigger>
              <TabsTrigger value="stt" className="flex items-center gap-1 text-xs">
                <Mic className="h-3 w-3" />
                <span className="hidden sm:inline">STT</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                <span className="hidden sm:inline">İçerik</span>
              </TabsTrigger>
              <TabsTrigger value="batch" className="flex items-center gap-1 text-xs">
                <Package className="h-3 w-3" />
                <span className="hidden sm:inline">Toplu</span>
              </TabsTrigger>
            </TabsList>

            {/* LLM Settings - Kompakt */}
            <TabsContent value="llm" className="space-y-3">
              <div className="mx-auto space-y-1.5">
                {/* LLM Provider Selection */}
                <Card className="p-1.5 rounded-md">
                  <div className="flex items-center gap-1 mb-1">
                    <Brain className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">LLM Sağlayıcı</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Sağlayıcı Seçin</Label>
                    <RadioGroup
                      value={localSettings.llmProvider || 'openai'}
                      onValueChange={(value) => updateSetting('llmProvider', value)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="openai" id="llm-openai" />
                        <Label htmlFor="llm-openai" className="text-xs cursor-pointer">OpenAI Compatible</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gemini" id="llm-gemini" />
                        <Label htmlFor="llm-gemini" className="text-xs cursor-pointer">Gemini LLM</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </Card>

                {/* OpenAI LLM Settings */}
                {(localSettings.llmProvider === 'openai' || !localSettings.llmProvider) && (
                  <Card className="p-1.5 rounded-md">
                    <div className="flex items-center gap-1 mb-1">
                      <SettingsIcon className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">OpenAI Compatible Ayarları</span>
                    </div>

                    <div className="space-y-1.5">
                      {/* API Endpoint */}
                      <div className="space-y-1">
                        <Label htmlFor="openai-llm-endpoint" className="text-xs">API Endpoint</Label>
                        <Input
                          id="openai-llm-endpoint"
                          placeholder="https://api.openai.com/v1/responses"
                          value={localSettings.openaiLLM?.endpoint || localSettings.llmEndpoint || ''}
                          onChange={(e) => {
                            updateSetting('openaiLLM.endpoint', e.target.value)
                            updateSetting('llmEndpoint', e.target.value) // Legacy compatibility
                          }}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Model ID */}
                      <div className="space-y-1">
                        <Label htmlFor="openai-llm-model" className="text-xs">Model ID</Label>
                        <Input
                          id="openai-llm-model"
                          placeholder="gpt-5-mini"
                          value={localSettings.openaiLLM?.modelId || localSettings.llmModelId || ''}
                          onChange={(e) => {
                            updateSetting('openaiLLM.modelId', e.target.value)
                            updateSetting('llmModelId', e.target.value) // Legacy compatibility
                          }}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* API Key */}
                      <div className="space-y-1">
                        <Label htmlFor="openai-llm-api-key" className="text-xs">API Key</Label>
                        <Input
                          id="openai-llm-api-key"
                          type="password"
                          placeholder="sk-..."
                          value={localSettings.openaiLLM?.apiKey || localSettings.llmApiKey || ''}
                          onChange={(e) => {
                            updateSetting('openaiLLM.apiKey', e.target.value)
                            updateSetting('llmApiKey', e.target.value) // Legacy compatibility
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </Card>
                )}

                {/* Gemini LLM Settings */}
                {localSettings.llmProvider === 'gemini' && (
                  <Card className="p-1.5 rounded-md">
                    <div className="flex items-center gap-1 mb-1">
                      <SettingsIcon className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">Gemini LLM Ayarları</span>
                    </div>

                    <div className="space-y-1.5">
                      {/* API Endpoint */}
                      <div className="space-y-1">
                        <Label htmlFor="gemini-llm-endpoint" className="text-xs">API Endpoint</Label>
                        <Input
                          id="gemini-llm-endpoint"
                          placeholder="https://generativelanguage.googleapis.com/v1beta/models"
                          value={localSettings.geminiLLM?.endpoint || ''}
                          onChange={(e) => updateSetting('geminiLLM.endpoint', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Model ID */}
                      <div className="space-y-1">
                        <Label htmlFor="gemini-llm-model" className="text-xs">Model ID</Label>
                        <Input
                          id="gemini-llm-model"
                          placeholder="gemini-2.0-flash-thinking-exp-1219"
                          value={localSettings.geminiLLM?.modelId || ''}
                          onChange={(e) => updateSetting('geminiLLM.modelId', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* API Key */}
                      <div className="space-y-1">
                        <Label htmlFor="gemini-llm-api-key" className="text-xs">API Key</Label>
                        <Input
                          id="gemini-llm-api-key"
                          type="password"
                          placeholder="AIza..."
                          value={localSettings.geminiLLM?.apiKey || ''}
                          onChange={(e) => updateSetting('geminiLLM.apiKey', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="p-1.5 rounded-md">
                  <div className="flex items-center gap-1 mb-1">
                    <Brain className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Model Ayarları</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Yaratıcılık</Label>
                        <Badge variant="outline" className="text-xs h-4 px-1">{localSettings.llmSettings?.temperature || 0.7}</Badge>
                      </div>
                      <Slider
                        value={[localSettings.llmSettings?.temperature || 0.7]}
                        onValueChange={(value) => updateSetting('llmSettings.temperature', value[0])}
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        className="w-full h-1"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Tutarlı</span>
                        <span>Yaratıcı</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>



            {/* Voice Settings - Kompakt */}
            <TabsContent value="voice" className="space-y-1.5">
              <div className="mx-auto space-y-1.5">
                {/* TTS Provider Selection */}
                <Card className="p-1.5 rounded-md">
                  <div className="flex items-center gap-1 mb-1">
                    <Volume2 className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">TTS Sağlayıcı</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Sağlayıcı Seçin</Label>
                    <RadioGroup
                      value={localSettings.ttsProvider || 'elevenlabs'}
                      onValueChange={(value) => updateSetting('ttsProvider', value)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="elevenlabs" id="tts-elevenlabs" />
                        <Label htmlFor="tts-elevenlabs" className="text-xs cursor-pointer">ElevenLabs</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gemini" id="tts-gemini" />
                        <Label htmlFor="tts-gemini" className="text-xs cursor-pointer">Gemini TTS</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </Card>

                {/* ElevenLabs Settings */}
                {(localSettings.ttsProvider === 'elevenlabs' || !localSettings.ttsProvider) && (
                  <Card className="p-1.5">
                    <div className="flex items-center gap-1 mb-1">
                      <SettingsIcon className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">ElevenLabs Ayarları</span>
                    </div>

                    <div className="space-y-1.5">
                      {/* API Endpoint */}
                      <div className="space-y-1">
                        <Label htmlFor="elevenlabs-endpoint" className="text-xs">API Endpoint</Label>
                        <Input
                          id="elevenlabs-endpoint"
                          placeholder="https://api.elevenlabs.io/v1/text-to-speech"
                          value={localSettings.elevenlabs?.endpoint || ''}
                          onChange={(e) => updateSetting('elevenlabs.endpoint', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Model ID */}
                      <div className="space-y-1">
                        <Label htmlFor="elevenlabs-model" className="text-xs">Model ID</Label>
                        <Input
                          id="elevenlabs-model"
                          placeholder="eleven_turbo_v2_5"
                          value={localSettings.elevenlabs?.modelId || ''}
                          onChange={(e) => updateSetting('elevenlabs.modelId', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Voice ID */}
                      <div className="space-y-1">
                        <Label htmlFor="elevenlabs-voice" className="text-xs">Voice ID</Label>
                        <Input
                          id="elevenlabs-voice"
                          placeholder="xsGHrtxT5AdDzYXTQT0d"
                          value={localSettings.elevenlabs?.voiceId || localSettings.voiceId || ''}
                          onChange={(e) => {
                            updateSetting('elevenlabs.voiceId', e.target.value)
                            updateSetting('voiceId', e.target.value) // Legacy compatibility
                          }}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* API Key */}
                      <div className="space-y-1">
                        <Label htmlFor="elevenlabs-api-key" className="text-xs">API Key</Label>
                        <Input
                          id="elevenlabs-api-key"
                          type="password"
                          placeholder="sk_..."
                          value={localSettings.elevenlabs?.apiKey || ''}
                          onChange={(e) => updateSetting('elevenlabs.apiKey', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </Card>
                )}

                {/* Gemini Settings */}
                {localSettings.ttsProvider === 'gemini' && (
                  <Card className="p-1.5">
                    <div className="flex items-center gap-1 mb-1">
                      <SettingsIcon className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">Gemini TTS Ayarları</span>
                    </div>

                    <div className="space-y-1.5">
                      {/* API Endpoint */}
                      <div className="space-y-1">
                        <Label htmlFor="gemini-tts-endpoint" className="text-xs">API Endpoint</Label>
                        <Input
                          id="gemini-tts-endpoint"
                          placeholder="https://generativelanguage.googleapis.com/v1beta/models"
                          value={localSettings.geminiTTS?.endpoint || ''}
                          onChange={(e) => updateSetting('geminiTTS.endpoint', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Model ID - Textbox olarak değiştirildi */}
                      <div className="space-y-1">
                        <Label htmlFor="gemini-tts-model" className="text-xs">Model ID</Label>
                        <Input
                          id="gemini-tts-model"
                          placeholder="gemini-2.0-flash-thinking-exp-1219"
                          value={localSettings.geminiTTS?.modelId || ''}
                          onChange={(e) => updateSetting('geminiTTS.modelId', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Voice ID */}
                      <div className="space-y-1">
                        <Label htmlFor="gemini-tts-voice" className="text-xs">Voice ID</Label>
                        <Input
                          id="gemini-tts-voice"
                          placeholder="Puck"
                          value={localSettings.geminiTTS?.voiceId || ''}
                          onChange={(e) => updateSetting('geminiTTS.voiceId', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* API Key */}
                      <div className="space-y-1">
                        <Label htmlFor="gemini-tts-api-key" className="text-xs">API Key</Label>
                        <Input
                          id="gemini-tts-api-key"
                          type="password"
                          placeholder="AIza..."
                          value={localSettings.geminiTTS?.apiKey || ''}
                          onChange={(e) => updateSetting('geminiTTS.apiKey', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </Card>
                )}

                {/* Voice Selector - Sadece ElevenLabs için */}
                {(localSettings.ttsProvider === 'elevenlabs' || !localSettings.ttsProvider) && (
                  <VoiceSelector
                    selectedVoiceId={localSettings.elevenlabs?.voiceId || localSettings.voiceId || 'xsGHrtxT5AdDzYXTQT0d'}
                    settings={localSettings}
                    onVoiceChange={(voiceId) => {
                      // UI seçimi ile textbox senkron: iki yerde de sakla
                      updateSetting('voiceId', voiceId)
                      updateSetting('elevenlabs.voiceId', voiceId)
                      // Anında kalıcılık için üstteki onSettingsChange'i çağır
                      // (local panel state kaydederken gecikme olmasın)
                      const merged = {
                        ...localSettings,
                        voiceId,
                        elevenlabs: { ...(localSettings.elevenlabs || {}), voiceId }
                      }
                      onSettingsChange?.(merged)
                      setLocalSettings(merged)
                    }}
                  />
                )}

                {/* Voice Settings - Kompakt */}
                <Card className="p-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Volume2 className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Ses Ayarları</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Hız</Label>
                        <Badge variant="outline" className="text-xs h-4 px-1">{localSettings.voiceSettings?.speed || 0.9}x</Badge>
                      </div>
                      <Slider
                        value={[localSettings.voiceSettings?.speed || 0.9]}
                        onValueChange={(value) => updateSetting('voiceSettings.speed', value[0])}
                        min={0.5}
                        max={2.0}
                        step={0.05}
                        className="w-full h-1"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Yavaş</span>
                        <span>Hızlı</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Ton</Label>
                        <Badge variant="outline" className="text-xs h-4 px-1">{localSettings.voiceSettings?.pitch || 1.0}x</Badge>
                      </div>
                      <Slider
                        value={[localSettings.voiceSettings?.pitch || 1.0]}
                        onValueChange={(value) => updateSetting('voiceSettings.pitch', value[0])}
                        min={0.5}
                        max={2.0}
                        step={0.05}
                        className="w-full h-1"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Alçak</span>
                        <span>Yüksek</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Seviye</Label>
                        <Badge variant="outline" className="text-xs h-4 px-1">{Math.round((localSettings.voiceSettings?.volume || 0.75) * 100)}%</Badge>
                      </div>
                      <Slider
                        value={[localSettings.voiceSettings?.volume || 0.75]}
                        onValueChange={(value) => updateSetting('voiceSettings.volume', value[0])}
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        className="w-full h-1"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Sessiz</span>
                        <span>Yüksek</span>
                      </div>
                    </div>

                    {/* ElevenLabs specific settings */}
                    {(localSettings.ttsProvider === 'elevenlabs' || !localSettings.ttsProvider) && (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Stabilite</Label>
                            <Badge variant="outline" className="text-xs h-4 px-1">{localSettings.voiceSettings?.stability || 0.5}</Badge>
                          </div>
                          <Slider
                            value={[localSettings.voiceSettings?.stability || 0.5]}
                            onValueChange={(value) => updateSetting('voiceSettings.stability', value[0])}
                            min={0.0}
                            max={1.0}
                            step={0.05}
                            className="w-full h-1"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Değişken</span>
                            <span>Sabit</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Benzerlik</Label>
                            <Badge variant="outline" className="text-xs h-4 px-1">{localSettings.voiceSettings?.similarityBoost || 0.5}</Badge>
                          </div>
                          <Slider
                            value={[localSettings.voiceSettings?.similarityBoost || 0.5]}
                            onValueChange={(value) => updateSetting('voiceSettings.similarityBoost', value[0])}
                            min={0.0}
                            max={1.0}
                            step={0.05}
                            className="w-full h-1"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Düşük</span>
                            <span>Yüksek</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* STT Settings - Speech Recognition */}
            <TabsContent value="stt" className="space-y-1.5">
              <div className="mx-auto space-y-1.5">
                {/* STT Provider Selection */}
                <Card className="p-1.5 rounded-md">
                  <div className="flex items-center gap-1 mb-1">
                    <Mic className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Speech Recognition Provider</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">STT Provider</Label>
                    <RadioGroup
                      value={localSettings.sttSettings?.provider || 'openai'}
                      onValueChange={(value) => updateSetting('sttSettings.provider', value)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="openai" id="stt-openai" />
                        <Label htmlFor="stt-openai" className="text-xs cursor-pointer">OpenAI (Recommended)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="deepgram" id="stt-deepgram" />
                        <Label htmlFor="stt-deepgram" className="text-xs cursor-pointer">Deepgram</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </Card>

                {/* OpenAI STT Model Selection */}
                {(localSettings.sttSettings?.provider === 'openai' || !localSettings.sttSettings?.provider) && (
                  <Card className="p-1.5 rounded-md">
                    <div className="flex items-center gap-1 mb-1">
                      <SettingsIcon className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">OpenAI Model Settings</span>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Speech Model</Label>
                      <RadioGroup
                        value={localSettings.sttSettings?.model || 'gpt-4o-mini-transcribe'}
                        onValueChange={(value) => updateSetting('sttSettings.model', value)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="gpt-4o-mini-transcribe" id="model-gpt4o" />
                          <Label htmlFor="model-gpt4o" className="text-xs cursor-pointer">
                            GPT-4o-mini-transcribe <Badge variant="secondary" className="text-xs ml-1">Enhanced</Badge>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="whisper-1" id="model-whisper" />
                          <Label htmlFor="model-whisper" className="text-xs cursor-pointer">
                            Whisper-1 <Badge variant="outline" className="text-xs ml-1">Legacy</Badge>
                          </Label>
                        </div>
                      </RadioGroup>

                      {/* Model capabilities info */}
                      <div className="p-2 bg-muted/50 rounded text-xs">
                        {localSettings.sttSettings?.model === 'gpt-4o-mini-transcribe' ? (
                          <div>
                            <div className="font-medium text-green-700 mb-1">✓ GPT-4o-mini-transcribe Features:</div>
                            <div className="space-y-0.5 text-muted-foreground">
                              <div>• Superior Turkish language support</div>
                              <div>• Word-level timing information</div>
                              <div>• 16K context window</div>
                              <div>• Enhanced accuracy for short phrases</div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium mb-1">Whisper-1 Features:</div>
                            <div className="space-y-0.5 text-muted-foreground">
                              <div>• Basic Turkish support</div>
                              <div>• Standard transcription</div>
                              <div>• 8K context window</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Wake Word Detection Settings */}
                <Card className="p-1.5 rounded-md">
                  <div className="flex items-center gap-1 mb-1">
                    <Mic className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Wake Word Detection</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Enable Wake Word</Label>
                      <Switch
                        checked={localSettings.sttSettings?.wakeWordEnabled || false}
                        onCheckedChange={(checked) => updateSetting('sttSettings.wakeWordEnabled', checked)}
                      />
                    </div>

                    {localSettings.sttSettings?.wakeWordEnabled && (
                      <div className="ml-4 space-y-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                          <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                            Wake Phrase: "Hey Elsa"
                          </div>
                          <div className="text-blue-600 dark:text-blue-400">
                            Model: hey-elsa.ppn (Porcupine format)
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Sensitivity</Label>
                          <RadioGroup
                            value={localSettings.sttSettings?.wakeWordSensitivity || 'medium'}
                            onValueChange={(value) => updateSetting('sttSettings.wakeWordSensitivity', value)}
                            className="space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="low" id="sens-low" />
                              <Label htmlFor="sens-low" className="text-xs cursor-pointer">
                                Low <span className="text-muted-foreground">(Fewer false positives)</span>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="medium" id="sens-medium" />
                              <Label htmlFor="sens-medium" className="text-xs cursor-pointer">
                                Medium <span className="text-muted-foreground">(Recommended)</span>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="high" id="sens-high" />
                              <Label htmlFor="sens-high" className="text-xs cursor-pointer">
                                High <span className="text-muted-foreground">(More responsive)</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Continuous Listening</Label>
                          <Switch
                            checked={localSettings.sttSettings?.continuousListening || false}
                            onCheckedChange={(checked) => updateSetting('sttSettings.continuousListening', checked)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Audio Settings */}
                <Card className="p-1.5 rounded-md">
                  <div className="flex items-center gap-1 mb-1">
                    <Volume2 className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Audio Settings</span>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Language</Label>
                      <RadioGroup
                        value={localSettings.sttSettings?.language || 'tr'}
                        onValueChange={(value) => updateSetting('sttSettings.language', value)}
                        className="space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="tr" id="lang-tr" />
                          <Label htmlFor="lang-tr" className="text-xs cursor-pointer">Türkçe (Recommended)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="en" id="lang-en" />
                          <Label htmlFor="lang-en" className="text-xs cursor-pointer">English</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Response Format</Label>
                      <RadioGroup
                        value={localSettings.sttSettings?.responseFormat || 'verbose_json'}
                        onValueChange={(value) => updateSetting('sttSettings.responseFormat', value)}
                        className="space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="verbose_json" id="format-verbose" />
                          <Label htmlFor="format-verbose" className="text-xs cursor-pointer">
                            Verbose JSON <span className="text-muted-foreground">(With timing)</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="json" id="format-json" />
                          <Label htmlFor="format-json" className="text-xs cursor-pointer">
                            JSON <span className="text-muted-foreground">(Text only)</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </Card>

                {/* System Information */}
                <Card className="p-1.5 rounded-md bg-muted/30">
                  <div className="flex items-center gap-1 mb-1">
                    <SettingsIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium">System Information</span>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Platform: Raspberry Pi Zero 2W Optimized</div>
                    <div>Memory Usage: ~35MB additional for STT + Wake Word</div>
                    <div>Latency: 2-4s (Remote) vs 15-30s (Local Whisper)</div>
                    <div>Accuracy: 95%+ Turkish with GPT-4o-mini-transcribe</div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Content Settings - Kompakt */}
            <TabsContent value="content" className="space-y-1.5">
              <div className="mx-auto space-y-1.5">
                <Card className="p-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <MessageSquare className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">İçerik Ayarları</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="space-y-2">
                      <Label className="text-xs">Masal Uzunluğu</Label>
                      <RadioGroup
                        value={localSettings.storyLength || 'medium'}
                        onValueChange={(value) => {
                          console.log('📝 RadioGroup onValueChange:', value)
                          updateSetting('storyLength', value)
                        }}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="short" id="length-short" />
                          <Label htmlFor="length-short" className="text-xs cursor-pointer">Kısa (1-2dk)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="length-medium" />
                          <Label htmlFor="length-medium" className="text-xs cursor-pointer">Orta (3-5dk)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="long" id="length-long" />
                          <Label htmlFor="length-long" className="text-xs cursor-pointer">Uzun (5-8dk)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Tema</Label>
                      <RadioGroup
                        value={localSettings.theme || 'system'}
                        onValueChange={(value) => updateSetting('theme', value)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="light" id="theme-light" />
                          <Label htmlFor="theme-light" className="text-xs cursor-pointer">Açık</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dark" id="theme-dark" />
                          <Label htmlFor="theme-dark" className="text-xs cursor-pointer">Koyu</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="system" id="theme-system" />
                          <Label htmlFor="theme-system" className="text-xs cursor-pointer">Sistem</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="custom-prompt" className="text-xs">Özel Prompt</Label>
                      <Textarea
                        id="custom-prompt"
                        placeholder="Masalların nasıl olmasını istediğinizi açıklayın..."
                        value={localSettings.customPrompt || ''}
                        onChange={(e) => updateSetting('customPrompt', e.target.value)}
                        className="min-h-[60px] text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="custom-instructions" className="text-xs">Custom Instructions</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => {
                            const snippet = "Karakter isimlerinde çeşitliliğe önem ver; yalnızca Elif/Ayşe gibi aynı isimleri tekrarlama, Türkiye’de yaygın kız ve erkek çocuk isimlerinden farklı örnekler kullan."
                            const current = localSettings.customInstructions || ''
                            const next = current ? `${current}\n${snippet}` : snippet
                            updateSetting('customInstructions', next)
                          }}
                        >
                          Çeşitlilik talimatını ekle
                        </Button>
                      </div>
                      <Textarea
                        id="custom-instructions"
                        placeholder="Ek kurallar/talimatlar (örn. isim çeşitliliği, ton, cümle uzunluğu, kapsayıcılık vb.)"
                        value={localSettings.customInstructions || ''}
                        onChange={(e) => updateSetting('customInstructions', e.target.value)}
                        className="min-h-[60px] text-xs"
                      />
                    </div>

                    <div className="p-2 bg-muted/50 rounded text-xs">
                      <div className="font-medium mb-1">Örnek Promptlar:</div>
                      <div className="space-y-0.5 text-muted-foreground">
                        <div>• "Türk kültürüne uygun, eğitici masallar"</div>
                        <div>• "Arkadaşlık ve paylaşım değerleri"</div>
                        <div>• "Fantastik, hayal gücünü geliştiren"</div>
                      </div>
                    </div>

                    <div className="p-2 bg-muted/30 rounded text-xs">
                      <div className="font-medium mb-1">Örnek Custom Instructions:</div>
                      <div className="space-y-0.5 text-muted-foreground">
                        <div>• "Karakter isimlerinde çeşitlilik; Elif/Ayşe tekrarı yapma, kız ve erkek isimlerinden farklı örnekler kullan"</div>
                        <div>• "Cümleleri kısa ve sade tut, 5-9 kelime aralığını hedefle"</div>
                        <div>• "Kapsayıcı dil kullan, klişelerden kaçın"</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Batch Operations Tab */}
            <TabsContent value="batch" className="space-y-1.5">
              <div className="mx-auto space-y-1.5">
                {/* Batch Story Creation */}
                <Card className="p-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Package className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Toplu Masal Oluşturma</span>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Masal Sayısı</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={batchStoryCount}
                        onChange={(e) => setBatchStoryCount(parseInt(e.target.value) || 3)}
                        className="h-7 text-xs"
                        placeholder="3"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Masal Türleri</Label>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={selectedStoryTypes.includes('princess')}
                            onChange={(e) => handleStoryTypeChange('princess', e.target.checked)}
                          />
                          <span>Prenses</span>
                        </label>
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={selectedStoryTypes.includes('unicorn')}
                            onChange={(e) => handleStoryTypeChange('unicorn', e.target.checked)}
                          />
                          <span>Unicorn</span>
                        </label>
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={selectedStoryTypes.includes('fairy')}
                            onChange={(e) => handleStoryTypeChange('fairy', e.target.checked)}
                          />
                          <span>Peri</span>
                        </label>
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={selectedStoryTypes.includes('butterfly')}
                            onChange={(e) => handleStoryTypeChange('butterfly', e.target.checked)}
                          />
                          <span>Kelebek</span>
                        </label>
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={selectedStoryTypes.includes('mermaid')}
                            onChange={(e) => handleStoryTypeChange('mermaid', e.target.checked)}
                          />
                          <span>Deniz Kızı</span>
                        </label>
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={selectedStoryTypes.includes('rainbow')}
                            onChange={(e) => handleStoryTypeChange('rainbow', e.target.checked)}
                          />
                          <span>Gökkuşağı</span>
                        </label>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={handleBatchStoryCreation}
                      disabled={isCreatingBatch || selectedStoryTypes.length === 0}
                    >
                      {isCreatingBatch ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <Package className="h-3 w-3 mr-1" />
                          Toplu Masal Oluştur
                        </>
                      )}
                    </Button>

                    <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      Seçilen türlerde otomatik masallar oluşturulacak ve kuyruğa eklenecek.
                    </div>
                  </div>
                </Card>

                {/* Batch Audio Conversion */}
                <Card className="p-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Toplu Ses Dönüştürme</span>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Ses Olmayan Masallar</Label>
                      <div className="p-2 bg-muted/30 rounded text-xs">
                        <div className="text-muted-foreground">
                          {batchStatus.storiesWithoutAudio > 0
                            ? `Sistemde ${batchStatus.storiesWithoutAudio} masal ses dosyası bekliyor`
                            : 'Tüm masalların ses dosyaları mevcut'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span>Otomatik ses oluşturma</span>
                      <Switch defaultChecked />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Öncelik</Label>
                      <RadioGroup
                        value={audioConversionPriority}
                        onValueChange={setAudioConversionPriority}
                        className="space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="recent" id="priority-recent" />
                          <Label htmlFor="priority-recent" className="text-xs cursor-pointer">En yeni masallar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="favorites" id="priority-favorites" />
                          <Label htmlFor="priority-favorites" className="text-xs cursor-pointer">Favori masallar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="priority-all" />
                          <Label htmlFor="priority-all" className="text-xs cursor-pointer">Tüm masallar</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Button
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={handleBatchAudioConversion}
                      disabled={isConvertingAudio || batchStatus.storiesWithoutAudio === 0}
                    >
                      {isConvertingAudio ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Dönüştürülüyor...
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3 mr-1" />
                          Toplu Ses Oluştur
                        </>
                      )}
                    </Button>

                    <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      Ses dosyası olmayan masallar için otomatik olarak ses oluşturulacak.
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

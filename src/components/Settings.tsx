import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Brain, Volume2, MessageSquare, Save, RotateCcw, Settings as SettingsIcon, User } from 'lucide-react'
import { getDefaultSettings } from '@/services/configService.js'
import VoiceSelector from './VoiceSelector.jsx'
import ProfileSelector from './ProfileSelector.jsx'
import PropTypes from 'prop-types'
// Audio quality ve background music imports kaldırıldı - sadece basit ayarlar

export default function Settings({ settings, onSettingsChange, onClose }) {
  const [localSettings, setLocalSettings] = useState(settings)
  const panelRef = useRef(null)

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Settings panel içindeki tıklamalarda panel'i kapatma
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Dropdown/Select content'leri portal olarak body'e render edilir
        // Bu tıklamaları ignore et
        const isDropdownClick = event.target.closest('[data-radix-select-content]') ||
          event.target.closest('[data-radix-popper-content-wrapper]') ||
          event.target.closest('[data-radix-select-viewport]') ||
          event.target.closest('[role="listbox"]') ||
          event.target.closest('[role="option"]') ||
          event.target.closest('.select-content') ||
          event.target.closest('[data-state="open"]')

        if (!isDropdownClick) {
          onClose()
        }
      }
    }

    const handleKeyDown = (event) => {
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


  const updateSetting = (path, value) => {
    try {
      // Removed console.log to prevent API key leakage
      const newSettings = { ...localSettings }
      const keys = path.split('.')
      let current = newSettings

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value

      // Removed console.log to prevent sensitive data leakage
      setLocalSettings(newSettings)
    } catch (error) {
      // Removed detailed logging to prevent sensitive data leakage - only show error type
      console.error('❌ Settings updateSetting error for path:', path)
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


  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2">
      <Card ref={panelRef} className="w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin border shadow-lg">
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
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="llm" className="flex items-center gap-1 text-xs">
                <Brain className="h-3 w-3" />
                <span className="hidden sm:inline">LLM</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-1 text-xs">
                <Volume2 className="h-3 w-3" />
                <span className="hidden sm:inline">Ses</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                <span className="hidden sm:inline">İçerik</span>
              </TabsTrigger>
              <TabsTrigger value="profiles" className="flex items-center gap-1 text-xs">
                <User className="h-3 w-3" />
                <span className="hidden sm:inline">Profiller</span>
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

                  <div className="space-y-1.5">
                    <div className="space-y-1">
                      <Label htmlFor="llm-provider" className="text-xs">Sağlayıcı Seçin</Label>
                      <Select
                        value={localSettings.llmProvider || 'openai'}
                        onValueChange={(value) => updateSetting('llmProvider', value)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent
                          className="z-[200] min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]"
                          position="popper"
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          <SelectItem value="openai" className="text-xs">OpenAI Compatible</SelectItem>
                          <SelectItem value="gemini" className="text-xs">Gemini LLM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                          placeholder="https://api.openai.com/v1/chat/completions"
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

                  <div className="space-y-1.5">
                    <div className="space-y-1">
                      <Label htmlFor="tts-provider" className="text-xs">Sağlayıcı Seçin</Label>
                      <Select
                        value={localSettings.ttsProvider || 'elevenlabs'}
                        onValueChange={(value) => updateSetting('ttsProvider', value)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent
                          className="z-[200] min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]"
                          position="popper"
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          <SelectItem value="elevenlabs" className="text-xs">ElevenLabs</SelectItem>
                          <SelectItem value="gemini" className="text-xs">Gemini TTS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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

            {/* Content Settings - Kompakt */}
            <TabsContent value="content" className="space-y-1.5">
              <div className="mx-auto space-y-1.5">
                <Card className="p-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <MessageSquare className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">İçerik Ayarları</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="space-y-1">
                      <Label htmlFor="story-length" className="text-xs">Masal Uzunluğu</Label>
                      <Select
                        value={localSettings.storyLength || 'medium'}
                        onValueChange={(value) => updateSetting('storyLength', value)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent
                          className="z-[200] min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]"
                          position="popper"
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          <SelectItem value="short" className="text-xs">Kısa (1-2dk)</SelectItem>
                          <SelectItem value="medium" className="text-xs">Orta (3-5dk)</SelectItem>
                          <SelectItem value="long" className="text-xs">Uzun (5-8dk)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="theme" className="text-xs">Tema</Label>
                      <Select
                        value={localSettings.theme || 'system'}
                        onValueChange={(value) => updateSetting('theme', value)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent
                          className="z-[200] min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]"
                          position="popper"
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          <SelectItem value="light" className="text-xs">Açık</SelectItem>
                          <SelectItem value="dark" className="text-xs">Koyu</SelectItem>
                          <SelectItem value="system" className="text-xs">Sistem</SelectItem>
                        </SelectContent>
                      </Select>
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

            {/* Profiles Settings */}
            <TabsContent value="profiles" className="space-y-3">
              <div className="mx-auto space-y-3">
                <ProfileSelector
                  onProfileSelect={(profile) => {
                    // Profil seçildiğinde ayarları güncelle
                    console.log('Profil seçildi:', profile)
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

Settings.propTypes = {
  settings: PropTypes.object.isRequired,
  onSettingsChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}

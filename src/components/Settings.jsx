import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Brain, Volume2, MessageSquare, Save, RotateCcw, Settings as SettingsIcon } from 'lucide-react'
import { getDefaultSettings } from '@/services/configService.js'
import VoiceSelector from './VoiceSelector.jsx'
// Audio quality ve background music imports kaldırıldı - sadece basit ayarlar

export default function Settings({ settings, onSettingsChange, onClose }) {
  const [localSettings, setLocalSettings] = useState(settings)
  const panelRef = useRef(null)

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Select dropdown'larının portal ile render edilme durumunu kontrol et
        const isSelectPortal = event.target.closest('[data-radix-select-content]') ||
                              event.target.closest('[data-radix-popper-content-wrapper]') ||
                              event.target.closest('[data-slot="select-content"]') ||
                              event.target.closest('[role="listbox"]')
        
        console.log('🖱️ Click outside check:', {
          isInModal: panelRef.current.contains(event.target),
          isSelectPortal,
          target: event.target,
          className: event.target.className
        })
        
        if (!isSelectPortal) {
          console.log('🖱️ Settings click outside, closing modal')
          onClose()
        }
      }
    }

    // Delay eklememiz gerekebilir çünkü portal render süresi var
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const updateSetting = (path, value) => {
    try {
      console.log('🔧 Settings updateSetting:', path, value, localSettings)
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


  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-1">
      <Card ref={panelRef} className="w-full max-w-5xl max-h-[95vh] overflow-y-auto relative z-[60]">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b p-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Ayarlar</CardTitle>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" onClick={handleReset} size="sm" className="h-7 px-2 text-xs">
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button onClick={onClose} variant="outline" size="sm" className="h-7 px-2 text-xs">
                İptal
              </Button>
              <Button onClick={handleSave} size="sm" className="h-7 px-2 text-xs">
                <Save className="h-3 w-3 mr-1" />
                Kaydet
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-2">
          <Tabs defaultValue="llm" className="space-y-2">
            <TabsList className="grid w-full grid-cols-3 h-7">
              <TabsTrigger value="llm" className="flex items-center gap-1 text-xs">
                <Brain className="h-3 w-3" />
                LLM
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-1 text-xs">
                <Volume2 className="h-3 w-3" />
                Ses
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                İçerik
              </TabsTrigger>
            </TabsList>

            {/* LLM Settings - Kompakt */}
            <TabsContent value="llm" className="space-y-2">
              <Card className="p-2">
                <div className="flex items-center gap-1 mb-2">
                  <Brain className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">LLM Ayarları</span>
                </div>
                
                <div className="p-2 bg-muted/50 rounded text-xs mb-2">
                  <div className="flex items-center gap-1">
                    <SettingsIcon className="h-3 w-3 text-primary" />
                    <span className="font-medium">Model: OpenAI GPT-4.1-Mini</span>
                  </div>
                </div>

                <div className="space-y-2">
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

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Kelime Sayısı</Label>
                      <Badge variant="outline" className="text-xs h-4 px-1">{localSettings.llmSettings?.maxTokens || 800}</Badge>
                    </div>
                    <Slider
                      value={[localSettings.llmSettings?.maxTokens || 800]}
                      onValueChange={(value) => updateSetting('llmSettings.maxTokens', value[0])}
                      min={400}
                      max={1200}
                      step={100}
                      className="w-full h-1"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Kısa</span>
                      <span>Uzun</span>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>



            {/* Voice Settings - Kompakt */}
            <TabsContent value="voice" className="space-y-2">
              {/* Voice Selector - Kompakt */}
              <VoiceSelector
                selectedVoiceId={localSettings.voiceId || 'xsGHrtxT5AdDzYXTQT0d'}
                onVoiceChange={(voiceId) => updateSetting('voiceId', voiceId)}
              />

              {/* Voice Settings - Kompakt */}
              <Card className="p-2">
                <div className="flex items-center gap-1 mb-2">
                  <Volume2 className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">Ses Ayarları</span>
                </div>
                
                <div className="p-2 bg-muted/50 rounded text-xs mb-2">
                  <div className="flex items-center gap-1">
                    <SettingsIcon className="h-3 w-3 text-primary" />
                    <span className="font-medium">Model: ElevenLabs Turbo</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Hız</Label>
                      <Badge variant="outline" className="text-xs h-4 px-1">{localSettings.voiceSettings.speed}x</Badge>
                    </div>
                    <Slider
                      value={[localSettings.voiceSettings.speed]}
                      onValueChange={(value) => updateSetting('voiceSettings.speed', value[0])}
                      min={0.5}
                      max={2.0}
                      step={0.1}
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
                      <Badge variant="outline" className="text-xs h-4 px-1">{localSettings.voiceSettings.pitch}x</Badge>
                    </div>
                    <Slider
                      value={[localSettings.voiceSettings.pitch]}
                      onValueChange={(value) => updateSetting('voiceSettings.pitch', value[0])}
                      min={0.5}
                      max={2.0}
                      step={0.1}
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
                      <Badge variant="outline" className="text-xs h-4 px-1">{Math.round(localSettings.voiceSettings.volume * 100)}%</Badge>
                    </div>
                    <Slider
                      value={[localSettings.voiceSettings.volume]}
                      onValueChange={(value) => updateSetting('voiceSettings.volume', value[0])}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      className="w-full h-1"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Sessiz</span>
                      <span>Yüksek</span>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Content Settings - Kompakt */}
            <TabsContent value="content" className="space-y-2">
              <Card className="p-2">
                <div className="flex items-center gap-1 mb-2">
                  <MessageSquare className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">İçerik Ayarları</span>
                </div>
                
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="story-length" className="text-xs">Masal Uzunluğu</Label>
                    <Select
                      value={localSettings.storyLength || 'medium'}
                      onValueChange={(value) => {
                        console.log('📝 Select onValueChange:', value)
                        updateSetting('storyLength', value)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[100]"
                        onCloseAutoFocus={(e) => {
                          console.log('🔍 SelectContent onCloseAutoFocus')
                          e.preventDefault()
                        }}
                      >
                        <SelectItem value="short" className="text-xs">Kısa (1-2dk)</SelectItem>
                        <SelectItem value="medium" className="text-xs">Orta (3-5dk)</SelectItem>
                        <SelectItem value="long" className="text-xs">Uzun (5-8dk)</SelectItem>
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

                  <div className="p-2 bg-muted/50 rounded text-xs">
                    <div className="font-medium mb-1">Örnek Promptlar:</div>
                    <div className="space-y-0.5 text-muted-foreground">
                      <div>• "Türk kültürüne uygun, eğitici masallar"</div>
                      <div>• "Arkadaşlık ve paylaşım değerleri"</div>
                      <div>• "Fantastik, hayal gücünü geliştiren"</div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}


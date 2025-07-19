import { useState } from 'react'
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
import { Brain, Mic, Volume2, MessageSquare, Save, RotateCcw, Eye, EyeOff } from 'lucide-react'

export default function Settings({ settings, onSettingsChange, onClose }) {
  const [localSettings, setLocalSettings] = useState(settings)
  const [showApiKeys, setShowApiKeys] = useState({
    llm: false,
    tts: false
  })

  const updateSetting = (path, value) => {
    const newSettings = { ...localSettings }
    const keys = path.split('.')
    let current = newSettings
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
    
    setLocalSettings(newSettings)
  }

  const handleSave = () => {
    onSettingsChange(localSettings)
    onClose()
  }

  const handleReset = () => {
    const defaultSettings = {
      llmEndpoint: '',
      llmModelId: '',
      llmApiKey: '',
      ttsEndpoint: '',
      ttsModelId: '',
      voiceId: '',
      ttsApiKey: '',
      customPrompt: 'Türk kültürüne uygun, 5 yaşındaki bir kız çocuğu için uyku vakti masalı yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.',
      storyLength: 'medium',
      voiceSettings: {
        speed: 1.0,
        pitch: 1.0,
        volume: 0.8
      }
    }
    setLocalSettings(defaultSettings)
  }

  const toggleApiKeyVisibility = (type) => {
    setShowApiKeys(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Ayarlar</CardTitle>
              <CardDescription>
                LLM ve TTS modellerini yapılandırın
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Sıfırla
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                İptal
              </Button>
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Kaydet
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <Tabs defaultValue="llm" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="llm" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                LLM
              </TabsTrigger>
              <TabsTrigger value="tts" className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                TTS
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Ses
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                İçerik
              </TabsTrigger>
            </TabsList>

            {/* LLM Settings */}
            <TabsContent value="llm" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    LLM Model Ayarları
                  </CardTitle>
                  <CardDescription>
                    Masal oluşturma için kullanılacak dil modelini yapılandırın
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="llm-endpoint">API Endpoint URL</Label>
                      <Input
                        id="llm-endpoint"
                        placeholder="https://api.example.com/v1/chat/completions"
                        value={localSettings.llmEndpoint}
                        onChange={(e) => updateSetting('llmEndpoint', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="llm-model">Model ID</Label>
                      <Input
                        id="llm-model"
                        placeholder="gpt-4, claude-3, llama-2, vb."
                        value={localSettings.llmModelId}
                        onChange={(e) => updateSetting('llmModelId', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="llm-api-key">API Anahtarı</Label>
                    <div className="relative">
                      <Input
                        id="llm-api-key"
                        type={showApiKeys.llm ? "text" : "password"}
                        placeholder="sk-..."
                        value={localSettings.llmApiKey}
                        onChange={(e) => updateSetting('llmApiKey', e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleApiKeyVisibility('llm')}
                      >
                        {showApiKeys.llm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TTS Settings */}
            <TabsContent value="tts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    TTS Model Ayarları
                  </CardTitle>
                  <CardDescription>
                    Metni sese dönüştürme için kullanılacak modeli yapılandırın
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tts-endpoint">API Endpoint URL</Label>
                      <Input
                        id="tts-endpoint"
                        placeholder="https://api.example.com/v1/audio/speech"
                        value={localSettings.ttsEndpoint}
                        onChange={(e) => updateSetting('ttsEndpoint', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tts-model">TTS Model ID</Label>
                      <Input
                        id="tts-model"
                        placeholder="tts-1, elevenlabs, vb."
                        value={localSettings.ttsModelId}
                        onChange={(e) => updateSetting('ttsModelId', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voice-id">Ses ID</Label>
                      <Input
                        id="voice-id"
                        placeholder="alloy, nova, shimmer, vb."
                        value={localSettings.voiceId}
                        onChange={(e) => updateSetting('voiceId', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tts-api-key">API Anahtarı</Label>
                      <div className="relative">
                        <Input
                          id="tts-api-key"
                          type={showApiKeys.tts ? "text" : "password"}
                          placeholder="sk-..."
                          value={localSettings.ttsApiKey}
                          onChange={(e) => updateSetting('ttsApiKey', e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => toggleApiKeyVisibility('tts')}
                        >
                          {showApiKeys.tts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voice Settings */}
            <TabsContent value="voice" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-primary" />
                    Ses Ayarları
                  </CardTitle>
                  <CardDescription>
                    Ses çıkışını özelleştirin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Konuşma Hızı</Label>
                        <Badge variant="outline">{localSettings.voiceSettings.speed}x</Badge>
                      </div>
                      <Slider
                        value={[localSettings.voiceSettings.speed]}
                        onValueChange={(value) => updateSetting('voiceSettings.speed', value[0])}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Yavaş (0.5x)</span>
                        <span>Hızlı (2.0x)</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Ses Tonu</Label>
                        <Badge variant="outline">{localSettings.voiceSettings.pitch}x</Badge>
                      </div>
                      <Slider
                        value={[localSettings.voiceSettings.pitch]}
                        onValueChange={(value) => updateSetting('voiceSettings.pitch', value[0])}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Alçak (0.5x)</span>
                        <span>Yüksek (2.0x)</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Ses Seviyesi</Label>
                        <Badge variant="outline">{Math.round(localSettings.voiceSettings.volume * 100)}%</Badge>
                      </div>
                      <Slider
                        value={[localSettings.voiceSettings.volume]}
                        onValueChange={(value) => updateSetting('voiceSettings.volume', value[0])}
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Sessiz (10%)</span>
                        <span>Yüksek (100%)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Settings */}
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    İçerik Ayarları
                  </CardTitle>
                  <CardDescription>
                    Masal içeriğini ve uzunluğunu özelleştirin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="story-length">Masal Uzunluğu</Label>
                    <Select
                      value={localSettings.storyLength}
                      onValueChange={(value) => updateSetting('storyLength', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Masal uzunluğunu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Kısa (1-2 dakika)</SelectItem>
                        <SelectItem value="medium">Orta (3-5 dakika)</SelectItem>
                        <SelectItem value="long">Uzun (5-8 dakika)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="custom-prompt">Özel Prompt</Label>
                    <Textarea
                      id="custom-prompt"
                      placeholder="Masalların nasıl olmasını istediğinizi açıklayın..."
                      value={localSettings.customPrompt}
                      onChange={(e) => updateSetting('customPrompt', e.target.value)}
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Bu prompt, LLM modeline masalları nasıl oluşturması gerektiğini söyler. 
                      Yaş grubu, kültürel değerler, eğitici içerik gibi özel isteklerinizi ekleyebilirsiniz.
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Örnek Prompt Önerileri:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• "Türk kültürüne uygun, eğitici değerler içeren masallar"</li>
                      <li>• "Hayvanlar ve doğa temalı, çevre bilinci kazandıran hikayeler"</li>
                      <li>• "Arkadaşlık, paylaşım ve yardımlaşma değerlerini öğreten masallar"</li>
                      <li>• "Fantastik öğeler içeren, hayal gücünü geliştiren hikayeler"</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}


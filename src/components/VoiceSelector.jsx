import { useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Volume2, User, Clock, Star } from 'lucide-react'
import { voiceOptions, getVoiceById } from '@/utils/voiceOptions.js'
import { TTSService } from '@/services/ttsService.js'
import PropTypes from 'prop-types'

export default function VoiceSelector({ selectedVoiceId, onVoiceChange, settings }) {
  const selectedVoice = getVoiceById(selectedVoiceId)
  const audioRef = useRef(null)
  const [previewingId, setPreviewingId] = useState(null)

  const playPreview = async (voice) => {
    try {
      setPreviewingId(voice.id)
      // Önce varsa çalan önizlemeyi durdur
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }

      // Mevcut ayarları kullan fakat voiceId'yi override et
      const svc = new TTSService({
        ...(settings || {}),
        ttsProvider: (settings?.ttsProvider) || 'elevenlabs',
        elevenlabs: {
          ...(settings?.elevenlabs || {}),
          voiceId: voice.id
        },
        voiceId: voice.id
      })

      const sample = `Merhaba, ben ${voice.name}. Seni masallar diyarına götürmek için hazırım.`
      const url = await svc.generateAudio(sample)

      const audio = new Audio(url)
      audioRef.current = audio
      audio.play().catch(() => { })
    } catch (err) {
      console.error('Ses önizleme hatası:', err)
    } finally {
      setPreviewingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          Ses Seçimi
        </CardTitle>
        <CardDescription>
          Masalını seslendirecek sesi seç
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <RadioGroup value={selectedVoiceId} onValueChange={onVoiceChange}>
          {voiceOptions.map((voice) => (
            <div key={voice.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value={voice.id} id={voice.id} />
              <Label htmlFor={voice.id} className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium">{voice.name}</span>
                      {voice.id === selectedVoiceId && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Seçili
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 truncate">
                      {voice.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        {voice.gender}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {voice.age}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {voice.style}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Önizleme"
                    onClick={(e) => {
                      e.preventDefault()
                      playPreview(voice)
                    }}
                    className="ml-2"
                    disabled={previewingId === voice.id}
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <Separator />

        {/* Seçili Ses Özeti */}
        <div className="p-2 bg-muted/50 rounded-md">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-primary" />
            Seçili Ses: {selectedVoice.name}
          </h4>
          <p className="text-xs text-muted-foreground mb-1">
            {selectedVoice.description}
          </p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              {selectedVoice.gender}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {selectedVoice.age}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {selectedVoice.style}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

VoiceSelector.propTypes = {
  selectedVoiceId: PropTypes.string.isRequired,
  onVoiceChange: PropTypes.func.isRequired,
  settings: PropTypes.shape({
    ttsProvider: PropTypes.string,
    elevenlabs: PropTypes.object, // veya daha detaylı bir shape tanımı yapılabilir
    voiceId: PropTypes.string,
    // ...diğer ayar alanları...
  })
}

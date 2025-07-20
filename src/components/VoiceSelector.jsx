import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Volume2, User, Clock, Star } from 'lucide-react'
import { voiceOptions, getVoiceById } from '@/utils/voiceOptions.js'

export default function VoiceSelector({ selectedVoiceId, onVoiceChange }) {
  const selectedVoice = getVoiceById(selectedVoiceId)

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
      <CardContent className="space-y-4">
        <RadioGroup value={selectedVoiceId} onValueChange={onVoiceChange}>
          {voiceOptions.map((voice) => (
            <div key={voice.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value={voice.id} id={voice.id} />
              <Label htmlFor={voice.id} className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{voice.name}</span>
                      {voice.id === selectedVoiceId && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Seçili
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {voice.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
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
                    onClick={(e) => {
                      e.preventDefault()
                      onVoiceChange(voice.id)
                    }}
                    className="ml-2"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <Separator />

        {/* Seçili Ses Özeti */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-primary" />
            Seçili Ses: {selectedVoice.name}
          </h4>
          <p className="text-sm text-muted-foreground mb-2">
            {selectedVoice.description}
          </p>
          <div className="flex flex-wrap gap-2">
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
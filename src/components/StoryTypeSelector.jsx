import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Sparkles, BookOpen } from 'lucide-react'
import { storyTypes, popularStoryTypes, getStoryTypeById } from '@/utils/storyTypes.js'

export default function StoryTypeSelector({ selectedType, customTopic, onTypeChange, onCustomTopicChange }) {
  const [showCustomInput, setShowCustomInput] = useState(selectedType === 'custom')

  const handleTypeChange = (typeId) => {
    onTypeChange(typeId)
    setShowCustomInput(typeId === 'custom')
    
    // Özel konu seçildiğinde custom topic'i temizle
    if (typeId !== 'custom') {
      onCustomTopicChange('')
    }
  }

  const selectedStoryType = getStoryTypeById(selectedType)

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Hangi Masalı Duymak İstersin?
        </CardTitle>
        <CardDescription>
          Masal türünü seç veya kendi konunu belirt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Hızlı Seçim Butonları */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Popüler Masal Türleri</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularStoryTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? "default" : "outline"}
                onClick={() => handleTypeChange(type.id)}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">{type.icon}</span>
                <span className="text-xs font-medium">{type.name}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Detaylı Seçim */}
        <div className="space-y-3">
          <Label htmlFor="story-type">Masal Türü</Label>
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Masal türünü seçin" />
            </SelectTrigger>
            <SelectContent>
              {storyTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    <span>{type.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedStoryType && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>{selectedStoryType.description}</span>
            </div>
          )}
        </div>

        {/* Özel Konu Girişi */}
        {showCustomInput && (
          <div className="space-y-3">
            <Label htmlFor="custom-topic">Özel Konu</Label>
            <Input
              id="custom-topic"
              placeholder="Örn: Uzay yolculuğu, Deniz altı macerası, Orman dostları..."
              value={customTopic}
              onChange={(e) => onCustomTopicChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Hangi konuda bir masal duymak istediğini yaz
            </p>
          </div>
        )}

        {/* Seçim Özeti */}
        {selectedType && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">
                {selectedStoryType.icon} {selectedStoryType.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedType === 'custom' && customTopic 
                ? `"${customTopic}" konulu özel bir masal oluşturulacak`
                : selectedStoryType.description
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { BookOpen, Sparkles, Volume2 } from 'lucide-react'
import { storyTypes } from '@/utils/storyTypes.js'

export default function StoryTypeSelector({ 
  selectedType, 
  customTopic, 
  onTypeChange, 
  onCustomTopicChange,
  onGenerateStory,
  onGenerateAudio,
  isGenerating,
  isGeneratingAudio,
  story,
  progress
}) {
  const handleTypeChange = (typeId) => {
    onTypeChange(typeId)
  }

  const handleCustomTopicChange = (e) => {
    const value = e.target.value
    onCustomTopicChange(value)
    // Özel konu yazılmaya başlandığında seçili türü temizle
    if (value.trim() && selectedType) {
      onTypeChange('')
    }
  }

  const handleCustomTopicFocus = () => {
    // Text area'ya odaklanıldığında seçili türü temizle
    if (selectedType) {
      onTypeChange('')
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Hangi Masalı Duymak İstersin?
        </CardTitle>
        <CardDescription>
          Masal türünü seç veya istediğin konuyu yaz
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Masal Türü Butonları - 2 satırda */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">En Sevilen Masal Türleri</Label>
          <div className="grid grid-cols-5 gap-2">
            {storyTypes.slice(0, 5).map((type) => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? "default" : "outline"}
                onClick={() => handleTypeChange(type.id)}
                className="flex flex-col items-center gap-1 h-16 p-2 text-xs"
                size="sm"
              >
                <span className="text-lg">{type.icon}</span>
                <span className="leading-none text-center">{type.name}</span>
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {storyTypes.slice(5, 10).map((type) => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? "default" : "outline"}
                onClick={() => handleTypeChange(type.id)}
                className="flex flex-col items-center gap-1 h-16 p-2 text-xs"
                size="sm"
              >
                <span className="text-lg">{type.icon}</span>
                <span className="leading-none text-center">{type.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Özel Konu Girişi ve Butonlar */}
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="custom-topic">Özel Masal Konun</Label>
              <Textarea
                id="custom-topic"
                placeholder="Hangi konuda bir masal duymak istiyorsun? Örn: Uzay yolculuğu yapan kedinin macerası..." 
                value={customTopic}
                onChange={handleCustomTopicChange}
                onFocus={handleCustomTopicFocus}
                className="min-h-[80px] resize-none"
              />
            </div>
            <div className="flex flex-col gap-2 min-w-[120px]">
              <Button 
                onClick={onGenerateStory}
                disabled={isGenerating || (!selectedType && !customTopic.trim())}
                className="flex items-center gap-2 w-full"
                size="default"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                    <span className="text-xs">Oluşturuluyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs">Masal Oluştur</span>
                  </>
                )}
              </Button>
              {story && (
                <Button 
                  onClick={onGenerateAudio}
                  disabled={isGeneratingAudio}
                  variant="outline"
                  className="flex items-center gap-2 w-full"
                  size="default"
                >
                  {isGeneratingAudio ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                      <span className="text-xs">Sesli...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" />
                      <span className="text-xs">Seslendir</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {/* Progress gösterimi */}
          {(isGenerating || isGeneratingAudio) && progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {isGenerating ? 'Masal oluşturuluyor...' : 'Ses oluşturuluyor...'}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {/* Seçim Özeti */}
        {(selectedType || customTopic.trim()) && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              {selectedType && (
                <Badge variant="secondary" className="text-xs">
                  {storyTypes.find(t => t.id === selectedType)?.icon} {storyTypes.find(t => t.id === selectedType)?.name}
                </Badge>
              )}
              {customTopic.trim() && !selectedType && (
                <Badge variant="outline" className="text-xs">
                  Özel Konu
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {customTopic.trim() && !selectedType
                ? `"${customTopic.substring(0, 80)}${customTopic.length > 80 ? '...' : ''}" konulu özel masal oluşturulacak`
                : selectedType 
                ? storyTypes.find(t => t.id === selectedType)?.description
                : ''
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
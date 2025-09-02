import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Sparkles, Volume2 } from 'lucide-react'
import { storyTypes } from '@/utils/storyTypes'

interface Story {
  id: string | number
  story?: string
  story_text?: string
  storyType?: string
  story_type?: string
  customTopic?: string
  custom_topic?: string
  createdAt?: string
  created_at?: string
  audioUrl?: string | null
  audio?: {
    file_name?: string
    file_path?: string
    voice_id?: string
  }
}

interface StoryTypeSelectorProps {
  selectedType: string
  customTopic: string
  onTypeChange: (typeId: string) => void
  onCustomTopicChange: (topic: string) => void
  onGenerateStory: () => void
  onGenerateAudio: () => void
  isGenerating: boolean
  isGeneratingAudio: boolean
  story: Story | null
  progress: number
}

/**
 * Masal türü seçimi ile özel konu girişi sağlayan UI bileşeni.
 *
 * Bu bileşen kullanıcıya en popüler masal türlerinden birini seçme veya serbest metin ile özel bir konu girme imkânı sunar;
 * seçilen tür ile özel konu girişleri birbirini dışlar (özel konu yazılmaya başlanınca veya textarea'ya odaklanınca seçili tür temizlenir).
 *
 * @param selectedType - Şu anda seçili masal türünün `id`'si; boş string ise tür seçili değildir.
 * @param customTopic - Özel konu metni (textarea içeriği).
 * @param onTypeChange - Seçili tür değiştirildiğinde çağrılır; boş string ile seçimi temizleme sağlar.
 * @param onCustomTopicChange - Özel konu metni değiştiğinde çağrılır.
 * @param onGenerateStory - "Masal Oluştur" butonuna basıldığında çağrılır.
 * @param onGenerateAudio - Var olan bir masal için "Seslendir" butonuna basıldığında çağrılır.
 * @param isGenerating - Masal oluşturma işleminde olduğu zamanı belirtir; true ise oluşturma butonu devre dışı ve spinner gösterilir.
 * @param isGeneratingAudio - Ses oluşturma işleminde olduğu zamanı belirtir; true ise seslendirme butonu devre dışı ve spinner gösterilir.
 * @param story - Oluşturulmuş masal nesnesi; mevcutsa "Seslendir" butonu gösterilir.
 * @param progress - Oluşturma/seslendirme süreçlerinin yüzde bazlı ilerleme değeri (0–100); 0'dan büyükse ilerleme çubuğu gösterilir.
 *
 * @returns React elemanı: masal türü seçim ve oluşturma arayüzü.
 */
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
}: StoryTypeSelectorProps) {
  const handleTypeChange = (typeId: string) => {
    onTypeChange(typeId)
  }

  const handleCustomTopicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

        {/* Masal Türü Butonları - Mobilde 2x5, desktopta 2x5 (toplam 10) */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">En Sevilen Masal Türleri</Label>
          {(() => {
            // 10 türü al, mobilde 5+5 (iki satır), >=sm'de tek grid (5x2)
            const topTen = storyTypes.slice(0, 10)
            const firstRow = topTen.slice(0, 5)
            const secondRow = topTen.slice(5, 10)

            const renderButton = (type: (typeof storyTypes)[number]) => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? 'default' : 'outline'}
                onClick={() => handleTypeChange(type.id)}
                className="w-full min-w-0 justify-center flex flex-col items-center gap-1 h-14 p-1.5 text-[10px] sm:text-xs"
                size="sm"
              >
                <span className="text-base sm:text-lg">{type.icon}</span>
                <span className="leading-tight text-center line-clamp-2">
                  {type.name}
                </span>
              </Button>
            )

            return (
              <>
                {/* Mobil 5+5 düzeni */}
                <div className="sm:hidden space-y-1">
                  <div className="grid grid-cols-5 gap-1">
                    {firstRow.map(renderButton)}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {secondRow.map(renderButton)}
                  </div>
                </div>
                {/* Desktop (>=sm) 5x2 grid */}
                <div className="hidden sm:grid grid-cols-5 auto-rows-[3.5rem] gap-2 items-stretch">
                  {topTen.map(renderButton)}
                </div>
              </>
            )
          })()}
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

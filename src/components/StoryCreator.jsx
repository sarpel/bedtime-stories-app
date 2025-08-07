import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { 
  BookOpen, 
  Sparkles, 
  Volume2, 
  Heart, 
  Share2, 
  Download, 
  Copy, 
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  X
} from 'lucide-react'
import { storyTypes } from '@/utils/storyTypes.js'
import { getStoryTypeName } from '@/utils/storyTypes.js'
import { shareStory, shareToSocialMedia, downloadStory } from '@/utils/share.js'
import sharingService from '@/services/sharingService.js'

export default function StoryCreator({ 
  selectedType, 
  customTopic, 
  storyId, // Add storyId prop for sharing
  onTypeChange, 
  onCustomTopicChange,
  onGenerateStory,
  onGenerateAudio,
  isGenerating,
  isGeneratingAudio,
  story,
  onStoryChange,
  progress,
  audioUrl,
  isPlaying,
  audioProgress,
  audioDuration,
  onPlayAudio,
  onPauseAudio,
  onStopAudio,
  onToggleMute,
  isMuted,
  isFavorite,
  onToggleFavorite,
  onClearStory,
  onSaveStory // Yeni prop eklendi
}) {
  const [copied, setCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [_shareUrl, setShareUrl] = useState('')
  const [isSharing, setIsSharing] = useState(false)

  const handleTypeChange = (typeId) => {
    onTypeChange(typeId)
    // Tür seçildiğinde custom topic'i temizle
    if (typeId && customTopic.trim()) {
      onCustomTopicChange('')
    }
  }

  const handleStoryTextChange = (e) => {
    const value = e.target.value
    
    // Eğer masal varsa, masalı güncelle
    if (story) {
      onStoryChange(value)
    } else {
      // Eğer masal yoksa, custom topic olarak güncelle
      onCustomTopicChange(value)
      // Custom topic yazılırken seçili türü temizle
      if (value.trim() && selectedType) {
        onTypeChange('')
      }
    }
  }

  const handleCopy = async () => {
    try {
      const textToCopy = story || customTopic
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Kopyalama başarısız:', error)
    }
  }

  const handleShare = async () => {
    if (!story) return
    
    if (!storyId) {
      // Fallback to old sharing method if no storyId
      const result = await shareStory(story, selectedType, customTopic)
      if (result.success && result.method === 'clipboard') {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      return
    }

    setIsSharing(true)
    try {
      const result = await sharingService.shareStory(storyId)
      if (result.success) {
        setShareUrl(result.shareUrl)
        // Copy share URL to clipboard
        await navigator.clipboard.writeText(result.shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      } else {
        console.error('Paylaşım hatası:', result.error)
        // Fallback to old method
        const fallbackResult = await shareStory(story, selectedType, customTopic)
        if (fallbackResult.success && fallbackResult.method === 'clipboard') {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      }
    } catch (error) {
      console.error('Paylaşım hatası:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const handleDownload = () => {
    if (!story) return
    downloadStory(story, selectedType)
  }

  const handleSocialShare = (platform) => {
    if (!story) return
    shareToSocialMedia(story, selectedType, platform)
    setShowShareMenu(false)
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getReadingTime = (text) => {
    const wordsPerMinute = 150
    const words = text.trim().split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return minutes
  }

  const displayText = story || customTopic
  const placeholder = story 
    ? "Masalın burada görünüyor..." 
    : "Hangi konuda bir masal duymak istiyorsun? Örn: Uzay yolculuğu yapan kedinin macerası..."

  return (
    <Card className="mb-8 overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {story ? 'Senin Masalın' : 'Hangi Masalı Duymak İstersin?'}
              {isGenerating && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              )}
            </CardTitle>
            
            {story ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Türkçe</Badge>
                <Badge variant="outline">5 Yaş</Badge>
                <Badge variant="outline">Uyku Vakti</Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {getStoryTypeName(selectedType)}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getReadingTime(story)} dk okuma
                </Badge>
              </div>
            ) : (
              <CardDescription>
                Masal türünü seç veya istediğin konuyu yaz
              </CardDescription>
            )}
          </div>
          
          {story && (
            <div className="flex gap-2">
              {/* Geri butonu */}
              <Button
                variant="outline"
                size="sm"
                onClick={onClearStory}
                className="self-end"
              >
                <X className="h-4 w-4 mr-2" />
                Geri
              </Button>
              
              {/* Kaydet butonu */}
              <Button
                variant="default"
                size="sm"
                onClick={onSaveStory}
                className="self-end"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Kaydet
              </Button>
              
              {/* Seslendir butonu */}
              {!isGeneratingAudio && !audioUrl && (
                <Button 
                  onClick={onGenerateAudio}
                  variant="secondary"
                  size="sm"
                  className="self-end"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Seslendir
                </Button>
              )}
            </div>
          )}
          
          {story && (
            <div className="flex flex-col gap-2">
              {/* Audio controls */}
              {(isGeneratingAudio || audioUrl) && (
                <div className="self-end">
                  {isGeneratingAudio ? (
                    <Button disabled size="sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Seslendiriliyor...
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button 
                        variant={isPlaying ? "secondary" : "default"}
                        size="sm"
                        onClick={isPlaying ? onPauseAudio : onPlayAudio}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={onStopAudio}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Favori ve diğer butonlar */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFavorite({ 
                    story, 
                    storyType: selectedType, 
                    customTopic,
                    audioUrl 
                  })}
                  className={isFavorite ? 'text-red-500 hover:text-red-600' : ''}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowShareMenu(!showShareMenu)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  
                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg p-2 z-10 min-w-[200px]">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={handleShare}
                      disabled={isSharing}
                    >
                      {isSharing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2" />
                          Paylaşılıyor...
                        </>
                      ) : copied ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          Link Kopyalandı!
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4 mr-2" />
                          {storyId ? 'Benzersiz Link Oluştur' : 'Paylaş'}
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      İndir
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={handleCopy}
                    >
                      {copied ? <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? 'Kopyalandı' : 'Kopyala'}
                    </Button>
                    <div className="border-t my-1" />
                    <div className="text-xs text-muted-foreground px-2 py-1">
                      Sosyal Medya
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-xs"
                      onClick={() => handleSocialShare('twitter')}
                    >
                      Twitter
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-xs"
                      onClick={() => handleSocialShare('whatsapp')}
                    >
                      WhatsApp
                    </Button>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {/* Masal Türü Butonları - Sadece masal oluşturulmamışsa göster */}
        {!story && (
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
        )}

        {/* Ana Metin Kutusu */}
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              {!story && (
                <Label htmlFor="story-input">
                  {selectedType ? 'Seçili Masal Türü' : 'Özel Masal Konun'}
                </Label>
              )}
              <div className="relative">
                <Textarea
                  id="story-input"
                  placeholder={placeholder}
                  value={displayText}
                  onChange={handleStoryTextChange}
                  className={`min-h-[300px] resize-none ${
                    story 
                      ? 'text-base leading-relaxed border-0 bg-transparent p-0 focus-visible:ring-0' 
                      : 'min-h-[120px]'
                  }`}
                  readOnly={isGenerating}
                />
                {story && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearStory}
                    className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    title="Metni temizle"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {!story && (
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
              </div>
            )}
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

        {/* Yükleme Durumu */}
        {isGenerating && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Seçim Özeti - Sadece masal oluşturulmamışsa ve seçim varsa göster */}
        {!story && (selectedType || customTopic.trim()) && (
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

        {/* Aksiyon Butonları - Sadece masal varsa göster */}
        {story && (
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button 
              onClick={onGenerateAudio}
              disabled={isGeneratingAudio}
              variant="outline"
              className="flex items-center gap-2"
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
            
            {audioUrl && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={isPlaying ? onPauseAudio : onPlayAudio}
                  size="sm"
                  variant="outline"
                >
                  {isPlaying ? 'Duraklat' : 'Oynat'}
                </Button>
                <Button onClick={onStopAudio} size="sm" variant="outline">
                  Durdur
                </Button>
                <Button onClick={onToggleMute} size="sm" variant="outline">
                  {isMuted ? 'Sesi Aç' : 'Sustur'}
                </Button>
                {audioDuration > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(audioDuration * audioProgress / 100)} / {formatDuration(audioDuration)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ses Progress */}
        {story && audioUrl && audioDuration > 0 && (
          <div className="space-y-2">
            <Progress value={audioProgress} className="h-1" />
          </div>
        )}

        {/* Hata Durumu */}
        {!isGenerating && !story && !customTopic.trim() && !selectedType && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Lütfen bir masal türü seçin veya özel bir konu yazın</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import { useState, useRef, useEffect } from 'react'
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
import { storyTypes, getStoryTypeName, extractStoryTitle } from '@/utils/storyTypes.js'
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
  const [categoryInput, setCategoryInput] = useState('')
  const [categories, setCategories] = useState([])
  const shareMenuRef = useRef(null)

  // Click outside handler için
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false)
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showShareMenu])

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

  const handleAddCategories = () => {
    if (!categoryInput.trim()) return
  const handleAddCategories = () => {
    // Don’t proceed if the input is empty or only whitespace
    if (!categoryInput.trim()) return

    // Split on commas, trim, lowercase, and dedupe within the input
    const parts = categoryInput
      .split(',')
      .map(c => c.trim().toLowerCase())
      .filter((c, index, arr) =>
        c.length >= 2 &&
        c.length <= 24 &&
        arr.indexOf(c) === index
      )

    if (parts.length === 0) return

    const merged = [...categories]
    parts.forEach(p => {
      // Avoid case-insensitive duplicates against existing categories
      if (
        merged.length < 10 &&
        !merged.some(m => m.toLowerCase() === p.toLowerCase())
      ) {
        merged.push(p)
      }
    })


    setCategories(merged)
    setCategoryInput('')
  }

  const handleRemoveCategory = (cat) => {
    setCategories(categories.filter(c => c !== cat))
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
    <Card className="mb-4 sm:mb-8 overflow-hidden">
      <CardHeader className="border-b p-3 sm:p-6">
        <div className="flex items-start justify-between flex-col sm:flex-row gap-3">
          <div className="flex-1 w-full">
            <CardTitle className="flex items-center gap-2 mb-2 text-base sm:text-lg">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {story ? extractStoryTitle(story) : 'Hangi Masalı Duymak İstersin?'}
              {isGenerating && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              )}
            </CardTitle>
            
            {story ? (
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <Badge variant="secondary" className="text-xs">Türkçe</Badge>
                <Badge variant="outline" className="text-xs">5 Yaş</Badge>
                <Badge variant="outline" className="text-xs">Uyku Vakti</Badge>
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  {getStoryTypeName(selectedType)}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {getReadingTime(story)} dk okuma
                </Badge>
                {categories.map(cat => (
                  {categories.map(cat => (
                    <Badge
                      key={cat}
                      variant="outline"
                      className="flex items-center gap-1 text-xs cursor-pointer"
                      onClick={() => handleRemoveCategory(cat)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRemoveCategory(cat)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${cat} kategorisini kaldır`}
                      title="Kaldır"
                    >
                      #{cat}
                    </Badge>
                  ))}

              </div>
            ) : (
              <CardDescription className="text-sm">
                Masal türünü seç veya istediğin konuyu yaz
              </CardDescription>
            )}
          </div>
          
          {story && (
            <div className="flex gap-1 sm:gap-2 flex-wrap w-full sm:w-auto">
              {/* Geri butonu */}
              <Button
                variant="outline"
                size="sm"
                onClick={onClearStory}
                className="flex-1 sm:flex-none"
              >
                <X className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Geri</span>
              </Button>
              
              {/* Kaydet butonu */}
              <Button
                variant="default"
                size="sm"
                onClick={onSaveStory}
                className="flex-1 sm:flex-none"
              >
                <CheckCircle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Kaydet</span>
              </Button>
              
              {/* Seslendir butonu */}
              {!isGeneratingAudio && !audioUrl && (
                <Button 
                  onClick={onGenerateAudio}
                  variant="secondary"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Volume2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Seslendir</span>
                </Button>
              )}
            </div>
          )}
          
          {story && (
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              {/* Audio controls */}
              {(isGeneratingAudio || audioUrl) && (
                <div className="w-full sm:self-end">
                  {isGeneratingAudio ? (
                    <Button disabled size="sm" className="w-full sm:w-auto">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Seslendiriliyor...
                    </Button>
                  ) : (
                    <div className="flex gap-1 w-full sm:w-auto">
                      <Button 
                        variant={isPlaying ? "secondary" : "default"}
                        size="sm"
                        onClick={isPlaying ? onPauseAudio : onPlayAudio}
                        className="flex-1 sm:flex-none"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={onStopAudio}
                        className="flex-1 sm:flex-none"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Favori ve diğer butonlar */}
              <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleFavorite}
                  className={`flex-1 sm:flex-none ${isFavorite ? 'text-red-500 hover:text-red-600' : ''}`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <div className="relative flex-1 sm:flex-none">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="w-full sm:w-auto"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  
                  {showShareMenu && (
                    <div 
                      ref={shareMenuRef}
                      className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg p-2 z-10 min-w-[200px]"
                    >
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

      <CardContent className="space-y-4 p-3 sm:p-6">
        {/* Masal Türü Butonları - Sadece masal oluşturulmamışsa göster */}
        {!story && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">En Sevilen Masal Türleri</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {storyTypes.slice(0, 5).map((type) => (
                <Button
                  key={type.id}
                  variant={selectedType === type.id ? "default" : "outline"}
                  onClick={() => handleTypeChange(type.id)}
                  className="flex flex-col items-center gap-1 h-14 sm:h-16 p-1 sm:p-2 text-xs"
                  size="sm"
                >
                  <span className="text-base sm:text-lg">{type.icon}</span>
                  <span className="leading-none text-center text-xs">{type.name}</span>
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {storyTypes.slice(5, 10).map((type) => (
                <Button
                  key={type.id}
                  variant={selectedType === type.id ? "default" : "outline"}
                  onClick={() => handleTypeChange(type.id)}
                  className="flex flex-col items-center gap-1 h-14 sm:h-16 p-1 sm:p-2 text-xs"
                  size="sm"
                >
                  <span className="text-base sm:text-lg">{type.icon}</span>
                  <span className="leading-none text-center text-xs">{type.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Ana Metin Kutusu */}
        <div className="space-y-3">
          {!story && (
            <div className="space-y-2">
              <Label htmlFor="categories" className="text-xs font-medium">Kategoriler (virgülle ayır) - örn: macera, uyku</Label>
              <div className="flex gap-2">
                <input
                  id="categories"
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategories(); } }}
                  className="flex-1 border rounded px-2 py-1 text-xs"
                  placeholder="macera, uyku"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddCategories} className="text-xs">Ekle</Button>
              </div>
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {categories.map(cat => (
                    <Badge key={cat} variant="outline" className="text-xs cursor-pointer" onClick={() => handleRemoveCategory(cat)} title="Kaldır">#{cat}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 w-full">
              {!story && (
                <Label htmlFor="story-input" className="text-sm">
                  {selectedType ? 'Seçili Masal Türü' : 'Özel Masal Konun'}
                </Label>
              )}
              <div className="relative">
                <Textarea
                  id="story-input"
                  placeholder={placeholder}
                  value={displayText}
                  onChange={handleStoryTextChange}
                  className={`resize-none ${
                    story 
                      ? 'min-h-[250px] sm:min-h-[300px] text-sm sm:text-base leading-relaxed border-0 bg-transparent p-0 focus-visible:ring-0' 
                      : 'min-h-[100px] sm:min-h-[120px] text-sm'
                  }`}
                  readOnly={isGenerating}
                />
                {story && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearStory}
                    className="absolute top-2 right-2 h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    title="Metni temizle"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {!story && (
              <div className="flex flex-col gap-2 w-full sm:min-w-[120px] sm:w-auto">
                <Button 
                  onClick={() => onGenerateStory(categories)}
                  disabled={isGenerating || (!selectedType && !customTopic.trim())}
                  className="flex items-center gap-2 w-full"
                  size="default"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                      <span className="text-xs sm:text-sm">Oluşturuluyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">Masal Oluştur</span>
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
          <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
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
          <div className="flex flex-wrap gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
            <Button 
              onClick={onGenerateAudio}
              disabled={isGeneratingAudio}
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-none"
              size="sm"
            >
              {isGeneratingAudio ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  <span className="text-xs sm:text-sm">Sesli...</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">Seslendir</span>
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

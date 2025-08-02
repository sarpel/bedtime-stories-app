import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog.jsx'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { 
  BookOpen, 
  Edit3, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Download,
  Calendar,
  FileText,
  Loader2,
  Save,
  X,
  Heart
} from 'lucide-react'
import { getStoryTypeLabel } from '@/utils/storyTypes.js'
import { TTSService } from '@/services/ttsService.js'

const StoryManagementPanel = ({ 
  history, 
  onUpdateStory, 
  onDeleteStory, 
  onClearHistory,
  onClose,
  settings,
  favorites,
  onToggleFavorite,
  isFavorite
}) => {
  const [selectedStory, setSelectedStory] = useState(null)
  const [editedStory, setEditedStory] = useState('')
  const [editedTitle, setEditedTitle] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [playingAudio, setPlayingAudio] = useState(null)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(null)
  const [audioProgress, setAudioProgress] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const audioRefs = useRef({})

  const filteredHistory = history.filter(story => 
    story.story.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getStoryTypeLabel(story.storyType).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (story.customTopic && story.customTopic.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleEditStory = (story) => {
    setSelectedStory(story)
    setEditedStory(story.story)
    setEditedTitle(story.customTopic || '')
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (selectedStory && editedStory.trim()) {
      onUpdateStory(selectedStory.id, {
        story: editedStory.trim(),
        customTopic: editedTitle.trim() || selectedStory.customTopic
      })
      setIsEditing(false)
      setSelectedStory(null)
      setEditedStory('')
      setEditedTitle('')
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setSelectedStory(null)
    setEditedStory('')
    setEditedTitle('')
  }

  const handleGenerateAudio = async (story) => {
    if (isGeneratingAudio) return
    
    setIsGeneratingAudio(story.id)
    try {
      const ttsService = new TTSService(settings)
      const audioUrl = await ttsService.generateAudio(story.story, (progress) => {
        setAudioProgress(prev => ({ ...prev, [story.id]: progress }))
      })
      
      // Update story with audio URL
      onUpdateStory(story.id, { audioUrl, audioGenerated: true })
    } catch (error) {
      console.error('Ses oluşturulurken hata:', error)
    } finally {
      setIsGeneratingAudio(null)
      setAudioProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[story.id]
        return newProgress
      })
    }
  }

  const handlePlayAudio = (story) => {
    if (!story.audioUrl) return
    
    const audio = audioRefs.current[story.id]
    if (audio) {
      if (playingAudio === story.id) {
        audio.pause()
        setPlayingAudio(null)
      } else {
        // Pause all other audios
        Object.values(audioRefs.current).forEach(a => a.pause())
        setPlayingAudio(null)
        
        audio.play()
        setPlayingAudio(story.id)
      }
    }
  }

  const handleDownloadAudio = (story) => {
    if (story.audioUrl) {
      const link = document.createElement('a')
      link.href = story.audioUrl
      link.download = `masal-${story.id}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const getTruncatedStory = (story, maxLength = 150) => {
    return story.length > maxLength ? story.substring(0, maxLength) + '...' : story
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Masal Yönetimi
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Masallarınızı düzenleyin, silin ve ses dosyalarını yönetin
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Masallarda ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={history.length === 0}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Tümünü Sil
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tüm Masalları Sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu işlem geri alınamaz. Tüm masallar ve ses dosyaları silinecek.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onClearHistory}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Evet, Tümünü Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Stories List */}
          <div className="overflow-auto max-h-[60vh]">
            {filteredHistory.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Arama kriterinize uygun masal bulunamadı.' : 'Henüz kaydedilmiş masal yok.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((story) => (
                  <Card key={story.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {getStoryTypeLabel(story.storyType)}
                            </Badge>
                            {story.customTopic && (
                              <Badge variant="outline">{story.customTopic}</Badge>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                              <Calendar className="h-3 w-3" />
                              {formatDate(story.createdAt)}
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {getTruncatedStory(story.story)}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 lg:w-48">
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="flex-1">
                                  <FileText className="h-3 w-3 mr-1" />
                                  Oku
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    {story.customTopic || getStoryTypeLabel(story.storyType)}
                                  </DialogTitle>
                                  <DialogDescription>
                                    {formatDate(story.createdAt)}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="prose prose-sm max-w-none">
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {story.story}
                                  </p>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditStory(story)}
                              className="flex-1"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Düzenle
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onToggleFavorite({
                                story: story.story,
                                storyType: story.storyType,
                                customTopic: story.customTopic,
                                audioUrl: story.audioUrl
                              })}
                              className={`${
                                isFavorite({ story: story.story, storyType: story.storyType }) 
                                ? 'text-red-500 hover:text-red-600' 
                                : 'hover:text-red-500'
                              }`}
                              title="Favorilere ekle/çıkar"
                            >
                              <Heart className={`h-3 w-3 ${
                                isFavorite({ story: story.story, storyType: story.storyType }) 
                                ? 'fill-current' 
                                : ''
                              }`} />
                            </Button>
                          </div>

                          <div className="flex gap-1">
                            {story.audioUrl ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handlePlayAudio(story)}
                                  className="flex-1"
                                >
                                  {playingAudio === story.id ? 
                                    <Pause className="h-3 w-3 mr-1" /> : 
                                    <Play className="h-3 w-3 mr-1" />
                                  }
                                  {playingAudio === story.id ? 'Durdur' : 'Dinle'}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDownloadAudio(story)}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleGenerateAudio(story)}
                                disabled={isGeneratingAudio === story.id}
                                className="flex-1"
                              >
                                {isGeneratingAudio === story.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    {audioProgress[story.id] || 0}%
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-3 w-3 mr-1" />
                                    Seslendir
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="w-full">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Sil
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Masalı Sil</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu masalı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => onDeleteStory(story.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Evet, Sil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {/* Hidden audio elements */}
                        {story.audioUrl && (
                          <audio
                            ref={(el) => {
                              if (el) audioRefs.current[story.id] = el
                            }}
                            src={story.audioUrl}
                            onEnded={() => setPlayingAudio(null)}
                            onPause={() => setPlayingAudio(null)}
                            preload="none"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Story Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Masalı Düzenle</DialogTitle>
            <DialogDescription>
              Masal metnini ve başlığını düzenleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Başlık (İsteğe bağlı)</Label>
              <Input
                id="title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Masal başlığı..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="story">Masal Metni</Label>
              <Textarea
                id="story"
                value={editedStory}
                onChange={(e) => setEditedStory(e.target.value)}
                placeholder="Masal metni..."
                className="min-h-[300px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              İptal
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editedStory.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StoryManagementPanel

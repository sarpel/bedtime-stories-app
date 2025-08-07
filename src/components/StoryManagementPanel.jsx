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
  onToggleFavorite,
  isFavorite
}) => {
  const [selectedStory, setSelectedStory] = useState(null)
  const [editedStory, setEditedStory] = useState('')
  const [editedTitle, setEditedTitle] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [playingAudio, setPlayingAudio] = useState(null)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(null)
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
      const audioUrl = await ttsService.generateAudio(story.story)
      
      // Update story with audio URL
      onUpdateStory(story.id, { audioUrl, audioGenerated: true })
    } catch (error) {
      console.error('Ses oluşturulurken hata:', error)
    } finally {
      setIsGeneratingAudio(null)
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

  const getTruncatedStory = (story, maxLength = 80) => {
    return story.length > maxLength ? story.substring(0, maxLength) + '...' : story
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Masal Yönetimi
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Masallarınızı düzenleyin, silin ve ses dosyalarını yönetin
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-3">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Masallarda ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8"
              />
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={history.length === 0} className="h-8">
                    <Trash2 className="h-3 w-3 mr-1" />
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
          <div className="overflow-auto max-h-[78vh]">
            {filteredHistory.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? 'Arama kriterinize uygun masal bulunamadı.' : 'Henüz kaydedilmiş masal yok.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-0.5">
                {filteredHistory.map((story) => (
                  <Card key={story.id} className="hover:shadow-sm transition-shadow border-muted/40">
                    <CardContent className="p-1.5">
                      <div className="flex items-center gap-2">
                        {/* Story Info - Ultra Compact */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 leading-none">
                              {getStoryTypeLabel(story.storyType)}
                            </Badge>
                            {story.customTopic && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 leading-none">{story.customTopic}</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                              {formatDate(story.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
                            {getTruncatedStory(story.story, 80)}
                          </p>
                        </div>

                        {/* Action Buttons - Ultra Compact */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Oku">
                                <FileText className="h-2.5 w-2.5" />
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
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditStory(story)}
                            className="h-6 w-6 p-0"
                            title="Düzenle"
                          >
                            <Edit3 className="h-2.5 w-2.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await onToggleFavorite({
                                story: story.story,
                                storyType: story.storyType,
                                customTopic: story.customTopic,
                                audioUrl: story.audioUrl
                              })
                            }}
                            className={`h-6 w-6 p-0 ${
                              isFavorite({ story: story.story, storyType: story.storyType }) 
                              ? 'text-red-500 hover:text-red-600' 
                              : 'hover:text-red-500'
                            }`}
                            title="Favorilere ekle/çıkar"
                          >
                            <Heart className={`h-2.5 w-2.5 ${
                              isFavorite({ story: story.story, storyType: story.storyType }) 
                              ? 'fill-current' 
                              : ''
                            }`} />
                          </Button>

                          {/* Audio Controls */}
                          {story.audioUrl ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handlePlayAudio(story)}
                                className="h-6 w-6 p-0"
                                title={playingAudio === story.id ? 'Durdur' : 'Dinle'}
                              >
                                {playingAudio === story.id ? 
                                  <Pause className="h-2.5 w-2.5" /> : 
                                  <Play className="h-2.5 w-2.5" />
                                }
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDownloadAudio(story)}
                                className="h-6 w-6 p-0"
                                title="İndir"
                              >
                                <Download className="h-2.5 w-2.5" />
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleGenerateAudio(story)}
                              disabled={isGeneratingAudio === story.id}
                              className="h-6 w-6 p-0"
                              title="Seslendir"
                            >
                              {isGeneratingAudio === story.id ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Volume2 className="h-2.5 w-2.5" />
                              )}
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" title="Sil">
                                <Trash2 className="h-2.5 w-2.5" />
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

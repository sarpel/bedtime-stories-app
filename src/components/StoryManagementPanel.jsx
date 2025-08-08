import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { X, Search, Edit, Trash2, BookOpen, Heart, Calendar, Volume2 } from 'lucide-react';
import { getStoryTypeLabel } from '../utils/storyTypes';
import AudioControls from './AudioControls.jsx';

const StoryManagementPanel = ({ 
  isOpen, 
  onClose, 
  history, 
  onDeleteStory, 
  onUpdateStory,
  onToggleFavorite,
  isFavorite,
  onGenerateAudio,
  isGeneratingAudio,
  // Audio control props
  audioIsPlaying,
  audioIsPaused,
  audioProgress,
  audioDuration,
  audioVolume,
  audioIsMuted,
  audioPlaybackRate,
  audioCurrentStoryId,
  playAudio,
  stopAudio,
  audioToggleMute,
  setVolumeLevel,
  setPlaybackSpeed,
  seekTo,
  getDbAudioUrl
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStories, setFilteredStories] = useState(history || []);
  const [editingStory, setEditingStory] = useState(null);
  const [editedText, setEditedText] = useState('');
  const panelRef = useRef(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  useEffect(() => {
    const stories = history || [];
    // En yeni masallar üstte olacak şekilde sıralama
    const sortedStories = [...stories].sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0);
      const dateB = new Date(b.created_at || b.createdAt || 0);
      return dateB - dateA; // Descending order (newest first)
    });
    
    if (searchTerm) {
      const filtered = sortedStories.filter(story => 
        (story.story_text || story.story || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (story.story_type || story.storyType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (story.custom_topic || story.customTopic || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStories(filtered);
    } else {
      setFilteredStories(sortedStories);
    }
  }, [searchTerm, history]);

  const handleEditStory = (story) => {
    setEditingStory(story);
    setEditedText(story.story_text || story.story || '');
  };

  const handleSaveEdit = () => {
    if (onUpdateStory && editingStory) {
      onUpdateStory(editingStory.id, editedText);
      setEditingStory(null);
      setEditedText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingStory(null);
    setEditedText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-1">
      <Card ref={panelRef} className="w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b p-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Masal Yönetimi ({filteredStories.length})
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Search - Header içinde kompakt */}
          <div className="flex items-center gap-1 mt-2">
            <Search className="h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Masallarda ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 h-7 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-2 space-y-1">
          {/* Story List - Kompakt */}
          <ScrollArea className="h-96">
            <div className="space-y-1">
              {filteredStories.map((story) => (
                <Card key={story.id} className="p-2">
                  <div className="space-y-1">
                    {/* Başlık satırı - kompakt */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                          {getStoryTypeLabel(story.story_type || story.storyType)}
                        </Badge>
                        {(story.custom_topic || story.customTopic) && (
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                            {story.custom_topic || story.customTopic}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-2 w-2" />
                          {new Date(story.created_at || story.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Audio Controls - Ses dosyası varsa göster */}
                        {(story.audio?.file_name || story.audioUrl) && (
                          <AudioControls
                            storyId={story.id}
                            audioUrl={story.audio?.file_name ? getDbAudioUrl(story.audio.file_name) : story.audioUrl}
                            isPlaying={audioIsPlaying}
                            isPaused={audioIsPaused}
                            progress={audioProgress}
                            duration={audioDuration}
                            volume={audioVolume}
                            isMuted={audioIsMuted}
                            playbackRate={audioPlaybackRate}
                            currentStoryId={audioCurrentStoryId}
                            onPlay={playAudio}
                            onStop={stopAudio}
                            onToggleMute={audioToggleMute}
                            onVolumeChange={setVolumeLevel}
                            onPlaybackSpeedChange={setPlaybackSpeed}
                            onSeek={seekTo}
                            size="xs"
                            showAdvanced={false}
                          />
                        )}
                        
                        {/* Generate Audio Button for stories without audio */}
                        {!story.audio?.file_name && !story.audioUrl && onGenerateAudio && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onGenerateAudio(story)}
                            disabled={isGeneratingAudio}
                            className="h-5 px-1 text-xs"
                            title="Hikayeyi seslendir"
                          >
                            <Volume2 className="h-2 w-2 mr-1" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleFavorite?.({
                            story: story.story_text || story.story,
                            storyType: story.story_type || story.storyType,
                            customTopic: story.custom_topic || story.customTopic
                          })}
                          className={`h-5 w-5 p-0 ${isFavorite?.({ 
                            story: story.story_text || story.story, 
                            storyType: story.story_type || story.storyType 
                          }) ? 'text-red-500' : ''}`}
                          title="Favorilere ekle/çıkar"
                        >
                          <Heart className={`h-2 w-2 ${
                            isFavorite?.({ 
                              story: story.story_text || story.story, 
                              storyType: story.story_type || story.storyType 
                            }) ? 'fill-current' : ''
                          }`} />
                        </Button>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStory(story)}
                              className="h-5 w-5 p-0"
                              title="Düzenle"
                            >
                              <Edit className="h-2 w-2" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Masalı Düzenle</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <textarea
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="w-full h-64 p-3 border rounded-md resize-none"
                                placeholder="Masal metnini düzenleyin..."
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={handleCancelEdit}>
                                  İptal
                                </Button>
                                <Button onClick={handleSaveEdit}>
                                  Kaydet
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive h-5 w-5 p-0"
                              title="Sil"
                            >
                              <Trash2 className="h-2 w-2" />
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
                                onClick={() => onDeleteStory?.(story.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Sil
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    
                    {/* Masal içeriği - Kompakt 1 satır */}
                    <p className="text-xs text-muted-foreground line-clamp-1 leading-tight">
                      {(story.story_text || story.story || '').substring(0, 100)}...
                    </p>
                  </div>
                </Card>
              ))}

              {filteredStories.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">
                    {searchTerm ? 'Arama kriterlerine uygun masal bulunamadı' : 'Henüz kaydedilmiş masal yok'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoryManagementPanel;

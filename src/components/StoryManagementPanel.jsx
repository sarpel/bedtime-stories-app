import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const stories = history || [];
    if (searchTerm) {
      const filtered = stories.filter(story => 
        (story.story_text || story.story || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (story.story_type || story.storyType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (story.custom_topic || story.customTopic || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStories(filtered);
    } else {
      setFilteredStories(stories);
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Masal Yönetimi
              </CardTitle>
              <CardDescription>
                Masallarınızı düzenleyin, arayın ve yönetin
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Masallarda ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <Separator />

          {/* Story List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Masallar ({filteredStories.length})
              </h3>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredStories.map((story) => (
                  <Card key={story.id} className="p-3">
                    <div className="space-y-2">
                      {/* Başlık satırı - masal türü, tarih ve mini ikonlar */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            {getStoryTypeLabel(story.story_type || story.storyType)}
                          </Badge>
                          {(story.custom_topic || story.customTopic) && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              {story.custom_topic || story.customTopic}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(story.created_at || story.createdAt).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Audio Controls */}
                          {(story.audio || story.audioUrl) && (
                            <AudioControls
                              storyId={story.id}
                              audioUrl={story.audio ? getDbAudioUrl(story.audio.file_name) : story.audioUrl}
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
                          
                          {/* Play Button - Only if audio exists */}
                          {(story.audio || story.audioUrl) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playAudio?.(story.id, story.audio ? getDbAudioUrl(story.audio.file_name) : story.audioUrl)}
                              className="h-6 w-6 p-0"
                              title="Oynat"
                            >
                              <Volume2 className="h-3 w-3" />
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
                            className={`h-6 w-6 p-0 ${isFavorite?.({ 
                              story: story.story_text || story.story, 
                              storyType: story.story_type || story.storyType 
                            }) ? 'text-red-500' : ''}`}
                            title="Favorilere ekle/çıkar"
                          >
                            <Heart className={`h-3 w-3 ${
                              isFavorite?.({ 
                                story: story.story_text || story.story, 
                                storyType: story.story_type || story.storyType 
                              }) ? 'fill-current' : ''
                            }`} />
                          </Button>
                          
                          {/* View Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Story'yi görüntüle - aynı queue panelindeki gibi
                              // Bu button için bir onSelectStory prop'u eklenebilir
                            }}
                            className="h-6 w-6 p-0"
                            title="Masalı görüntüle"
                          >
                            <BookOpen className="h-3 w-3" />
                          </Button>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditStory(story)}
                                className="h-6 w-6 p-0"
                                title="Düzenle"
                              >
                                <Edit className="h-3 w-3" />
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
                                className="text-destructive hover:text-destructive h-6 w-6 p-0"
                                title="Sil"
                              >
                                <Trash2 className="h-3 w-3" />
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
                      
                      {/* Masal içeriği - 2 satır */}
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-tight">
                        {(story.story_text || story.story || '').substring(0, 150)}...
                      </p>
                    </div>
                  </Card>
                ))}

                {filteredStories.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>
                      {searchTerm ? 'Arama kriterlerine uygun masal bulunamadı' : 'Henüz kaydedilmiş masal yok'}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoryManagementPanel;

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'
import { BookOpen, Heart, X, GripVertical, Settings, Calendar, Clock } from 'lucide-react'
import AudioControls from './AudioControls.jsx'
import { getStoryTypeLabel } from '@/utils/storyTypes.js'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Sortable Story Item Component
function SortableStoryItem({ 
  story, 
  onToggleFavorite, 
  onDeleteStory, 
  onSelectStory, 
  isFavorite,
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
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: story.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 border rounded-lg hover:bg-muted/30 transition-colors min-h-16 sm:h-12 bg-background gap-2 ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
      }`}
    >
      {/* Drag Handle - Mobile: positioned differently */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded transition-colors self-start sm:mr-2 sm:self-center"
        title="Sürükleyerek sırala"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>

      {/* Story Info */}
      <div className="flex-1 min-w-0 w-full sm:w-auto">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 mb-1 sm:mb-0.5">
          <Badge variant="secondary" className="text-xs sm:text-[9px] px-1.5 sm:px-1 py-0.5 h-4 sm:h-3 leading-none">
            {getStoryTypeLabel(story.story_type || story.storyType)}
          </Badge>
          {(story.custom_topic || story.customTopic) && (
            <Badge variant="outline" className="text-xs sm:text-[9px] px-1.5 sm:px-1 py-0.5 h-4 sm:h-3 leading-none max-w-24 truncate">
              {story.custom_topic || story.customTopic}
            </Badge>
          )}
          <span className="text-xs sm:text-[9px] text-muted-foreground font-mono shrink-0">
            {new Date(story.created_at || story.createdAt).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: '2-digit'
            })}
          </span>
        </div>
        <p className="text-xs sm:text-[10px] text-muted-foreground truncate leading-tight">
          {(story.story_text || story.story).substring(0, 50)}...
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-0.5 ml-0 sm:ml-2 shrink-0 w-full sm:w-auto justify-end">
        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('❤️ Favori butonuna tıklandı, story:', story)
            console.log('❤️ onToggleFavorite fonksiyonu mevcut mu?', typeof onToggleFavorite)
            
            if (typeof onToggleFavorite !== 'function') {
              console.error('❤️ onToggleFavorite bir fonksiyon değil!')
              return
            }
            
            const storyData = {
              story: story.story_text || story.story,
              storyType: story.story_type || story.storyType,
              customTopic: story.custom_topic || story.customTopic,
              audioUrl: story.audio ? getDbAudioUrl(story.audio.file_name) : story.audioUrl
            }
            console.log('❤️ Toggle favorite için gönderilen data:', storyData)
            
            try {
              const result = await onToggleFavorite(storyData)
              console.log('❤️ Toggle sonucu:', result)
            } catch (error) {
              console.error('❤️ Toggle hatası:', error)
            }
          }}
          className={`h-5 w-5 p-0 ${
            isFavorite({ 
              story: story.story_text || story.story, 
              storyType: story.story_type || story.storyType 
            }) 
            ? 'text-red-500 hover:text-red-600' 
            : 'hover:text-red-500'
          }`}
          title="Favorilere ekle/çıkar"
        >
          <Heart className={`h-2 w-2 ${
            isFavorite({ 
              story: story.story_text || story.story, 
              storyType: story.story_type || story.storyType 
            }) 
            ? 'fill-current' 
            : ''
          }`} />
        </Button>
        
        {/* Audio Controls */}
        {(story.audio || story.audioUrl) && (
          <div className="flex items-center">
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
            />
          </div>
        )}

        {/* View Button */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('👁️ Görüntüle butonuna tıklandı, story:', story)
            console.log('👁️ onSelectStory fonksiyonu mevcut mu?', typeof onSelectStory)
            
            if (typeof onSelectStory !== 'function') {
              console.error('👁️ onSelectStory bir fonksiyon değil!')
              return
            }
            
            onSelectStory(story)
          }}
          className="h-5 w-5 p-0"
          title="Masalı görüntüle"
        >
          <BookOpen className="h-2 w-2" />
        </Button>
        
        {/* Delete Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('🗑️ Sil butonuna tıklandı, story ID:', story.id)
            console.log('🗑️ onDeleteStory fonksiyonu mevcut mu?', typeof onDeleteStory)
            
            if (typeof onDeleteStory !== 'function') {
              console.error('🗑️ onDeleteStory bir fonksiyon değil!')
              return
            }
            
            onDeleteStory(story.id)
          }}
          className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
          title="Masalı sil"
        >
          <X className="h-2 w-2" />
        </Button>
      </div>
    </div>
  )
}

export default function StoryQueuePanel({ 
  stories, 
  onDeleteStory,
  onSelectStory,
  onShowStoryManagement,
  onToggleFavorite,
  isFavorite,
  // Audio props
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
}) {
  const [localStories, setLocalStories] = useState(stories)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event) {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = localStories.findIndex((story) => story.id === active.id)
      const newIndex = localStories.findIndex((story) => story.id === over.id)

      const newStories = arrayMove(localStories, oldIndex, newIndex)
      setLocalStories(newStories)
      
      // TODO: Persist queue order to backend/localStorage if needed
      console.log('Queue order changed:', newStories.map(s => s.id))
    }
  }

  // Update local stories when prop changes
  useEffect(() => {
    setLocalStories(stories)
  }, [stories])

  const displayStories = localStories.slice(0, 12) // Limit to 12 for better UI

  return (
    <Card className="mt-4 sm:mt-8">
      <CardHeader className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="h-4 w-4 text-primary" />
              Masal Kuyruğu
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Masalları sürükleyerek sıralayın - İlk 12 masal gösteriliyor
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={onShowStoryManagement}
            className="gap-1 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto"
            size="sm"
          >
            <Settings className="h-3 w-3" />
            Tümünü Yönet
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="max-h-96 sm:max-h-80 overflow-hidden">
          {displayStories.length > 0 ? (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={displayStories.map(story => story.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 sm:space-y-1 max-h-96 sm:max-h-80 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  {displayStories.map((story) => (
                    <SortableStoryItem
                      key={story.id}
                      story={story}
                      onToggleFavorite={onToggleFavorite}
                      onDeleteStory={onDeleteStory}
                      onSelectStory={onSelectStory}
                      isFavorite={isFavorite}
                      audioIsPlaying={audioIsPlaying}
                      audioIsPaused={audioIsPaused}
                      audioProgress={audioProgress}
                      audioDuration={audioDuration}
                      audioVolume={audioVolume}
                      audioIsMuted={audioIsMuted}
                      audioPlaybackRate={audioPlaybackRate}
                      audioCurrentStoryId={audioCurrentStoryId}
                      playAudio={playAudio}
                      stopAudio={stopAudio}
                      audioToggleMute={audioToggleMute}
                      setVolumeLevel={setVolumeLevel}
                      setPlaybackSpeed={setPlaybackSpeed}
                      seekTo={seekTo}
                      getDbAudioUrl={getDbAudioUrl}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Henüz kaydedilmiş masal yok</p>
            </div>
          )}
          
          {stories.length > 12 && (
            <div className="text-center py-3 border-t mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onShowStoryManagement}
                className="text-xs"
              >
                +{stories.length - 12} masal daha - Tümünü Görüntüle
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

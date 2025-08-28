import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { BookOpen, Heart, X, GripVertical, Settings, Volume2, Play, Pause, Square, SkipForward, SkipBack, Shuffle, Repeat2, Plus, Edit, Trash2, Radio } from 'lucide-react'
import AudioControls from './AudioControls.jsx'
import { getStoryTypeLabel } from '@/utils/storyTypes.js'
import { getStoryTitle } from '@/utils/titleGenerator.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
// CSS util kullanılmıyor, kaldırıldı
import { queueService } from '@/services/queueService.js'
import { getBestTitle } from '@/services/titleService.js'

// Type definitions
interface Story {
  id?: string | number
  story: string
  storyType: string
  customTopic?: string
  audioUrl?: string | null
  story_text?: string
  story_type?: string
  custom_topic?: string
  created_at?: string
  audio?: {
    file_name: string
  }
  is_favorite?: boolean | number
}

interface RemoteStatus {
  playing: boolean
  storyId?: string
}

interface SortableStoryItemProps {
  story: Story
  titleMap: { [key: string]: string }
  onToggleFavorite: (story: Story) => void
  onRemoveFromQueue: (id: string | number) => void
  onEditStory: (story: Story) => void
  onSelectStory: (story: Story) => void
  isFavorite: (story: Story) => boolean
  onGenerateAudio: (storyId: string | number) => void
  isGeneratingAudio: boolean
  audioIsPlaying: boolean
  audioIsPaused: boolean
  audioProgress: number
  audioDuration: number
  audioVolume: number
  audioIsMuted: boolean
  audioPlaybackRate: number
  audioCurrentStoryId: string | number | null
  playAudio: (audioUrl: string, storyId: string | number) => void
  stopAudio: () => void
  audioToggleMute: () => void
  setVolumeLevel: (volume: number) => void
  setPlaybackSpeed: (speed: number) => void
  seekTo: (time: number) => void
  getDbAudioUrl: (fileName: string) => string
  onRemotePlay: (storyId: string | number) => void
  remoteStatus: RemoteStatus
  onPause?: () => void
  onStop?: () => void
  onVolumeChange?: (volume: number) => void
  onPlaybackSpeedChange?: (speed: number) => void
  onSeek?: (progress: number) => void
}

// Sortable Story Item Component
function SortableStoryItem({
  story,
  titleMap,
  onToggleFavorite,
  onRemoveFromQueue,
  onEditStory,
  onSelectStory,
  isFavorite,
  onGenerateAudio,
  isGeneratingAudio,
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
  getDbAudioUrl,
  onRemotePlay,
  remoteStatus
}: SortableStoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({ id: story.id || 'unknown' })
  // Transform değerini sürükleme animasyonunda style ile kullanmıyoruz; dnd-kit class temelli geçiş yeterli
  const isCurrent = audioCurrentStoryId === story.id

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-1 border rounded-lg transition-colors min-h-12 sm:h-12 gap-1 ${isCurrent ? 'bg-primary/10 border-primary/40' : 'bg-background hover:bg-muted/30'
        } ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
      onClick={() => onSelectStory?.(story)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onSelectStory?.(story) } }}
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
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-0.5 mb-0.5 sm:mb-0.5">
          <span className="font-medium text-[11px] sm:text-[10px] truncate max-w-40">
            {story.id ? titleMap?.[story.id] || getStoryTitle(story) : getStoryTitle(story)}
          </span>
          <Badge variant="secondary" className="text-[11px] sm:text-[9px] px-1.5 sm:px-1 py-0.5 h-4 sm:h-3 leading-none">
            {getStoryTypeLabel(story.story_type || story.storyType)}
          </Badge>
          {(story.custom_topic || story.customTopic) && (
            <Badge variant="outline" className="text-[11px] sm:text-[9px] px-1.5 sm:px-1 py-0.5 h-4 sm:h-3 leading-none max-w-24 truncate">
              {story.custom_topic || story.customTopic}
            </Badge>
          )}
          <span className="text-[11px] sm:text-[9px] text-muted-foreground font-mono shrink-0">
            {new Date(story.created_at || '').toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: '2-digit'
            })}
          </span>
        </div>
        <p className="text-[11px] sm:text-[10px] text-muted-foreground truncate leading-tight">
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

            try {
              await onToggleFavorite(storyData)
            } catch (error) {
              console.error('❤️ Toggle hatası:', error)
            }
          }}
          className={`h-5 w-5 p-0 ${isFavorite({
            story: story.story_text || story.story,
            storyType: story.story_type || story.storyType
          })
            ? 'text-red-500 hover:text-red-600'
            : 'hover:text-red-500'
            }`}
          title="Favorilere ekle/çıkar"
        >
          <Heart
            className={`h-2 w-2 ${isFavorite({
              story: story.story_text || story.story,
              storyType: story.story_type || story.storyType
            })
              ? 'fill-current'
              : ''
              }`}
          />
        </Button>

        {/* Audio Controls */}
        {(story.audio || story.audioUrl) && (
          <div className="flex items-center">
            <AudioControls
              storyId={String(story.id || '')}
              audioUrl={story.audio ? getDbAudioUrl(story.audio.file_name) : (story.audioUrl || null)}
              isPlaying={audioIsPlaying}
              isPaused={audioIsPaused}
              progress={audioProgress}
              duration={audioDuration}
              volume={audioVolume}
              isMuted={audioIsMuted}
              playbackRate={audioPlaybackRate}
              currentStoryId={audioCurrentStoryId ? String(audioCurrentStoryId) : null}
              onPlay={playAudio}
              onPause={() => {}} // TODO: Implement pause functionality
              onStop={stopAudio}
              onToggleMute={audioToggleMute}
              onVolumeChange={setVolumeLevel}
              onPlaybackSpeedChange={setPlaybackSpeed}
              onSeek={seekTo}
              size="xs"
            />
          </div>
        )}
        {/* Sunucu (cihaz) hoparlöründe çal */}
        {(story.audio || story.audioUrl) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemotePlay?.(story.id!);
            }}
            className={`h-5 w-5 p-0 ${remoteStatus.playing && remoteStatus.storyId === story.id ? 'text-primary' : ''}`}
            title="Cihaz hoparlöründe çal"
          >
            <Radio className="h-2.5 w-2.5" />
          </Button>
        )}

        {/* Generate Audio Button for stories without audio */}
        {!(story.audio || story.audioUrl) && onGenerateAudio && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerateAudio(story.id!)}
            disabled={isGeneratingAudio}
            className="h-7 px-2 text-xs"
            title="Hikayeyi seslendir"
          >
            <Volume2 className="h-3 w-3 mr-1" />
            {isGeneratingAudio ? 'Ses...' : 'Seslendir'}
          </Button>
        )}

        {/* Edit Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEditStory?.(story)
          }}
          className="h-5 w-5 p-0"
          title="Masalı düzenle"
        >
          <Edit className="h-2.5 w-2.5" />
        </Button>

        {/* View Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSelectStory?.(story)
          }}
          className="h-5 w-5 p-0"
          title="Masalı görüntüle"
        >
          <BookOpen className="h-2 w-2" />
        </Button>

        {/* Remove from Queue */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemoveFromQueue?.(story.id!)
          }}
          className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
          title="Kuyruktan çıkar"
        >
          <X className="h-2 w-2" />
        </Button>
      </div>
    </div>
  )
}

interface StoryQueuePanelProps {
  stories: Story[]
  onUpdateStory: (id: string | number, updates: Partial<Story>) => void
  onSelectStory: (story: Story) => void
  onShowStoryManagement: () => void
  onToggleFavorite: (story: Story) => void
  isFavorite: (story: Story) => boolean
  onGenerateAudio: (storyId: string | number) => void
  isGeneratingAudio: boolean
  audioIsPlaying: boolean
  audioIsPaused: boolean
  audioProgress: number
  audioDuration: number
  audioVolume: number
  audioIsMuted: boolean
  audioPlaybackRate: number
  audioCurrentStoryId: string | number | null
  playAudio: (audioUrl: string, storyId: string | number) => void
  stopAudio: () => void
  audioToggleMute: () => void
  setVolumeLevel: (volume: number) => void
  setPlaybackSpeed: (speed: number) => void
  seekTo: (time: number) => void
  getDbAudioUrl: (fileName: string) => string
  setOnEnded: (callback: () => void) => void
  onRemoteStatusChange: (status: RemoteStatus) => void
}

export default function StoryQueuePanel({
  stories,
  onUpdateStory,
  onSelectStory,
  onShowStoryManagement,
  onToggleFavorite,
  isFavorite,
  onGenerateAudio,
  isGeneratingAudio,
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
  getDbAudioUrl,
  // setOnEnded fonksiyonu App'ten pekala geçirilebilir; burada props yerine window üzerinden erişmeyelim
  setOnEnded,
  onRemoteStatusChange // App seviyesine remote durumunu yükseltmek için opsiyonel callback
}: StoryQueuePanelProps) {
  const [localStories, setLocalStories] = useState(stories)
  const [queue, setQueue] = useState<Story[]>([]) // gerçek çalma kuyruğu (story objeleri)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [editText, setEditText] = useState('')
  const [editTopic, setEditTopic] = useState('')
  const [shuffle, setShuffle] = useState(false)
  const [repeatAll, setRepeatAll] = useState(true)
  const [titles, setTitles] = useState<{ [key: string]: string }>({})
  const [remoteStatus, setRemoteStatus] = useState({ playing: false })
  const [remoteLoading, setRemoteLoading] = useState(false)

  const refreshRemote = useCallback(async () => {
    try {
      const r = await fetch('/api/play/status')
      if (r.ok) {
        const data = await r.json()
        setRemoteStatus(data)
        if (onRemoteStatusChange) {
          try {
            onRemoteStatusChange(data)
          } catch (e) {
            console.warn('Remote status callback error:', e)
          }
        }
      }
    } catch { /* ignore */ }
  }, []) // onRemoteStatusChange kaldırıldı

  useEffect(() => {
    let id;
    const start = () => {
      refreshRemote();
      id = setInterval(refreshRemote, 5000);
    };
    const stop = () => { if (id) clearInterval(id); id = null; };
    const onVis = () => (document.hidden ? stop() : start());
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [refreshRemote])

  // onRemoteStatusChange değiştiğinde sadece bu effect çalışsın
  useEffect(() => {
    if (remoteStatus.playing !== false || remoteStatus.storyId) {
      if (onRemoteStatusChange) {
        try {
          onRemoteStatusChange(remoteStatus)
        } catch (e) {
          console.warn('Remote status callback error:', e)
        }
      }
    }
  }, [onRemoteStatusChange, remoteStatus])

  async function remotePlayToggle(storyId) {
    if (!storyId) return
    setRemoteLoading(true)
    try {
      if (remoteStatus.playing && remoteStatus.storyId === storyId) {
        await fetch('/api/play/stop', { method: 'POST' })
      } else {
        await fetch(`/api/play/${storyId}`, { method: 'POST' })
      }
      await refreshRemote()
    } catch (e) {
      console.error('Uzaktan oynatma', e)
    } finally {
      setRemoteLoading(false)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over) return

    if (active.id !== over.id) {
      const oldIndex = queue.findIndex((story) => story.id === active.id)
      const newIndex = queue.findIndex((story) => story.id === over.id)

      const newQueue = arrayMove(queue, oldIndex, newIndex)
      setQueue(newQueue)
      persistQueue(newQueue)
      // DB senkron
      try { queueService.setQueueIds(newQueue.map(s => String(s.id!)).filter(Boolean)) } catch { /* queue sync optional */ }
      if (import.meta.env?.DEV) console.log('Kuyruk sırası güncellendi:', newQueue.map(s => s.id))
    }
  }

  // Update local stories when prop changes
  useEffect(() => {
    setLocalStories(stories)
  }, [stories])

  // İlk yüklemede: localStorage'da kayıtlı bir kuyruk varsa onu yükle, yoksa ilk 12 öğeyle başlat
  useEffect(() => {
    try {
      const raw = localStorage.getItem('bedtime-queue-v1')
      if (raw) {
        const ids = JSON.parse(raw)
        const mapped = ids
          .map((id) => (localStories || []).find((s) => s.id === id))
          .filter(Boolean)
        if (mapped.length > 0) {
          setQueue(mapped)
          return
        }
      }
      // fallback: ilk 12
      if ((localStories || []).length > 0) {
        const initial = localStories.slice(0, 12)
        setQueue(initial)
        persistQueue(initial)
      }
    } catch (e) {
      console.error('Kuyruk yükleme hatası:', e)
    }

  }, [localStories && localStories.length])

  // stories değişince kuyruktaki objeleri güncelle (ör. audio eklenmiş olabilir)
  useEffect(() => {
    setQueue((prev) => {
      if (!prev || prev.length === 0) return prev
      const updated = prev.map((item) => (localStories || []).find((s) => s.id === item.id) || item)
      // Şekilsel değişiklik yoksa state'i değiştirme
      if (prev.length === updated.length) {
        let same = true
        for (let i = 0; i < prev.length; i++) {
          const p = prev[i]
          const u = updated[i]
          const pf = p?.audio?.file_name || p?.audioUrl || null
          const uf = u?.audio?.file_name || u?.audioUrl || null
          if (
            p.id !== u.id ||
            pf !== uf ||
            (p.story_text || p.story || '') !== (u.story_text || u.story || '') ||
            (p.custom_topic || p.customTopic || '') !== (u.custom_topic || u.customTopic || '')
          ) {
            same = false
            break
          }
        }
        if (same) return prev
      }
      return updated
    })
  }, [localStories])

  // Kuyruktaki öğeler için başlıkları asenkron hazırla (LLM fallback'li)
  useEffect(() => {
    let alive = true
    const run = async () => {
      for (const item of queue) {
        const key = String(item.id!)
        if (!key || titles[key]) continue
        try {
          const t = await getBestTitle(item)
          if (!alive) return
          setTitles((old) => ({ ...old, [key]: t }))
        } catch {
          // ignore
        }
      }
    }
    run()
    return () => { alive = false }
  }, [queue, titles])

  const persistQueue = (items) => {
    try {
      const ids = items.map((s) => s.id)
      localStorage.setItem('bedtime-queue-v1', JSON.stringify(ids))
    } catch (err) { console.warn('Queue persist failed', err) }
  }

  const playAtIndex = (idx) => {
    if (!queue || idx < 0 || idx >= queue.length) return
    const item = queue[idx]
    const audioUrl = item.audio ? getDbAudioUrl(item.audio.file_name) : item.audioUrl
    if (!audioUrl) {
      // Ses yoksa bir sonrakine geç
      next()
      return
    }
    setCurrentIndex(idx)
    playAudio(audioUrl, item.id!)
  }

  const next = () => {
    if (!queue || queue.length === 0) return
    // Karıştırma açık ise rastgele seçim
    if (shuffle) {
      const candidates = queue
        .map((_, i) => i)
        .filter((i) => i !== currentIndex)
      if (candidates.length === 0) return
      const tryOrder = [...candidates]
      while (tryOrder.length) {
        const r = Math.floor(Math.random() * tryOrder.length)
        const idx = tryOrder.splice(r, 1)[0]
        const item = queue[idx]
        const url = item.audio ? getDbAudioUrl(item.audio.file_name) : item.audioUrl
        if (url) {
          playAtIndex(idx)
          return
        }
      }
      return
    }

    let idx = currentIndex + 1
    while (idx < queue.length) {
      const item = queue[idx]
      const url = item.audio ? getDbAudioUrl(item.audio.file_name) : item.audioUrl
      if (url) {
        playAtIndex(idx)
        return
      }
      idx++
    }

    // Sona gelindi
    if (repeatAll) {
      // Baştan uygun ilk sesli öğeye git
      let i = 0
      while (i < queue.length) {
        const item = queue[i]
        const url = item.audio ? getDbAudioUrl(item.audio.file_name) : item.audioUrl
        if (url) {
          playAtIndex(i)
          return
        }
        i++
      }
    } else {
      stopAudio()
      setCurrentIndex(-1)
    }
  }

  // prev fonksiyonu header kontrollerinde uzaktan oynatma ile değiştirildi

  // Audio bittiğinde otomatik bir sonraki masala geç
  useEffect(() => {
    if (!setOnEnded) return
    setOnEnded(() => next)

  }, [queue, currentIndex, shuffle, repeatAll, setOnEnded])

  const addToQueue = (story) => {
    if (!story) return
    if (queue.find((s) => s.id === story.id)) return
    const updated = [...queue, story]
    setQueue(updated)
    persistQueue(updated)
    try { queueService.add(story.id) } catch { /* queue sync optional */ }
  }

  const removeFromQueue = (id) => {
    const updated = queue.filter((s) => s.id !== id)
    setQueue(updated)
    persistQueue(updated)
    try { queueService.remove(id) } catch { /* queue sync optional */ }
    if (currentIndex !== -1) {
      const idx = queue.findIndex((s) => s.id === id)
      if (idx !== -1 && idx <= currentIndex) {
        setCurrentIndex(Math.max(-1, currentIndex - 1))
      }
    }
  }

  const clearQueue = () => {
    setQueue([])
    persistQueue([])
    stopAudio()
    setCurrentIndex(-1)
    try { queueService.setQueueIds([]) } catch { /* queue sync optional */ }
  }

  const displayStories = queue // artık gerçek kuyruk

  const libraryToAdd = useMemo(() => {
    const qIds = new Set(queue.map((s) => s.id))
    return (localStories || [])
      .filter((s) => !qIds.has(s.id))
      .filter((s) => {
        if (!search.trim()) return true
        const t = (s.story_text || s.story || '').toLowerCase()
        const topic = (s.custom_topic || s.customTopic || '').toLowerCase()
        return t.includes(search.toLowerCase()) || topic.includes(search.toLowerCase())
      })
      .slice(0, 100)
  }, [queue, localStories, search])

  return (
    <Card className="mt-4 sm:mt-8">
      <CardHeader className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="h-4 w-4 text-primary" />
              Masal Kuyruğu (Playlist)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Masalları sürükleyerek sıralayın, oynatın ve yönetin
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2 w-full sm:w-auto">
            {/* Header kontrol butonları artık sadece UZAK (cihaz) oynatmayı yönetir */}
            <Button
              size="sm"
              onClick={() => {
                const activeId = currentIndex === -1 ? queue[0]?.id : queue[currentIndex]?.id
                const candidate = currentIndex === -1 ? queue[0] : queue[currentIndex]
                const hasAudio = !!(candidate && (candidate.audio || candidate.audioUrl))
                if (activeId && hasAudio) {
                  remotePlayToggle(activeId)
                }
              }}
              disabled={
                remoteLoading ||
                queue.length === 0 ||
                (() => {
                  const c = currentIndex === -1 ? queue[0] : queue[currentIndex]
                  return !(c && (c.audio || c.audioUrl))
                })()
              }
              title={remoteStatus.playing ? 'Uzaktan Durdur' : 'Uzaktan Oynat'}
            >
              {remoteStatus.playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span className="ml-1 hidden sm:inline">{remoteStatus.playing ? 'Dur' : 'Oynat'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Sadece queue index değiştirip otomatik remote play
                if (!queue.length) return
                let target = currentIndex
                for (let i = 0; i < queue.length; i++) {
                  target = (target - 1 + queue.length) % queue.length
                  const it = queue[target]
                  if (it && (it.audio || it.audioUrl)) break
                }
                setCurrentIndex(target)
                const item = queue[target]
                if (item) remotePlayToggle(item.id)
              }}
              disabled={remoteLoading || queue.length < 2}
              title="Önceki (Uzaktan)"
            ><SkipBack className="h-3 w-3" /></Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!queue.length) return
                let target = currentIndex
                for (let i = 0; i < queue.length; i++) {
                  target = (target + 1) % queue.length
                  const it = queue[target]
                  if (it && (it.audio || it.audioUrl)) break
                }
                setCurrentIndex(target)
                const item = queue[target]
                if (item) remotePlayToggle(item.id)
              }}
              disabled={remoteLoading || queue.length < 2}
              title="Sonraki (Uzaktan)"
            ><SkipForward className="h-3 w-3" /></Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (remoteStatus.playing) {
                  remotePlayToggle(remoteStatus.storyId)
                }
              }}
              disabled={!remoteStatus.playing || remoteLoading}
              title="Uzaktan Durdur"
            ><Square className="h-3 w-3" /></Button>
            <Separator className="h-6 hidden sm:block" orientation="vertical" />
            <Button variant={shuffle ? 'default' : 'outline'} size="sm" onClick={() => setShuffle(!shuffle)} title="Karıştır"><Shuffle className="h-3 w-3" /></Button>
            <Button variant={repeatAll ? 'default' : 'outline'} size="sm" onClick={() => setRepeatAll(!repeatAll)} title="Tekrar (Tümü)"><Repeat2 className="h-3 w-3" /></Button>
            <Separator className="h-6 hidden sm:block" orientation="vertical" />
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)} title="Kuyruğa ekle"><Plus className="h-3 w-3" /><span className="ml-1 hidden sm:inline">Ekle</span></Button>
            <Button variant="outline" size="sm" onClick={clearQueue} title="Kuyruğu temizle" className="text-destructive border-destructive/40"><Trash2 className="h-3 w-3" /><span className="ml-1 hidden sm:inline">Temizle</span></Button>
            <Button
              variant="outline"
              onClick={onShowStoryManagement}
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
              size="sm"
              title="Masal Yönetimi"
            >
              <Settings className="h-3 w-3" />
              Yönet
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <div className="max-h-[35vh] sm:max-h-80 overflow-hidden">
          {displayStories.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayStories.filter(story => story.id).map(story => story.id!)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1 sm:space-y-1 max-h-[35vh] sm:max-h-80 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  {displayStories.map((story) => (
                    <SortableStoryItem
                      key={story.id}
                      story={story}
                      titleMap={titles}
                      onToggleFavorite={onToggleFavorite}
                      onRemoveFromQueue={removeFromQueue}
                      onEditStory={(s) => {
                        setEditTarget(s)
                        setEditText(s.story_text || s.story || '')
                        setEditTopic(s.custom_topic || s.customTopic || '')
                      }}
                      onSelectStory={onSelectStory}
                      isFavorite={isFavorite}
                      onGenerateAudio={onGenerateAudio}
                      isGeneratingAudio={isGeneratingAudio}
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
                      remoteStatus={remoteStatus}
                      onRemotePlay={remotePlayToggle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Kuyruğa eklenmiş masal yok</p>
              <div className="mt-3">
                <Button size="sm" onClick={() => setShowAddDialog(true)}><Plus className="h-3 w-3 mr-1" />Kuyruğa Ekle</Button>
              </div>
            </div>
          )}
        </div>

        {/* Add to Queue Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kuyruğa Masal Ekle</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                placeholder="Ara (metin veya konu)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">Kütüphanedeki masallar listelenir. Zaten kuyrukta olanlar gizlenir.</div>
              <ScrollArea className="h-64 border rounded-md p-2">
                <div className="space-y-2">
                  {libraryToAdd.length === 0 && (
                    <div className="text-xs text-muted-foreground">Eklenecek masal bulunamadı.</div>
                  )}
                  {libraryToAdd.map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-2 p-2 rounded hover:bg-muted/40">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{getStoryTypeLabel(s.story_type || s.storyType)}</Badge>
                          {(s.custom_topic || s.customTopic) && (
                            <Badge variant="outline" className="text-[10px] px-1.5 h-4">{s.custom_topic || s.customTopic}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[36ch]">{(s.story_text || s.story).slice(0, 100)}...</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {(s.audio || s.audioUrl) ? (
                          <Badge variant="default" className="text-[10px] bg-emerald-600 text-white hover:bg-emerald-600/90">Ses Var</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Ses Yok</Badge>
                        )}
                        <Button size="sm" onClick={() => addToQueue(s)}>Ekle</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Kapat</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Masalı Düzenle</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Konu (isteğe bağlı)</label>
              <Input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} placeholder="Örn: prenses ve ejderha" />
              <label className="text-xs text-muted-foreground">Metin</label>
              <textarea className="w-full h-40 border rounded-md p-2 text-sm bg-background" value={editText} onChange={(e) => setEditText(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTarget(null)}>Vazgeç</Button>
              <Button onClick={async () => {
                if (!editTarget || !onUpdateStory) { setEditTarget(null); return }
                try {
                  await onUpdateStory(editTarget.id, { story: editText, customTopic: editTopic })
                  // local queue güncelle
                  const updated = queue.map((s) => s.id === editTarget.id ? { ...s, story_text: editText, story: editText, custom_topic: editTopic, customTopic: editTopic } : s)
                  setQueue(updated)
                } catch (e) {
                  console.error('Düzenleme hatası:', e)
                } finally {
                  setEditTarget(null)
                }
              }}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

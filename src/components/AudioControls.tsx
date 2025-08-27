import { Button } from '@/components/ui/button.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Volume1,
  Gauge
  // Download, Bookmark, Music kaldırıldı - çalışmayan özellikler
} from 'lucide-react'

interface AudioControlsProps {
  storyId: string
  audioUrl: string | null
  isPlaying: boolean
  isPaused: boolean
  progress: number
  duration: number
  volume: number
  isMuted: boolean
  playbackRate: number
  currentStoryId: string | null
  onPlay: (audioUrl: string, storyId: string) => void
  onPause: () => void
  onStop: () => void
  onToggleMute: () => void
  onVolumeChange: (volume: number) => void
  onPlaybackSpeedChange: (speed: number) => void
  onSeek: (progress: number) => void
  size?: 'xs' | 'sm' | 'default'
  showAdvanced?: boolean
}

export default function AudioControls({
  storyId,
  audioUrl,
  isPlaying,
  isPaused,
  progress,
  duration,
  volume,
  isMuted,
  playbackRate,
  currentStoryId,
  onPlay,
  onPause,
  onStop,
  onToggleMute,
  onVolumeChange,
  onPlaybackSpeedChange,
  onSeek,
  // onDownload, onBookmark kaldırıldı - çalışmayan özellikler
  size = 'default', // 'xs' | 'sm' | 'default'
  showAdvanced = true // Gelişmiş kontrolleri göster/gizle
}: AudioControlsProps) {
  const isCurrentAudio = currentStoryId === storyId
  const isThisPlaying = isCurrentAudio && isPlaying
  const isThisPaused = isCurrentAudio && isPaused

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getVolumeIcon = (): typeof VolumeX => {
    if (isMuted || volume === 0) return VolumeX
    if (volume < 0.3) return Volume1
    if (volume < 0.7) return Volume2
    return Volume2
  }

  const VolumeIcon = getVolumeIcon()
  const buttonSize = size === 'xs' ? 'sm' : size === 'sm' ? 'sm' : 'default'
  const iconSize = size === 'xs' ? 'h-2.5 w-2.5' : size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  if (!audioUrl) return null

  return (
    <div className={`flex items-center gap-2 ${size === 'xs' ? 'text-[10px]' : size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={() => {
          if (!audioUrl) return;
          if (isThisPlaying) {
            if (typeof onPause === 'function') {
              onPause()
            } else {
              // Geriye dönük: onPlay toggle mantığıyla çalışsın
              onPlay(audioUrl, storyId)
            }
          } else {
            onPlay(audioUrl, storyId)
          }
        }}
        className="shrink-0"
      >
        {isThisPlaying ? (
          <Pause className={iconSize} />
        ) : (
          <Play className={iconSize} />
        )}
      </Button>

      {/* Stop Button */}
      {(isThisPlaying || isThisPaused) && (
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={onStop}
          className="shrink-0"
        >
          <Square className={iconSize} />
        </Button>
      )}

      {/* Progress Bar */}
      {isCurrentAudio && duration > 0 && (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTime((progress / 100) * duration)}
          </span>
          <Slider
            value={[progress]}
            onValueChange={(value: number[]) => onSeek(value[0])}
            max={100}
            step={1}
            className="flex-1 cursor-pointer"
          />
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Volume Control */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={onToggleMute}
        >
          <VolumeIcon className={iconSize} />
        </Button>

        {size !== 'sm' && size !== 'xs' && (
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={(value: number[]) => onVolumeChange(value[0] / 100)}
            max={100}
            step={1}
            className="w-16"
          />
        )}
      </div>

      {/* Speed Control with Preset Buttons */}
      {isCurrentAudio && size !== 'sm' && size !== 'xs' && showAdvanced && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size={buttonSize}
            title="Hız Kontrolü"
          >
            <Gauge className={iconSize} />
          </Button>

          {/* Speed Preset Buttons */}
          <div className="flex gap-1">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed: number) => (
              <Button
                key={speed}
                variant={playbackRate === speed ? "default" : "outline"}
                size="sm"
                onClick={() => onPlaybackSpeedChange(speed)}
                className="px-2 py-1 text-xs min-w-0"
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Download ve Bookmark butonları kaldırıldı - çalışmayan özellikler */}
    </div>
  )
}

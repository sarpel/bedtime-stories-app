import { Button } from '@/components/ui/button.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX,
  Volume1
} from 'lucide-react'

export default function AudioControls({ 
  storyId,
  audioUrl, 
  isPlaying, 
  isPaused, 
  progress,
  duration,
  volume,
  isMuted,
  currentStoryId,
  onPlay,
  onStop,
  onToggleMute,
  onVolumeChange,
  onSeek,
  size = 'default' // 'sm' | 'default'
}) {
  const isCurrentAudio = currentStoryId === storyId
  const isThisPlaying = isCurrentAudio && isPlaying
  const isThisPaused = isCurrentAudio && isPaused

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX
    if (volume < 0.3) return Volume1
    if (volume < 0.7) return Volume2
    return Volume2
  }

  const VolumeIcon = getVolumeIcon()
  const buttonSize = size === 'sm' ? 'sm' : 'default'
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  if (!audioUrl) return null

  return (
    <div className={`flex items-center gap-2 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={() => onPlay(audioUrl, storyId)}
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
            onValueChange={(value) => onSeek(value[0])}
            max={100}
            step={1}
            className="flex-1"
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
        
        {size !== 'sm' && (
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={(value) => onVolumeChange(value[0] / 100)}
            max={100}
            step={1}
            className="w-16"
          />
        )}
      </div>
    </div>
  )
}

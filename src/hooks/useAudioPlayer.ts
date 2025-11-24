import { useState, useRef, useEffect } from 'react'
import analyticsService from '../services/analyticsService.js'

export function useAudioPlayer() {
  const [currentAudio, setCurrentAudio] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [volume, setVolume] = useState<number>(0.75)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0)
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef<(() => void) | null>(null)

  // Initialize audio element on first mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'metadata'
    }
  }, [])

  // Audio event handlers
  // ROBUSTNESS FIX: Proper cleanup and error handling for all audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      // EDGE CASE FIX: Handle NaN or Infinity duration
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      } else {
        setDuration(0)
      }
    }

    const handleTimeUpdate = () => {
      // EDGE CASE FIX: Prevent division by zero and handle invalid values
      if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
        const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
        setProgress((currentTime / audio.duration) * 100)
      }
    }

    const handleEnded = () => {
      // Analytics: Track audio completion
      if (currentStoryId) {
        try {
          analyticsService.trackAudioPlayback(currentStoryId, 'complete', audio.currentTime)
        } catch (analyticsError) {
          // Non-critical: Log but don't fail
          console.error('Analytics tracking failed:', analyticsError)
        }
      }

      setIsPlaying(false)
      setIsPaused(false)
      setProgress(0)
      setCurrentStoryId(null)

      // ROBUSTNESS FIX: Safe callback execution with error handling
      try {
        if (typeof onEndedRef.current === 'function') {
          onEndedRef.current()
        }
      } catch (err) {
        console.error('onEnded callback error:', err)
      }
    }

    const handlePlay = () => {
      // Analytics: Track audio play
      if (currentStoryId) {
        try {
          analyticsService.trackAudioPlayback(currentStoryId, 'play', audio.currentTime)
        } catch (analyticsError) {
          console.error('Analytics tracking failed:', analyticsError)
        }
      }

      setIsPlaying(true)
      setIsPaused(false)
    }

    const handlePause = () => {
      // Analytics: Track audio pause
      if (currentStoryId) {
        try {
          analyticsService.trackAudioPlayback(currentStoryId, 'pause', audio.currentTime)
        } catch (analyticsError) {
          console.error('Analytics tracking failed:', analyticsError)
        }
      }

      setIsPlaying(false)
      setIsPaused(true)
    }

    const handleError = (event: Event) => {
      // ROBUSTNESS FIX: Detailed error logging for debugging
      const errorEvent = event as ErrorEvent
      console.error('Audio playback error:', {
        error: errorEvent.error,
        message: errorEvent.message,
        src: audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState
      })
      
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentStoryId(null)
    }

    // ROBUSTNESS FIX: Add these event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)

    // CRITICAL FIX: Proper cleanup to prevent memory leaks
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
    }
  }, [currentAudio, currentStoryId]) // Dependencies properly listed

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Playback rate control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  const playAudio = async (audioUrl: string, storyId: string): Promise<void> => {
    // EDGE CASE FIX: Input validation
    if (!audioUrl || typeof audioUrl !== 'string') {
      console.error('Invalid audio URL provided')
      return
    }
    
    if (!storyId || typeof storyId !== 'string') {
      console.error('Invalid story ID provided')
      return
    }

    try {
      console.log('🎵 [Audio Player] Starting web audio playback...', { audioUrl, storyId })

      // Use standard web audio player only
      console.log('🎵 [Audio Player] Using web audio player')

      const audio = audioRef.current
      if (!audio) {
        console.error('Audio element not initialized')
        return
      }

      // Eğer aynı ses çalıyorsa, sadece pause/resume yap
      if (currentStoryId === storyId && currentAudio === audioUrl) {
        if (isPlaying) {
          audio.pause()
        } else {
          // ROBUSTNESS FIX: Handle play() promise rejection
          try {
            await audio.play()
          } catch (playError) {
            console.error('Resume playback failed:', playError)
            // Reset state on failure
            setIsPlaying(false)
            setCurrentStoryId(null)
          }
        }
        return
      }

      // Farklı bir ses çalacaksa, önce çalanı duraklat
      if (isPlaying || isPaused) {
        audio.pause()
        // ROBUSTNESS FIX: Reset currentTime to release resources
        audio.currentTime = 0
      }

      // Yeni ses dosyasını yükle
      setCurrentAudio(audioUrl)
      setCurrentStoryId(storyId)
      audio.src = audioUrl
      audio.volume = isMuted ? 0 : volume

      // ROBUSTNESS FIX: Handle play() promise properly
      try {
        await audio.play()
        console.log('🎵 [Audio Player] Web audio playback started successfully')
      } catch (playError: unknown) {
        // Browser autoplay policy or other playback error
        console.error('🎵 [Audio Player] Play failed:', playError instanceof Error ? playError.message : String(playError))
        setIsPlaying(false)
        setCurrentStoryId(null)
        setCurrentAudio(null)
        throw playError // Re-throw to allow caller to handle
      }

    } catch (error: unknown) {
      console.error('🎵 [Audio Player] Playback failed:', error instanceof Error ? error.message : String(error))
      setIsPlaying(false)
      setCurrentStoryId(null)
      setCurrentAudio(null)
    }
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(0)
      setCurrentStoryId(null)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const setVolumeLevel = (newVolume: number): void => {
    setVolume(Math.max(0, Math.min(1, newVolume)))
  }

  const setPlaybackSpeed = (newRate: number): void => {
    setPlaybackRate(Math.max(0.25, Math.min(4, newRate)))
  }

  const seekTo = (percentage: number): void => {
    // EDGE CASE FIX: Validate percentage input
    if (typeof percentage !== 'number' || !Number.isFinite(percentage)) {
      console.error('Invalid percentage value for seek:', percentage)
      return
    }
    
    // Clamp percentage to valid range [0, 100]
    const clampedPercentage = Math.max(0, Math.min(100, percentage))
    
    if (!audioRef.current) return
    const audio = audioRef.current
    const dur = audio.duration || duration
    
    // EDGE CASE FIX: Handle invalid or zero duration
    if (!dur || !Number.isFinite(dur) || dur <= 0) {
      console.warn('Cannot seek: invalid duration', dur)
      return
    }
    
    const newTime = Math.max(0, Math.min(dur, (clampedPercentage / 100) * dur))
    
    // EDGE CASE FIX: Validate calculated time
    if (!Number.isFinite(newTime)) {
      console.error('Calculated seek time is invalid:', newTime)
      return
    }
    
    try {
      audio.currentTime = newTime
      // Seeker hareketinde progress anında güncellensin
      setProgress((newTime / dur) * 100)
    } catch (seekError) {
      // Some media formats don't support seeking
      console.error('Seek operation failed:', seekError)
    }
  }

  const setOnEnded = (callback: (() => void) | null): void => {
    onEndedRef.current = typeof callback === 'function' ? callback : null
  }

  return {
    // State
    isPlaying,
    isPaused,
    progress,
    duration,
    volume,
    isMuted,
    playbackRate,
    currentStoryId,

    // Controls
    playAudio,
    pauseAudio,
    stopAudio,
    toggleMute,
    setVolumeLevel,
    setPlaybackSpeed,
    seekTo,
  setOnEnded,

    // Ref
    audioRef
  }
}

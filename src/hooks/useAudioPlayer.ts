import { useState, useRef, useEffect } from 'react'
import analyticsService from '../services/analyticsService.js'
import { raspberryAudioService } from '../services/raspberryAudioService'

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
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    const handleEnded = () => {
      // Analytics: Track audio completion
      if (currentStoryId) {
        analyticsService.trackAudioPlayback(currentStoryId, 'complete', audio.currentTime)
      }

      setIsPlaying(false)
      setIsPaused(false)
      setProgress(0)
      setCurrentStoryId(null)

      // Kuyruk/playlist için harici sonlanma callback'i
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
        analyticsService.trackAudioPlayback(currentStoryId, 'play', audio.currentTime)
      }

      setIsPlaying(true)
      setIsPaused(false)
    }

    const handlePause = () => {
      // Analytics: Track audio pause
      if (currentStoryId) {
        analyticsService.trackAudioPlayback(currentStoryId, 'pause', audio.currentTime)
      }

      setIsPlaying(false)
      setIsPaused(true)
    }

    const handleError = () => {
      console.error('Audio playback error')
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentStoryId(null)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
    }
  }, [currentAudio, currentStoryId])

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
    if (!audioUrl) return

    try {
      console.log('🎵 [Audio Player] Starting playback pipeline...', { audioUrl, storyId })

      // First, try Raspberry Pi audio playback
      try {
        const audioStatus = await raspberryAudioService.getAudioStatus()

        if (audioStatus.isRaspberryPi && audioStatus.status === 'ready') {
          console.log('🎵 [Audio Player] Detected Raspberry Pi, using IQAudio Codec Zero')

          // Convert web URL to file path for Pi
          const audioFilePath = raspberryAudioService.convertAudioUrlToFilePath(audioUrl)

          // Play audio on Raspberry Pi speakers
          const playbackResult = await raspberryAudioService.playAudio(audioFilePath, Math.round(volume * 100))

          console.log('🎵 [Audio Player] Raspberry Pi playback started:', playbackResult)

          // Update UI state to reflect playback
          setCurrentAudio(audioUrl)
          setCurrentStoryId(storyId)
          setIsPlaying(true)
          setIsPaused(false)

          // Analytics: Track Pi audio playback
          if (storyId) {
            analyticsService.trackAudioPlayback(storyId, 'start', 0)
          }

          return // Exit early - using Pi audio
        }
      } catch (piError) {
        console.warn('🎵 [Audio Player] Raspberry Pi playback failed, falling back to web audio:', piError)
      }

      // Fallback to standard web audio player
      console.log('🎵 [Audio Player] Using web audio player')

      const audio = audioRef.current
      if (!audio) return

      // Eğer aynı ses çalıyorsa, sadece pause/resume yap
      if (currentStoryId === storyId && currentAudio === audioUrl) {
        if (isPlaying) {
          audio.pause()
        } else {
          await audio.play()
        }
        return
      }

      // Farklı bir ses çalacaksa, önce çalanı duraklat
      if (isPlaying || isPaused) {
        audio.pause()
      }

      // Yeni ses dosyasını yükle
      setCurrentAudio(audioUrl)
      setCurrentStoryId(storyId)
      audio.src = audioUrl
      audio.volume = isMuted ? 0 : volume

      await audio.play()

      console.log('🎵 [Audio Player] Web audio playback started successfully')

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
    if (!audioRef.current) return
    const audio = audioRef.current
    const dur = audio.duration || duration
    if (!dur || Number.isNaN(dur)) return
    const newTime = Math.max(0, Math.min(dur, (percentage / 100) * dur))
    audio.currentTime = newTime
    // Seeker hareketinde progress anında güncellensin
    setProgress((newTime / dur) * 100)
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

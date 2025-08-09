import { useState, useRef, useEffect } from 'react'
import analyticsService from '../services/analyticsService.js'

export function useAudioPlayer() {
  const [currentAudio, setCurrentAudio] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.75)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [currentStoryId, setCurrentStoryId] = useState(null)
  
  const audioRef = useRef(null)
  const onEndedRef = useRef(null)

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

  const playAudio = (audioUrl, storyId) => {
    if (!audioUrl) return

    const audio = audioRef.current
    if (!audio) return

    try {
      // Eğer aynı ses çalıyorsa, sadece pause/resume yap
      if (currentStoryId === storyId && currentAudio === audioUrl) {
        if (isPlaying) {
          audio.pause()
        } else {
          audio.play().catch(error => {
            console.error('Audio resume error:', error)
            setIsPlaying(false)
          })
        }
        return
      }

      // Farklı bir ses çalacaksa, önce durdur
      if (isPlaying) {
        audio.pause()
        audio.currentTime = 0
      }

      // Yeni ses dosyasını yükle
      setCurrentAudio(audioUrl)
      setCurrentStoryId(storyId)
      audio.src = audioUrl
      audio.volume = isMuted ? 0 : volume
      
      audio.play().catch(error => {
        console.error('Audio play error:', error)
        setIsPlaying(false)
        setCurrentStoryId(null)
        setCurrentAudio(null)
      })
    } catch (error) {
      console.error('playAudio function error:', error)
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

  const setVolumeLevel = (newVolume) => {
    setVolume(Math.max(0, Math.min(1, newVolume)))
  }

  const setPlaybackSpeed = (newRate) => {
    setPlaybackRate(Math.max(0.25, Math.min(4, newRate)))
  }

  const seekTo = (percentage) => {
    if (audioRef.current && duration) {
      const newTime = (percentage / 100) * duration
      audioRef.current.currentTime = newTime
    }
  }

  const setOnEnded = (callback) => {
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

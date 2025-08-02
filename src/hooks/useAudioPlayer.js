import { useState, useRef, useEffect } from 'react'

export function useAudioPlayer() {
  const [currentAudio, setCurrentAudio] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.75)
  const [isMuted, setIsMuted] = useState(false)
  const [currentStoryId, setCurrentStoryId] = useState(null)
  
  const audioRef = useRef(null)

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
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(0)
      setCurrentStoryId(null)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }

    const handlePause = () => {
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
  }, [currentAudio])

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const playAudio = (audioUrl, storyId) => {
    if (!audioUrl) return

    const audio = audioRef.current
    if (!audio) return

    // Eğer aynı ses çalıyorsa, sadece pause/resume yap
    if (currentStoryId === storyId && currentAudio === audioUrl) {
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play()
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
    })
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

  const seekTo = (percentage) => {
    if (audioRef.current && duration) {
      const newTime = (percentage / 100) * duration
      audioRef.current.currentTime = newTime
    }
  }

  return {
    // State
    isPlaying,
    isPaused,
    progress,
    duration,
    volume,
    isMuted,
    currentStoryId,
    
    // Controls
    playAudio,
    pauseAudio,
    stopAudio,
    toggleMute,
    setVolumeLevel,
    seekTo,
    
    // Ref
    audioRef
  }
}

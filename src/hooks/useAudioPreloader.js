import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Audio Preloading Hook
 * Ses dosyalarını önceden yükler ve önbelleğe alır
 */
export function useAudioPreloader() {
  const [preloadedAudios, setPreloadedAudios] = useState(new Map())
  const audioElements = useRef(new Map())
  const loadingPromises = useRef(new Map())
  
  const preloadAudio = useCallback(async (audioUrl) => {
    if (!audioUrl) return null
    
    // Zaten yüklenmiş mi kontrol et
    if (preloadedAudios.has(audioUrl)) {
      return preloadedAudios.get(audioUrl)
    }
    
    // Yükleniyor mu kontrol et
    if (loadingPromises.current.has(audioUrl)) {
      return loadingPromises.current.get(audioUrl)
    }
    
    const loadPromise = new Promise((resolve, reject) => {
      const audio = new Audio()
      audio.preload = 'auto'
      
      const onCanPlayThrough = () => {
        audioElements.current.set(audioUrl, audio)
        setPreloadedAudios(prev => new Map(prev).set(audioUrl, {
          audio,
          loadedAt: Date.now(),
          url: audioUrl
        }))
        
        // Cleanup listeners
        audio.removeEventListener('canplaythrough', onCanPlayThrough)
        audio.removeEventListener('error', onError)
        
        loadingPromises.current.delete(audioUrl)
        resolve(audio)
      }
      
      const onError = (error) => {
        audio.removeEventListener('canplaythrough', onCanPlayThrough)
        audio.removeEventListener('error', onError)
        loadingPromises.current.delete(audioUrl)
        reject(error)
      }
      
      audio.addEventListener('canplaythrough', onCanPlayThrough)
      audio.addEventListener('error', onError)
      audio.src = audioUrl
    })
    
    loadingPromises.current.set(audioUrl, loadPromise)
    
    return loadPromise
  }, [preloadedAudios])
  
  const getPreloadedAudio = useCallback((audioUrl) => {
    const preloaded = preloadedAudios.get(audioUrl)
    if (preloaded) {
      // Audio element'in yeni bir kopyasını oluştur (eşzamanlı oynatım için)
      const newAudio = preloaded.audio.cloneNode()
      newAudio.currentTime = 0
      return newAudio
    }
    return null
  }, [preloadedAudios])
  
  const clearPreloadedAudio = useCallback((audioUrl) => {
    const audio = audioElements.current.get(audioUrl)
    if (audio) {
      audio.src = ''
      audio.load()
      audioElements.current.delete(audioUrl)
    }
    
    setPreloadedAudios(prev => {
      const newMap = new Map(prev)
      newMap.delete(audioUrl)
      return newMap
    })
  }, [])
  
  const clearAllPreloaded = useCallback(() => {
    audioElements.current.forEach((audio) => {
      audio.src = ''
      audio.load()
    })
    audioElements.current.clear()
    setPreloadedAudios(new Map())
  }, [])
  
  // Memory management - eski preload'ları temizle
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now()
      const maxAge = 30 * 60 * 1000 // 30 dakika
      
      preloadedAudios.forEach((item, audioUrl) => {
        if (now - item.loadedAt > maxAge) {
          clearPreloadedAudio(audioUrl)
        }
      })
    }
    
    const intervalId = setInterval(cleanup, 5 * 60 * 1000) // 5 dakikada bir temizle
    
    return () => clearInterval(intervalId)
  }, [preloadedAudios, clearPreloadedAudio])
  
  return {
    preloadAudio,
    getPreloadedAudio,
    clearPreloadedAudio,
    clearAllPreloaded,
    preloadedCount: preloadedAudios.size
  }
}

/**
 * Smart Audio Player Hook
 * Preloading ve cache ile optimize edilmiş ses oynatma
 */
export function useSmartAudioPlayer() {
  const [currentAudio, setCurrentAudio] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  
  const { preloadAudio, getPreloadedAudio } = useAudioPreloader()
  
  const play = useCallback(async (audioUrl) => {
    try {
      // Mevcut ses varsa durdur
      if (currentAudio) {
        currentAudio.pause()
        setIsPlaying(false)
      }
      
      // Preload edilmiş ses var mı kontrol et
      let audio = getPreloadedAudio(audioUrl)
      
      if (!audio) {
        // Preload edilmemiş, yükle ve oynat
        audio = await preloadAudio(audioUrl)
      }
      
      if (audio) {
        audio.volume = isMuted ? 0 : volume
        audio.playbackRate = playbackRate
        
        const onTimeUpdate = () => setCurrentTime(audio.currentTime)
        const onLoadedMetadata = () => setDuration(audio.duration)
        const onEnded = () => {
          setIsPlaying(false)
          setCurrentTime(0)
        }
        
        audio.addEventListener('timeupdate', onTimeUpdate)
        audio.addEventListener('loadedmetadata', onLoadedMetadata)
        audio.addEventListener('ended', onEnded)
        
        await audio.play()
        setCurrentAudio(audio)
        setIsPlaying(true)
        
        // Cleanup function
        const cleanup = () => {
          audio.removeEventListener('timeupdate', onTimeUpdate)
          audio.removeEventListener('loadedmetadata', onLoadedMetadata)
          audio.removeEventListener('ended', onEnded)
        }
        
        audio.cleanup = cleanup
      }
      
    } catch (error) {
      console.error('Ses oynatma hatası:', error)
      setIsPlaying(false)
    }
  }, [currentAudio, getPreloadedAudio, preloadAudio, volume, isMuted, playbackRate])
  
  const pause = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause()
      setIsPlaying(false)
    }
  }, [currentAudio])
  
  const stop = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      setIsPlaying(false)
      setCurrentTime(0)
      
      // Cleanup listeners
      if (currentAudio.cleanup) {
        currentAudio.cleanup()
      }
      
      setCurrentAudio(null)
    }
  }, [currentAudio])
  
  const seek = useCallback((time) => {
    if (currentAudio) {
      currentAudio.currentTime = time
      setCurrentTime(time)
    }
  }, [currentAudio])
  
  const setVolumeLevel = useCallback((level) => {
    setVolume(level)
    if (currentAudio) {
      currentAudio.volume = isMuted ? 0 : level
    }
  }, [currentAudio, isMuted])
  
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev
      if (currentAudio) {
        currentAudio.volume = newMuted ? 0 : volume
      }
      return newMuted
    })
  }, [currentAudio, volume])
  
  const setSpeed = useCallback((rate) => {
    setPlaybackRate(rate)
    if (currentAudio) {
      currentAudio.playbackRate = rate
    }
  }, [currentAudio])
  
  return {
    play,
    pause,
    stop,
    seek,
    setVolume: setVolumeLevel,
    toggleMute,
    setSpeed,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    preloadAudio
  }
}

import { useState, useEffect } from 'react'
import safeLocalStorage from '../utils/safeLocalStorage.js'

const MAX_HISTORY = 10 // Son 10 masalı sakla

export function useStoryHistory() {
  const [history, setHistory] = useState([])

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = safeLocalStorage.get('bedtime-stories-history', [])
    try {
      setHistory(Array.isArray(savedHistory) ? savedHistory : [])
    } catch (error) {
      console.error('Masal geçmişi yüklenirken hata:', error)
      setHistory([])
    }
  }, [])

  // Save history to localStorage whenever it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const saved = safeLocalStorage.set('bedtime-stories-history', history)
      if (!saved) {
        console.warn('Masal geçmişi localStorage\'a kaydedilemedi')
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [history])

  const addToHistory = (story) => {
    const newStory = {
      id: Date.now(),
      story: story.story,
      storyType: story.storyType,
      customTopic: story.customTopic,
      createdAt: new Date().toISOString(),
      audioUrl: story.audioUrl || null,
      audioGenerated: !!story.audioUrl
    }
    
    setHistory(prev => {
      // Aynı masalı tekrar ekleme
      const existingIndex = prev.findIndex(item => 
        item.story === story.story && 
        item.storyType === story.storyType
      )
      
      if (existingIndex >= 0) {
        // Mevcut masalı güncelle
        const updated = [...prev]
        updated[existingIndex] = { ...updated[existingIndex], ...newStory }
        return updated
      } else {
        // Yeni masal ekle ve en fazla MAX_HISTORY kadar sakla
        return [newStory, ...prev.slice(0, MAX_HISTORY - 1)]
      }
    })
    
    return newStory.id
  }

  const removeFromHistory = (id) => {
    setHistory(prev => prev.filter(item => item.id !== id))
  }

  const clearHistory = () => {
    setHistory([])
  }

  const updateStoryAudio = (id, audioUrl) => {
    setHistory(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, audioUrl, audioGenerated: true }
          : item
      )
    )
  }

  const updateStory = (id, updates) => {
    setHistory(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      )
    )
  }

  const getStoryById = (id) => {
    return history.find(item => item.id === id)
  }

  const getRecentStories = (count = 5) => {
    return history.slice(0, count)
  }

  const getStoriesByType = (storyType) => {
    return history.filter(item => item.storyType === storyType)
  }

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    updateStoryAudio,
    updateStory,
    getStoryById,
    getRecentStories,
    getStoriesByType
  }
}
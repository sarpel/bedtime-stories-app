import { useState, useEffect } from 'react'
import safeLocalStorage from '../utils/safeLocalStorage'
import { Story } from '../utils/storyTypes'

const MAX_HISTORY = 10 // Son 10 masalı sakla

interface HistoryItem {
  id: number
  story: string
  storyType: string
  customTopic: string | null
  createdAt: string
  audioUrl: string | null
  audioGenerated: boolean
  updatedAt?: string
}

export function useStoryHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = safeLocalStorage.get('bedtime-stories-history', [])
    try {
      setHistory(Array.isArray(savedHistory) ? savedHistory : [])
    } catch (error) {
      console.error('Masal geçmişi yüklenirken hata:', (error as Error).message)
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

  const addToHistory = (story: Story): number => {
    const newStory: HistoryItem = {
      id: Date.now(),
      story: story.story || story.story_text || '',
      storyType: story.storyType || story.story_type || '',
      customTopic: (story.customTopic !== undefined ? story.customTopic : story.custom_topic) || null,
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

  const removeFromHistory = (id: number): void => {
    setHistory(prev => prev.filter(item => item.id !== id))
  }

  const clearHistory = () => {
    setHistory([])
  }

  const updateStoryAudio = (id: number, audioUrl: string): void => {
    setHistory(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, audioUrl, audioGenerated: true }
          : item
      )
    )
  }

  const updateStory = (id: number, updates: Partial<HistoryItem>): void => {
    setHistory(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      )
    )
  }

  const getStoryById = (id: number): HistoryItem | undefined => {
    return history.find(item => item.id === id)
  }

  const getRecentStories = (count = 5) => {
    return history.slice(0, count)
  }

  const getStoriesByType = (storyType: string): HistoryItem[] => {
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

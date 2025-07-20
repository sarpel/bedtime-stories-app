import { useState, useEffect } from 'react'

export function useFavorites() {
  const [favorites, setFavorites] = useState([])

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('bedtime-stories-favorites')
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites))
      } catch (error) {
        console.error('Favori masallar yüklenirken hata:', error)
        setFavorites([])
      }
    }
  }, [])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('bedtime-stories-favorites', JSON.stringify(favorites))
  }, [favorites])

  const addFavorite = (story) => {
    const newFavorite = {
      id: Date.now(),
      story: story.story,
      storyType: story.storyType,
      customTopic: story.customTopic,
      createdAt: new Date().toISOString(),
      audioUrl: story.audioUrl || null
    }
    
    setFavorites(prev => [newFavorite, ...prev])
    return newFavorite.id
  }

  const removeFavorite = (id) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id))
  }

  const toggleFavorite = (story) => {
    const existingIndex = favorites.findIndex(fav => 
      fav.story === story.story && 
      fav.storyType === story.storyType
    )
    
    if (existingIndex >= 0) {
      removeFavorite(favorites[existingIndex].id)
      return false // removed
    } else {
      addFavorite(story)
      return true // added
    }
  }

  const isFavorite = (story) => {
    return favorites.some(fav => 
      fav.story === story.story && 
      fav.storyType === story.storyType
    )
  }

  const clearFavorites = () => {
    setFavorites([])
  }

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites
  }
}
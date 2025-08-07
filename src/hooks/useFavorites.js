import { useState, useEffect } from 'react'
import databaseService from '../services/optimizedDatabaseService.js'

export default function useFavorites() {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    setLoading(true)
    try {
      // Önce veritabanından favorileri yükle
      let dbFavorites = []
      try {
        const allStories = await databaseService.getAllStories()
        dbFavorites = allStories.filter(story => story.is_favorite === 1 || story.is_favorite === true)
        console.log('Veritabanından favori masallar yüklendi:', dbFavorites.length)
        console.log('Favori masallar:', dbFavorites.map(s => ({ id: s.id, is_favorite: s.is_favorite, story: s.story_text?.substring(0, 50) })))
      } catch (dbError) {
        console.log('Veritabanı kullanılamıyor, localStorage kullanılıyor:', dbError.message)
      }

      // localStorage'dan da favorileri yükle (backward compatibility)
      const savedFavorites = localStorage.getItem('bedtime-stories-favorites')
      let localFavorites = []
      
      if (savedFavorites) {
        try {
          localFavorites = JSON.parse(savedFavorites)
          localFavorites = localFavorites.map(fav => ({
            ...fav,
            id: fav.id || `fav_${Date.now()}_${Math.random()}`,
            createdAt: fav.createdAt || new Date().toISOString()
          }))
        } catch (error) {
          console.error('localStorage favori parse hatası:', error)
          localFavorites = []
        }
      }

      // Veritabanı ve localStorage favorilerini birleştir
      const combinedFavorites = [
        ...dbFavorites.map(story => ({
          id: `db_${story.id}`,
          story: story.story_text,
          storyType: story.story_type,
          customTopic: story.custom_topic,
          createdAt: story.created_at,
          audioUrl: story.audio ? `http://localhost:3001/audio/${story.audio.file_name}` : null,
          source: 'database'
        })),
        ...localFavorites.filter(local => 
          !dbFavorites.some(db => db.story_text === local.story && db.story_type === local.storyType)
        ).map(fav => ({ ...fav, source: 'localStorage' }))
      ]

      combinedFavorites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setFavorites(combinedFavorites)
      console.log('Favoriler senkronize edildi:', combinedFavorites.length)
      
    } catch (error) {
      console.error('Favori yükleme hatası:', error)
      setFavorites([])
    } finally {
      setLoading(false)
    }
  }

  // localStorage sync sadece localStorage masallar için (backward compatibility)
  useEffect(() => {
    if (favorites.length >= 0) {
      const localStorageOnlyData = favorites
        .filter(fav => fav.source === 'localStorage')
        .map(fav => ({
          id: fav.id,
          story: fav.story,
          storyType: fav.storyType,
          customTopic: fav.customTopic,
          createdAt: fav.createdAt,
          audioUrl: fav.audioUrl
        }))
      localStorage.setItem('bedtime-stories-favorites', JSON.stringify(localStorageOnlyData))
      console.log('localStorage favorileri kaydedildi:', localStorageOnlyData.length)
    }
  }, [favorites])

  const addFavorite = async (story) => {
    try {
      const existingFavorite = favorites.find(fav => 
        fav.story === story.story && 
        fav.storyType === story.storyType
      )
      
      if (existingFavorite) {
        console.log('Bu masal zaten favorilerde:', existingFavorite.id)
        return existingFavorite.id
      }

      // Önce veritabanında bu masalı ara
      try {
        const allStories = await databaseService.getAllStories()
        const existingDbStory = allStories.find(dbStory => 
          dbStory.story_text === story.story && 
          dbStory.story_type === story.storyType
        )

        if (existingDbStory) {
          // Veritabanında var, is_favorite'i true yap
          await databaseService.updateStoryFavorite(existingDbStory.id, true)
          console.log('Favori eklendi: db_' + existingDbStory.id)
          return `db_${existingDbStory.id}`
        } else {
          // Veritabanında yok, önce masalı oluştur sonra favoriye ekle
          const newStory = await databaseService.createStory(
            story.story, 
            story.storyType, 
            story.customTopic
          )
          await databaseService.updateStoryFavorite(newStory.id, true)
          console.log('Favori eklendi: db_' + newStory.id)
          return `db_${newStory.id}`
        }
      } catch (dbError) {
        console.log('Veritabanı kullanılamıyor, localStorage kullanılıyor:', dbError.message)
        
        // Veritabanı kullanılamıyorsa localStorage'a ekle
        const timestamp = Date.now()
        const newFavorite = {
          id: `fav_${timestamp}_${Math.random()}`,
          story: story.story,
          storyType: story.storyType,
          customTopic: story.customTopic,
          createdAt: new Date().toISOString(),
          audioUrl: story.audioUrl || null,
          source: 'localStorage'
        }
        
        setFavorites(prev => [newFavorite, ...prev])
        console.log('Favori eklendi (localStorage):', newFavorite.id)
        return newFavorite.id
      }
      
    } catch (error) {
      console.error('Favori ekleme hatası:', error)
      throw error
    }
  }

  const removeFavorite = async (id) => {
    console.log('Favori siliniyor:', id)
    
    try {
      // Eğer veritabanı ID'si ise (db_ ile başlıyorsa)
      if (id.startsWith('db_')) {
        const dbId = id.replace('db_', '')
        await databaseService.updateStoryFavorite(parseInt(dbId), false)
        console.log('Veritabanından favori çıkarıldı:', dbId)
      }
      
      // localStorage'dan da çıkar
      setFavorites(prev => {
        const updated = prev.filter(fav => fav.id !== id)
        console.log('Favoriler güncellendi, kalan:', updated.length)
        return updated
      })
    } catch (error) {
      console.error('Favori silme hatası:', error)
      // Hata olsa bile local state'i güncelle
      setFavorites(prev => prev.filter(fav => fav.id !== id))
    }
  }

  const toggleFavorite = async (story) => {
    try {
      console.log('🔵 Toggle favori başlatılıyor:', story)
      console.log('🔵 Mevcut favoriler:', favorites.length)
      
      const existingFavorite = favorites.find(fav => 
        fav.story === story.story && 
        fav.storyType === story.storyType
      )
      
      console.log('🔵 Mevcut favori bulundu mu?', !!existingFavorite)
      
      let result
      if (existingFavorite) {
        console.log('🔴 Favori çıkarılıyor:', existingFavorite.id)
        await removeFavorite(existingFavorite.id)
        console.log('🔴 Favori çıkarıldı')
        result = { action: 'removed', favoriteId: existingFavorite.id }
      } else {
        console.log('🟢 Favori ekleniyor...')
        const favoriteId = await addFavorite(story)
        console.log('🟢 Favori eklendi, ID:', favoriteId)
        result = { action: 'added', favoriteId }
      }
      
      // Favorileri hemen yenile
      console.log('🔄 Favoriler yenileniyor...')
      await refreshFavorites()
      console.log('🔄 Favoriler yenilendi, yeni sayı:', favorites.length)
      
      return result
    } catch (error) {
      console.error('❌ Favori toggle hatası:', error)
      throw error
    }
  }

  const isFavorite = (story) => {
    const isInFavorites = favorites.some(fav => 
      fav.story === story.story && 
      fav.storyType === story.storyType
    )
    return isInFavorites
  }

  const refreshFavorites = async () => {
    console.log('Favoriler yenileniyor...')
    await loadFavorites()
  }

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    refreshFavorites
  }
}

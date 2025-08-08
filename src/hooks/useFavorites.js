import { useState, useEffect } from 'react'
import databaseService from '../services/optimizedDatabaseService.js'
import safeLocalStorage from '../utils/safeLocalStorage.js'

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

      // localStorage'dan da favorileri güvenli şekilde yükle
      const savedFavorites = safeLocalStorage.get('bedtime-stories-favorites', [])
      let localFavorites = []
      
      if (Array.isArray(savedFavorites)) {
        localFavorites = savedFavorites.map(fav => ({
          ...fav,
          id: fav.id || `fav_${Date.now()}_${Math.random()}`,
          createdAt: fav.createdAt || new Date().toISOString()
        }))
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
    // Debounce localStorage yazma işlemi ve infinite loop prevention
    const timeoutId = setTimeout(() => {
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
        
        // Infinite loop prevention: Compare with current localStorage data
        const currentLocalData = safeLocalStorage.get('bedtime-stories-favorites', [])
        const currentDataString = JSON.stringify(currentLocalData)
        const newDataString = JSON.stringify(localStorageOnlyData)
        
        if (currentDataString !== newDataString) {
          const saved = safeLocalStorage.set('bedtime-stories-favorites', localStorageOnlyData)
          if (saved) {
            console.log('localStorage favorileri kaydedildi:', localStorageOnlyData.length)
          } else {
            console.warn('localStorage favorileri kaydedilemedi')
          }
        }
      }
    }, 1000) // 1000ms debounce - increased to prevent rapid updates

    return () => clearTimeout(timeoutId)
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
          
          // State'i hemen güncelle
          const newFavorite = {
            id: `db_${existingDbStory.id}`,
            story: existingDbStory.story_text,
            storyType: existingDbStory.story_type,
            customTopic: existingDbStory.custom_topic,
            createdAt: existingDbStory.created_at,
            audioUrl: existingDbStory.audio ? `http://localhost:3001/audio/${existingDbStory.audio.file_name}` : null,
            source: 'database'
          }
          setFavorites(prev => [newFavorite, ...prev.filter(fav => fav.id !== newFavorite.id)])
          
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
          
          // State'i hemen güncelle
          const newFavorite = {
            id: `db_${newStory.id}`,
            story: newStory.story_text || story.story,
            storyType: newStory.story_type || story.storyType,
            customTopic: newStory.custom_topic || story.customTopic,
            createdAt: newStory.created_at || new Date().toISOString(),
            audioUrl: story.audioUrl || null,
            source: 'database'
          }
          setFavorites(prev => [newFavorite, ...prev])
          
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
      // Önce state'den çıkar (optimistic update)
      setFavorites(prev => {
        const updated = prev.filter(fav => fav.id !== id)
        console.log('Favoriler güncellendi, kalan:', updated.length)
        return updated
      })
      
      // Eğer veritabanı ID'si ise (db_ ile başlıyorsa)
      if (id.startsWith('db_')) {
        const dbId = id.replace('db_', '')
        await databaseService.updateStoryFavorite(parseInt(dbId), false)
        console.log('Veritabanından favori çıkarıldı:', dbId)
      }
      
    } catch (error) {
      console.error('Favori silme hatası:', error)
      // Hata olursa state'i geri yükle
      await loadFavorites()
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
      
      // addFavorite ve removeFavorite zaten state'i güncelliyor, gereksiz refresh yok
      console.log('🔄 Favoriler güncellendi, yeni sayı:', favorites.length)
      
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
    try {
      // loadFavorites yerine direkt olarak state'i güncelleyelim
      const allStories = await databaseService.getAllStories()
      const dbFavorites = allStories.filter(story => story.is_favorite === 1 || story.is_favorite === true)
      
      const savedFavorites = safeLocalStorage.get('bedtime-stories-favorites', [])
      let localFavorites = []
      
      if (savedFavorites) {
        try {
          localFavorites = JSON.parse(savedFavorites)
        } catch (error) {
          console.error('localStorage favori parse hatası:', error)
          localFavorites = []
        }
      }

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
      console.log('✅ Favoriler güncellendi:', combinedFavorites.length)
    } catch (error) {
      console.error('❌ Favori yenileme hatası:', error)
    }
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

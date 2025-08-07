import { useState, useEffect } from 'react'
import databaseService from '../services/optimizedDatabaseService.js'

export function useStoryDatabase() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Tüm masalları yükle
  const loadStories = async () => {
    setLoading(true)
    setError(null)
    try {
      const allStories = await databaseService.getAllStories()
      setStories(allStories)
    } catch (err) {
      setError(err.message)
      console.error('Masalları yükleme hatası:', err)
    } finally {
      setLoading(false)
    }
  }

  // Sayfa yüklendiğinde masalları getir
  useEffect(() => {
    loadStories()
    
    // Migration işlemi - sadece bir kere çalıştır
    const migrationKey = 'database-migration-completed'
    const migrationCompleted = localStorage.getItem(migrationKey)
    
    if (!migrationCompleted) {
      // Önce mevcut veritabanı masallarını kontrol et
      const timeoutId = setTimeout(() => {
        databaseService.migrateFromLocalStorage().then((result) => {
          if (result.migrated > 0) {
            console.log(`${result.migrated} masal localStorage'dan veritabanına taşındı.`)
            // Sadece migration başarılıysa yeniden yükle
            setStories(prevStories => [...prevStories]) // Trigger re-render without API call
          }
          localStorage.setItem(migrationKey, 'true')
        }).catch((err) => {
          console.error('Migration hatası:', err)
          localStorage.setItem(migrationKey, 'true') // Mark as completed even on error
        })
      }, 1000) // 1 saniye bekle ki veritabanı hazır olsun
      
      return () => clearTimeout(timeoutId) // Cleanup timeout
    }
  }, [])

  // Yeni masal oluştur
  const createStory = async (storyText, storyType, customTopic = null) => {
    setLoading(true)
    setError(null)
    try {
      const newStory = await databaseService.createStory(storyText, storyType, customTopic)
      await loadStories() // Listeyi yenile
      return newStory
    } catch (err) {
      setError(err.message)
      console.error('Masal oluşturma hatası:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Masal güncelle
  const updateStory = async (id, storyText, storyType, customTopic = null) => {
    setLoading(true)
    setError(null)
    try {
      const updatedStory = await databaseService.updateStory(id, storyText, storyType, customTopic)
      await loadStories() // Listeyi yenile
      return updatedStory
    } catch (err) {
      setError(err.message)
      console.error('Masal güncelleme hatası:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Masal sil
  const deleteStory = async (id) => {
    setLoading(true)
    setError(null)
    try {
      await databaseService.deleteStory(id)
      await loadStories() // Listeyi yenile
    } catch (err) {
      setError(err.message)
      console.error('Masal silme hatası:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Belirli bir masalı getir
  const getStory = async (id) => {
    setLoading(true)
    setError(null)
    try {
      const story = await databaseService.getStory(id)
      return story
    } catch (err) {
      setError(err.message)
      console.error('Masal getirme hatası:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Tip bazlı masalları getir
  const getStoriesByType = async (storyType) => {
    setLoading(true)
    setError(null)
    try {
      const typeStories = await databaseService.getStoriesByType(storyType)
      return typeStories
    } catch (err) {
      setError(err.message)
      console.error('Tip bazlı masal getirme hatası:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Son masalları getir
  const getRecentStories = (count = 5) => {
    return stories.slice(0, count)
  }

  // Ses dosyası URL'si getir
  const getAudioUrl = (fileName) => {
    return databaseService.getAudioUrl(fileName)
  }

  // Masal ID'sine göre masalı bul
  const findStoryById = (id) => {
    return stories.find(story => story.id === id)
  }

  return {
    stories,
    loading,
    error,
    loadStories,
    createStory,
    updateStory,
    deleteStory,
    getStory,
    getStoriesByType,
    getRecentStories,
    getAudioUrl,
    findStoryById
  }
}

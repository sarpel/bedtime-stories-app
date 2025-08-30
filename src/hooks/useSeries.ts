import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Series {
  id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
}

interface CreateSeriesData {
  title: string
  description?: string
  [key: string]: any
}

interface UpdateSeriesData {
  title?: string
  description?: string
  [key: string]: any
}

const useSeries = () => {
  const [series, setSeries] = useState<Series[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Serileri yükle
  const loadSeries = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/series')
      if (response.ok) {
        const data = await response.json()
        setSeries(data.series || [])
      }
    } catch (error) {
      console.error('Serileri yükleme hatası:', error)
      toast.error('Seriler yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Seri oluştur
  const createSeries = useCallback(async (seriesData: CreateSeriesData) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seriesData),
      })

      if (response.ok) {
        const result = await response.json()
        await loadSeries() // Listeyi yenile
        toast.success('Seri oluşturuldu')
        return result
      } else {
        throw new Error('Seri oluşturulamadı')
      }
    } catch (error) {
      console.error('Seri oluşturma hatası:', error)
      toast.error('Seri oluştururken hata oluştu')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [loadSeries])

  // Seri güncelle
  const updateSeries = useCallback(async (id: string, updates: UpdateSeriesData) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/series/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        await loadSeries() // Listeyi yenile
        toast.success('Seri güncellendi')
        return true
      } else {
        throw new Error('Seri güncellenemedi')
      }
    } catch (error) {
      console.error('Seri güncelleme hatası:', error)
      toast.error('Seri güncellerken hata oluştu')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadSeries])

  // Seri sil
  const deleteSeries = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/series/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadSeries() // Listeyi yenile
        toast.success('Seri silindi')
        return true
      } else {
        throw new Error('Seri silinemedi')
      }
    } catch (error) {
      console.error('Seri silme hatası:', error)
      toast.error('Seri silerken hata oluştu')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadSeries])

  // Seriye hikaye ekle
  const addStoryToSeries = useCallback(async (seriesId: string, storyId: string, seriesTitle: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/series/${seriesId}/add-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyId, seriesTitle }),
      })

      if (response.ok) {
        toast.success('Hikaye seriye eklendi')
        return true
      } else {
        throw new Error('Hikaye seriye eklenemedi')
      }
    } catch (error) {
      console.error('Hikayeyi seriye ekleme hatası:', error)
      toast.error('Hikaye seriye eklenirken hata oluştu')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Serinin hikayelerini getir
  const getSeriesStories = useCallback(async (seriesId: string) => {
    try {
      const response = await fetch(`/api/series/${seriesId}/stories`)
      if (response.ok) {
        const data = await response.json()
        return data.stories || []
      }
      return []
    } catch (error) {
      console.error('Seri hikayelerini getirme hatası:', error)
      return []
    }
  }, [])

  // İlk yükleme
  useEffect(() => {
    loadSeries()
  }, [loadSeries])

  return {
    series,
    isLoading,
    loadSeries,
    createSeries,
    updateSeries,
    deleteSeries,
    addStoryToSeries,
    getSeriesStories,
  }
}

export default useSeries

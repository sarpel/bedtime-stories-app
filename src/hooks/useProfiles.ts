import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Profile {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  age?: number
  gender?: 'girl' | 'boy' | 'other'
  custom_prompt?: string
}

interface CreateProfileData {
  name: string
  [key: string]: any
}

interface UpdateProfileData {
  name?: string
  is_active?: boolean
  [key: string]: any
}

const useProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Profilleri yükle
  const loadProfiles = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/profiles')
      if (response.ok) {
        const data = await response.json()
        setProfiles(data.profiles || [])

        // Aktif profili bul
        const active = data.profiles?.find((p: Profile) => p.is_active)
        setActiveProfile(active || null)
      }
    } catch (error) {
      console.error('Profilleri yükleme hatası:', error)
      toast.error('Profiller yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Profil oluştur
  const createProfile = useCallback(async (profileData: CreateProfileData) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })

      if (response.ok) {
        const result = await response.json()
        await loadProfiles() // Listeyi yenile
        toast.success('Profil oluşturuldu')
        return result
      } else {
        throw new Error('Profil oluşturulamadı')
      }
    } catch (error) {
      console.error('Profil oluşturma hatası:', error)
      toast.error('Profil oluştururken hata oluştu')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [loadProfiles])

  // Profil güncelle
  const updateProfile = useCallback(async (id: string, updates: UpdateProfileData) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        await loadProfiles() // Listeyi yenile
        toast.success('Profil güncellendi')
        return true
      } else {
        throw new Error('Profil güncellenemedi')
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error)
      toast.error('Profil güncellerken hata oluştu')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadProfiles])

  // Profil sil
  const deleteProfile = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadProfiles() // Listeyi yenile
        toast.success('Profil silindi')
        return true
      } else {
        throw new Error('Profil silinemedi')
      }
    } catch (error) {
      console.error('Profil silme hatası:', error)
      toast.error('Profil silerken hata oluştu')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadProfiles])

  // Aktif profil değiştir
  const setActiveProfileById = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/profiles/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileId: id }),
      })

      if (response.ok) {
        await loadProfiles() // Listeyi yenile
        toast.success('Aktif profil değiştirildi')
        return true
      } else {
        throw new Error('Aktif profil değiştirilemedi')
      }
    } catch (error) {
      console.error('Aktif profil değiştirme hatası:', error)
      toast.error('Aktif profil değiştirirken hata oluştu')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadProfiles])

  // İlk yükleme
  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  return {
    profiles,
    activeProfile,
    isLoading,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    setActiveProfileById,
  }
}

export default useProfiles

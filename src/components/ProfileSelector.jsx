import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { User, Plus, Edit, Trash2, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import useProfiles from '../hooks/useProfiles.js'

const ProfileSelector = ({ onProfileSelect, selectedProfileId }) => {
  const {
    profiles,
    activeProfile,
    isLoading,
    createProfile,
    updateProfile,
    deleteProfile,
    setActiveProfileById
  } = useProfiles()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingProfileId, setPendingProfileId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [editingProfile, setEditingProfile] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    customPrompt: ''
  })

  const handleCreateProfile = async () => {
    if (!formData.name || !formData.age || !formData.gender) {
      toast.error('Lütfen tüm zorunlu alanları doldurun')
      return
    }

    const success = await createProfile({
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender,
      customPrompt: formData.customPrompt
    })

    if (success) {
      setShowCreateDialog(false)
      setFormData({ name: '', age: '', gender: '', customPrompt: '' })
    }
  }

  const handleEditProfile = async () => {
    if (!formData.name || !formData.age || !formData.gender) {
      toast.error('Lütfen tüm zorunlu alanları doldurun')
      return
    }

    const success = await updateProfile(editingProfile.id, {
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender,
      customPrompt: formData.customPrompt
    })

    if (success) {
      setShowEditDialog(false)
      setEditingProfile(null)
      setFormData({ name: '', age: '', gender: '', customPrompt: '' })
    }
  }

  const requestDeleteProfile = (profileId) => {
    setPendingProfileId(profileId)
    setConfirmOpen(true)
  }

  const confirmDeleteProfile = async () => {
    if (!pendingProfileId) return
    setIsDeleting(true)
    try {
      await deleteProfile(pendingProfileId)
      toast.success('Profil başarıyla silindi')
      setConfirmOpen(false)
      setPendingProfileId(null)
    } catch (error) {
      toast.error('Profil silinirken bir hata oluştu')
      console.error('Profil silme hatası:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectProfile = async (profile) => {
    await setActiveProfileById(profile.id)
    onProfileSelect?.(profile)
  }

  const openEditDialog = (profile) => {
    setEditingProfile(profile)
    setFormData({
      name: profile.name,
      age: profile.age.toString(),
      gender: profile.gender,
      customPrompt: profile.custom_prompt || ''
    })
    setShowEditDialog(true)
  }

  const ProfileForm = ({ onSubmit, submitLabel, onCancel }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">İsim *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Çocuğun adı"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="age">Yaş *</Label>
        <Input
          id="age"
          type="number"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          placeholder="5"
          min="1"
          max="18"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">Cinsiyet *</Label>
        <Select
          value={formData.gender}
          onValueChange={(value) => setFormData({ ...formData, gender: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="girl">Kız</SelectItem>
            <SelectItem value="boy">Erkek</SelectItem>
            <SelectItem value="other">Diğer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customPrompt">Özel İstekler</Label>
        <Input
          id="customPrompt"
          value={formData.customPrompt}
          onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
          placeholder="Özel masal tercihleri..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={onSubmit} className="flex-1">
          {submitLabel}
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          İptal
        </Button>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Çocuk Profilleri
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Yeni Profil
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Profil Oluştur</DialogTitle>
              </DialogHeader>
              <ProfileForm
                onSubmit={handleCreateProfile}
                submitLabel="Oluştur"
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Yükleniyor...</div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Henüz profil oluşturulmamış
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  profile.is_active
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {profile.name}
                        {profile.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Aktif
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {profile.age} yaş • {profile.gender === 'girl' ? 'Kız' : profile.gender === 'boy' ? 'Erkek' : 'Diğer'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!profile.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectProfile(profile)}
                      >
                        Seç
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(profile)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => requestDeleteProfile(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {profile.custom_prompt && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Özel istek: {profile.custom_prompt}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profili Düzenle</DialogTitle>
          </DialogHeader>
          <ProfileForm
            onSubmit={handleEditProfile}
            submitLabel="Güncelle"
            onCancel={() => {
              setShowEditDialog(false)
              setEditingProfile(null)
              setFormData({ name: '', age: '', gender: '', customPrompt: '' })
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profili Sil</DialogTitle>
            <DialogDescription>
              Bu profili silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteProfile}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default ProfileSelector

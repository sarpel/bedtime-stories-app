import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BookOpen, Plus, Edit, Trash2, Play, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import useSeries from '../hooks/useSeries'

interface Series {
  id: string | number
  title: string
  description?: string
  character_info?: any
  story_count?: number
}

interface Story {
  id: string | number
  series_title?: string
  series_order?: number
  created_at: string
}

interface SeriesManagerProps {
  onSeriesSelect?: (series: Series) => void
  onContinueSeries?: (story: Story, stories: Story[]) => void
  selectedSeriesId?: string | number | null
}

interface SeriesFormProps {
  onSubmit: () => void
  submitLabel: string
  onCancel: () => void
}

const SeriesManager = ({ onSeriesSelect, onContinueSeries, selectedSeriesId }: SeriesManagerProps) => {
  const {
    series,
    isLoading,
    createSeries,
    updateSeries,
    deleteSeries,
    addStoryToSeries,
    getSeriesStories
  } = useSeries()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSeries, setEditingSeries] = useState<Series | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    characterInfo: ''
  })

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  const [selectedSeriesStories, setSelectedSeriesStories] = useState<Story[]>([])
  const [showStoriesDialog, setShowStoriesDialog] = useState(false)

  const handleCreateSeries = async () => {
    if (!formData.title) {
      toast.error('Lütfen seri başlığını girin')
      return
    }

    const success = await createSeries({
      title: formData.title,
      description: formData.description,
      characterInfo: formData.characterInfo ? JSON.parse(formData.characterInfo) : {}
    })

    if (success) {
      setShowCreateDialog(false)
      setFormData({ title: '', description: '', characterInfo: '' })
    }
  }

  const handleEditSeries = async () => {
    if (!formData.title || !editingSeries) {
      toast.error('Lütfen seri başlığını girin')
      return
    }

    const success = await updateSeries(String(editingSeries.id), {
      title: formData.title,
      description: formData.description,
      characterInfo: formData.characterInfo ? JSON.parse(formData.characterInfo) : {}
    })

    if (success) {
      setShowEditDialog(false)
      setEditingSeries(null)
      setFormData({ title: '', description: '', characterInfo: '' })
    }
  }

  const handleDeleteSeries = async (seriesId: string | number) => {
    if (window.confirm('Bu seriyi silmek istediğinizden emin misiniz?')) {
      await deleteSeries(String(seriesId))
    }
  }

  const handleSelectSeries = (series: Series) => {
    onSeriesSelect?.(series)
  }

  const handleContinueSeries = async (series: Series) => {
    const stories = await getSeriesStories(String(series.id))
    setSelectedSeriesStories(stories)
    setShowStoriesDialog(true)
  }

  const handleStorySelect = (story: Story) => {
    onContinueSeries?.(story, selectedSeriesStories)
    setShowStoriesDialog(false)
  }

  const openEditDialog = (series: Series) => {
    setEditingSeries(series)
    setFormData({
      title: series.title,
      description: series.description || '',
      characterInfo: series.character_info ? JSON.stringify(series.character_info, null, 2) : ''
    })
    setShowEditDialog(true)
  }

  const SeriesForm = React.memo(({ onSubmit, submitLabel, onCancel }: SeriesFormProps) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Seri Başlığı *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => updateFormData('title', e.target.value)}
          placeholder="Örneğin: Peri Kızın Maceraları"
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Açıklama</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Serinin konusu hakkında kısa açıklama..."
          rows={3}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="characterInfo">Karakter Bilgileri (JSON)</Label>
        <Textarea
          id="characterInfo"
          value={formData.characterInfo}
          onChange={(e) => updateFormData('characterInfo', e.target.value)}
          placeholder='{"ana_karakter": "Ela", "yaş": 5, "özellikler": ["meraklı", "cesur"]}'
          rows={4}
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Karakter tutarlılığı için JSON formatında bilgi girin
        </p>
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
  ))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Masal Serileri
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Yeni Seri
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg max-h-[95vh] overflow-y-auto scrollbar-thin">
              <DialogHeader>
                <DialogTitle>Yeni Seri Oluştur</DialogTitle>
              </DialogHeader>
              <SeriesForm
                onSubmit={handleCreateSeries}
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
        ) : series.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Henüz seri oluşturulmamış
          </div>
        ) : (
          <div className="space-y-3">
            {series.map((seriesItem: Series) => (
              <div
                key={seriesItem.id}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedSeriesId === seriesItem.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {seriesItem.title}
                      <Badge variant="secondary" className="text-xs">
                        {seriesItem.story_count || 0} hikaye
                      </Badge>
                    </div>
                    {seriesItem.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {seriesItem.description}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectSeries(seriesItem)}
                    >
                      Seç
                    </Button>
                    {seriesItem.story_count && seriesItem.story_count > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleContinueSeries(seriesItem)}
                      >
                        <ChevronRight className="h-4 w-4 mr-1" />
                        Devam Et
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(seriesItem)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSeries(seriesItem.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg max-h-[95vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Seriyi Düzenle</DialogTitle>
          </DialogHeader>
          <SeriesForm
            onSubmit={handleEditSeries}
            submitLabel="Güncelle"
            onCancel={() => {
              setShowEditDialog(false)
              setEditingSeries(null)
              setFormData({ title: '', description: '', characterInfo: '' })
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Stories Dialog */}
      <Dialog open={showStoriesDialog} onOpenChange={setShowStoriesDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg max-h-[95vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Serinin Hikayeleri</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {selectedSeriesStories.map((story, index) => (
                <div
                  key={story.id}
                  className="p-3 rounded-lg border hover:bg-accent cursor-pointer"
                  onClick={() => handleStorySelect(story)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div className="flex-1">
                      <div className="font-medium">
                        {story.series_title} - Bölüm {story.series_order || index + 1}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(story.created_at).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default SeriesManager

import { memo, useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { BookOpen, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useProgressiveLoading, useDebouncedSearch } from '@/hooks/usePerformance.js'
import { getStoryTypeLabel } from '@/utils/storyTypes.js'

interface Story {
  id: string | number
  story?: string
  story_text?: string
  storyType?: string
  story_type?: string
  customTopic?: string
  custom_topic?: string
  createdAt?: string
  created_at?: string
  audioUrl?: string | null
  audio?: {
    file_name?: string
    file_path?: string
    voice_id?: string
  }
}

interface StoryItemProps {
  story: Story
  onStoryClick: (story: Story) => void
}

// Story item memoized component to prevent unnecessary re-renders
const StoryItem = memo(({ story, onStoryClick }: StoryItemProps) => {
  const handleClick = useCallback(() => {
    onStoryClick(story)
  }, [story, onStoryClick])

  return (
    <div
      className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/30 transition-colors h-14 cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-4 leading-none">
            {getStoryTypeLabel(story.story_type || story.storyType || '')}
          </Badge>
          {(story.custom_topic || story.customTopic) && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-4 leading-none">
              {story.custom_topic || story.customTopic}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            {new Date(story.created_at || story.createdAt || Date.now()).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit'
            })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate leading-tight">
          {((story.story_text || story.story) || '').substring(0, 60)}...
        </p>
      </div>
      <div className="flex gap-0.5 ml-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          title="Masalı görüntüle"
        >
          <BookOpen className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  )
})

StoryItem.displayName = 'StoryItem'

interface OptimizedStoryListProps {
  stories?: Story[]
  onStoryClick: (story: Story) => void
  initialDisplayCount?: number
  batchSize?: number
  showSearch?: boolean
  maxHeight?: string
}

/**
 * Optimize edilmiş Story List Component
 * - Progressive loading
 * - Debounced search
 * - Memoized items
 * - Virtualization ready
 */
export const OptimizedStoryList = memo(({
  stories = [],
  onStoryClick,
  initialDisplayCount = 10,
  batchSize = 10,
  showSearch = true,
  maxHeight = "max-h-96"
}: OptimizedStoryListProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  // Debounced search for better performance
  const debouncedSearch = useDebouncedSearch(searchTerm, 300)

  // Filtered stories based on search
  const filteredStories = useMemo(() => {
    if (!debouncedSearch.trim()) return stories

    const searchLower = debouncedSearch.toLowerCase()
    return stories.filter(story => {
      const storyText = story.story_text || story.story || ''
      const storyType = story.story_type || story.storyType || ''
      const customTopic = story.custom_topic || story.customTopic || ''

      return (
        storyText.toLowerCase().includes(searchLower) ||
        storyType.toLowerCase().includes(searchLower) ||
        customTopic.toLowerCase().includes(searchLower)
      )
    })
  }, [stories, debouncedSearch])

  // Progressive loading for large lists
  const {
    displayedItems,
    isLoading,
    hasMore,
    loadMore
  } = useProgressiveLoading(
    (isExpanded ? filteredStories : filteredStories.slice(0, initialDisplayCount)) as any,
    batchSize
  )

  const handleExpand = useCallback(() => {
    setIsExpanded(true)
  }, [])

  const handleCollapse = useCallback(() => {
    setIsExpanded(false)
  }, [])

  const handleLoadMore = useCallback(() => {
    loadMore()
  }, [loadMore])

  if (stories.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Henüz kaydedilmiş masal yok.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Masallarda ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Badge variant="secondary" className="text-xs">
                {filteredStories.length} sonuç
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Story List */}
      <div className={`${maxHeight} overflow-y-auto space-y-1`}>
        {displayedItems.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Arama kriterinize uygun masal bulunamadı.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {displayedItems.map((story, index) => (
              <StoryItem
                key={(story as Story).id || index}
                story={story as Story}
                onStoryClick={onStoryClick}
              />
            ))}

            {/* Load More / Expand Controls */}
            {!isExpanded && filteredStories.length > initialDisplayCount && (
              <div className="text-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpand}
                  className="text-xs gap-2"
                >
                  <ChevronDown className="h-3 w-3" />
                  +{filteredStories.length - displayedItems.length} masal daha - Tümünü Görüntüle
                </Button>
              </div>
            )}

            {isExpanded && hasMore && (
              <div className="text-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="text-xs gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
                      Yükleniyor...
                    </>
                  ) : (
                    <>Daha Fazla Yükle</>
                  )}
                </Button>
              </div>
            )}

            {isExpanded && !hasMore && filteredStories.length > initialDisplayCount && (
              <div className="text-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCollapse}
                  className="text-xs gap-2"
                >
                  <ChevronUp className="h-3 w-3" />
                  Daralt
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Performance Stats */}
      <div className="text-xs text-muted-foreground text-center">
        Toplam: {stories.length} | Filtrelenen: {filteredStories.length} | Gösterilen: {displayedItems.length}
      </div>
    </div>
  )
})

OptimizedStoryList.displayName = 'OptimizedStoryList'

export default OptimizedStoryList

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, X, Clock, Star, Filter, Loader2 } from 'lucide-react'
import StoryCard from './StoryCard'
import { useDebounce } from '../hooks/useDebounce'
import { toast } from 'sonner'

const SEARCH_HISTORY_KEY = 'story-search-history'

interface Story {
  id?: string | number
  story_text?: string
  story?: string
  story_type?: string
  storyType?: string
  custom_topic?: string | null
  customTopic?: string | null
  created_at?: string
  createdAt?: string
  audio?: {
    file_name?: string
  }
}

interface EnrichedStory extends Story {
  isFavorite: boolean
}

interface SearchPanelProps {
  onClose: () => void
  onStorySelect: (story: Story) => void
  favorites?: Story[]
  onToggleFavorite: (story: Story) => void
  onDeleteStory: (storyId: string | number) => void
}

const SearchPanel = ({
  onClose,
  onStorySelect,
  favorites = [],
  onToggleFavorite,
  onDeleteStory
}: SearchPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('all') // all, title, content
  const [searchResults, setSearchResults] = useState<Story[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Debounce search query to avoid too many API calls
  const debouncedQuery = useDebounce(searchQuery, 300)

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY)
      if (saved) {
        setSearchHistory(JSON.parse(saved).slice(0, 10)) // Keep last 10 searches
      }
    } catch (error) {
      console.error('Search history load error:', error)
    }
  }, [])

  // Save search to history (memoized)
  const saveSearchToHistory = useCallback((query: string) => {
    const q = (query || '').trim()
    if (q.length < 2) return
    try {
      setSearchHistory(prev => {
        const next = [q, ...prev.filter(h => h !== q)].slice(0, 10)
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
        return next
      })
    } catch (error) {
      console.error('Search history save error:', error)
    }
  }, [])

  // Perform search (memoized)
  const performSearch = useCallback(async (query: string, type: string = 'all') => {
    const q = (query || '').trim()
    if (q.length < 2) {
      setSearchResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        q,
        limit: '50',
        useFTS: 'true'
      })

      if (type !== 'all') {
        params.append('type', type)
      }

      const response = await fetch(`/api/stories/search?${params}`)

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const data = await response.json()
      setSearchResults(data.results || [])

      // Save successful search to history
      saveSearchToHistory(q)

      console.log(`Search completed: ${data.count} results for "${q}"`)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Arama yapılırken hata oluştu')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [saveSearchToHistory])

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery, searchType)
    } else {
      setSearchResults([])
      setHasSearched(false)
    }
  }, [debouncedQuery, searchType, performSearch])

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
  }

  // Clear search history
  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem(SEARCH_HISTORY_KEY)
    toast.success('Arama geçmişi temizlendi')
  }

  // Handle search history click
  const handleHistoryClick = (query: string) => {
    setSearchQuery(query)
  }

  // Memoized search results with favorites info
  const enrichedResults: EnrichedStory[] = useMemo(() => {
    return searchResults.map(story => ({
      ...story,
      isFavorite: favorites.some(fav => fav.id === story.id)
    }))
  }, [searchResults, favorites])

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-1">
      <div ref={panelRef}>
        <Card className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg max-h-[95vh] overflow-y-auto scrollbar-thin">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Masal Arama
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Masal ara... (en az 2 karakter)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            autoFocus
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Type Tabs */}
        <Tabs value={searchType} onValueChange={setSearchType}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Tümü
            </TabsTrigger>
            <TabsTrigger value="title" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              Başlık
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              İçerik
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <p className="text-sm text-muted-foreground">
              Masal başlığı, türü ve içeriğinde arama yapar
            </p>
          </TabsContent>
          <TabsContent value="title" className="mt-4">
            <p className="text-sm text-muted-foreground">
              Sadece masal başlığı ve türünde arama yapar
            </p>
          </TabsContent>
          <TabsContent value="content" className="mt-4">
            <p className="text-sm text-muted-foreground">
              Sadece masal içeriğinde arama yapar
            </p>
          </TabsContent>
        </Tabs>

        {/* Search History */}
        {!searchQuery && searchHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Son Aramalar
              </h4>
              <Button variant="ghost" size="sm" onClick={clearSearchHistory}>
                Temizle
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((query, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => handleHistoryClick(query)}
                >
                  {query}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Aranıyor...</span>
          </div>
        )}

        {/* Search Results */}
        {!isSearching && hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Arama Sonuçları ({enrichedResults.length})
              </h4>
              {searchQuery && (
                <Badge variant="outline">
                  "{searchQuery}" için {searchType === 'all' ? 'tüm' : searchType} arama
                </Badge>
              )}
            </div>

            {enrichedResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Arama kriterlerinize uygun masal bulunamadı.</p>
                <p className="text-sm mt-1">Farklı kelimeler deneyin veya arama türünü değiştirin.</p>
              </div>
            ) : (
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {enrichedResults.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    onSelect={() => onStorySelect(story)}
                    onToggleFavorite={() => onToggleFavorite(story)}
                    onDelete={() => onDeleteStory(story.id || '')}
                    isFavorite={story.isFavorite}
                    showActions={true}
                    compact={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && !hasSearched && searchHistory.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Masallarınızda arama yapmak için yukarıdaki kutucuğa yazın.</p>
            <p className="text-sm mt-1">En az 2 karakter girmeniz gerekiyor.</p>
          </div>
        )}
      </CardContent>
    </Card>
      </div>
    </div>
  )
}

export default SearchPanel

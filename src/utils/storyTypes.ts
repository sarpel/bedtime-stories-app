// Masal türü tanımları ve yardımcı fonksiyonlar

export interface StoryType {
  id: string
  name: string
  icon: string
  description: string
  prompt: string
}

export const storyTypes: StoryType[] = [
  {
    id: 'princess',
    name: 'Prenses Masalları',
    icon: '👸',
    description: 'Büyülü prenses hikayeleri',
    prompt: 'Prenseslerin, büyülü krallıkların ve iyiliğin zaferi temalı'
  },
  {
    id: 'unicorn',
    name: 'Unicorn Masalları',
    icon: '🦄',
    description: 'Tek boynuzlu at masalları',
    prompt: 'Unicornlar, büyü ve masalsı yaratıklar temalı'
  },
  {
    id: 'fairy',
    name: 'Peri Masalları',
    icon: '🧚‍♀️',
    description: 'Peri ve büyü hikayeleri',
    prompt: 'Periler, büyülü değnekler ve iyilik yapan yaratıklar temalı'
  },
  {
    id: 'butterfly',
    name: 'Kelebek Masalları',
    icon: '🦋',
    description: 'Rengarenk kelebek maceraları',
    prompt: 'Kelebekler, çiçekler ve doğa güzellikleri temalı'
  },
  {
    id: 'mermaid',
    name: 'Deniz Kızı Masalları',
    icon: '🧜‍♀️',
    description: 'Deniz altı prenses hikayeleri',
    prompt: 'Deniz kızları, okyanus maceraları ve su altı krallıkları temalı'
  },
  {
    id: 'rainbow',
    name: 'Gökkuşağı Masalları',
    icon: '🌈',
    description: 'Renkli gökkuşağı hikayeleri',
    prompt: 'Gökkuşağı, renkler ve neşe temalı masallar'
  },
  {
    id: 'flower',
    name: 'Çiçek Masalları',
    icon: '🌸',
    description: 'Güzel çiçek bahçesi hikayeleri',
    prompt: 'Çiçekler, bahçe dostları ve doğa sevgisi temalı'
  },
  {
    id: 'cat',
    name: 'Kedi Masalları',
    icon: '🐱',
    description: 'Sevimli kedi dostlar',
    prompt: 'Kediler, dostluk ve sevimli maceralar temalı'
  },
  {
    id: 'star',
    name: 'Yıldız Masalları',
    icon: '⭐',
    description: 'Parıldayan yıldız hikayeleri',
    prompt: 'Yıldızlar, gece gökyüzü ve hayaller temalı'
  },
  {
    id: 'magic',
    name: 'Sihirli Masallar',
    icon: '✨',
    description: 'Büyülü ve fantastik hikayeler',
    prompt: 'Sihir, büyü ve fantastik öğeler içeren, hayal gücünü geliştiren'
  }
]

// Masal türü ID'sine göre bilgi getirme
export const getStoryTypeById = (id: string): StoryType => {
  return storyTypes.find(type => type.id === id) || storyTypes[0]
}

// Masal türü adını getirme
export const getStoryTypeName = (id: string): string => {
  const type = getStoryTypeById(id)
  return type ? type.name : 'Genel Masal'
}

// Masal türü label'ını getirme (aynı fonksiyon)
export const getStoryTypeLabel = (id: string): string => {
  return getStoryTypeName(id)
}

// Masal türü prompt'unu getirme
export const getStoryTypePrompt = (id: string, customTopic: string = ''): string => {
  const type = getStoryTypeById(id)

  if (id === 'custom' && customTopic) {
    return `${customTopic} konulu, özel bir masal`
  }

  return type ? type.prompt : 'Genel bir masal'
}

// Masaldan başlık çıkarma fonksiyonu
export const extractStoryTitle = (storyText: string): string => {
  if (!storyText) {
    return 'Senin Masalın'
  }

  // Önce masal metninin ilk cümlesini bul
  const firstSentence = storyText.split(/[.!?]/)[0].trim()

  // Eğer çok kısa ise (20 karakterden az), ikinci cümleyi de ekle
  if (firstSentence.length < 20) {
    const sentences = storyText.split(/[.!?]/)
    const title = sentences.slice(0, 2).join('. ').trim()
    return title.length > 50 ? title.substring(0, 50) + '...' : title
  }

  // İlk cümleyi başlık olarak kullan, çok uzunsa kısalt
  return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence
}

// Popüler masal türleri (hızlı seçim için)
export const popularStoryTypes: StoryType[] = storyTypes.filter(type =>
  ['princess', 'unicorn', 'fairy', 'magic'].includes(type.id)
)

// Unified Story interface for the entire application
export interface Story {
  id?: string | number;
  // Story content - can be in different formats
  story?: string;
  story_text?: string;
  // Story type - can be in different formats
  storyType?: string;
  story_type?: string;
  // Custom topic - can be in different formats
  customTopic?: string | null;
  custom_topic?: string | null;
  // Creation date - can be in different formats
  createdAt?: string;
  created_at?: string;
  // Audio information
  audio?: {
    file_name: string;
  } | null;
  audioUrl?: string | null;
  audioGenerated?: boolean;
  // Favorite status
  is_favorite?: boolean | number;
  isFavorite?: boolean;
  // Additional metadata
  updatedAt?: string;
}

// Helper functions to normalize Story properties
export const normalizeStory = (story: any): Story => {
  return {
    id: story.id,
    story: story.story || story.story_text,
    story_text: story.story_text || story.story,
    storyType: story.storyType || story.story_type,
    story_type: story.story_type || story.storyType,
    customTopic: story.customTopic !== undefined ? story.customTopic : story.custom_topic,
    custom_topic: story.custom_topic !== undefined ? story.custom_topic : story.customTopic,
    createdAt: story.createdAt || story.created_at,
    created_at: story.created_at || story.createdAt,
    audio: story.audio,
    audioUrl: story.audioUrl,
    audioGenerated: story.audioGenerated,
    is_favorite: story.is_favorite,
    isFavorite: typeof story.is_favorite === 'boolean' ? story.is_favorite : Boolean(story.is_favorite),
    updatedAt: story.updatedAt,
  };
};

// Type for story creation/update
export interface CreateStoryData {
  story: string;
  storyType: string;
  customTopic?: string | null;
}

// Type for story filters
export interface StoryFilters {
  storyType?: string;
  isFavorite?: boolean;
  searchTerm?: string;
}

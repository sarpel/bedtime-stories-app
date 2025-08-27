// Enhanced Story Types with Better Categories and Prompts


export interface EnhancedStoryType {
  id: string
  name: string
  icon: string
  description: string
  prompt: string
  ageRange: {
    min: number
    max: number
  }
  difficulty: 'easy' | 'medium' | 'advanced'
  themes: string[]
  emotionalTone: 'calming' | 'exciting' | 'inspiring' | 'educational' | 'mixed'
  seasonality?: 'spring' | 'summer' | 'autumn' | 'winter' | 'all'
  culturalElements?: string[]
}


// Enhanced story types with better prompts and categorization
export const enhancedStoryTypes: EnhancedStoryType[] = [
  {
    id: 'princess',
    name: 'Prenses Masalları',
    icon: '👸',
    description: 'Güçlü prenseslerin cesur maceraları',
    prompt: 'Akıllı, cesur ve kibar bir prenses. Modern değerler, problem çözme becerileri, liderlik ve başkaları için mücadele etme',
    ageRange: { min: 4, max: 8 },
    difficulty: 'medium',
    themes: ['liderlik', 'cesaret', 'dostluk', 'adalet'],
    emotionalTone: 'inspiring',
    culturalElements: ['krallık', 'şato', 'adalet']
  },
  {
    id: 'animals',
    name: 'Hayvan Dostları',
    icon: '🐾',
    description: 'Sevimli hayvan karakterlerle dostluk hikayeleri',
    prompt: 'Konuşabilen hayvan karakterler. Dostluk, yardımlaşma, doğa sevgisi ve farklı türlerin birlikte yaşaması',
    ageRange: { min: 3, max: 7 },
    difficulty: 'easy',
    themes: ['dostluk', 'doğa sevgisi', 'farklılıklara saygı'],
    emotionalTone: 'calming',
    seasonality: 'all'
  },
  {
    id: 'space',
    name: 'Uzay Maceraları',
    icon: '🚀',
    description: 'Galaksiler arası keşifler ve uzaylı dostluklar',
    prompt: 'Uzay araştırmaları, yeni gezegenlerin keşfi, uzaylı dostlar ve bilim temalı maceralar',
    ageRange: { min: 5, max: 9 },
    difficulty: 'advanced',
    themes: ['bilim', 'keşif', 'merak', 'dostluk'],
    emotionalTone: 'exciting'
  },
  {
    id: 'underwater',
    name: 'Deniz Altı Dünyası',
    icon: '🐠',
    description: 'Okyanus derinliklerinde maceralı keşifler',
    prompt: 'Deniz altı yaşamı, deniz canlıları, çevre koruma ve su altı maceraları',
    ageRange: { min: 4, max: 8 },
    difficulty: 'medium',
    themes: ['çevre koruma', 'deniz yaşamı', 'keşif'],
    emotionalTone: 'mixed',
    culturalElements: ['okyanuslar', 'mercanlar', 'balık türleri']
  },
  {
    id: 'seasons',
    name: 'Mevsim Hikayeleri',
    icon: '🍂',
    description: 'Mevsimlerin güzellikleri ve değişimleri',
    prompt: 'Mevsimlerin özellikleri, doğa döngüleri ve mevsimsel etkinlikler',
    ageRange: { min: 3, max: 6 },
    difficulty: 'easy',
    themes: ['doğa döngüsü', 'değişim', 'gözlem'],
    emotionalTone: 'calming',
    seasonality: 'all'
  },
  {
    id: 'feelings',
    name: 'Duygularımız',
    icon: '😊',
    description: 'Duyguları tanıma ve anlama hikayeleri',
    prompt: 'Farklı duyguların tanınması, ifade edilmesi ve yönetilmesi. Empati geliştirme',
    ageRange: { min: 4, max: 7 },
    difficulty: 'medium',
    themes: ['duygusal zeka', 'empati', 'iletişim'],
    emotionalTone: 'educational'
  },
  {
    id: 'music',
    name: 'Müzikal Masallar',
    icon: '🎵',
    description: 'Müzik ve ritim dolu eğlenceli hikayeler',
    prompt: 'Müzik, şarkı söyleme, enstrümanlar ve ritim temalı masallar',
    ageRange: { min: 3, max: 8 },
    difficulty: 'easy',
    themes: ['müzik', 'yaratıcılık', 'ifade'],
    emotionalTone: 'exciting'
  },
  {
    id: 'helpers',
    name: 'Yardımcı Kahramanlar',
    icon: '🦸‍♀️',
    description: 'Günlük hayat kahramanları ve yardımlaşma',
    prompt: 'İtfaiyeci, doktor, öğretmen gibi meslek sahipleri ve topluma yardım etme',
    ageRange: { min: 4, max: 7 },
    difficulty: 'medium',
    themes: ['meslek tanıtımı', 'toplum hizmeti', 'yardımlaşma'],
    emotionalTone: 'inspiring'
  },
  {
    id: 'bedtime_special',
    name: 'Uyku Masalları',
    icon: '🌙',
    description: 'Özel uyku vakti rahatlatıcı hikayeler',
    prompt: 'Yumuşak tonlu, rahatlatıcı ve uyku getirici hikayeler. Gece temaları, rüyalar ve huzur',
    ageRange: { min: 3, max: 6 },
    difficulty: 'easy',
    themes: ['rahatlık', 'güvenlik', 'huzur'],
    emotionalTone: 'calming',
    seasonality: 'all'
  },
  {
    id: 'problem_solving',
    name: 'Problem Çözme',
    icon: '🧩',
    description: 'Akıl oyunları ve yaratıcı çözümler',
    prompt: 'Mantık, problem çözme, yaratıcı düşünme ve zeka temalı hikayeler',
    ageRange: { min: 5, max: 9 },
    difficulty: 'advanced',
    themes: ['mantık', 'yaratıcılık', 'sebep-sonuç'],
    emotionalTone: 'educational'
  }
]

// Enhanced prompt building
// Profile types removed

interface SeriesInfo {
  title: string
  description: string
  previousStories?: Array<{
    title?: string
    story_text: string
  }>
  continuity?: string
}

export const buildEnhancedPrompt = (
  storyType: string,
  customTopic: string,
  seriesInfo: SeriesInfo | null = null
): string => {
  const selectedType = enhancedStoryTypes.find(t => t.id === storyType)

  // Base prompt with personality and tone
  let basePrompt = `Sen çocuklar için masal yazan uzman bir hikayecisin. Türkçe, yaratıcı ve eğitici masallar yazıyorsun.`

  // Story type specific instructions
  if (selectedType) {
    basePrompt += `\n\nMasal türü: ${selectedType.name} - ${selectedType.description}`
    basePrompt += `\nTematik özellikler: ${selectedType.themes.join(', ')}`
    basePrompt += `\nDuygusal ton: ${selectedType.emotionalTone}`
    basePrompt += `\nYaş aralığı: ${selectedType.ageRange.min}-${selectedType.ageRange.max}`
    basePrompt += `\nÖzel prompt: ${selectedType.prompt}`
  }

  // Custom topic integration
  if (customTopic.trim()) {
    basePrompt += `\n\nÖzel konu: ${customTopic.trim()}`
  }


  // Profile-based personalization removed

  // Series information
  if (seriesInfo) {
    basePrompt += `\n\nSeri bilgisi: ${seriesInfo.title} - ${seriesInfo.description}`
    if (seriesInfo.previousStories && seriesInfo.previousStories.length > 0) {
      basePrompt += `\nÖnceki masallarla tutarlılık sağla ve karakterleri geliştir.`
    }
  }

  // Quality guidelines
  basePrompt += `\n\nMasal yazma kuralları:
1. Türkçe dilbilgisi kurallarına uygun, açık ve anlaşılır dil kullan
2. Yaş grubuna uygun kelime dağarcığı ve cümle yapısı
3. Pozitif değerler ve öğretici mesajlar içer
4. Açık ve net bir başlangıç, gelişme ve sonuç bölümü olsun
5. Karakterler çocukların özdeşim kurabileceği özellikler taşısın
6. Hayal gücünü geliştiren betimlemeler kullan
7. Diyaloglar doğal ve akıcı olsun
8. Masalın sonunda pozitif bir mesaj/öğreti olsun

Şimdi bu kriterlere uygun olarak masalı yaz:`

  return basePrompt
}


// Age-appropriate filtering
export const getAgeAppropriateTypes = (age: number): EnhancedStoryType[] => {
  return enhancedStoryTypes.filter(type => 
    age >= type.ageRange.min && age <= type.ageRange.max
  )
}

// Seasonal story suggestions
export const getSeasonalTypes = (month: number): EnhancedStoryType[] => {
  const season = 
    month >= 3 && month <= 5 ? 'spring' :
    month >= 6 && month <= 8 ? 'summer' :
    month >= 9 && month <= 11 ? 'autumn' : 'winter'

  return enhancedStoryTypes.filter(type => 
    !type.seasonality || type.seasonality === 'all' || type.seasonality === season
  )
}


// Export for backward compatibility
export const getStoryTypeById = (id: string): EnhancedStoryType | undefined => {
  return enhancedStoryTypes.find(type => type.id === id)
}

export const getStoryTypeName = (id: string): string => {
  const type = getStoryTypeById(id)
  return type ? type.name : 'Genel Masal'
}

export const getStoryTypeLabel = getStoryTypeName

export const getStoryTypePrompt = (id: string, customTopic: string = ''): string => {
  const type = getStoryTypeById(id)
  
  if (id === 'custom' && customTopic) {
    return `${customTopic} konulu özel masal`
  }

  return type ? type.prompt : 'Genel bir masal'
}

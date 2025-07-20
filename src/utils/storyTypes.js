// Masal türü tanımları ve yardımcı fonksiyonlar

export const storyTypes = [
  {
    id: 'animals',
    name: 'Hayvan Masalları',
    icon: '🐾',
    description: 'Sevimli hayvanların maceraları',
    prompt: 'Hayvanların başrol oynadığı, dostluk ve yardımlaşma temalı'
  },
  {
    id: 'princess',
    name: 'Prenses Masalları',
    icon: '👑',
    description: 'Büyülü prenses hikayeleri',
    prompt: 'Prenseslerin, büyülü krallıkların ve iyiliğin zaferi temalı'
  },
  {
    id: 'adventure',
    name: 'Macera Masalları',
    icon: '🗺️',
    description: 'Heyecan dolu keşif hikayeleri',
    prompt: 'Keşif, macera ve cesaret temalı, heyecan verici'
  },
  {
    id: 'friendship',
    name: 'Arkadaşlık Masalları',
    icon: '🤝',
    description: 'Dostluk ve paylaşım hikayeleri',
    prompt: 'Arkadaşlık, paylaşım ve yardımlaşma değerlerini öğreten'
  },
  {
    id: 'nature',
    name: 'Doğa Masalları',
    icon: '🌳',
    description: 'Doğa ve çevre bilinci hikayeleri',
    prompt: 'Doğa sevgisi, çevre bilinci ve hayvan dostluğu temalı'
  },
  {
    id: 'magic',
    name: 'Sihirli Masallar',
    icon: '✨',
    description: 'Büyülü ve fantastik hikayeler',
    prompt: 'Sihir, büyü ve fantastik öğeler içeren, hayal gücünü geliştiren'
  },
  {
    id: 'custom',
    name: 'Özel Konu',
    icon: '✏️',
    description: 'Kendi konunu seç',
    prompt: 'Kullanıcının belirttiği özel konu temalı'
  }
]

// Masal türü ID'sine göre bilgi getirme
export const getStoryTypeById = (id) => {
  return storyTypes.find(type => type.id === id) || storyTypes[0]
}

// Masal türü adını getirme
export const getStoryTypeName = (id) => {
  const type = getStoryTypeById(id)
  return type ? type.name : 'Genel Masal'
}

// Masal türü prompt'unu getirme
export const getStoryTypePrompt = (id, customTopic = '') => {
  const type = getStoryTypeById(id)
  
  if (id === 'custom' && customTopic) {
    return `${customTopic} konulu, özel bir masal`
  }
  
  return type ? type.prompt : 'Genel bir masal'
}

// Popüler masal türleri (hızlı seçim için)
export const popularStoryTypes = storyTypes.filter(type => 
  ['animals', 'princess', 'adventure', 'friendship'].includes(type.id)
)
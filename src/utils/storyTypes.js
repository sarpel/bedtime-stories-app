// Masal türü tanımları ve yardımcı fonksiyonlar

export const storyTypes = [
  {
    id: 'princess',
    name: 'Prenses Masalları',
    icon: '�',
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
    icon: '�‍♀️',
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
    icon: '�',
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
export const getStoryTypeById = (id) => {
  return storyTypes.find(type => type.id === id) || storyTypes[0]
}

// Masal türü adını getirme
export const getStoryTypeName = (id) => {
  const type = getStoryTypeById(id)
  return type ? type.name : 'Genel Masal'
}

// Masal türü label'ını getirme (aynı fonksiyon)
export const getStoryTypeLabel = (id) => {
  return getStoryTypeName(id)
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
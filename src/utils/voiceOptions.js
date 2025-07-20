// ElevenLabs ses seçenekleri

export const voiceOptions = [
  {
    id: 'xsGHrtxT5AdDzYXTQT0d',
    name: 'Sarah',
    description: 'Sıcak ve anne sesi',
    language: 'Türkçe',
    gender: 'Kadın',
    age: 'Yetişkin',
    style: 'Sakin ve rahatlatıcı'
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Genç ve enerjik',
    language: 'Türkçe',
    gender: 'Kadın',
    age: 'Genç',
    style: 'Neşeli ve canlı'
  },
  {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    description: 'Sakin ve güvenilir',
    language: 'Türkçe',
    gender: 'Erkek',
    age: 'Yetişkin',
    style: 'Sakin ve güven verici'
  },
  {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    description: 'Güçlü ve etkileyici',
    language: 'Türkçe',
    gender: 'Erkek',
    age: 'Yetişkin',
    style: 'Güçlü ve etkileyici'
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    description: 'Genç ve dinamik',
    language: 'Türkçe',
    gender: 'Erkek',
    age: 'Genç',
    style: 'Dinamik ve enerjik'
  }
]

// Varsayılan ses
export const defaultVoice = voiceOptions[0]

// Ses ID'sine göre ses bilgisi getirme
export const getVoiceById = (id) => {
  return voiceOptions.find(voice => voice.id === id) || defaultVoice
}

// Ses adına göre ses bilgisi getirme
export const getVoiceByName = (name) => {
  return voiceOptions.find(voice => voice.name === name) || defaultVoice
}

// Kategoriye göre sesleri filtreleme
export const getVoicesByGender = (gender) => {
  return voiceOptions.filter(voice => voice.gender === gender)
}

export const getVoicesByAge = (age) => {
  return voiceOptions.filter(voice => voice.age === age)
}

export const getVoicesByStyle = (style) => {
  return voiceOptions.filter(voice => voice.style.includes(style))
}
// Basit başlık üretici: hikaye metninden veya custom topic'ten kısa bir başlık türetir

// Başlangıç kalıplarını farklı yazım varyasyonlarıyla temizle
const PREFIX_PATTERNS = [
  /^bir\s+varmış\s*,?\s*bir\s+yokmuş\s*[,–-]?\s*/i,
  /^evvel\s+zaman\s+içinde\s*[,–-]?\s*/i,
  /^bir\s+zamanlar\s*[,–-]?\s*/i,
  /^uzak\s+diyarlarda\s*[,–-]?\s*/i,
  /^büyülü\s+bir\s+ormanda\s*[,–-]?\s*/i,
  /^bir\s+gün\s*[,–-]?\s*/i
]

function toTitleCaseTR(str = '') {
  return String(str)
    .toLowerCase()
    .split(/\s+/)
    .map(w => w ? w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1) : w)
    .join(' ')
}

function stripPrefixes(text = '') {
  let s = String(text).trim()
  for (const rx of PREFIX_PATTERNS) {
    if (rx.test(s)) {
      s = s.replace(rx, '')
      break
    }
  }
  return s
}

function firstSentence(text = '') {
  const s = String(text).replace(/\s+/g, ' ').trim()
  const m = s.match(/([^.!?]+[.!?])/)
  if (m) return m[1].trim()
  return s.split(/[.!?]/)[0] || s
}

function deriveFromContent(storyText = '') {
  if (!storyText) return ''
  let sentence = stripPrefixes(firstSentence(storyText))
  // Ad + "adında" kalıbından isim yakala (örn: "Elif adında küçük bir kız")
  const nameMatch = sentence.match(/([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\s+adında/)
  if (nameMatch) {
    const name = nameMatch[1]
    return `${name}'in Macerası`
  }
  // İlk 5-7 kelimeyi al, çok uzunsa kısalt
  const words = sentence.split(' ').filter(Boolean)
  const slice = words.slice(0, Math.min(7, Math.max(3, Math.floor(words.length / 2))))
  return toTitleCaseTR(slice.join(' '))
}

export function getStoryTitle(story) {
  if (!story) return ''
  const text = story.story_text || story.story || ''
  const topic = story.custom_topic || story.customTopic || ''

  // Öncelik: kullanıcı konusu mevcutsa, onu kısa başlığa çevir
  if (topic && topic.trim().length > 0) {
    // Çok uzunsa kısalt
    const t = topic.trim()
    if (t.split(' ').length <= 6) return toTitleCaseTR(`${t} Masalı`)
    return toTitleCaseTR(t.split(' ').slice(0, 6).join(' '))
  }

  // Aksi halde içerikten türet
  const fromContent = deriveFromContent(text)
  if (fromContent) return fromContent

  // Son çare: kısa varsayılan
  return 'Masal'
}

// İleri seviye: LLM ile başlık üretimi (opsiyonel, kullanılmadı)
export async function generateTitleWithLLM(storyText, fetcher) {
  if (!storyText) return ''
  const prompt = `Aşağıdaki çocuk masalı için 3-5 kelimelik, kısa ve akılda kalıcı, 5 yaşındaki Türk bir kız çocuğuna uygun bir TÜRKÇE başlık üret. SADECE başlık metnini döndür.\n\nMasal:\n${storyText}`
  try {
  const res = await fetcher('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', modelId: 'gpt-4o-mini', prompt, max_tokens: 24 })
    })
    if (!res.ok) return ''
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content || data?.text || data?.response
    return (text || '').trim().split('\n')[0].slice(0, 60)
  } catch {
    return ''
  }
}

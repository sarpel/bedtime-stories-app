import { getStoryTitle, generateTitleWithLLM } from '@/utils/titleGenerator'

const CACHE_KEY = 'title-cache-v1'

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveCache(cache: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

function makeKey(story: { id?: string | number; story_text?: string; story?: string }) {
  const id = story.id || 'noid'
  const text = (story.story_text || story.story || '').slice(0, 200)
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  return `${id}-${hash}`
}

export async function getBestTitle(story: { id?: string | number; story_text?: string; story?: string }) {
  const heuristic = getStoryTitle(story)
  const cache = loadCache()
  const key = makeKey(story)
  if (cache[key]) return cache[key]

  // Heuristik yeterliyse LLM çağırmadan dön
  if (heuristic && heuristic.length >= 8) {
    cache[key] = heuristic
    saveCache(cache)
    return heuristic
  }

  try {
    const llmTitle = await generateTitleWithLLM(story.story_text || story.story || '', fetch)
    const finalTitle = (llmTitle && llmTitle.length >= 3) ? llmTitle : heuristic
    cache[key] = finalTitle
    saveCache(cache)
    return finalTitle
  } catch {
    cache[key] = heuristic
    saveCache(cache)
    return heuristic
  }
}

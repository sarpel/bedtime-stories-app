import { getStoryTypePrompt } from '@/utils/storyTypes.js'
import { config } from './configService.js'
import { storyCache } from '@/utils/cache.js'

// LLM Service for story generation
export class LLMService {
  constructor(settings) {
    // Sabit OpenAI ayarları
    this.endpoint = config.openai.endpoint
    this.modelId = config.openai.model
    this.apiKey = config.openai.apiKey
    
    // Kullanıcı ayarları
    this.customPrompt = settings.customPrompt
    this.storyLength = settings.storyLength
    this.temperature = settings.llmSettings?.temperature || 0.9
    this.maxTokens = settings.llmSettings?.maxTokens || 500
  }

  // Get story length instructions based on setting
  getStoryLengthInstruction() {
    const lengthMap = {
      short: 'Kısa bir masal yaz (yaklaşık 1-2 dakika okuma süresi, 150-250 kelime).',
      medium: 'Orta uzunlukta bir masal yaz (yaklaşık 3-5 dakika okuma süresi, 300-500 kelime).',
      long: 'Uzun bir masal yaz (yaklaşık 5-8 dakika okuma süresi, 600-800 kelime).'
    }
    return lengthMap[this.storyLength] || lengthMap.medium
  }

  // Build the complete prompt
  buildPrompt(storyType = null, customTopic = '') {
    const lengthInstruction = this.getStoryLengthInstruction()
    
    // Masal türü bilgisini ekle
    let storyTypeText = ''
    if (storyType && storyType !== 'general') {
      if (storyType === 'custom' && customTopic) {
        storyTypeText = `\nKonu: ${customTopic}`
      } else {
        storyTypeText = `\nTür: ${getStoryTypePrompt(storyType, customTopic)}`
      }
    }
    
    return `${this.customPrompt}${storyTypeText}\n\n${lengthInstruction}\n\nMasal Türkçe olmalı ve şu özellikleri içermeli:\n- 5 yaşındaki bir kız çocuğu için uygun\n- Eğitici ve pozitif değerler içeren\n- Uyku vakti için rahatlatıcı\n- Hayal gücünü geliştiren\n\nMasalı şimdi yaz:`
  }

  // Generate story using custom LLM endpoint
  async generateStory(onProgress, storyType = null, customTopic = '') {
    try {
      // Sabit model kontrolü
      if (!this.endpoint || !this.modelId) {
        throw new Error('OpenAI ayarları eksik. Lütfen .env dosyasını kontrol edin.')
      }

      // Önbellekten kontrol et
      const cachedStory = storyCache.getStory(storyType, customTopic, {
        llmSettings: { temperature: this.temperature, maxTokens: this.maxTokens },
        customPrompt: this.customPrompt
      })
      
      if (cachedStory) {
        onProgress?.(100)
        return cachedStory
      }

      onProgress?.(10)

      const prompt = this.buildPrompt(storyType, customTopic)
      onProgress?.(30)

      // İstek artık kendi backend sunucumuza (localhost:3001) yapılıyor
      const response = await fetch('http://localhost:3001/api/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Backend'e gerekli tüm bilgileri gönderiyoruz
        body: JSON.stringify({
          endpoint: this.endpoint,
          modelId: this.modelId,
          prompt: prompt,
          max_tokens: this.getMaxTokens()
        })
      })

      onProgress?.(70)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`LLM API hatası (${response.status}): ${errorData.error}`)
      }

      const data = await response.json()
      onProgress?.(90)

      const story = this.extractStoryFromResponse(data)
      onProgress?.(100)
      
      // Önbellekle
      storyCache.setStory(storyType, customTopic, {
        llmSettings: { temperature: this.temperature, maxTokens: this.maxTokens },
        customPrompt: this.customPrompt
      }, story)
      
      return story

    } catch (error) {
      console.error('LLM story generation error:', error)
      throw error
    }
  }

  // Prepare request body for different LLM providers
  prepareRequestBody(prompt) {
    // OpenAI/Compatible format
    if (this.endpoint.includes('chat/completions') || this.endpoint.includes('v1/chat')) {
      return {
        model: this.modelId,
        messages: [
          {
            role: 'system',
            content: '5 yaşındaki bir türk kız çocuğu için uyku vaktinde okunmak üzere, uyku getirici ve kazanması istenen temel erdemleri de ders niteliğinde hikayelere iliştirecek şekilde masal yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.getMaxTokens(),
        temperature: this.temperature,
        top_p: 0.9
      }
    }
    
    // Claude/Anthropic format
    if (this.endpoint.includes('anthropic') || this.endpoint.includes('claude')) {
      return {
        model: this.modelId,
        max_tokens: this.getMaxTokens(),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9
      }
    }

    // Generic/Custom format
    return {
      model: this.modelId,
      prompt: prompt,
      max_tokens: this.getMaxTokens(),
      temperature: 0.9,
      top_p: 0.9
    }
  }

  // Get max tokens based on story length
  getMaxTokens() {
    return this.maxTokens
  }

  // Extract story from different response formats
  extractStoryFromResponse(data) {
    // OpenAI format
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim()
    }
    
    // Claude format
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text.trim()
    }
    
    // Generic completion format
    if (data.choices && data.choices[0] && data.choices[0].text) {
      return data.choices[0].text.trim()
    }
    
    // Direct text response
    if (typeof data === 'string') {
      return data.trim()
    }
    
    // Custom response format
    if (data.response) {
      return data.response.trim()
    }
    
    if (data.text) {
      return data.text.trim()
    }
    
    if (data.output) {
      return data.output.trim()
    }

    throw new Error('LLM yanıtından masal metni çıkarılamadı. API yanıt formatını kontrol edin.')
  }

  // Generate a fallback story if API fails
  generateFallbackStory() {
    const fallbackStories = [
      `Bir zamanlar, çok uzak bir ülkede, Ayşe adında çok akıllı ve cesur bir kız yaşarmış. Ayşe, her gece yıldızlara bakarak büyük hayaller kurarmış.

Bir gece, en parlak yıldız ona şöyle demiş: "Ayşe, sen çok iyi kalpli bir çocuksun. Bu gece sana özel bir hediye vereceğim."

Yıldız, Ayşe'ye sihirli bir kutu vermiş. Kutuyu açtığında içinden binlerce küçük ışık çıkmış ve odayı aydınlatmış. Bu ışıklar, dünyadaki tüm çocukların mutlu rüyalar görmesini sağlarmış.

Ayşe o geceden sonra her gece bu sihirli kutuyu açar, tüm dünyaya sevgi ve mutluluk gönderirmiş. Ve sen de şimdi gözlerini kapatıp bu güzel ışıkları hayal edebilirsin.

İyi geceler, tatlı rüyalar...`,

      `Bir zamanlar, büyülü bir ormanda, Elif adında küçük bir kız yaşarmış. Elif, hayvanlarla konuşabilen özel bir yeteneği olan çok nazik bir çocukmuş.

Bir gün, ormandaki tüm hayvanlar üzgün görünüyormuş. Elif onlara ne olduğunu sormuş. Tavşan şöyle demiş: "Ormanımızın sihirli çiçeği kayboldu. Bu çiçek olmadan ormanda huzur olmaz."

Elif, arkadaşlarına yardım etmek için çiçeği aramaya başlamış. Günlerce aradıktan sonra, çiçeği küçük bir mağarada bulmuş. Ama çiçek çok solgunmuş.

Elif, çiçeğe sevgiyle bakmış ve ona güzel şarkılar söylemiş. Sevgisi sayesinde çiçek tekrar canlanmış ve orman yeniden huzurlu olmuş.

O günden sonra Elif, sevginin her şeyi iyileştirebileceğini öğrenmiş. Sen de sevginle dünyayı daha güzel yapabilirsin.

İyi geceler, tatlı rüyalar...`
    ]

    return fallbackStories[Math.floor(Math.random() * fallbackStories.length)]
  }
}


import { getStoryTypePrompt } from '@/utils/storyTypes.js'
import { config } from './configService.js'
import { storyCache } from '@/utils/cache.js'
import { logger } from '@/utils/logger.js'

// LLM Service for story generation
export class LLMService {
  constructor(settings) {
    this.provider = settings.llmProvider || 'openai'

    if (this.provider === 'openai') {
      // OpenAI ayarları
      this.endpoint = settings.openaiLLM?.endpoint || settings.llmEndpoint || config.openai.endpoint
      this.modelId = settings.openaiLLM?.modelId || settings.llmModelId || config.openai.model
      this.apiKey = settings.openaiLLM?.apiKey || settings.llmApiKey || config.openai.apiKey
    } else if (this.provider === 'gemini') {
      // Gemini ayarları
      this.endpoint = settings.geminiLLM?.endpoint || config.geminiLLM.endpoint
      this.modelId = settings.geminiLLM?.modelId || config.geminiLLM.model
      this.apiKey = settings.geminiLLM?.apiKey || config.geminiLLM.apiKey
    }

    // Kullanıcı ayarları
    this.customPrompt = settings.customPrompt
    this.customInstructions = settings.customInstructions || ''
    this.storyLength = settings.storyLength
    this.temperature = settings.llmSettings?.temperature ?? 0.9
    // Yanıtların kısalmaması için maxTokens sabit 5000
    this.maxTokens = 5000

    // Aktif profil bilgisi
    this.activeProfile = settings.activeProfile || null

    // Debug: init logs (kimlik bilgisi ve tam prompt loglama yok)
    try {
      logger.debug('LLM Service initialized', 'LLMService', {
        provider: this.provider,
        modelId: this.modelId,
        endpoint: (this.endpoint || '').toString(),
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        storyLength: this.storyLength,
        hasCustomPrompt: !!this.customPrompt,
        customPromptLen: this.customPrompt?.length || 0,
        hasCustomInstructions: !!this.customInstructions,
        customInstructionsLen: this.customInstructions?.length || 0,
        hasActiveProfile: !!this.activeProfile
      })
    } catch (initErr) {
      // Init logging failed; safe to ignore in production
      logger.debug('LLM Service init log error', 'LLMService', { error: initErr?.message })
    }
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

  // Get audience info based on active profile
  getAudience() {
    if (!this.activeProfile) {
      return {
        audienceLine: 'bir çocuk için uygun',
        profileInfo: '',
        systemPrompt: 'bir çocuk için uyku vaktinde okunmak üzere, uyku getirici ve temel erdemleri ders niteliğinde anlatan masallar yaz. Masallar eğitici, sevgi dolu ve rahatlatıcı olsun.'
      }
    }

    const { name, age, gender, custom_prompt } = this.activeProfile
    const genderText = gender === 'girl' ? 'kız' : gender === 'boy' ? 'erkek' : 'çocuk'
    const audienceLine = `${age} yaşındaki bir ${genderText} çocuğu için uygun`

    let profileInfo = `\nBu masal ${name} adlı ${age} yaşındaki ${genderText} için yazılıyor.`
    if (custom_prompt) {
      profileInfo += `\nÖzel istekler: ${custom_prompt}`
    }

    const systemPrompt = `${age} yaşındaki bir ${genderText} çocuğu için uyku vaktinde okunmak üzere, uyku getirici ve kazanması istenen temel erdemleri de ders niteliğinde hikayelere iliştirecek şekilde masal yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.`

    return { audienceLine, profileInfo, systemPrompt }
  }

  // Build the complete prompt
  buildPrompt(storyType = null, customTopic = '') {
    const lengthInstruction = this.getStoryLengthInstruction()
    const { audienceLine, profileInfo } = this.getAudience()

    // Masal türü bilgisini ekle
    let storyTypeText = ''
    if (storyType && storyType !== 'general') {
      if (storyType === 'custom' && customTopic) {
        storyTypeText = `\nKonu: ${customTopic}`
      } else {
        storyTypeText = `\nTür: ${getStoryTypePrompt(storyType, customTopic)}`
      }
    }

    const extraInstructions = (this.customInstructions?.trim())
      ? `\n\nEk talimatlar:\n${this.customInstructions.trim()}`
      : ''

    const prompt = `${this.customPrompt}${profileInfo}${storyTypeText}\n\n${lengthInstruction}\n\nMasal Türkçe olmalı ve şu özellikleri içermeli:\n- ${audienceLine}\n- Eğitici ve pozitif değerler içeren\n- Uyku vakti için rahatlatıcı\n- Hayal gücünü geliştiren${extraInstructions}\n\nMasalı şimdi yaz:`
    console.log('[LLMService:buildPrompt]', {
      storyType,
      customTopic,
      hasActiveProfile: !!this.activeProfile,
      promptLen: prompt.length
    })
    return prompt
  }

  // Generate story using custom LLM endpoint
  async generateStory(onProgress, storyType = null, customTopic = '') {
    try {
      // Model kontrolü
      if (!this.modelId) {
        throw new Error('LLM ayarları eksik. Lütfen model bilgisini kontrol edin.')
      }

      // Önbellekten kontrol et
      const cacheKeyMeta = {
        llmSettings: { temperature: this.temperature, maxTokens: this.maxTokens },
        customPrompt: this.customPrompt
      }
      const cachedStory = storyCache.getStory(storyType, customTopic, cacheKeyMeta)

      if (cachedStory) {
        console.log('[LLMService:cacheHit]', {
          storyType,
          customTopic,
          length: cachedStory.length
        })
        onProgress?.(100)
        return cachedStory
      }

      onProgress?.(10)

      const prompt = this.buildPrompt(storyType, customTopic)
      onProgress?.(30)

      // İstek backend proxy'imize yönlendirilir (aynı origin, dev'de Vite proxy)
      const url = `/api/llm`
      const payload = {
        provider: this.provider,
        modelId: this.modelId,
        prompt: prompt,
        max_output_tokens: this.getMaxTokens(),
        temperature: this.temperature
      }
      console.log('[LLMService:request:start]', {
        url,
        provider: this.provider,
        modelId: this.modelId,
        promptLen: prompt.length,
        max_output_tokens: payload.max_output_tokens,
        temperature: payload.temperature
      })
      const t0 = Date.now()
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Backend'e gerekli tüm bilgileri gönderiyoruz
        body: JSON.stringify(payload)
      })

      onProgress?.(70)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'non-json-response' }))
        console.error('[LLMService:request:error]', {
          status: response.status,
          statusText: response.statusText,
          error: errorData?.error
        })
        throw new Error(`LLM API hatası (${response.status}): ${errorData.error}`)
      }

      const data = await response.json()
      const dt = Date.now() - t0
      console.log('[LLMService:request:success]', {
        status: response.status,
        durationMs: dt,
        keys: Object.keys(data || {}),
        textLen: typeof data?.text === 'string' ? data.text.length : undefined
      })
      onProgress?.(90)

      // Backend normalize edilmiş text döndürüyorsa onu kullan
      const story = (typeof data?.text === 'string' && data.text.trim())
        ? data.text.trim()
        : this.extractStoryFromResponse(data)
      console.log('[LLMService:extract]', {
        extractedLen: story?.length || 0,
        isString: typeof story === 'string'
      })
      onProgress?.(100)

      // Önbellekle
      storyCache.setStory(storyType, customTopic, cacheKeyMeta, story)
      console.log('[LLMService:cacheSet]', {
        storyType,
        customTopic,
        length: story.length
      })

      return story

    } catch (error) {
      console.error('[LLMService:error]', { message: error.message })
      throw error
    }
  }

  // Prepare request body for different LLM providers
  prepareRequestBody(prompt) {
    // OpenAI Responses API format (güncellendi)
    if (this.endpoint.includes('responses') || this.endpoint.includes('/api/llm')) {
      return {
        model: this.modelId,
        input: prompt,
        max_output_tokens: this.getMaxTokens(),
        temperature: this.temperature
      }
    }

    // Legacy OpenAI Chat format (backward compatibility)
    if (this.endpoint.includes('chat/completions') || this.endpoint.includes('v1/chat')) {
      const { systemPrompt } = this.getAudience()
      return {
        model: this.modelId,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: this.getMaxTokens(),
        temperature: this.temperature,
        top_p: 0.9
      }
    }

    // Claude/Anthropic format
    if (this.endpoint.includes('anthropic') || this.endpoint.includes('claude')) {
      return {
        model: this.modelId,
        max_completion_tokens: this.getMaxTokens(),
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
      max_completion_tokens: this.getMaxTokens(),
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
    // OpenAI Responses API format (yeni) - output bir array olabilir
    if (data?.output) {
      if (Array.isArray(data.output) && data.output.length > 0) {
        // output array'inde text content'i ara
        const textContent = data.output.find(item =>
          item?.type === 'text' || typeof item === 'string' || item?.content
        );
        if (textContent) {
          return (textContent.content || textContent.text || textContent || '').toString().trim();
        }
        // Fallback: ilk elemanı string olarak al
        return (data.output[0]?.content || data.output[0]?.text || data.output[0] || '').toString().trim();
      } else if (typeof data.output === 'string') {
        return data.output.trim();
      }
    }

    // Gemini format (candidates[].content.parts[].text)
    if (data && Array.isArray(data.candidates) && data.candidates.length > 0) {
      const first = data.candidates[0]
      // Some SDKs expose output_text directly
      if (typeof first.output_text === 'string' && first.output_text.trim()) {
        return first.output_text.trim()
      }
      const parts = first.content && Array.isArray(first.content.parts) ? first.content.parts : []
      if (parts.length) {
        const joined = parts
          .map(p => (typeof p === 'string' ? p : (p?.text || '')))
          .join('')
          .trim()
        if (joined) return joined
      }
    }

    // Legacy OpenAI Chat format
    if (data?.choices?.[0]?.message) {
      return data.choices[0].message.content.trim()
    }

    // Claude format
    if (data?.content?.[0]?.text) {
      return data.content[0].text.trim()
    }

    // Generic completion format
    if (data?.choices?.[0]?.text) {
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
  generateFallbackStory(seed = '') {
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

İyi geceler, tatlı rüyalar...`,
      `Bir zamanlar, deniz kıyısında yaşayan Zeynep, dalgaların fısıltılarını dinlemeyi çok severmiş. Bir gece, deniz kabuğunun içinden minik bir peri çıkmış ve "Cesaretle paylaştığın her iyilik, büyüyüp sana döner" demiş. Zeynep o günden sonra herkesle sevgi dolu hikayeler paylaşmış. İyi geceler, tatlı rüyalar...`,
      `Bir zamanlar, yıldızların altında kamp yapan küçük Defne, gökyüzündeki takımyıldızları sayarken uykuya dalmış. Rüyasında bir kuyruklu yıldız ona “Merak ettiğin her şeyin cevabı, sabırlı kalbinde saklı” demiş. Defne sabırla çalışmayı öğrenmiş. İyi geceler, tatlı rüyalar...`,
      `Bir zamanlar, yeşil bir tepenin ardında yaşayan Nazlı, her gün minik bir ağacı sulayıp onunla konuşurmuş. Ağaç büyüdükçe gölgesi herkesi serinletmiş. Nazlı, emek verince güzelliklerin çoğaldığını anlamış. İyi geceler, tatlı rüyalar...`
    ];

    // Basit tohumlama: storyType/customTopic metnini kullanarak deterministik/dağıtık seçim
    const hash = Array.from(String(seed)).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 9973, 7);
    const idx = (hash + Math.floor(Math.random() * 1000)) % fallbackStories.length;
    return fallbackStories[idx]
  }
}

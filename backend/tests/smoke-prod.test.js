const request = require('supertest')
const fs = require('fs')
const path = require('path')
const axios = require('axios')

jest.setTimeout(15000)

jest.mock('axios')

describe('Production smoke test', () => {
  let app
  let testStoryIds = [] // Track created test stories for cleanup
  beforeAll(() => {
    process.env.NODE_ENV = 'production'
    delete require.cache[require.resolve('../server')]
    app = require('../server')
  })
  
  afterEach(async () => {
    // Clean up test stories after each test
    const storyDb = require('../database/db')
    for (const storyId of testStoryIds) {
      try {
        storyDb.deleteStory(storyId)
        console.log(`Cleaned up test story ID: ${storyId}`)
      } catch (error) {
        console.warn(`Failed to clean up test story ${storyId}:`, error.message)
      }
    }
    testStoryIds = [] // Reset array
  })

  test('create story → tts stream → audio saved & static served', async () => {
    // 1) Create story
    const createRes = await request(app)
      .post('/api/stories')
      .send({
        storyText: 'Kısa bir test masalı metni burada. Bu metin en az 50 karakter olmalı ki valid olsun. Ek kelimeler.',
        storyType: 'test',
        customTopic: ''
      })
    expect(createRes.status).toBe(201)
    const storyId = createRes.body.id
    expect(storyId).toBeGreaterThan(0)
    testStoryIds.push(storyId) // Track for cleanup

    // 2) Mock ElevenLabs stream and call TTS
    process.env.ELEVENLABS_API_KEY = 'key'
    const { Readable } = require('stream')
    const audioData = Buffer.from('audio')
    const mockStream = Readable.from(audioData)
    axios.post.mockResolvedValue({ data: mockStream, status: 200, headers: {} })

    const ttsRes = await request(app)
      .post('/api/tts')
      .send({ provider: 'elevenlabs', voiceId: 'xsGHrtxT5AdDzYXTQT0d', requestBody: { text: 'Merhaba' }, storyId })
    expect(ttsRes.status).toBe(200)
    expect(ttsRes.headers['content-type']).toBe('audio/mpeg')

    // 3) Verify DB returns story with audio and static file exists
    const storyRes = await request(app).get(`/api/stories/${storyId}`)
    expect(storyRes.status).toBe(200)
    const fileName = storyRes.body.audio?.file_name
    expect(typeof fileName).toBe('string')

    const audioPath = path.join(__dirname, '..', 'audio', fileName)
    expect(fs.existsSync(audioPath)).toBe(true)

    const staticHead = await request(app).head(`/audio/${fileName}`)
    expect(staticHead.status).toBe(200)
    expect(staticHead.headers['content-type']).toBe('audio/mpeg')
  })
})

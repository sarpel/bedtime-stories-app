const request = require('supertest');
const axios = require('axios');
const { Readable } = require('stream');

jest.mock('axios');

describe('API endpoints', () => {
  let app;
  let testStoryIds = []; // Track created test stories for cleanup

  const loadApp = () => {
    delete require.cache[require.resolve('../server')];
    return require('../server');
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Clean up test stories after each test
    const storyDb = require('../database/db');
    for (const storyId of testStoryIds) {
      try {
        storyDb.deleteStory(storyId);
        console.log(`Cleaned up test story ID: ${storyId}`);
      } catch (error) {
        console.warn(`Failed to clean up test story ${storyId}:`, error.message);
      }
    }
    testStoryIds = []; // Reset array
  });

  describe('/api/llm', () => {
    test('missing API key returns 500', async () => {
      delete process.env.OPENAI_API_KEY;
      app = loadApp();
      const res = await request(app)
        .post('/api/llm')
        .send({ provider: 'openai', modelId: 'gpt-4o-mini', prompt: 'p', max_completion_tokens: 5 });
      expect(res.status).toBe(500);
    });

    test('forwards successful response', async () => {
      process.env.OPENAI_API_KEY = 'key';
      // Mock OpenAI Responses API format
      axios.post.mockResolvedValue({
        data: {
          output: [{
            type: 'message',
            content: [{
              type: 'output_text',
              text: 'This is a test bedtime story for a 5-year-old child.'
            }]
          }],
          usage: { total_tokens: 50 },
          model: 'gpt-4o-mini',
          id: 'test-id'
        }
      });
      app = loadApp();
      const res = await request(app)
        .post('/api/llm')
        .send({ provider: 'openai', modelId: 'gpt-4o-mini', prompt: 'p', max_completion_tokens: 5 });
      expect(axios.post).toHaveBeenCalled();
      expect(res.status).toBe(200);
      // Check transformed response format
      expect(res.body.text).toBe('This is a test bedtime story for a 5-year-old child.');
    });

    test('allows custom provider with client-provided endpoint', async () => {
      const longStoryText = 'Bu çok uzun bir masal metni. Bir varmış bir yokmuş, evvel zaman içinde kalbur saman içinde...';
      axios.post.mockResolvedValue({ data: { text: longStoryText } });
      app = loadApp();
      const res = await request(app)
        .post('/api/llm')
        .send({ provider: 'custom', modelId: 'x-model', prompt: 'p', endpoint: 'http://localhost/fake' });
      expect(axios.post).toHaveBeenCalledWith('http://localhost/fake', expect.any(Object), expect.any(Object));
      expect(res.status).toBe(200);
      expect(res.body.text).toBe(longStoryText);
    });
  });

  describe('/api/tts', () => {
    test('missing API key returns 500', async () => {
      delete process.env.ELEVENLABS_API_KEY;
      app = loadApp();
      const res = await request(app)
        .post('/api/tts')
        .send({ provider: 'elevenlabs', voiceId: 'test', requestBody: { text: 'merhaba' } });
      expect(res.status).toBe(500);
    });

    test('forwards audio stream', async () => {
      process.env.ELEVENLABS_API_KEY = 'key';
      const mockStream = Readable.from(['audio']);
      axios.post.mockResolvedValue({ data: mockStream, status: 200, headers: {} });
      app = loadApp();
      const res = await request(app)
        .post('/api/tts')
        .send({ provider: 'elevenlabs', voiceId: 'test', requestBody: { text: 'merhaba' } });
      expect(axios.post).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('audio/mpeg');
      const body = res.text || res.body.toString();
      expect(body).toBe('audio');
    });

    test('allows custom TTS provider with client-provided endpoint', async () => {
      const mockStream = Readable.from(['audio2']);
      axios.post.mockResolvedValue({ data: mockStream, status: 200, headers: {} });
      app = loadApp();
      const res = await request(app)
        .post('/api/tts')
        .send({ provider: 'mytts', voiceId: 'v', modelId: 'm', requestBody: { text: 'merhaba' }, endpoint: 'http://localhost/tts' });
      expect(axios.post).toHaveBeenCalledWith('http://localhost/tts', expect.any(Object), expect.objectContaining({ responseType: 'stream' }));
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('audio/mpeg');
      const body = res.text || res.body.toString();
      expect(body).toBe('audio2');
    });
  });
});

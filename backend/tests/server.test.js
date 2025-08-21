const request = require('supertest');
const axios = require('axios');
const { Readable } = require('stream');

jest.mock('axios');

describe('API endpoints', () => {
  let app;

  const loadApp = () => {
    delete require.cache[require.resolve('../server')];
    return require('../server');
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
      axios.post.mockResolvedValue({ data: { ok: true } });
      app = loadApp();
      const res = await request(app)
        .post('/api/llm')
        .send({ provider: 'openai', modelId: 'gpt-4o-mini', prompt: 'p', max_completion_tokens: 5 });
      expect(axios.post).toHaveBeenCalled();
      expect(res.status).toBe(200);
      // Sunucu ham yanıtı olduğu gibi iletir
      expect(res.body.ok).toBe(true);
    });

    test('allows custom provider with client-provided endpoint', async () => {
      axios.post.mockResolvedValue({ data: { text: 'masal metni' } });
      app = loadApp();
      const res = await request(app)
        .post('/api/llm')
        .send({ provider: 'custom', modelId: 'x-model', prompt: 'p', endpoint: 'http://localhost/fake' });
      expect(axios.post).toHaveBeenCalledWith('http://localhost/fake', expect.any(Object), expect.any(Object));
      expect(res.status).toBe(200);
      expect(res.body.text).toBe('masal metni');
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

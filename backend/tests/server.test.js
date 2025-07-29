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
        .send({ endpoint: 'http://llm', modelId: 'm', prompt: 'p', max_tokens: 5 });
      expect(res.status).toBe(500);
    });

    test('forwards successful response', async () => {
      process.env.OPENAI_API_KEY = 'key';
      axios.post.mockResolvedValue({ data: { ok: true } });
      app = loadApp();
      const res = await request(app)
        .post('/api/llm')
        .send({ endpoint: 'http://llm', modelId: 'm', prompt: 'p', max_tokens: 5 });
      expect(axios.post).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('/api/tts', () => {
    test('missing API key returns 500', async () => {
      delete process.env.ELEVENLABS_API_KEY;
      app = loadApp();
      const res = await request(app)
        .post('/api/tts')
        .send({ endpoint: 'http://tts', requestBody: {} });
      expect(res.status).toBe(500);
    });

    test('forwards audio stream', async () => {
      process.env.ELEVENLABS_API_KEY = 'key';
      const mockStream = Readable.from(['audio']);
      axios.post.mockResolvedValue({ data: mockStream, status: 200, headers: {} });
      app = loadApp();
      const res = await request(app)
        .post('/api/tts')
        .send({ endpoint: 'http://tts', requestBody: {} });
      expect(axios.post).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('audio/mpeg');
      const body = res.text || res.body.toString();
      expect(body).toBe('audio');
    });
  });
});

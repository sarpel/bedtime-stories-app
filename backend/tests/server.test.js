const request = require('supertest');
const axios = require('axios');
const app = require('../server');
const { Readable } = require('stream');

jest.mock('axios');

describe('API endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/llm should forward request', async () => {
    axios.post.mockResolvedValue({
      data: { text: 'This is a sufficiently long story about a cat that lives in a hat.' },
    });

    const response = await request(app)
      .post('/api/llm')
      .send({
        provider: 'generic',
        endpoint: 'http://fake-llm-provider.com',
        prompt: 'tell me a story',
      });

    expect(response.status).toBe(200);
    expect(response.body.text).toBe('This is a sufficiently long story about a cat that lives in a hat.');
    expect(axios.post).toHaveBeenCalledWith(
      'http://fake-llm-provider.com',
      expect.any(Object),
      expect.any(Object)
    );
  });

  test('POST /api/tts should forward request and stream response', async () => {
    const mockStream = new Readable();
    mockStream.push('fake audio data');
    mockStream.push(null);

    axios.post.mockResolvedValue({
      data: mockStream,
      status: 200,
      headers: { 'content-type': 'audio/mpeg' },
    });

    const response = await request(app)
      .post('/api/tts')
      .send({
        provider: 'elevenlabs',
        requestBody: { text: 'hello world' },
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('audio/mpeg');
    expect(response.body.toString()).toBe('fake audio data');
  });
});

const request = require('supertest');
const path = require('path');

// Test veritabanı izole etmek için env ayarla (aynı process içinde require öncesi)
process.env.STORIES_DB_PATH = path.join(__dirname, 'test-stories.db');
process.env.AUDIO_DIR_PATH = path.join(__dirname, 'audio-test');
process.env.OPENAI_API_KEY = 'DUMMY';
process.env.ELEVENLABS_API_KEY = 'DUMMY';
process.env.OPENAI_MODEL = 'gpt-4o-mini';
process.env.OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';

// OpenAI / dış çağrıları mockla
jest.mock('axios', () => ({
    post: jest.fn((url, body) => {
        if (url.includes('/responses')) {
            return Promise.resolve({ data: { output: [{ type: 'message', content: [{ type: 'output_text', text: 'Bu bir test masalıdır. Uzuuun ve yeterince içerik içeren güvenli masal metni.' }] }], model: 'gpt-4o-mini', id: 'test' } });
        }
        if (url.includes('chat/completions')) {
            return Promise.resolve({ data: { choices: [{ message: { content: 'Test masalı içerik cümleleri burada. Yeterli uzunlukta bir masal metni.' } }] } });
        }
        return Promise.resolve({ data: {} });
    })
}));

const app = require('../server.ts');

describe('Backend basic endpoints', () => {
    it('GET /health returns healthy payload', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status');
    });

    it('POST /api/stories creates a story', async () => {
        const storyText = 'Bir zamanlar küçük bir test tavşanı vardı ve uzun bir masal anlatılır... '.repeat(2);
        const res = await request(app)
            .post('/api/stories')
            .send({ storyText, storyType: 'test_type' });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.story_text).toContain('test tavşanı');
    });

    it('Validates short story rejection', async () => {
        const res = await request(app)
            .post('/api/stories')
            .send({ storyText: 'kısa', storyType: 'x' });
        expect(res.status).toBe(400);
    });
});

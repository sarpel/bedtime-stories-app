// Tests for /health endpoint basic behavior (without hitting external APIs)
const http = require('http');
const path = require('path');

// Provide minimal env so server starts
process.env.OPENAI_API_KEY = 'x';
process.env.OPENAI_MODEL = 'gpt-test';
process.env.OPENAI_ENDPOINT = 'https://api.openai.test/v1/chat/completions';
process.env.ELEVENLABS_API_KEY = 'y';
process.env.ELEVENLABS_VOICE_ID = 'voice';
process.env.ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.test/v1/text-to-speech';
process.env.GEMINI_LLM_MODEL = 'gem-llm';
process.env.GEMINI_LLM_ENDPOINT = 'https://gemini.test/llm';
process.env.GEMINI_TTS_MODEL = 'gem-tts';
process.env.GEMINI_TTS_ENDPOINT = 'https://gemini.test/tts';

const app = require('../backend/server');

/**
 * @param {boolean} cond
 * @param {string} [msg]
 */
function assert(cond, msg){ if(!cond) throw new Error(msg || 'Assertion failed'); }

exports.health_ok = () => new Promise((resolve, reject) => {
  const server = app.listen(0, () => {
    const port = server.address().port;
    http.get({ hostname: '127.0.0.1', port, path: '/health', timeout: 2000 }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          assert(res.statusCode === 200 || res.statusCode === 503, 'Status 200 veya 503 olmalı');
          const json = JSON.parse(data);
          assert(json.status, 'status alanı olmalı');
          assert(json.services && json.services.database, 'services.database olmalı');
          server.close();
          resolve();
        } catch(e){ server.close(); reject(e); }
      });
    }).on('error', err => { server.close(); reject(err); });
  });
});

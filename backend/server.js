// server.js

// .env dosyasındaki gizli bilgileri process.env'ye yükler
require('dotenv').config();

// Gerekli paketleri import et
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Express uygulamasını oluştur
const app = express();
const PORT = 3001; // Backend'in çalışacağı port (frontend ile karışmaması için 3001 seçildi)

// Frontend'den gelen JSON verilerini okuyabilmek için middleware
app.use(express.json());

// Sadece bizim Vite sunucumuzdan (http://localhost:5173) gelen isteklere izin ver.
// Bu, başkalarının sizin backend'inizi kullanmasını engeller.
app.use(cors({ origin: 'http://localhost:5173' }));

// --- LLM İSTEKLERİ İÇİN ENDPOINT ---
app.post('/api/llm', async (req, res) => {
  // Frontend'den gelen ayarları ve prompt'u al
  const { endpoint, modelId, prompt, max_tokens } = req.body;
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'LLM API anahtarı sunucuda tanımlanmamış.' });
  }

  // llmService.js'deki prepareRequestBody fonksiyonuna benzer bir yapı
  const requestBody = {
    model: modelId,
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
    max_tokens: max_tokens,
    temperature: 1.0
  };

  try {
    // Axios ile LLM API'sine isteği gönder
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Gelen cevabı doğrudan frontend'e geri gönder
    res.json(response.data);
  } catch (error) {
    console.error('LLM API Hatası:', error.response ? error.response.data : error.message);
    res.status(error.response?.status || 500).json({ error: 'LLM API\'sine istek gönderilirken hata oluştu.' });
  }
});


// --- TTS İSTEKLERİ İÇİN ENDPOINT ---
app.post('/api/tts', async (req, res) => {
  // Frontend'den gelen ayarları ve metni al
  const { endpoint, requestBody } = req.body;
  const apiKey = process.env.TTS_API_KEY;

  console.log('TTS Request received:', { endpoint, hasApiKey: !!apiKey });

  if (!apiKey) {
    console.error('TTS API key missing from environment variables');
    return res.status(500).json({ error: 'TTS API anahtarı sunucuda tanımlanmamış.' });
  }

  try {
    console.log('Sending request to ElevenLabs:', { endpoint, requestBody });
    
    // Axios ile TTS API'sine isteği gönder.
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        // --- DEĞİŞİKLİK BURADA ---
        // 'Authorization' başlığını sildik ve ElevenLabs'in istediği
        // 'xi-api-key' başlığını ekledik.
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    console.log('ElevenLabs response received:', { 
      status: response.status, 
      headers: response.headers,
      hasData: !!response.data 
    });

    // Gelen ses verisini (stream) doğrudan frontend'e geri gönderiyoruz
    res.setHeader('Content-Type', 'audio/mpeg');
    
    // Stream error handling
    response.data.on('error', (streamError) => {
      console.error('Stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Audio stream error: ' + streamError.message });
      }
    });
    
    response.data.on('end', () => {
      console.log('Audio stream completed successfully');
    });
    
    response.data.pipe(res);

  } catch (error) {
    console.error('TTS API Hatası:', error.response ? error.response.data.detail || error.response.data : error.message);
    const errorDetail = error.response?.data?.detail || { error: "TTS API'sine istek gönderilirken hata oluştu." };
    res.status(error.response?.status || 500).json(errorDetail);
  }
});


// Sunucuyu belirtilen port'ta dinlemeye başla
app.listen(PORT, () => {
  console.log(`Backend proxy sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});
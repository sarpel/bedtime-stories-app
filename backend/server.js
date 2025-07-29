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
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API anahtarı sunucuda tanımlanmamış.' });
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
  const apiKey = process.env.ELEVENLABS_API_KEY;

  console.log('TTS Request received:', { 
    endpoint, 
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none'
  });

  if (!apiKey) {
    console.error('ElevenLabs API key missing from environment variables');
    return res.status(500).json({ error: 'ElevenLabs API anahtarı sunucuda tanımlanmamış.' });
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
    console.error('TTS API Hatası:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      endpoint: endpoint,
      hasApiKey: !!apiKey
    });
    
    let errorMessage = "TTS API'sine istek gönderilirken hata oluştu.";
    
    if (error.response?.status === 401) {
      errorMessage = "ElevenLabs API anahtarı geçersiz. Lütfen .env dosyasındaki ELEVENLABS_API_KEY değerini kontrol edin.";
    } else if (error.response?.status === 400) {
      errorMessage = "ElevenLabs API isteği hatalı. Lütfen metin ve ses ayarlarını kontrol edin.";
    } else if (error.response?.data?.detail) {
      errorMessage = `ElevenLabs API Hatası: ${error.response.data.detail}`;
    }
    
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});


// Sunucuyu belirtilen port'ta dinlemeye başla
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `Backend proxy sunucusu http://localhost:${PORT} adresinde çalışıyor`
    );
  });
}

module.exports = app;
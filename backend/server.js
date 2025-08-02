// server.js

// .env dosyasındaki gizli bilgileri process.env'ye yükler
require('dotenv').config();

// Gerekli paketleri import et
const express = require('express');
const axios = require('axios');
const cors = require('cors');
// const multer = require('multer'); // Şu anda kullanılmıyor
const fs = require('fs');
const path = require('path');

// Veritabanı modülü
const storyDb = require('./database/db');

// Express uygulamasını oluştur
const app = express();
const PORT = 3001; // Backend'in çalışacağı port (frontend ile karışmaması için 3001 seçildi)

// Frontend'den gelen JSON verilerini okuyabilmek için middleware
app.use(express.json());

// Sadece bizim Vite sunucumuzdan (http://localhost:5173) gelen isteklere izin ver.
// Bu, başkalarının sizin backend'inizi kullanmasını engeller.
app.use(cors({ origin: 'http://localhost:5173' }));

// Static dosyalar için middleware (ses dosyalarını serve etmek için)
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// Multer konfigürasyonu (ses dosyası upload için - şu anda kullanılmıyor)
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, storyDb.getAudioDir());
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, 'story-' + uniqueSuffix + '.mp3');
//   }
// });

// const upload = multer({ storage: storage });

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


// --- VERİTABANI API ENDPOINT'LERİ ---

// Tüm masalları getir
app.get('/api/stories', (req, res) => {
  try {
    const stories = storyDb.getAllStories();
    res.json(stories);
  } catch (error) {
    console.error('Masalları getirme hatası:', error);
    res.status(500).json({ error: 'Masallar getirilirken hata oluştu.' });
  }
});

// Belirli bir masalı getir
app.get('/api/stories/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const story = storyDb.getStoryWithAudio(id);
    
    if (!story) {
      return res.status(404).json({ error: 'Masal bulunamadı.' });
    }
    
    res.json(story);
  } catch (error) {
    console.error('Masal getirme hatası:', error);
    res.status(500).json({ error: 'Masal getirilirken hata oluştu.' });
  }
});

// Yeni masal oluştur
app.post('/api/stories', (req, res) => {
  try {
    const { storyText, storyType, customTopic } = req.body;
    
    if (!storyText || !storyType) {
      return res.status(400).json({ error: 'Masal metni ve türü gereklidir.' });
    }
    
    const storyId = storyDb.createStory(storyText, storyType, customTopic);
    const story = storyDb.getStory(storyId);
    
    res.status(201).json(story);
  } catch (error) {
    console.error('Masal oluşturma hatası:', error);
    res.status(500).json({ error: 'Masal oluşturulurken hata oluştu.' });
  }
});

// Masal güncelle
app.put('/api/stories/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { storyText, storyType, customTopic } = req.body;
    
    if (!storyText || !storyType) {
      return res.status(400).json({ error: 'Masal metni ve türü gereklidir.' });
    }
    
    const updated = storyDb.updateStory(id, storyText, storyType, customTopic);
    
    if (!updated) {
      return res.status(404).json({ error: 'Güncellenecek masal bulunamadı.' });
    }
    
    const story = storyDb.getStory(id);
    res.json(story);
  } catch (error) {
    console.error('Masal güncelleme hatası:', error);
    res.status(500).json({ error: 'Masal güncellenirken hata oluştu.' });
  }
});

// Masal sil
app.delete('/api/stories/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = storyDb.deleteStory(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Silinecek masal bulunamadı.' });
    }
    
    res.json({ message: 'Masal başarıyla silindi.' });
  } catch (error) {
    console.error('Masal silme hatası:', error);
    res.status(500).json({ error: 'Masal silinirken hata oluştu.' });
  }
});

// Belirli türdeki masalları getir
app.get('/api/stories/type/:storyType', (req, res) => {
  try {
    const storyType = req.params.storyType;
    const stories = storyDb.getStoriesByType(storyType);
    res.json(stories);
  } catch (error) {
    console.error('Tip bazlı masal getirme hatası:', error);
    res.status(500).json({ error: 'Masallar getirilirken hata oluştu.' });
  }
});


// --- TTS İSTEKLERİ İÇİN ENDPOINT (GÜNCELLEN VERSİYON) ---
app.post('/api/tts', async (req, res) => {
  // Frontend'den gelen ayarları ve metni al
  const { endpoint, requestBody, storyId } = req.body;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  console.log('TTS Request received:', { 
    endpoint, 
    hasApiKey: !!apiKey,
    storyId: storyId
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
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    console.log('ElevenLabs response received:', { 
      status: response.status, 
      headers: response.headers
    });

    // Eğer storyId varsa, ses dosyasını kaydet
    if (storyId) {
      try {
        // Dosya adı oluştur
        const fileName = `story-${storyId}-${Date.now()}.mp3`;
        const filePath = path.join(storyDb.getAudioDir(), fileName);
        
        // Ses dosyasını kaydet
        const writeStream = fs.createWriteStream(filePath);
        response.data.pipe(writeStream);
        
        writeStream.on('finish', () => {
          console.log('Audio file saved:', filePath);
          // Veritabanına ses dosyası bilgisini kaydet
          try {
            // Voice ID'yi request body'den çıkar
            const voiceId = endpoint.includes('/') ? endpoint.split('/').pop() : 'unknown';
            storyDb.saveAudio(storyId, fileName, filePath, voiceId, requestBody);
            console.log('Audio info saved to database for story:', storyId);
          } catch (dbError) {
            console.error('Database save error:', dbError);
          }
        });
        
        writeStream.on('error', (error) => {
          console.error('File write error:', error);
        });
        
        // Aynı zamanda client'a da stream gönder
        res.setHeader('Content-Type', 'audio/mpeg');
        response.data.pipe(res);
        
      } catch (fileError) {
        console.error('File handling error:', fileError);
        // Dosya hatası olsa bile client'a stream gönder
        res.setHeader('Content-Type', 'audio/mpeg');
        response.data.pipe(res);
      }
    } else {
      // StoryId yoksa sadece client'a stream gönder
      res.setHeader('Content-Type', 'audio/mpeg');
      response.data.pipe(res);
    }

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
// server.js

// .env dosyasındaki gizli bilgileri process.env'ye yükler
require('dotenv').config();

// Gerekli paketleri import et
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
// const multer = require('multer'); // Şu anda kullanılmıyor
const fs = require('fs');
const path = require('path');

// Veritabanı modülü
const storyDb = require('./database/db');

// Express uygulamasını oluştur
const app = express();
const PORT = 3001; // Backend'in çalışacağı port (frontend ile karışmaması için 3001 seçildi)

// Rate limiting konfigürasyonu
// Genel API istekleri için rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına 15 dakikada maksimum 100 istek
  message: { error: 'Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true, // `RateLimit-*` headers'ları gönder
  legacyHeaders: false, // `X-RateLimit-*` headers'ları devre dışı bırak
});

// Veritabanı işlemleri için daha sıkı rate limit
const dbLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 20, // IP başına 1 dakikada maksimum 20 istek
  message: { error: 'Çok fazla veritabanı isteği. Lütfen 1 dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// LLM API istekleri için özel rate limit (daha pahalı işlemler)
const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 5, // IP başına 1 dakikada maksimum 5 LLM isteği
  message: { error: 'Çok fazla masal oluşturma isteği. Lütfen 1 dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// TTS API istekleri için özel rate limit (ses üretimi pahalı işlem)
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 10, // IP başına 1 dakikada maksimum 10 TTS isteği
  message: { error: 'Çok fazla ses üretme isteği. Lütfen 1 dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Frontend'den gelen JSON verilerini okuyabilmek için middleware
app.use(express.json());

// Sadece bizim Vite sunucumuzdan (http://localhost:5173) gelen isteklere izin ver.
// Bu, başkalarının sizin backend'inizi kullanmasını engeller.
// Paylaşılan masallar için daha esnek CORS ayarı
app.use(cors({ 
  origin: function (origin, callback) {
    // Development sırasında localhost'tan gelen isteklere izin ver
    // Production'da bu ayar güncellenmeli
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy tarafından engellendi'));
    }
  }
}));

// Static dosyalar için middleware (ses dosyalarını serve etmek için)
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// Rate limiting uygula
app.use('/api', generalLimiter); // Tüm API endpoint'lerine genel rate limit
app.use('/api/stories', dbLimiter); // Veritabanı işlemleri için özel rate limit

// Paylaşılan masalların ses dosyalarına erişim (public endpoint)
app.get('/api/shared/:shareId/audio', (req, res) => {
  try {
    const shareId = req.params.shareId;
    const story = storyDb.getStoryByShareId(shareId);
    
    if (!story || !story.audio) {
      return res.status(404).json({ error: 'Paylaşılan masalın ses dosyası bulunamadı.' });
    }
    
    const audioPath = path.join(__dirname, 'audio', story.audio.file_name);
    
    // Dosyanın var olup olmadığını kontrol et
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: 'Ses dosyası fiziksel olarak bulunamadı.' });
    }
    
    // Ses dosyasını stream olarak gönder
    res.setHeader('Content-Type', 'audio/mpeg');
    const stream = fs.createReadStream(audioPath);
    stream.pipe(res);
    
  } catch (error) {
    console.error('Paylaşılan ses dosyası servisi hatası:', error);
    res.status(500).json({ error: 'Ses dosyası servis edilirken hata oluştu.' });
  }
});

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
app.post('/api/llm', llmLimiter, async (req, res) => {
  // Frontend'den gelen ayarları ve prompt'u al
  const { endpoint, modelId, prompt, max_tokens } = req.body;
  
  // Input validation
  if (!endpoint || !modelId || !prompt) {
    return res.status(400).json({ error: 'Endpoint, model ID ve prompt gereklidir.' });
  }
  
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Geçerli bir prompt girin.' });
  }
  
  if (max_tokens && (typeof max_tokens !== 'number' || max_tokens <= 0 || max_tokens > 4000)) {
    return res.status(400).json({ error: 'max_tokens 1 ile 4000 arasında olmalıdır.' });
  }
  
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
    console.error('LLM API Hatası:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    let errorMessage = 'LLM API\'sine istek gönderilirken hata oluştu.';
    
    if (error.response?.status === 401) {
      errorMessage = 'OpenAI API anahtarı geçersiz. Lütfen .env dosyasındaki OPENAI_API_KEY değerini kontrol edin.';
    } else if (error.response?.status === 400) {
      errorMessage = 'OpenAI API isteği hatalı. Lütfen metin ve ayarları kontrol edin.';
    } else if (error.response?.status === 429) {
      errorMessage = 'OpenAI API rate limit aşıldı. Lütfen daha sonra tekrar deneyin.';
    } else if (error.response?.data?.error) {
      errorMessage = `OpenAI API Hatası: ${error.response.data.error.message || error.response.data.error}`;
    }
    
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});


// --- VERİTABANI API ENDPOINT'LERİ ---

// Tüm masalları getir
app.get('/api/stories', dbLimiter, (req, res) => {
  try {
    const stories = storyDb.getAllStories();
    res.json(stories);
  } catch (error) {
    console.error('Masalları getirme hatası:', error);
    res.status(500).json({ error: 'Masallar getirilirken hata oluştu.' });
  }
});

// Belirli bir masalı getir
app.get('/api/stories/:id', dbLimiter, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Input validation: ID must be a positive integer
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Geçersiz masal ID\'si.' });
    }
    
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
app.post('/api/stories', dbLimiter, (req, res) => {
  try {
    const { storyText, storyType, customTopic } = req.body;
    
    // Input validation
    if (!storyText || !storyType) {
      return res.status(400).json({ error: 'Masal metni ve türü gereklidir.' });
    }
    
    if (typeof storyText !== 'string' || storyText.trim().length < 50) {
      return res.status(400).json({ error: 'Masal metni en az 50 karakter olmalıdır.' });
    }
    
    if (storyText.length > 10000) {
      return res.status(400).json({ error: 'Masal metni 10.000 karakterden uzun olamaz.' });
    }
    
    if (typeof storyType !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(storyType)) {
      return res.status(400).json({ error: 'Geçersiz masal türü.' });
    }
    
    if (customTopic && (typeof customTopic !== 'string' || customTopic.length > 200)) {
      return res.status(400).json({ error: 'Özel konu 200 karakterden uzun olamaz.' });
    }
    
    const storyId = storyDb.createStory(storyText.trim(), storyType, customTopic?.trim());
    const story = storyDb.getStory(storyId);
    
    res.status(201).json(story);
  } catch (error) {
    console.error('Masal oluşturma hatası:', error);
    res.status(500).json({ error: 'Masal oluşturulurken hata oluştu.' });
  }
});

// Masal güncelle
app.put('/api/stories/:id', dbLimiter, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Input validation: ID must be a positive integer
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Geçersiz masal ID\'si.' });
    }
    
    const { storyText, storyType, customTopic } = req.body;
    
    // Input validation
    if (!storyText || !storyType) {
      return res.status(400).json({ error: 'Masal metni ve türü gereklidir.' });
    }
    
    if (typeof storyText !== 'string' || storyText.trim().length < 50) {
      return res.status(400).json({ error: 'Masal metni en az 50 karakter olmalıdır.' });
    }
    
    if (storyText.length > 10000) {
      return res.status(400).json({ error: 'Masal metni 10.000 karakterden uzun olamaz.' });
    }
    
    if (typeof storyType !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(storyType)) {
      return res.status(400).json({ error: 'Geçersiz masal türü.' });
    }
    
    if (customTopic && (typeof customTopic !== 'string' || customTopic.length > 200)) {
      return res.status(400).json({ error: 'Özel konu 200 karakterden uzun olamaz.' });
    }
    
    const updated = storyDb.updateStory(id, storyText.trim(), storyType, customTopic?.trim());
    
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
app.delete('/api/stories/:id', dbLimiter, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Input validation: ID must be a positive integer
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Geçersiz masal ID\'si.' });
    }
    
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

// Masalın favori durumunu güncelle (PATCH)
app.patch('/api/stories/:id/favorite', dbLimiter, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Input validation: ID must be a positive integer
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Geçersiz masal ID\'si.' });
    }
    
    const { isFavorite, is_favorite } = req.body;
    const favoriteValue = isFavorite !== undefined ? isFavorite : is_favorite;
    
    if (typeof favoriteValue !== 'boolean') {
      return res.status(400).json({ error: 'isFavorite veya is_favorite boolean değer olmalıdır.' });
    }
    
    const updated = storyDb.updateStoryFavorite(id, favoriteValue);
    
    if (!updated) {
      return res.status(404).json({ error: 'Güncellenecek masal bulunamadı.' });
    }
    
    res.json({ 
      message: 'Favori durumu başarıyla güncellendi.',
      story: updated
    });
  } catch (error) {
    console.error('Favori güncelleme hatası:', error);
    res.status(500).json({ error: 'Favori durumu güncellenirken hata oluştu.' });
  }
});

// Masalın favori durumunu güncelle (PUT - aynı işlevsellik)
app.put('/api/stories/:id/favorite', dbLimiter, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Input validation: ID must be a positive integer
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Geçersiz masal ID\'si.' });
    }
    
    const { isFavorite, is_favorite } = req.body;
    const favoriteValue = isFavorite !== undefined ? isFavorite : is_favorite;
    
    if (typeof favoriteValue !== 'boolean') {
      return res.status(400).json({ error: 'isFavorite veya is_favorite boolean değer olmalıdır.' });
    }
    
    const updated = storyDb.updateStoryFavorite(id, favoriteValue);
    
    if (!updated) {
      return res.status(404).json({ error: 'Güncellenecek masal bulunamadı.' });
    }
    
    res.json({ 
      message: 'Favori durumu başarıyla güncellendi.',
      story: updated
    });
  } catch (error) {
    console.error('Favori durumu güncelleme hatası:', error);
    res.status(500).json({ error: 'Favori durumu güncellenirken hata oluştu.' });
  }
});

// Belirli türdeki masalları getir
app.get('/api/stories/type/:storyType', dbLimiter, (req, res) => {
  try {
    const storyType = req.params.storyType;
    
    // Input validation: storyType should be alphanumeric
    if (!storyType || typeof storyType !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(storyType)) {
      return res.status(400).json({ error: 'Geçersiz masal türü.' });
    }
    
    const stories = storyDb.getStoriesByType(storyType);
    res.json(stories);
  } catch (error) {
    console.error('Tip bazlı masal getirme hatası:', error);
    res.status(500).json({ error: 'Masallar getirilirken hata oluştu.' });
  }
});


// --- TTS İSTEKLERİ İÇİN ENDPOINT (GÜNCELLEN VERSİYON) ---
app.post('/api/tts', ttsLimiter, async (req, res) => {
  // Frontend'den gelen ayarları ve metni al
  const { endpoint, requestBody, storyId } = req.body;
  
  // Input validation
  if (!endpoint || !requestBody) {
    return res.status(400).json({ error: 'Endpoint ve request body gereklidir.' });
  }
  
  if (typeof endpoint !== 'string' || !endpoint.includes('elevenlabs.io')) {
    return res.status(400).json({ error: 'Geçerli bir ElevenLabs endpoint URL\'si gereklidir.' });
  }
  
  if (!requestBody.text || typeof requestBody.text !== 'string' || requestBody.text.trim().length === 0) {
    return res.status(400).json({ error: 'TTS için geçerli bir metin gereklidir.' });
  }
  
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
      // Security: Validate storyId to prevent path traversal attacks
      const sanitizedStoryId = parseInt(storyId);
      if (isNaN(sanitizedStoryId) || sanitizedStoryId <= 0) {
        console.warn('Invalid storyId format:', storyId);
        // Continue without saving file but still stream to client
        res.setHeader('Content-Type', 'audio/mpeg');
        response.data.pipe(res);
        return;
      }
      
      try {
        // Security: Use sanitized storyId for filename
        const fileName = `story-${sanitizedStoryId}-${Date.now()}.mp3`;
        const filePath = path.join(storyDb.getAudioDir(), fileName);
        
        // Ses dosyasını kaydet
        const writeStream = fs.createWriteStream(filePath);
        response.data.pipe(writeStream);
        
        writeStream.on('finish', () => {
          console.log('Audio file saved:', filePath);
          // Veritabanına ses dosyası bilgisini kaydet
          try {
            // Voice ID'yi endpoint URL'sinden çıkar (query parameters öncesi)
            let voiceId = 'unknown';
            try {
              const url = new URL(endpoint);
              const pathParts = url.pathname.split('/');
              voiceId = pathParts[pathParts.length - 1] || 'unknown';
            } catch (urlError) {
              console.warn('Voice ID extraction failed, using unknown:', urlError.message);
            }
            
            storyDb.saveAudio(sanitizedStoryId, fileName, filePath, voiceId, requestBody);
            console.log('Audio info saved to database for story:', sanitizedStoryId);
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


// --- SHARING API ENDPOINTS ---

// Masalı paylaş (unique URL oluştur)
app.post('/api/stories/:id/share', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Masalın var olup olmadığını kontrol et
    const story = storyDb.getStory(id);
    if (!story) {
      return res.status(404).json({ error: 'Paylaşılacak masal bulunamadı.' });
    }
    
    const result = storyDb.shareStory(id);
    
    if (result.success) {
      const shareUrl = `${req.protocol}://${req.get('host')}/shared/${result.shareId}`;
      res.json({ 
        success: true,
        shareId: result.shareId,
        shareUrl: shareUrl,
        message: 'Masal başarıyla paylaşıma açıldı.'
      });
    } else {
      res.status(500).json({ error: 'Masal paylaşıma açılırken hata oluştu.' });
    }
  } catch (error) {
    console.error('Masal paylaşma hatası:', error);
    res.status(500).json({ error: 'Masal paylaşılırken hata oluştu.' });
  }
});

// Masalın paylaşımını kaldır
app.delete('/api/stories/:id/share', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const result = storyDb.unshareStory(id);
    
    if (result) {
      res.json({ 
        success: true,
        message: 'Masal paylaşımdan kaldırıldı.'
      });
    } else {
      res.status(404).json({ error: 'Paylaşımı kaldırılacak masal bulunamadı.' });
    }
  } catch (error) {
    console.error('Masal paylaşımı kaldırma hatası:', error);
    res.status(500).json({ error: 'Masal paylaşımı kaldırılırken hata oluştu.' });
  }
});

// Paylaşılan masalı ID ile getir (public endpoint)
app.get('/api/shared/:shareId', (req, res) => {
  try {
    const shareId = req.params.shareId;
    const story = storyDb.getStoryByShareId(shareId);
    
    if (!story) {
      return res.status(404).json({ error: 'Paylaşılan masal bulunamadı veya artık mevcut değil.' });
    }
    
    res.json({
      id: story.share_id, // Share ID'yi public ID olarak kullan
      story_text: story.story_text,
      story_type: story.story_type,
      custom_topic: story.custom_topic,
      shared_at: story.shared_at,
      created_at: story.created_at,
      audio: story.audio
    });
  } catch (error) {
    console.error('Paylaşılan masal getirme hatası:', error);
    res.status(500).json({ error: 'Paylaşılan masal getirilirken hata oluştu.' });
  }
});

// Tüm paylaşılan masalları listele (public endpoint)
app.get('/api/shared', (req, res) => {
  try {
    const stories = storyDb.getAllSharedStories();
    
    // Sadece gerekli bilgileri döndür (güvenlik için)
    const publicStories = stories.map(story => ({
      id: story.share_id,
      story_text: story.story_text.substring(0, 200) + '...', // Preview
      story_type: story.story_type,
      custom_topic: story.custom_topic,
      shared_at: story.shared_at,
      created_at: story.created_at,
      hasAudio: !!story.audio
    }));
    
    res.json(publicStories);
  } catch (error) {
    console.error('Paylaşılan masalları listeleme hatası:', error);
    res.status(500).json({ error: 'Paylaşılan masallar listelenirken hata oluştu.' });
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
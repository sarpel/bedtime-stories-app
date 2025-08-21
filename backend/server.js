// server.js

// Gerekli paketleri import et (env yükleme fallback mantığı için fs/path önce)
const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const pino = require('pino');
const pinoHttp = require('pino-http');

// Üretimde fallback istemiyoruz: sadece backend/.env (veya .env.production) okunur; yoksa hata.
(() => {
  try {
    const backendDir = __dirname;
    const prodFile = path.join(backendDir, '.env.production');
    const mainFile = path.join(backendDir, '.env');
    if (fs.existsSync(prodFile)) {
      require('dotenv').config({ path: prodFile });
    } else if (fs.existsSync(mainFile)) {
      require('dotenv').config({ path: mainFile });
    } else {
      // Hiçbiri yoksa erken, basit stderr uyarısı (logger henüz yok)
      console.error('ENV dosyası bulunamadı (backend/.env). Çevresel değişkenler set edilmiş olmalı.');
    }
  } catch (e) {
    console.error('ENV yüklenemedi:', e.message);
  }
})();

// Production vs Development konfigürasyonu
const isProduction = process.env.NODE_ENV === 'production';

// Logger konfigürasyonu
const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info'),
  transport: isProduction ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Env anahtarlarının varlık durumunu başlangıçta logla (içerikleri değil)
try {
  logger.info({
    msg: 'API key presence check',
    nodeEnv: process.env.NODE_ENV,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasElevenLabs: !!process.env.ELEVENLABS_API_KEY,
    hasGeminiLLM: !!process.env.GEMINI_LLM_API_KEY,
    hasGeminiTTS: !!process.env.GEMINI_TTS_API_KEY
  });
} catch { /* initial presence log skipped */ }

// Express uygulamasını oluştur
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Güvenlik başlıkları ve karmaşık kalkanlar kaldırıldı (kişisel/lokal kullanım)

// Request logging
app.use(pinoHttp({ logger }));

// Veritabanı modülü
const storyDb = require('./database/db');

// TTS Concurrency Control for Pi Zero 2W
const MAX_CONCURRENT_TTS = parseInt(process.env.MAX_CONCURRENT_TTS) || 1;
let activeTTSRequests = 0;
const ttsQueue = [];

// TTS concurrency manager
const processTTSQueue = () => {
  if (activeTTSRequests >= MAX_CONCURRENT_TTS || ttsQueue.length === 0) {
    return;
  }
  
  const nextRequest = ttsQueue.shift();
  activeTTSRequests++;
  
  nextRequest.execute()
    .finally(() => {
      activeTTSRequests--;
      processTTSQueue(); // Process next item in queue
    });
};

const queueTTSRequest = (executeFunction) => {
  return new Promise((resolve, reject) => {
    const requestWrapper = {
      execute: async () => {
        try {
          const result = await executeFunction();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    };
    
    ttsQueue.push(requestWrapper);
    processTTSQueue();
  });
};

// Sıkıştırma ve ek güvenlik katmanları kullanılmıyor (kişisel/lokal kullanım)
// CORS: Production tek cihaz kullanım senaryosu; genişletilmiş serbestiyet.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Frontend'den gelen JSON verilerini okuyabilmek için middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static dosyalar (ses) - frontend build için tekil konsolide blok aşağıda (çift mount kaldırıldı)
app.use('/audio', express.static(path.join(__dirname, 'audio'), { etag: true, lastModified: true }));
// distDir burada tanımlanmıyor; aşağıdaki kapsamlı blokta yerel olarak hesaplanacak

// Rate limiting uygulanmıyor (kişisel kurulum)

// Health check endpoint (comprehensive)
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      performance: {
        activeTTSRequests: activeTTSRequests,
        queuedTTSRequests: ttsQueue.length,
        maxConcurrentTTS: MAX_CONCURRENT_TTS
      },
      services: {
        database: 'checking...',
        filesystem: 'checking...',
        apiKeys: {
          openai: !!process.env.OPENAI_API_KEY,
          elevenlabs: !!process.env.ELEVENLABS_API_KEY,
          gemini: !!(process.env.GEMINI_LLM_API_KEY || process.env.GEMINI_TTS_API_KEY)
        },
        endpoints: {
          openai: {
            configured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL && process.env.OPENAI_ENDPOINT)
          },
          elevenlabs: {
            configured: !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID && process.env.ELEVENLABS_ENDPOINT)
          },
          gemini: {
            llm: !!(process.env.GEMINI_LLM_API_KEY && process.env.GEMINI_LLM_MODEL),
            tts: !!(process.env.GEMINI_TTS_API_KEY && process.env.GEMINI_TTS_MODEL)
          }
        }
      }
    };

    // Kritik API anahtarlarından hiçbiri yoksa unhealthy, bir tanesi yoksa degraded
    const hasOpenAI = healthStatus.services.apiKeys.openai;
    const hasElevenLabs = healthStatus.services.apiKeys.elevenlabs;
    const hasGemini = healthStatus.services.apiKeys.gemini;
    
    if (!hasOpenAI && !hasElevenLabs && !hasGemini) {
      healthStatus.status = 'unhealthy';
    } else if ((!hasOpenAI && !hasGemini) || (!hasElevenLabs && !hasGemini)) {
      healthStatus.status = 'degraded';
    }

    // Check database connection
    try {
      storyDb.getAllStories(1); // Try to get one story to test connection
      healthStatus.services.database = 'healthy';
      healthStatus.services.database_info = {
        totalStories: storyDb.getAllStories().length,
        connectionType: 'SQLite',
        walMode: true
      };
    } catch (error) {
      healthStatus.services.database = 'unhealthy';
      healthStatus.status = healthStatus.status === 'healthy' ? 'degraded' : 'unhealthy';
      logger.error({ error: error.message }, 'Database health check failed');
    }

    // Check audio directory
    try {
      const audioDir = path.join(__dirname, 'audio');
      fs.accessSync(audioDir, fs.constants.R_OK | fs.constants.W_OK);
      
      // Count audio files
      const audioFiles = fs.readdirSync(audioDir).filter(file => file.endsWith('.mp3'));
      
      healthStatus.services.filesystem = 'healthy';
      healthStatus.services.filesystem_info = {
        audioDir: audioDir,
        audioFilesCount: audioFiles.length,
        writable: true,
        readable: true
      };
    } catch (error) {
      healthStatus.services.filesystem = 'unhealthy';
      healthStatus.status = healthStatus.status === 'healthy' ? 'degraded' : healthStatus.status;
      logger.error({ error: error.message }, 'Filesystem health check failed');
    }

    // Memory usage warning for Pi Zero 2W (512MB total)
    const memoryUsageMB = healthStatus.memory.rss / 1024 / 1024;
    if (memoryUsageMB > 256) {
      healthStatus.warnings = healthStatus.warnings || [];
      healthStatus.warnings.push(`High memory usage: ${memoryUsageMB.toFixed(1)}MB (>256MB threshold for Pi Zero 2W)`);
      if (healthStatus.status === 'healthy') {
        healthStatus.status = 'degraded';
      }
    }

    // Check disk space (basic)
    try {
      fs.statSync(__dirname); // Basic filesystem check
      healthStatus.services.filesystem_info = {
        ...healthStatus.services.filesystem_info,
        diskCheck: 'completed'
      };
    } catch (error) {
      // Non-critical, just log
      logger.debug('Disk space check failed', error.message);
    }

    // Response time measurement
    healthStatus.performance.responseTimeMs = Date.now() - startTime;

    // Determine appropriate HTTP status code
    let statusCode = 200;
    if (healthStatus.status === 'unhealthy') {
      statusCode = 503;
    } else if (healthStatus.status === 'degraded') {
      statusCode = 200; // Still functional, just degraded
    }

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error({ error: error.message }, 'Health check failed');
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      message: 'Health check endpoint encountered an internal error'
    });
  }
});

// Üretimde frontend'i backend'den servis etmek için (../dist klasörü varsa)
try {
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    // Serve static files with proper caching
    app.use(express.static(distPath, {
      maxAge: isProduction ? '1y' : '0',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));

    // Catch-all handler for SPA routing (only for non-API routes)
    app.get(/^(?!\/api|\/audio|\/health).*/, (req, res, next) => {
      // Send index.html for all other routes (SPA)
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  } else if (isProduction) {
    logger.warn('Production mode but no dist folder found');
  }
} catch (error) {
  logger.error({ error: error.message }, 'Error setting up static file serving');
}

// /healthz kaldırıldı (tekil /health endpoint'i kullanılacak)

// Paylaşılan masalların ses dosyalarına erişim (public endpoint)
app.get('/api/shared/:shareId/audio', (req, res) => {
  try {
    const shareId = req.params.shareId;
    const story = storyDb.getStoryByShareId(shareId);

    if (!story?.audio) {
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

// --- LLM İSTEKLERİ İÇİN ENDPOINT ---
app.post('/api/llm', async (req, res) => {
  const tStart = Date.now();
  try {
    logger.info({
      msg: '[API /api/llm] request:start',
      ip: req.ip,
      headers: { 'content-type': req.headers['content-type'] },
      bodyKeys: Object.keys(req.body || {})
    });
  } catch { /* llm request start log skipped */ }
  // Frontend'den gelen ayarları ve prompt'u al
  const { provider = 'openai', modelId, prompt, max_completion_tokens, max_output_tokens, temperature, endpoint: clientEndpoint } = req.body;

  // Input validation
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Geçerli bir prompt girin.' });
  }

  const maxTokens = max_output_tokens || max_completion_tokens;
  if (maxTokens && (typeof maxTokens !== 'number' || maxTokens <= 0 || maxTokens > 5000)) {
    return res.status(400).json({ error: 'max_output_tokens 1 ile 5000 arasında olmalıdır.' });
  }

  // API key'leri yalnızca sunucu ortamından al
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const GEMINI_LLM_API_KEY = process.env.GEMINI_LLM_API_KEY || process.env.GEMINI_TTS_API_KEY;

  let endpoint;
  const headers = { 'Content-Type': 'application/json' };
  let body;

  // Endpoint belirleme: Öncelik client'tan gelen endpoint'te
  if (clientEndpoint && typeof clientEndpoint === 'string') {
    endpoint = clientEndpoint;
  }

  if (provider === 'openai') {
    if (!OPENAI_API_KEY) {
      return res.status(503).json({
        error: 'OpenAI API anahtarı eksik. Lütfen backend/.env dosyasında OPENAI_API_KEY\'i ayarlayın.'
      });
    }
    if (!process.env.OPENAI_MODEL) { return res.status(500).json({ error: 'OPENAI_MODEL tanımlı değil.' }); }
    if (!process.env.OPENAI_ENDPOINT) { return res.status(500).json({ error: 'OPENAI_ENDPOINT tanımlı değil.' }); }
    const effectiveModel = modelId || process.env.OPENAI_MODEL;
    endpoint = clientEndpoint || process.env.OPENAI_ENDPOINT;
    headers.Authorization = `Bearer ${OPENAI_API_KEY}`;
    // OpenAI Responses API formatı (güncellendi)
    body = {
      model: effectiveModel,
      input: prompt,
      temperature: Number.isFinite(temperature) ? temperature : 1.0
    };
    if (maxTokens) {
      body.max_output_tokens = maxTokens;
    }
    logger.info({
      msg: '[API /api/llm] provider:openai payload',
      endpoint,
      hasAuth: !!headers.Authorization,
      temperature: body.temperature,
      max_output_tokens: body.max_output_tokens,
      model: body.model,
      inputLen: body.input?.length
    });
  } else if (provider === 'gemini') {
    if (!GEMINI_LLM_API_KEY) { return res.status(500).json({ error: 'Gemini LLM API anahtarı eksik.' }); }
    if (!process.env.GEMINI_LLM_MODEL) { return res.status(500).json({ error: 'GEMINI_LLM_MODEL tanımlı değil.' }); }
    if (!process.env.GEMINI_LLM_ENDPOINT) { return res.status(500).json({ error: 'GEMINI_LLM_ENDPOINT tanımlı değil.' }); }
    const effectiveModel = modelId || process.env.GEMINI_LLM_MODEL;
    const geminiBase = process.env.GEMINI_LLM_ENDPOINT.replace(/\/$/, '');
    endpoint = clientEndpoint || `${geminiBase}/${encodeURIComponent(effectiveModel)}:generateContent?key=${encodeURIComponent(GEMINI_LLM_API_KEY)}`;
    // Gemini generateContent formatı
    body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: Number.isFinite(temperature) ? temperature : 1.0,
        maxOutputTokens: maxTokens && Number.isFinite(maxTokens) ? maxTokens : undefined
      }
    };
    logger.info({
      msg: '[API /api/llm] provider:gemini payload',
      endpoint,
      temperature: body.generationConfig.temperature,
      maxOutputTokens: body.generationConfig.maxOutputTokens,
      contentsLen: body.contents?.[0]?.parts?.[0]?.text?.length
    });
  } else {
    // Diğer provider'lar için generic JSON format ve client-provided endpoint gerekir
    if (!endpoint) {
      return res.status(400).json({ error: 'Bilinmeyen LLM sağlayıcısı için endpoint belirtin.' });
    }
    body = {
      model: modelId,
      prompt,
      temperature: Number.isFinite(temperature) ? temperature : 1.0,
      max_completion_tokens: maxTokens && Number.isFinite(maxTokens) ? maxTokens : undefined
    };
    logger.info({
      msg: '[API /api/llm] provider:generic payload',
      endpoint,
      temperature: body.temperature,
      max_completion_tokens: body.max_completion_tokens,
      promptLen: (prompt || '').length
    });
  }

  // Herhangi bir metin manipülasyonu veya yeniden biçimleme yapılmaz

  try {
    logger.info({ msg: '[API /api/llm] forwarding:start', endpoint });
    const t0 = Date.now();
    const response = await axios.post(endpoint, body, { headers });
    const duration = Date.now() - t0;
    const data = response.data;
    logger.info({
      msg: '[API /api/llm] forwarding:success',
      status: response.status,
      durationMs: duration,
      keys: Object.keys(data || {}),
      textLen: typeof data?.text === 'string' ? data.text.length : undefined
    });
    res.json(data);
  } catch (error) {
    logger.error({
      msg: 'LLM API Hatası',
      provider,
      status: error.response?.status,
      message: error.message
    });
    let errorMessage = 'LLM API\'sine istek gönderilirken hata oluştu.';
    if (error.response?.status === 401) {
      errorMessage = `${provider} API anahtarı geçersiz.`;
    } else if (error.response?.status === 400) {
      errorMessage = `${provider} API isteği hatalı.`;
    }
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
  try { logger.info({ msg: '[API /api/llm] request:end', totalMs: Date.now() - tStart }); } catch { /* llm request end log skipped */ }
});

// --- QUEUE API ---
// Kuyruğu getir
app.get('/api/queue', (req, res) => {
  try {
    const ids = storyDb.getQueue();
    res.json({ ids });
  } catch (error) {
    logger.error({ msg: 'Kuyruk getirme hatası', error: error?.message });
    res.status(500).json({ error: 'Kuyruk getirilirken hata oluştu.' });
  }
});

// Kuyruğu komple sırayla ayarla
app.put('/api/queue', (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids array gereklidir.' });
    }
    storyDb.setQueue(ids);
    res.json({ success: true });
  } catch (error) {
    logger.error({ msg: 'Kuyruk güncelleme hatası', error: error?.message });
    res.status(500).json({ error: 'Kuyruk güncellenirken hata oluştu.' });
  }
});

// Kuyruğa ekle (sona)
app.post('/api/queue/add', (req, res) => {
  try {
    const { id } = req.body || {};
    const sid = parseInt(id);
    if (!Number.isFinite(sid) || sid <= 0) {
      return res.status(400).json({ error: 'Geçerli bir story id gereklidir.' });
    }
    storyDb.addToQueue(sid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ msg: 'Kuyruğa ekleme hatası', error: error?.message });
    res.status(500).json({ error: 'Kuyruğa eklenirken hata oluştu.' });
  }
});

// Kuyruktan çıkar
app.delete('/api/queue/:id', (req, res) => {
  try {
    const sid = parseInt(req.params.id);
    if (!Number.isFinite(sid) || sid <= 0) {
      return res.status(400).json({ error: 'Geçerli bir story id gereklidir.' });
    }
    storyDb.removeFromQueue(sid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ msg: 'Kuyruktan çıkarma hatası', error: error?.message });
    res.status(500).json({ error: 'Kuyruktan çıkarılırken hata oluştu.' });
  }
});


// --- VERİTABANI API ENDPOINT'LERİ ---

// Tüm masalları getir
app.get('/api/stories', (req, res) => {
  try {
    const stories = storyDb.getAllStories();
    res.json(stories);
  } catch (error) {
    logger.error({ msg: 'Masalları getirme hatası', error: error?.message });
    res.status(500).json({ error: 'Masallar getirilirken hata oluştu.' });
  }
});

// Belirli bir masalı getir
app.get('/api/stories/:id', (req, res) => {
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
    logger.error({ msg: 'Masal getirme hatası', error: error?.message });
    res.status(500).json({ error: 'Masal getirilirken hata oluştu.' });
  }
});

// Yeni masal oluştur
app.post('/api/stories', (req, res) => {
  try {
    logger.info({ msg: 'POST /api/stories - request', bodyKeys: Object.keys(req.body || {}) })
    const { storyText, storyType, customTopic } = req.body;

    // Input validation
    if (!storyText || !storyType) {
      logger.warn({ msg: 'POST /api/stories - validation error', storyText: typeof storyText, storyType: typeof storyType })
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
    logger.error({ msg: 'Masal oluşturma hatası', error: error.message });
    res.status(500).json({ error: 'Masal oluşturulurken hata oluştu.' });
  }
});

// Masal güncelle
app.put('/api/stories/:id', (req, res) => {
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
    logger.error({ msg: 'Masal güncelleme hatası', error: error?.message });
    res.status(500).json({ error: 'Masal güncellenirken hata oluştu.' });
  }
});

// Masal sil
app.delete('/api/stories/:id', (req, res) => {
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
    logger.error({ msg: 'Masal silme hatası', error: error?.message });
    res.status(500).json({ error: 'Masal silinirken hata oluştu.' });
  }
});

// Masalın favori durumunu güncelle (PATCH)
app.patch('/api/stories/:id/favorite', (req, res) => {
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
    logger.error({ msg: 'Favori güncelleme hatası', error: error?.message });
    res.status(500).json({ error: 'Favori durumu güncellenirken hata oluştu.' });
  }
});

// Masalın favori durumunu güncelle (PUT - aynı işlevsellik)
app.put('/api/stories/:id/favorite', (req, res) => {
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
    logger.error({ msg: 'Favori durumu güncelleme hatası', error: error?.message });
    res.status(500).json({ error: 'Favori durumu güncellenirken hata oluştu.' });
  }
});

// Belirli türdeki masalları getir
app.get('/api/stories/type/:storyType', (req, res) => {
  try {
    const storyType = req.params.storyType;

    // Input validation: storyType should be alphanumeric
    if (!storyType || typeof storyType !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(storyType)) {
      return res.status(400).json({ error: 'Geçersiz masal türü.' });
    }

    const stories = storyDb.getStoriesByType(storyType);
    res.json(stories);
  } catch (error) {
    logger.error({ msg: 'Tip bazlı masal getirme hatası', error: error?.message });
    res.status(500).json({ error: 'Masallar getirilirken hata oluştu.' });
  }
});


// --- TTS İSTEKLERİ İÇİN ENDPOINT (GÜNCELLENMİŞ) ---
app.post('/api/tts', async (req, res) => {
  console.log('🔊 [Backend TTS] Request received:', {
    provider: req.body.provider,
    voiceId: req.body.voiceId,
    hasRequestBody: !!req.body.requestBody,
    requestBodyKeys: req.body.requestBody ? Object.keys(req.body.requestBody) : [],
    queueLength: ttsQueue.length,
    activeTTS: activeTTSRequests
  })

  // Frontend'den gelen ayarları ve metni al
  const { provider, modelId, voiceId, requestBody, storyId, endpoint: clientEndpoint } = req.body;

  // Input validation
  if (!provider || !requestBody) {
    console.log('🔊 [Backend TTS] Validation failed:', { provider, hasRequestBody: !!requestBody })
    return res.status(400).json({ error: 'Provider ve request body gereklidir.' });
  }

  // Metin kontrolü
  let textToSpeak;
  if (provider === 'elevenlabs') {
    textToSpeak = requestBody.text;
  } else if (provider === 'gemini') {
    textToSpeak = requestBody.contents?.[0]?.parts?.[0]?.text;
  } else {
    // Generic TTS: yaygın alan adlarını dene
    textToSpeak = requestBody.text
      || requestBody.input
      || requestBody.ssml
      || requestBody.contents?.[0]?.parts?.[0]?.text
      || '';
  }
  if (!textToSpeak || typeof textToSpeak !== 'string' || textToSpeak.trim().length === 0) {
    return res.status(400).json({ error: 'TTS için geçerli bir metin gereklidir.' });
  }

  // Queue the TTS request to enforce MAX_CONCURRENT_TTS limit
  try {
    await queueTTSRequest(async () => {
      return await processTTSRequestWithErrorHandling(req, res, provider, modelId, voiceId, requestBody, storyId, clientEndpoint);
    });
  } catch (error) {
    logger.error({
      msg: 'TTS Queue Error',
      error: error.message,
      provider
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'TTS isteği işlenirken hata oluştu.' });
    }
  }
});

// Separate TTS processing function for concurrency control
async function processTTSRequest(req, res, provider, modelId, voiceId, requestBody, storyId, clientEndpoint) {
  const ELEVEN_BASE = (process.env.ELEVENLABS_ENDPOINT || '').replace(/\/$/, '');
  const GEMINI_BASE = (process.env.GEMINI_TTS_ENDPOINT || process.env.GEMINI_LLM_ENDPOINT || '').replace(/\/$/, '');
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const GEMINI_TTS_API_KEY = process.env.GEMINI_TTS_API_KEY || process.env.GEMINI_LLM_API_KEY;

  console.log('🔊 [Backend TTS] Processing with API Keys status:', {
    elevenlabs: ELEVENLABS_API_KEY ? 'DEFINED' : 'UNDEFINED',
    gemini: GEMINI_TTS_API_KEY ? 'DEFINED' : 'UNDEFINED'
  })

  let endpoint;
  let headers = {};
  let response;

  if (provider === 'elevenlabs') {
    console.log('🔊 [Backend TTS] Using ElevenLabs provider')
    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: 'ElevenLabs API anahtarı eksik. Lütfen backend/.env dosyasında ELEVENLABS_API_KEY\'i ayarlayın.'
      });
    }
    if (!process.env.ELEVENLABS_VOICE_ID && !voiceId) { 
      return res.status(500).json({ error: 'ELEVENLABS_VOICE_ID tanımlı değil.' }); 
    }
    if (!process.env.ELEVENLABS_ENDPOINT && !clientEndpoint) { 
      return res.status(500).json({ error: 'ELEVENLABS_ENDPOINT tanımlı değil.' }); 
    }
    const effectiveVoice = voiceId || process.env.ELEVENLABS_VOICE_ID;

    const audioFormat = 'mp3_44100_128';
    endpoint = clientEndpoint || `${ELEVEN_BASE}/${encodeURIComponent(effectiveVoice)}?output_format=${audioFormat}`;
    headers = {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    };

    response = await axios.post(endpoint, requestBody, {
      headers,
      responseType: 'stream'
    });
  } else if (provider === 'gemini') {
    if (!GEMINI_TTS_API_KEY) { 
      return res.status(500).json({ error: 'Gemini TTS API anahtarı eksik.' }); 
    }
    if (!process.env.GEMINI_TTS_MODEL && !process.env.GEMINI_LLM_MODEL && !modelId) { 
      return res.status(500).json({ error: 'GEMINI_TTS_MODEL tanımlı değil.' }); 
    }
    if (!process.env.GEMINI_TTS_ENDPOINT && !process.env.GEMINI_LLM_ENDPOINT && !clientEndpoint) { 
      return res.status(500).json({ error: 'GEMINI_TTS_ENDPOINT tanımlı değil.' }); 
    }
    const effectiveModel = modelId || process.env.GEMINI_TTS_MODEL || process.env.GEMINI_LLM_MODEL;
    const base = GEMINI_BASE || '';
    if (!base && !clientEndpoint) { 
      return res.status(500).json({ error: 'Gemini base endpoint yok.' }); 
    }
    endpoint = clientEndpoint || `${base}/${encodeURIComponent(effectiveModel)}:generateContent?key=${encodeURIComponent(GEMINI_TTS_API_KEY)}`;
    headers = { 'Content-Type': 'application/json' };
    response = await axios.post(endpoint, requestBody, { headers });

    // Gemini response'dan audio data'yı çıkar
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      const audioData = response.data.candidates[0].content.parts[0].inlineData.data;
      const audioBuffer = Buffer.from(audioData, 'base64');
      const { Readable } = require('stream');
      const audioStream = new Readable();
      audioStream.push(audioBuffer);
      audioStream.push(null);
      response.data = audioStream;
      response.headers = { 'content-type': 'audio/mpeg' };
    } else {
      throw new Error('Gemini API\'den ses verisi alınamadı');
    }
  } else {
    // Diğer provider'lar: clientEndpoint zorunlu
    if (!clientEndpoint) {
      return res.status(400).json({ error: 'Bilinmeyen TTS sağlayıcısı için endpoint belirtin.' });
    }
    endpoint = clientEndpoint;
    headers = { 'Content-Type': 'application/json' };
    // Çoğu TTS API binary döndürür, stream destekleyelim
    response = await axios.post(endpoint, requestBody, { headers, responseType: 'stream' });
  }

  // Minimal logging, hassas veri yok
  logger.info({ msg: 'TTS response received', provider, status: response.status });

  // Eğer storyId varsa, ses dosyasını kaydet
  if (storyId) {
    // Security: Validate storyId to prevent path traversal attacks
    const sanitizedStoryId = parseInt(storyId);
    if (isNaN(sanitizedStoryId) || sanitizedStoryId <= 0) {
      logger.warn({ msg: 'Invalid storyId format', storyId });
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
        logger.info({ msg: 'Audio file saved', filePath });
        // Veritabanına ses dosyası bilgisini kaydet
        try {
          // Voice ID'yi provider'a göre çıkar
          let usedVoiceId = 'unknown';
          if (provider === 'elevenlabs') {
            usedVoiceId = voiceId || 'unknown';
          } else if (provider === 'gemini') {
            usedVoiceId = requestBody.generationConfig?.speechConfig?.voiceConfig?.name || 'unknown';
          }

          storyDb.saveAudio(sanitizedStoryId, fileName, filePath, usedVoiceId, requestBody);
          logger.info({ msg: 'Audio info saved to database', storyId: sanitizedStoryId });
        } catch (dbError) {
          logger.error({ msg: 'Database save error', error: dbError?.message });
        }
      });

      writeStream.on('error', (error) => {
        logger.error({ msg: 'File write error', error: error?.message });
      });

      // Aynı zamanda client'a da stream gönder
      res.setHeader('Content-Type', 'audio/mpeg');
      response.data.pipe(res);

    } catch (fileError) {
      logger.error({ msg: 'File handling error', error: fileError?.message });
      // Dosya hatası olsa bile client'a stream gönder
      res.setHeader('Content-Type', 'audio/mpeg');
      response.data.pipe(res);
    }
  } else {
    // StoryId yoksa sadece client'a stream gönder
    res.setHeader('Content-Type', 'audio/mpeg');
    response.data.pipe(res);
  }
}

// Error handling wrapper for processTTSRequest
async function processTTSRequestWithErrorHandling(req, res, provider, modelId, voiceId, requestBody, storyId, clientEndpoint) {
  try {
    return await processTTSRequest(req, res, provider, modelId, voiceId, requestBody, storyId, clientEndpoint);
  } catch (error) {
    logger.error({
      msg: 'TTS API Hatası',
      provider,
      status: error.response?.status,
      statusText: error.response?.statusText,
      error: error.message
    });

    let errorMessage = `${provider} TTS API'sine istek gönderilirken hata oluştu.`;

    if (error.response?.status === 401) {
      errorMessage = `${provider} API anahtarı geçersiz. Lütfen API anahtarını kontrol edin.`;
    } else if (error.response?.status === 400) {
      errorMessage = `${provider} API isteği hatalı. Lütfen metin ve ayarları kontrol edin.`;
    } else if (error.response?.data?.detail) {
      errorMessage = `${provider} API Hatası: ${error.response.data.detail}`;
    } else if (error.response?.data?.error?.message) {
      errorMessage = `${provider} API Hatası: ${error.response.data.error.message}`;
    }

    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({ error: errorMessage });
    }
  }
}


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
    logger.error({ msg: 'Masal paylaşma hatası', error: error?.message });
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
    logger.error({ msg: 'Masal paylaşımı kaldırma hatası', error: error?.message });
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
    logger.error({ msg: 'Paylaşılan masal getirme hatası', error: error?.message });
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
    logger.error({ msg: 'Paylaşılan masalları listeleme hatası', error: error?.message });
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

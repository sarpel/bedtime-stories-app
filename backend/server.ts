// @ts-nocheck
// server.ts

// Gerekli paketleri import et (env yükleme fallback mantığı için fs/path önce)
const fs = require("fs");
const path = require("path");
const express = require("express");
const axios = require("axios");
const { PassThrough, pipeline } = require("stream");
const pino = require("pino");
const pinoHttp = require("pino-http");
const multer = require("multer");
const FormData = require("form-data");

// Üretimde fallback istemiyoruz: sadece backend/.env (veya .env.production) okunur; yoksa hata.
(() => {
  try {
    const backendDir = __dirname;
    const prodFile = path.join(backendDir, ".env.production");
    const mainFile = path.join(backendDir, ".env");
    if (fs.existsSync(prodFile)) {
      require("dotenv").config({ path: prodFile });
    } else if (fs.existsSync(mainFile)) {
      require("dotenv").config({ path: mainFile });
    } else {
      // Hiçbiri yoksa erken, basit stderr uyarısı (logger henüz yok)
      console.error(
        "ENV dosyası bulunamadı (backend/.env). Çevresel değişkenler set edilmiş olmalı.",
      );
    }
  } catch (e) {
    console.error("ENV yüklenemedi:", e.message);
  }
})();

// Production vs Development konfigürasyonu
const isProduction = process.env.NODE_ENV === "production";

// Yardimci: gelistirmede ayrintili hata dondur
function errorPayload(userMessage: string, err?: any) {
  if (isProduction) {
    return { error: userMessage };
  }
  return {
    error: userMessage,
    details: {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
    },
  };
}

function preview(str: any, len = 80) {
  try {
    if (typeof str !== "string") return undefined;
    const t = str.trim();
    return t.length <= len ? t : t.slice(0, len) + "…";
  } catch {
    return undefined;
  }
}

// Logger konfigürasyonu
const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "warn" : "info"),
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
});

// Constants
const LLM_REQUEST_TIMEOUT_MS = 120000; // 2 minutes
const STT_REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// Multer configuration for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 100 * 1024 * 1024, // 100MB for form fields
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (
      file.mimetype.startsWith("audio/") ||
      file.originalname.match(/\.(webm|wav|mp3|m4a|ogg|flac)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Sadece ses dosyaları kabul edilir."), false);
    }
  },
});

// Env anahtarlarının varlık durumunu başlangıçta logla (içerikleri değil)
try {
  logger.info({
    msg: "API key presence check",
    nodeEnv: process.env.NODE_ENV,
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
    hasElevenLabs: Boolean(process.env.ELEVENLABS_API_KEY),
    hasGeminiLLM: Boolean(process.env.GEMINI_LLM_API_KEY),
    hasGeminiTTS: Boolean(process.env.GEMINI_TTS_API_KEY),
  });
} catch {
  /* initial presence log skipped */
}

// Utility: Convert raw PCM to WAV format
// Gemini TTS returns PCM: 16-bit, 24kHz, mono
function pcmToWav(pcmBuffer: Buffer): Buffer {
  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;

  const wavHeader = Buffer.alloc(44);

  // "RIFF" chunk descriptor
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + dataSize, 4); // File size - 8
  wavHeader.write("WAVE", 8);

  // "fmt " sub-chunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}

// Express uygulamasını oluştur
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Güvenlik başlıkları ve karmaşık kalkanlar kaldırıldı (kişisel/lokal kullanım)

// Request logging
app.use(pinoHttp({ logger }));

// Veritabanı modülü
const storyDb = require("./database/db").default;
// Sunucu tarafı ses çalma (Pi üzerinde hoparlörden) için child_process
const { spawn } = require("child_process");

// Tek seferde yalnızca bir oynatma süreci tutulur
let currentPlayback = {
  process: null,
  storyId: null,
  startedAt: null,
  file: null,
};

function stopCurrentPlayback(reason = "stopped") {
  if (currentPlayback.process && !currentPlayback.process.killed) {
    try {
      currentPlayback.process.kill("SIGTERM");
    } catch {
      /* kill fail ignore */
    }
  }
  const info = {
    storyId: currentPlayback.storyId,
    file: currentPlayback.file,
    startedAt: currentPlayback.startedAt,
    reason,
  };
  currentPlayback = {
    process: null,
    storyId: null,
    startedAt: null,
    file: null,
  };
  return info;
}

// Sıkıştırma ve ek güvenlik katmanları kullanılmıyor (kişisel/lokal kullanım)
// CORS removed - using same-origin via Vite dev proxy as per guidelines

// Frontend'den gelen JSON verilerini okuyabilmek için middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// MIME type düzeltmeleri için middleware (ES modules için kritik)
app.use((req, res, next) => {
  const ext = path.extname(req.url).toLowerCase();

  switch (ext) {
    case ".js":
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      break;
    case ".jsx":
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      break;
    case ".mjs":
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      break;
    case ".css":
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      break;
    case ".json":
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      break;
    case ".svg":
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      break;
  }

  next();
});

// Static dosyalar (ses) - frontend build için tekil konsolide blok aşağıda (çift mount kaldırıldı)
app.use(
  "/audio",
  express.static(path.join(__dirname, "audio"), {
    etag: true,
    lastModified: true,
  }),
);
// distDir burada tanımlanmıyor; aşağıdaki kapsamlı blokta yerel olarak hesaplanacak

// Rate limiting uygulanmıyor (kişisel kurulum)

// Health check endpoint (comprehensive)
app.get("/health", async (req, res) => {
  try {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: "checking...",
        filesystem: "checking...",
        apiKeys: {
          openai: Boolean(process.env.OPENAI_API_KEY),
          elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
          gemini: Boolean(process.env.GEMINI_LLM_API_KEY || process.env.GEMINI_TTS_API_KEY),
        },
      },
    };

    // Kritik API anahtarlarından en az biri yoksa status'u degraded yap
    if (
      !healthStatus.services.apiKeys.openai ||
      !healthStatus.services.apiKeys.elevenlabs
    ) {
      healthStatus.status =
        healthStatus.status === "healthy" ? "degraded" : healthStatus.status;
    }

    // Check database connection
    try {
      storyDb.getAllStories(1); // Try to get one story
      healthStatus.services.database = "healthy";
    } catch (error) {
      healthStatus.services.database = "unhealthy";
      healthStatus.status = "degraded";
      logger.error({ error: error.message }, "Database health check failed");
    }

    // Check audio directory
    try {
      const audioDir = path.join(__dirname, "audio");
      fs.accessSync(audioDir, fs.constants.R_OK | fs.constants.W_OK);
      healthStatus.services.filesystem = "healthy";
    } catch (error) {
      healthStatus.services.filesystem = "unhealthy";
      healthStatus.status = "degraded";
      logger.error({ error: error.message }, "Filesystem health check failed");
    }

    const statusCode = 200;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error({ error: error.message }, "Health check failed");
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Üretimde frontend'i backend'den servis etmek için
try {
  // Önce root klasördeki static dosyaları dene (production setup)
  const rootPath = path.join(__dirname, "..");
  const distPath = path.join(__dirname, "..", "dist");
  const rootAssetsPath = path.join(rootPath, "assets");
  const distAssetsPath = path.join(distPath, "assets");

  let staticPath = null;
  let indexPath = null;

  // Production setup: static dosyalar root'ta
  if (fs.existsSync(path.join(rootPath, "index.html"))) {
    staticPath = rootPath;
    indexPath = path.join(rootPath, "index.html");
    logger.info("Serving static files from root directory (production setup)");
  }
  // Development setup: static dosyalar dist/'te
  else if (
    fs.existsSync(distPath) &&
    fs.existsSync(path.join(distPath, "index.html"))
  ) {
    staticPath = distPath;
    indexPath = path.join(distPath, "index.html");
    logger.info("Serving static files from dist directory (development setup)");
  }

  if (staticPath && indexPath) {
    // Serve static files with proper caching and MIME types
    app.use(
      express.static(staticPath, {
        maxAge: isProduction ? "1y" : "0",
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          // Cache control for HTML files
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache");
          }

          // Fix MIME types for JavaScript modules
          if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) {
            res.setHeader(
              "Content-Type",
              "application/javascript; charset=utf-8",
            );
          }

          // Ensure proper MIME types for other assets
          if (filePath.endsWith(".css")) {
            res.setHeader("Content-Type", "text/css; charset=utf-8");
          }

          if (filePath.endsWith(".json")) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
          }

          // Security headers for all static files
          res.setHeader("X-Content-Type-Options", "nosniff");
        },
      }),
    );

    // Catch-all handler for SPA routing (only for non-API routes)
    app.get(/^(?!\/api|\/audio|\/health).*/, (req, res, next) => {
      // Send index.html for all other routes (SPA)
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });

    // /assets fallback: root/assets yoksa dist/assets mount et
    if (!fs.existsSync(rootAssetsPath) && fs.existsSync(distAssetsPath)) {
      logger.info("Mounting /assets from dist/assets (fallback)");
      app.use(
        "/assets",
        express.static(distAssetsPath, {
          maxAge: isProduction ? "1y" : "0",
          etag: true,
          lastModified: true,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) {
              res.setHeader(
                "Content-Type",
                "application/javascript; charset=utf-8",
              );
            }
            res.setHeader("X-Content-Type-Options", "nosniff");
          },
        }),
      );
    }
  } else if (isProduction) {
    logger.warn(
      "Production mode but no static files found in root or dist folder",
    );
  }
} catch (error) {
  logger.error(
    { error: error.message },
    "Error setting up static file serving",
  );
}

// /healthz kaldırıldı (tekil /health endpoint'i kullanılacak)

// Paylaşılan masalların ses dosyalarına erişim (public endpoint)
app.get("/api/shared/:shareId/audio", (req, res) => {
  try {
    const shareId = req.params.shareId;
    const story = storyDb.getStoryByShareId(shareId);

    if (!story?.audio) {
      return res
        .status(404)
        .json({ error: "Paylaşılan masalın ses dosyası bulunamadı." });
    }

    const audioPath = path.join(__dirname, "audio", story.audio.file_name);

    // Dosyanın var olup olmadığını kontrol et
    if (!fs.existsSync(audioPath)) {
      return res
        .status(404)
        .json({ error: "Ses dosyası fiziksel olarak bulunamadı." });
    }

    // Ses dosyasını stream olarak gönder
    res.setHeader("Content-Type", "audio/mpeg");
    const stream = fs.createReadStream(audioPath);
    stream.pipe(res);
  } catch (error) {
    console.error("Paylaşılan ses dosyası servisi hatası:", error);
    res
      .status(500)
      .json({ error: "Ses dosyası servis edilirken hata oluştu." });
  }
});

// --- UZAKTAN (SUNUCU ÜZERİNDE) SES ÇALMA ENDPOINT'LERİ ---
// Amaç: Anne uzaktan web arayüzünden "Cihazda Çal" dediğinde Pi Zero üzerindeki hoparlörden masal sesi çıksın.
// Varsayılan oynatıcı: mpg123 (MP3). Kurulum: sudo apt-get install -y mpg123
// ENV ile override: AUDIO_PLAYER_COMMAND (örn: "ffplay -nodisp -autoexit" veya "aplay" (wav için))

const AUDIO_PLAYER_CMD = (process.env.AUDIO_PLAYER_COMMAND || "mpg123").trim();
const DRY_RUN_AUDIO = process.env.DRY_RUN_AUDIO_PLAYBACK === "true";

app.get("/api/play/status", (req, res) => {
  if (!currentPlayback.process) {
    return res.json({ playing: false });
  }
  return res.json({
    playing: true,
    storyId: currentPlayback.storyId,
    file: currentPlayback.file,
    startedAt: currentPlayback.startedAt,
  });
});

app.post("/api/play/stop", (req, res) => {
  if (!currentPlayback.process) {
    return res.json({
      success: true,
      stopped: false,
      message: "Aktif oynatma yok",
    });
  }
  const info = stopCurrentPlayback("manual-stop");
  res.json({ success: true, stopped: true, info });
});

app.post("/api/play/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Geçersiz masal ID" });
    }
    const story = storyDb.getStoryWithAudio(id);
    if (!story || !story.audio || !story.audio.file_name) {
      return res
        .status(404)
        .json({ error: "Masalın kayıtlı bir ses dosyası yok." });
    }
    const audioPath = path.join(storyDb.getAudioDir(), story.audio.file_name);
    if (!fs.existsSync(audioPath)) {
      return res
        .status(404)
        .json({ error: "Ses dosyası bulunamadı (diskte yok)." });
    }

    // Mevcut oynatma varsa durdur
    if (currentPlayback.process) {
      stopCurrentPlayback("replaced");
    }

    if (DRY_RUN_AUDIO) {
      currentPlayback = {
        process: { killed: false, pid: 0 },
        storyId: id,
        startedAt: new Date().toISOString(),
        file: audioPath,
      };
      return res.json({
        success: true,
        dryRun: true,
        message: "DRY_RUN modunda oynatma simüle edildi",
        storyId: id,
      });
    }

    // Komutu argümanlara parçala (örn: "ffplay -nodisp -autoexit")
    const parts = AUDIO_PLAYER_CMD.split(/\s+/).filter(Boolean);
    const bin = parts.shift();
    const args = [...parts, audioPath];

    const child = spawn(bin, args, { stdio: "ignore" });
    currentPlayback = {
      process: child,
      storyId: id,
      startedAt: new Date().toISOString(),
      file: audioPath,
    };

    child.on("exit", (code, signal) => {
      // Normal bitiş veya öldürülme: state temizle
      if (currentPlayback.process === child) {
        stopCurrentPlayback(signal === "SIGTERM" ? "stopped" : "ended");
      }
    });

    res.json({
      success: true,
      playing: true,
      storyId: id,
      command: AUDIO_PLAYER_CMD,
    });
  } catch (error) {
    logger.error({ msg: "Sunucu oynatma hatası", error: error?.message });
    res.status(500).json({ error: "Sunucu oynatma başlatılamadı." });
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
app.post("/api/llm", async (req, res) => {
  const tStart = Date.now();
  try {
    logger.info({
      msg: "[API /api/llm] request:start",
      ip: req.ip,
      headers: { "content-type": req.headers["content-type"] },
      bodyKeys: Object.keys(req.body || {}),
    });
  } catch {
    /* llm request start log skipped */
  }
  // Frontend'den gelen ayarları ve prompt'u al
  const {
    provider = "openai",
    modelId,
    prompt,
    max_completion_tokens,
    max_output_tokens,
    temperature,
    endpoint: clientEndpoint,
  } = req.body;

  // Input validation
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "Geçerli bir prompt girin." });
  }

  const maxTokens = max_output_tokens || max_completion_tokens;
  if (
    maxTokens &&
    (typeof maxTokens !== "number" || maxTokens <= 0 || maxTokens > 5000)
  ) {
    return res
      .status(400)
      .json({ error: "max_output_tokens 1 ile 5000 arasında olmalıdır." });
  }

  // API key'leri yalnızca sunucu ortamından al
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const GEMINI_LLM_API_KEY =
    process.env.GEMINI_LLM_API_KEY || process.env.GEMINI_TTS_API_KEY;

  let endpoint;
  const headers = { "Content-Type": "application/json" };
  let body;

  // Endpoint belirleme: Öncelik client'tan gelen endpoint'te
  if (clientEndpoint && typeof clientEndpoint === "string") {
    endpoint = clientEndpoint;
  }

  if (provider === "openai") {
    if (!OPENAI_API_KEY) {
      return res.status(503).json({
        error:
          "OpenAI API anahtarı eksik. Lütfen backend/.env dosyasında OPENAI_API_KEY'i ayarlayın.",
      });
    }
    if (!process.env.OPENAI_MODEL) {
      return res.status(500).json({ error: "OPENAI_MODEL tanımlı değil." });
    }
    if (!process.env.OPENAI_ENDPOINT) {
      return res.status(500).json({ error: "OPENAI_ENDPOINT tanımlı değil." });
    }

    if (
      clientEndpoint &&
      typeof clientEndpoint === "string" &&
      clientEndpoint.startsWith("http")
    ) {
      endpoint = clientEndpoint;
    } else {
      endpoint = process.env.OPENAI_ENDPOINT;
    }

    const effectiveModel = modelId || process.env.OPENAI_MODEL;
    headers.Authorization = `Bearer ${OPENAI_API_KEY}`;

    // Responses, chat/completions veya legacy completion formatlarını destekle
    const defaultSystemPrompt =
      "5 yaşındaki bir türk kız çocuğu için uyku vaktinde okunmak üzere, uyku getirici ve kazanması istenen temel erdemleri de ders niteliğinde hikayelere iliştirecek şekilde masal yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.";
    const systemPrompt = (
      process.env.SYSTEM_PROMPT_TURKISH || defaultSystemPrompt
    ).trim();
    const fullPrompt = `${systemPrompt}

${prompt}`;
    if (endpoint.includes("/responses")) {
      body = { model: effectiveModel, input: fullPrompt };
      logger.info({
        msg: "[API /api/llm] provider:openai responses payload",
        endpoint,
        model: body.model,
        inputLen: fullPrompt.length,
      });
    } else if (endpoint.includes("chat/completions")) {
      body = {
        model: effectiveModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: Number.isFinite(temperature) ? temperature : 0.9,
        max_tokens:
          maxTokens && Number.isFinite(maxTokens) ? maxTokens : undefined,
      };
      logger.info({
        msg: "[API /api/llm] provider:openai chat/completions payload",
        endpoint,
        model: body.model,
        messagesLen: body.messages?.length,
      });
    } else {
      body = {
        model: effectiveModel,
        prompt: fullPrompt,
        temperature: Number.isFinite(temperature) ? temperature : 0.9,
        max_tokens:
          maxTokens && Number.isFinite(maxTokens) ? maxTokens : undefined,
      };
      logger.info({
        msg: "[API /api/llm] provider:openai completions payload",
        endpoint,
        model: body.model,
        promptLen: fullPrompt.length,
      });
    }
  } else if (provider === "gemini") {
    if (!GEMINI_LLM_API_KEY) {
      return res.status(500).json({ error: "Gemini LLM API anahtarı eksik." });
    }
    if (!process.env.GEMINI_LLM_MODEL) {
      return res.status(500).json({ error: "GEMINI_LLM_MODEL tanımlı değil." });
    }
    if (!process.env.GEMINI_LLM_ENDPOINT) {
      return res
        .status(500)
        .json({ error: "GEMINI_LLM_ENDPOINT tanımlı değil." });
    }
    const effectiveModel = modelId || process.env.GEMINI_LLM_MODEL;
    const geminiBase = process.env.GEMINI_LLM_ENDPOINT.replace(/\/$/, "");
    endpoint =
      clientEndpoint ||
      `${geminiBase}/${encodeURIComponent(effectiveModel)}:generateContent?key=${encodeURIComponent(GEMINI_LLM_API_KEY)}`;
    // Gemini generateContent formatı
    body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: Number.isFinite(temperature) ? temperature : 1.0,
        maxOutputTokens:
          maxTokens && Number.isFinite(maxTokens) ? maxTokens : undefined,
      },
    };
    logger.info({
      msg: "[API /api/llm] provider:gemini payload",
      endpoint,
      temperature: body.generationConfig.temperature,
      maxOutputTokens: body.generationConfig.maxOutputTokens,
      contentsLen: body.contents?.[0]?.parts?.[0]?.text?.length,
    });
  } else {
    // Diğer provider'lar için generic JSON format ve client-provided endpoint gerekir
    if (!endpoint) {
      return res
        .status(400)
        .json({ error: "Bilinmeyen LLM sağlayıcısı için endpoint belirtin." });
    }
    body = {
      model: modelId,
      prompt,
      temperature: Number.isFinite(temperature) ? temperature : 1.0,
      max_completion_tokens:
        maxTokens && Number.isFinite(maxTokens) ? maxTokens : undefined,
    };
    logger.info({
      msg: "[API /api/llm] provider:generic payload",
      endpoint,
      temperature: body.temperature,
      max_completion_tokens: body.max_completion_tokens,
      promptLen: (prompt || "").length,
    });
  }

  // Herhangi bir metin manipülasyonu veya yeniden biçimleme yapılmaz

  try {
    logger.info({ msg: "[API /api/llm] forwarding:start", endpoint });
    const t0 = Date.now();
    const response = await axios.post(endpoint, body, {
      headers,
      timeout: LLM_REQUEST_TIMEOUT_MS,
    });
    const duration = Date.now() - t0;
    const data = response.data;

    // Debug logging for API responses
    if (provider === "openai") {
      logger.info({
        msg: "[API /api/llm] OpenAI response received",
        status: response.status,
        hasOutput: Boolean(data.output),
        hasChoices: Boolean(data.choices),
      });
    } else if (provider === "gemini") {
      logger.info({
        msg: "[API /api/llm] Gemini response received",
        status: response.status,
        hasCandidates: Boolean(data.candidates),
        candidatesCount: data.candidates?.length || 0,
      });
    }

    // Transform response format to expected format
    let transformedData = data;

    // OpenAI Responses API format - actual content is in the 'output' field
    if (provider === "openai" && data.output && Array.isArray(data.output)) {
      // Find the message object with content in the output array
      let storyContent = "";
      for (const item of data.output) {
        if (
          item.type === "message" &&
          item.content &&
          Array.isArray(item.content)
        ) {
          // Look for output_text type in the content array
          for (const contentItem of item.content) {
            if (contentItem.type === "output_text" && contentItem.text) {
              storyContent = contentItem.text;
              break;
            }
          }
          if (storyContent) break;
        }
      }

      // If no content found, stringify the whole output for debugging
      if (!storyContent) {
        storyContent = JSON.stringify(data.output, null, 2);
        logger.warn({
          msg: "[API /api/llm] No story content found in OpenAI Responses API output",
          outputLength: data.output.length,
        });
      }

      transformedData = {
        text: storyContent,
        usage: data.usage,
        model: data.model,
        id: data.id,
      };
    }
    // Legacy Chat Completions format (fallback)
    else if (
      provider === "openai" &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message
    ) {
      transformedData = {
        text: data.choices[0].message.content,
        usage: data.usage,
        model: data.model,
        id: data.id,
      };
    }
    // Gemini API format
    else if (provider === "gemini" && data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0];
      let storyContent = "";

      // Extract text from parts
      if (
        candidate.content?.parts &&
        Array.isArray(candidate.content.parts)
      ) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            storyContent += part.text;
          }
        }
      }

      if (!storyContent) {
        logger.error({
          msg: "[API /api/llm] No text found in Gemini response",
          candidate: JSON.stringify(candidate).substring(0, 500),
        });
        throw new Error("Gemini API'den metin alınamadı");
      }

      transformedData = {
        text: storyContent,
        usage: data.usageMetadata,
        model: data.modelVersion,
        finishReason: candidate.finishReason,
      };

      logger.info({
        msg: "[API /api/llm] Gemini response transformed",
        textLength: storyContent.length,
        finishReason: candidate.finishReason,
      });
    }

    // Validate story response more robustly
    const story = transformedData?.text;
    if (!story || (typeof story === "string" && story.trim().length < 50)) {
      logger.warn({
        msg: "LLM response too short or empty",
        textLength: story?.length || 0,
      });
      throw new Error(
        "LLM yanıtı çok kısa veya boş. API ayarlarını kontrol edin.",
      );
    }

    // Additional validation to ensure it's actual story content
    if (typeof story === "string") {
      // Check if response looks like JSON or error message
      if (story.trim().startsWith("{") || story.trim().startsWith("[")) {
        logger.warn({
          msg: "LLM returned JSON instead of story text",
          preview: story.substring(0, 100),
        });
        throw new Error(
          "LLM yanıtı beklenen formatta değil. API ayarlarını kontrol edin.",
        );
      }
      if (
        story.toLowerCase().includes("error") ||
        story.toLowerCase().includes("invalid")
      ) {
        logger.warn({
          msg: "LLM response contains error keywords",
          preview: story.substring(0, 100),
        });
        throw new Error(
          "LLM bir hata mesajı döndürdü. API ayarlarını kontrol edin.",
        );
      }
    }

    logger.info({
      msg: "[API /api/llm] forwarding:success",
      status: response.status,
      durationMs: duration,
      keys: Object.keys(transformedData || {}),
      textLen:
        typeof transformedData?.text === "string"
          ? transformedData.text.length
          : undefined,
    });
    res.json(transformedData);
  } catch (error) {
    logger.error({
      msg: "LLM API Hatası",
      provider,
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data,
    });
    let errorMessage = "LLM API'sine istek gönderilirken hata oluştu.";
    if (error.response?.status === 401) {
      errorMessage = `${provider} API anahtarı geçersiz.`;
    } else if (error.response?.status === 400) {
      errorMessage = `${provider} API isteği hatalı.`;
    }
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
  try {
    logger.info({
      msg: "[API /api/llm] request:end",
      totalMs: Date.now() - tStart,
    });
  } catch {
    /* llm request end log skipped */
  }
});

// --- QUEUE API ---
// Kuyruğu getir
app.get("/api/queue", (req, res) => {
  try {
    const ids = storyDb.getQueue();
    res.json({ ids });
  } catch (error) {
    logger.error({ msg: "Kuyruk getirme hatası", error: error?.message });
    res.status(500).json({ error: "Kuyruk getirilirken hata oluştu." });
  }
});

// Kuyruğu komple sırayla ayarla
app.put("/api/queue", (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "ids array gereklidir." });
    }
    storyDb.setQueue(ids);
    res.json({ success: true });
  } catch (error) {
    logger.error({ msg: "Kuyruk güncelleme hatası", error: error?.message });
    res.status(500).json({ error: "Kuyruk güncellenirken hata oluştu." });
  }
});

// Kuyruğa ekle (sona)
app.post("/api/queue/add", (req, res) => {
  try {
    const { id } = req.body || {};
    const sid = parseInt(id);
    if (!Number.isFinite(sid) || sid <= 0) {
      return res
        .status(400)
        .json({ error: "Geçerli bir story id gereklidir." });
    }
    storyDb.addToQueue(sid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ msg: "Kuyruğa ekleme hatası", error: error?.message });
    res.status(500).json({ error: "Kuyruğa eklenirken hata oluştu." });
  }
});

// Kuyruktan çıkar
app.delete("/api/queue/:id", (req, res) => {
  try {
    const sid = parseInt(req.params.id);
    if (!Number.isFinite(sid) || sid <= 0) {
      return res
        .status(400)
        .json({ error: "Geçerli bir story id gereklidir." });
    }
    storyDb.removeFromQueue(sid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ msg: "Kuyruktan çıkarma hatası", error: error?.message });
    res.status(500).json({ error: "Kuyruktan çıkarılırken hata oluştu." });
  }
});

// --- VERİTABANI API ENDPOINT'LERİ ---

// Masal arama endpoint'i (MUST be before /:id route)
app.get("/api/stories/search", (req, res) => {
  try {
    const { q: query, limit, type, useFTS } = req.query;

    // Input validation
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "Arama sorgusu gereklidir." });
    }

    // Parse options
    const searchOptions = {
      limit: limit ? Math.min(parseInt(limit) || 20, 100) : 20,
      useFTS: useFTS !== "false", // Default true unless explicitly disabled
    };

    // Minimum query length validation moved here
    if (query.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "Arama sorgusu en az 2 karakter olmalıdır." });
    }

    let results;

    // Different search types
    switch (type) {
      case "title":
        results = storyDb.searchStoriesByTitle(query, searchOptions.limit);
        break;
      case "content":
        results = storyDb.searchStoriesByContent(query, searchOptions.limit);
        break;
      default:
        results = storyDb.searchStories(query, searchOptions);
    }

    logger.info({
      msg: "Arama tamamlandı",
      query: query.substring(0, 50),
      type: type || "all",
      resultCount: results.length,
      useFTS: searchOptions.useFTS,
    });

    res.json({
      query,
      type: type || "all",
      results,
      count: results.length,
      usedFTS: searchOptions.useFTS,
    });
  } catch (error) {
    logger.error({
      msg: "Arama hatası",
      error: error?.message,
      query: req.query.q,
    });
    res.status(500).json({ error: "Arama yapılırken hata oluştu." });
  }
});

// Tüm masalları getir
app.get("/api/stories", (req, res) => {
  try {
    const stories = storyDb.getAllStories();
    res.json(stories);
  } catch (error) {
    logger.error({ msg: "Masalları getirme hatası", error: error?.message });
    res.status(500).json({ error: "Masallar getirilirken hata oluştu." });
  }
});

// Belirli bir masalı getir
app.get("/api/stories/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Input validation: ID must be a positive integer
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Geçersiz masal ID'si." });
    }

    const story = storyDb.getStoryWithAudio(id);

    if (!story) {
      return res.status(404).json({ error: "Masal bulunamadı." });
    }

    res.json(story);
  } catch (error) {
    logger.error({ msg: "Masal getirme hatası", error: error?.message });
    res.status(500).json({ error: "Masal getirilirken hata oluştu." });
  }
});

// Yeni masal oluştur
app.post("/api/stories", (req, res) => {
  try {
    logger.info({
      msg: "POST /api/stories - request",
      bodyKeys: Object.keys(req.body || {}),
      contentLen:
        typeof req.body?.storyText === "string"
          ? req.body.storyText.length
          : undefined,
      storyType: req.body?.storyType,
    });
    const { storyText, storyType, customTopic } = req.body;

    // Input validation
    if (!storyText) {
      logger.warn({
        msg: "POST /api/stories - validation error",
        storyText: typeof storyText,
        storyType: typeof storyType,
      });
      return res.status(400).json({ error: "Masal metni gereklidir." });
    }

    if (typeof storyText !== "string" || storyText.trim().length < 50) {
      return res
        .status(400)
        .json({ error: "Masal metni en az 50 karakter olmalıdır." });
    }

    if (storyText.length > 10000) {
      return res
        .status(400)
        .json({ error: "Masal metni 10.000 karakterden uzun olamaz." });
    }

    // Default storyType if not provided (for voice-generated stories)
    const finalStoryType = storyType || "voice_generated";
    const finalCustomTopic = customTopic || "";

    if (
      typeof finalStoryType !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(finalStoryType)
    ) {
      return res.status(400).json({ error: "Geçersiz masal türü." });
    }

    if (
      finalCustomTopic &&
      (typeof finalCustomTopic !== "string" || finalCustomTopic.length > 200)
    ) {
      return res
        .status(400)
        .json({ error: "Özel konu 200 karakterden uzun olamaz." });
    }

    logger.info({ msg: "DB:createStory:begin", storyType: finalStoryType });
    const story = storyDb.createAndFetchStory(
      storyText.trim(),
      finalStoryType,
      finalCustomTopic?.trim(),
    );
    logger.info({
      msg: "DB:createAndFetch:done",
      found: Boolean(story),
      id: story?.id,
      inconsistent: (story as any)?._inconsistent,
    });
    if (!story) {
      return res.status(500).json({ error: "Story create sonrası okunamadı." });
    }
    const wantAuto = req.query.autoTts === "1" || req.body.autoTts === true;
    if ((story as any)?._inconsistent) {
      // Inconsistent durumda bile kullanıcıya hemen dön; background TTS denemesini ertele
      res.status(202).json(story);
      return;
    }
    res.status(201).json(story);
    if (wantAuto) {
      // Hemen arka planda TTS isteği
      const autoProvider = process.env.AUTO_TTS_PROVIDER || undefined;
      setTimeout(() => {
        try {
          const axios = require("axios");
          axios
            .post(`http://localhost:${process.env.PORT || 3001}/api/tts`, {
              storyId: story.id,
              provider: autoProvider,
            })
            .then(() =>
              console.log("[AUTO TTS] Başlatıldı", {
                storyId: story.id,
                provider: autoProvider,
              }),
            )
            .catch((e) => console.error("[AUTO TTS] Hata", e?.message));
        } catch (e) {
          console.error("[AUTO TTS] trigger exception", e?.message);
        }
      }, 50);
    }
  } catch (error) {
    logger.error({ msg: "Masal oluşturma hatası", error: error.message });
    res.status(500).json({ error: "Masal oluşturulurken hata oluştu." });
  }
});

// Masal güncelle
app.put("/api/stories/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Input validation: ID must be a positive integer
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Geçersiz masal ID'si." });
    }

    const { storyText, storyType, customTopic } = req.body;

    // Input validation
    if (!storyText) {
      return res.status(400).json({ error: "Masal metni gereklidir." });
    }

    if (typeof storyText !== "string" || storyText.trim().length < 50) {
      return res
        .status(400)
        .json({ error: "Masal metni en az 50 karakter olmalıdır." });
    }

    if (storyText.length > 10000) {
      return res
        .status(400)
        .json({ error: "Masal metni 10.000 karakterden uzun olamaz." });
    }

    // Default storyType if not provided (for voice-generated stories)
    const finalStoryType = storyType || "voice_generated";
    const finalCustomTopic = customTopic || "";

    if (
      typeof finalStoryType !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(finalStoryType)
    ) {
      return res.status(400).json({ error: "Geçersiz masal türü." });
    }

    if (
      finalCustomTopic &&
      (typeof finalCustomTopic !== "string" || finalCustomTopic.length > 200)
    ) {
      return res
        .status(400)
        .json({ error: "Özel konu 200 karakterden uzun olamaz." });
    }

    const updated = storyDb.updateStory(
      id,
      storyText.trim(),
      finalStoryType,
      finalCustomTopic?.trim(),
    );

    if (!updated) {
      return res.status(404).json({ error: "Güncellenecek masal bulunamadı." });
    }

    const story = storyDb.getStory(id);
    res.json(story);
  } catch (error) {
    logger.error({ msg: "Masal güncelleme hatası", error: error?.message });
    res.status(500).json({ error: "Masal güncellenirken hata oluştu." });
  }
});

// Masal sil
app.delete("/api/stories/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Input validation: ID must be a positive integer
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Geçersiz masal ID'si." });
    }

    const deleted = storyDb.deleteStory(id);

    if (!deleted) {
      return res.status(404).json({ error: "Silinecek masal bulunamadı." });
    }

    res.json({ message: "Masal başarıyla silindi." });
  } catch (error) {
    logger.error({ msg: "Masal silme hatası", error: error?.message });
    res.status(500).json({ error: "Masal silinirken hata oluştu." });
  }
});

// Masalın favori durumunu güncelle (PATCH)
app.patch("/api/stories/:id/favorite", (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Input validation: ID must be a positive integer
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Geçersiz masal ID'si." });
    }

    const { isFavorite, is_favorite } = req.body;
    const favoriteValue = isFavorite !== undefined ? isFavorite : is_favorite;

    if (typeof favoriteValue !== "boolean") {
      return res.status(400).json({
        error: "isFavorite veya is_favorite boolean değer olmalıdır.",
      });
    }

    const updated = storyDb.updateStoryFavorite(id, favoriteValue);

    if (!updated) {
      return res.status(404).json({ error: "Güncellenecek masal bulunamadı." });
    }

    res.json({
      message: "Favori durumu başarıyla güncellendi.",
      story: updated,
    });
  } catch (error) {
    logger.error({ msg: "Favori güncelleme hatası", error: error?.message });
    res
      .status(500)
      .json({ error: "Favori durumu güncellenirken hata oluştu." });
  }
});

// Masalın favori durumunu güncelle (PUT - aynı işlevsellik)
app.put("/api/stories/:id/favorite", (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Input validation: ID must be a positive integer
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Geçersiz masal ID'si." });
    }

    const { isFavorite, is_favorite } = req.body;
    const favoriteValue = isFavorite !== undefined ? isFavorite : is_favorite;

    if (typeof favoriteValue !== "boolean") {
      return res.status(400).json({
        error: "isFavorite veya is_favorite boolean değer olmalıdır.",
      });
    }

    const updated = storyDb.updateStoryFavorite(id, favoriteValue);

    if (!updated) {
      return res.status(404).json({ error: "Güncellenecek masal bulunamadı." });
    }

    res.json({
      message: "Favori durumu başarıyla güncellendi.",
      story: updated,
    });
  } catch (error) {
    logger.error({
      msg: "Favori durumu güncelleme hatası",
      error: error?.message,
    });
    res
      .status(500)
      .json({ error: "Favori durumu güncellenirken hata oluştu." });
  }
});

// Belirli türdeki masalları getir
app.get("/api/stories/type/:storyType", (req, res) => {
  try {
    const storyType = req.params.storyType;

    // Input validation: storyType should be alphanumeric
    if (
      !storyType ||
      typeof storyType !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(storyType)
    ) {
      return res.status(400).json({ error: "Geçersiz masal türü." });
    }

    const stories = storyDb.getStoriesByType(storyType);
    res.json(stories);
  } catch (error) {
    logger.error({
      msg: "Tip bazlı masal getirme hatası",
      error: error?.message,
    });
    res.status(500).json({ error: "Masallar getirilirken hata oluştu." });
  }
});

// --- TTS İSTEKLERİ İÇİN ENDPOINT (GÜNCELLENMİŞ) ---
app.post("/api/tts", async (req, res) => {
  logger.info({
    msg: "[Backend TTS] Request received",
    provider: req.body.provider,
    voiceId: req.body.voiceId,
    hasRequestBody: Boolean(req.body.requestBody),
    storyId: req.body.storyId,
    autoMode: !req.body.requestBody && Boolean(req.body.storyId),
  });

  // Frontend veya otomatik çağrıdan gelen parametreler
  let {
    provider,
    modelId,
    voiceId,
    requestBody,
    storyId,
    endpoint: clientEndpoint,
  } = req.body;

  // Varsayılan provider seç (env önceliği: AUTO_TTS_PROVIDER > ELEVENLABS > GEMINI)
  if (!provider) {
    if (process.env.AUTO_TTS_PROVIDER) provider = process.env.AUTO_TTS_PROVIDER;
    else if (process.env.ELEVENLABS_API_KEY) provider = "elevenlabs";
    else if (process.env.GEMINI_TTS_API_KEY || process.env.GEMINI_LLM_API_KEY)
      provider = "gemini";
  }

  // Eğer requestBody yok ama storyId varsa hikayeyi DB'den çekip otomatik body üret
  if (!requestBody && storyId) {
    try {
      const sid = parseInt(storyId);
      if (!isNaN(sid) && sid > 0) {
        const story = storyDb.getStory(sid);
        if (!story) {
          return res.status(404).json({ error: "TTS için masal bulunamadı." });
        }
        const text = story.story_text;
        if (provider === "elevenlabs") {
          requestBody = { text };
        } else if (provider === "gemini") {
          requestBody = {
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName:
                      voiceId || process.env.GEMINI_TTS_VOICE || "Zephyr",
                  },
                },
              },
            },
          };
        } else {
          // Generic - en basit text alanı
          requestBody = { text };
        }
        logger.info({
          msg: "[Backend TTS] Auto-built requestBody from story",
          provider,
          storyId: sid,
          textLen: text.length,
        });
      }
    } catch (e) {
      logger.error({
        msg: "[Backend TTS] Auto-build failed",
        error: e?.message,
      });
      return res
        .status(500)
        .json({ error: "Otomatik TTS body oluşturulamadı." });
    }
  }

  // Nihai doğrulama
  if (!provider || !requestBody) {
    logger.warn({
      msg: "[Backend TTS] Validation failed",
      provider,
      hasRequestBody: Boolean(requestBody),
    });
    return res.status(400).json({ error: "Provider veya request body eksik." });
  }
  // Provider kısıtlaması kaldırıldı: generic sağlayıcılar için endpoint gereklidir

  // Metin kontrolü
  let textToSpeak;
  if (provider === "elevenlabs") {
    textToSpeak = requestBody.text;
  } else if (provider === "gemini") {
    textToSpeak = requestBody.contents?.[0]?.parts?.[0]?.text;
  } else {
    // Generic TTS: yaygın alan adlarını dene
    textToSpeak =
      requestBody.text ||
      requestBody.input ||
      requestBody.ssml ||
      requestBody.contents?.[0]?.parts?.[0]?.text ||
      "";
  }
  if (
    !textToSpeak ||
    typeof textToSpeak !== "string" ||
    textToSpeak.trim().length === 0
  ) {
    return res
      .status(400)
      .json({ error: "TTS için geçerli bir metin gereklidir." });
  }

  // Varsayılan endpointler (override edilebilir)
  if (
    process.env.MAX_CONCURRENT_TTS &&
    process.env.MAX_CONCURRENT_TTS !== "1"
  ) {
    // Politika gereği zorla 1 yap (env yanlış ayarlansa da)
    process.env.MAX_CONCURRENT_TTS = "1";
    if (
      process.env.MAX_CONCURRENT_TTS &&
      process.env.MAX_CONCURRENT_TTS !== "1"
    ) {
      // Politika gereği: sadece 1 izin verilir, env yanlışsa uyarı ver
      console.warn(
        `[Config] MAX_CONCURRENT_TTS env '${process.env.MAX_CONCURRENT_TTS}' olarak ayarlanmış, ancak sadece '1' destekleniyor. Uygulama '1' ile devam edecek.`,
      );
    }
  }
  // İleride maxConcurrentTTS kullanılacaksa, buradan alınmalı
  const ELEVEN_BASE = (process.env.ELEVENLABS_ENDPOINT || "").replace(
    /\/$/,
    "",
  );
  const GEMINI_BASE = (
    process.env.GEMINI_TTS_ENDPOINT ||
    process.env.GEMINI_LLM_ENDPOINT ||
    ""
  ).replace(/\/$/, "");
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const GEMINI_TTS_API_KEY =
    process.env.GEMINI_TTS_API_KEY || process.env.GEMINI_LLM_API_KEY;

  console.log("🔊 [Backend TTS] API Keys status:", {
    elevenlabs: ELEVENLABS_API_KEY ? "DEFINED" : "UNDEFINED",
    gemini: GEMINI_TTS_API_KEY ? "DEFINED" : "UNDEFINED",
  });

  let endpoint;
  let headers = {};
  let response;
  let attemptsUsed = 0;

  try {
    const execOnce = async () => {
      if (provider === "elevenlabs") {
        console.log("🔊 [Backend TTS] Using ElevenLabs provider");
        if (!ELEVENLABS_API_KEY) {
          throw new Error("ElevenLabs API anahtarı eksik");
        }
        if (!process.env.ELEVENLABS_VOICE_ID && !voiceId) {
          throw new Error("ELEVENLABS_VOICE_ID tanımlı değil");
        }
        if (!process.env.ELEVENLABS_ENDPOINT && !clientEndpoint) {
          throw new Error("ELEVENLABS_ENDPOINT tanımlı değil");
        }
        const effectiveVoice = voiceId || process.env.ELEVENLABS_VOICE_ID;
        const audioFormat = "mp3_44100_128";
        endpoint =
          clientEndpoint ||
          `${ELEVEN_BASE}/${encodeURIComponent(effectiveVoice)}?output_format=${audioFormat}`;
        headers = {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        };
        return await axios.post(endpoint, requestBody, {
          headers,
          responseType: "stream",
        });
      } else if (provider === "gemini") {
        if (!GEMINI_TTS_API_KEY) {
          throw new Error("Gemini TTS API anahtarı eksik");
        }
        if (
          !process.env.GEMINI_TTS_MODEL &&
          !process.env.GEMINI_LLM_MODEL &&
          !modelId
        ) {
          throw new Error("GEMINI_TTS_MODEL tanımlı değil");
        }
        if (
          !process.env.GEMINI_TTS_ENDPOINT &&
          !process.env.GEMINI_LLM_ENDPOINT &&
          !clientEndpoint
        ) {
          throw new Error("GEMINI_TTS_ENDPOINT tanımlı değil");
        }
        const effectiveModel =
          modelId ||
          process.env.GEMINI_TTS_MODEL ||
          process.env.GEMINI_LLM_MODEL;
        const base = GEMINI_BASE || "";
        if (!base && !clientEndpoint) {
          throw new Error("Gemini base endpoint yok");
        }
        endpoint =
          clientEndpoint ||
          `${base}/${encodeURIComponent(effectiveModel)}:generateContent?key=${encodeURIComponent(GEMINI_TTS_API_KEY)}`;
        headers = { "Content-Type": "application/json" };
        logger.info({
          msg: "[Gemini TTS] Request",
          endpoint,
          requestBody: JSON.stringify(requestBody).substring(0, 500),
        });
        const resp = await axios.post(endpoint, requestBody, { headers });
        logger.info({
          msg: "[Gemini TTS] Response",
          status: resp.status,
          hasAudio:
            Boolean(resp.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data),
        });
        if (resp.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
          const audioData =
            resp.data.candidates[0].content.parts[0].inlineData.data;
          const pcmBuffer = Buffer.from(audioData, "base64");
          // Convert PCM to WAV (Gemini returns raw PCM: 16-bit, 24kHz, mono)
          const wavBuffer = pcmToWav(pcmBuffer);
          logger.info({
            msg: "[Gemini TTS] Converted PCM to WAV",
            pcmSize: pcmBuffer.length,
            wavSize: wavBuffer.length,
          });
          const { Readable } = require("stream");
          const audioStream = new Readable();
          audioStream.push(wavBuffer);
          audioStream.push(null);
          resp.data = audioStream;
          resp.headers = { "content-type": "audio/wav" };
          return resp;
        }
        logger.error({
          msg: "[Gemini TTS] No audio data in response",
          response: JSON.stringify(resp.data).substring(0, 1000),
        });
        throw new Error("Gemini API'den ses verisi alınamadı");
      } else {
        if (!clientEndpoint) {
          throw new Error("Generic provider için endpoint gerekli");
        }
        endpoint = clientEndpoint;
        headers = { "Content-Type": "application/json" };
        return await axios.post(endpoint, requestBody, {
          headers,
          responseType: "stream",
        });
      }
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        attemptsUsed = attempt;
        response = await execOnce();
        break;
      } catch (err) {
        logger.error({
          msg: "TTS attempt failed",
          attempt,
          provider,
          error: err?.message,
          response: err?.response?.data
            ? JSON.stringify(err.response.data).substring(0, 500)
            : undefined,
          status: err?.response?.status,
        });
        if (attempt === 2) {
          return res.status(500).json({ error: "TTS başarısız (max retry)." });
        }
      }
    }

    // Minimal logging, hassas veri yok
    logger.info({
      msg: "TTS response received",
      provider,
      status: response.status,
      attempts: attemptsUsed,
    });

    // Eğer storyId varsa, ses dosyasını kaydet
    if (storyId) {
      // Security: Validate storyId to prevent path traversal attacks
      const sanitizedStoryId = parseInt(storyId);
      if (isNaN(sanitizedStoryId) || sanitizedStoryId <= 0) {
        logger.warn({ msg: "Invalid storyId format", storyId });
        // Continue without saving file but still stream to client
        const contentType = provider === "gemini" ? "audio/wav" : "audio/mpeg";
        res.setHeader("Content-Type", contentType);
        res.setHeader("x-tts-attempts", String(attemptsUsed));
        response.data.pipe(res);
        return;
      }

      try {
        // Security: Use sanitized storyId for filename
        // Use .wav for Gemini (PCM converted to WAV), .mp3 for others
        const fileExtension = provider === "gemini" ? "wav" : "mp3";
        const fileName = `story-${sanitizedStoryId}-${Date.now()}.${fileExtension}`;
        const filePath = path.join(storyDb.getAudioDir(), fileName);

        // Use PassThrough streams to tee the incoming stream
        const tee1 = new PassThrough();
        const tee2 = new PassThrough();

        // Tee the incoming stream
        response.data.pipe(tee1);
        response.data.pipe(tee2);

        // Ses dosyasını kaydet
        const writeStream = fs.createWriteStream(filePath);
        pipeline(tee1, writeStream, (err) => {
          if (err) {
            logger.error({ msg: "File pipeline error", error: err?.message });
          } else {
            logger.info({ msg: "Audio file saved", filePath });
            // Veritabanına ses dosyası bilgisini kaydet
            try {
              // Voice ID'yi provider'a göre çıkar
              let usedVoiceId = "unknown";
              if (provider === "elevenlabs") {
                usedVoiceId = voiceId || "unknown";
              } else if (provider === "gemini") {
                usedVoiceId =
                  requestBody.generationConfig?.speechConfig?.voiceConfig
                    ?.prebuiltVoiceConfig?.voiceName || "unknown";
              }

              storyDb.saveAudio(
                sanitizedStoryId,
                fileName,
                filePath,
                usedVoiceId,
                requestBody,
              );
              logger.info({
                msg: "Audio info saved to database",
                storyId: sanitizedStoryId,
              });
            } catch (dbError) {
              logger.error({
                msg: "Database save error",
                error: dbError?.message,
              });
            }
          }
        });

        // Aynı zamanda client'a da stream gönder
        const contentType = provider === "gemini" ? "audio/wav" : "audio/mpeg";
        res.setHeader("Content-Type", contentType);
        res.setHeader("x-tts-attempts", String(attemptsUsed));
        pipeline(tee2, res, (err) => {
          if (err)
            logger.error({
              msg: "Client stream pipeline error",
              error: err?.message,
            });
        });
      } catch (fileError) {
        logger.error({ msg: "File handling error", error: fileError?.message });
        // Dosya hatası olsa bile client'a stream gönder
        const contentType = provider === "gemini" ? "audio/wav" : "audio/mpeg";
        res.setHeader("Content-Type", contentType);
        response.data.pipe(res);
      }
    } else {
      // StoryId yoksa sadece client'a stream gönder
      const contentType = provider === "gemini" ? "audio/wav" : "audio/mpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("x-tts-attempts", String(attemptsUsed));
      response.data.pipe(res);
    }
  } catch (error) {
    logger.error({
      msg: "TTS API Hatası",
      provider,
      status: error.response?.status,
      statusText: error.response?.statusText,
      error: error.message,
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

    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});

// --- VOICE ASSISTANT API ENDPOINT ---
// Smart voice assistant for story generation and TTS commands
app.post("/api/voice-assistant", async (req, res) => {
  const tStart = Date.now();

  try {
    logger.info({
      msg: "[Voice Assistant] Request received",
      transcript: req.body.transcript?.substring(0, 100),
    });

    // Basic validation
    const raw = req.body.transcript;
    if (typeof raw !== "string") {
      return res.status(400).json({ error: "Transcript required" });
    }
    const transcript = raw.trim();
    if (!transcript) {
      return res.status(400).json({ error: "Empty transcript" });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error:
          "OpenAI API key missing. Please set OPENAI_API_KEY in backend/.env.",
      });
    }

    // Optional: allow short control intents WITHOUT generating a full story.
    // Detect very short pure TTS intent phrases (e.g., just asking to read existing story aloud)
    const ttsControlRegex =
      /^(ses(lendir|e cevir|li oku)|oku|dinlemek ist(iyorum)?|sese cevir)$/i;
    if (ttsControlRegex.test(transcript)) {
      return res.json({
        response: "Mevcut masalı sese dönüştürmeye hazırım.",
        isTtsRequest: true,
        originalTranscript: transcript,
      });
    }

    const systemPrompt = `Sen bir çocuklar için masal asistanısın. Görevin:
1. MASAL ÜRETİMİ: Her isteği masal talebi olarak değerlendir ve uygun, eğitici, sevgi dolu, yaşa uygun bir masal üret.
2. TTS İSTEĞİ: Eğer kullanıcı sadece mevcut masalı seslendirmek istiyorsa (örn: \'seslendir\', \'sesli oku\', \'dinlemek istiyorum\'), yanıtı '__TTS_REQUEST__ Mevcut masalı seslendiriyorum.' şeklinde ver.
3. EĞER KULLANICI AÇIKÇA YENİ MASAL İSTİYORSA: Tam masalı üret (en az 6-8 cümle, sakin ve uyku öncesi ton). Başına '__TTS_REQUEST__' KOYMA.
4. SADECE MASAL VEYA TTS İSTEĞİNE CEVAP VER. Başka açıklama, meta yorum, rol tekrarı yapma.
5. FORMAT: Paragraflar halinde, sade, Türkçe ve 5 yaşındaki bir çocuk için anlaşılır.
`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    let aiResponse = (
      response.data.choices?.[0]?.message?.content || ""
    ).trim();

    // Safety: fallback if empty
    if (!aiResponse) {
      aiResponse =
        "Küçük bir kahramanın sevgi ve cesaretle dolu macerasını anlatan bir masal hazırlayamıyorum şu an, lütfen tekrar dener misin?";
    }

    const isTtsRequest = aiResponse.startsWith("__TTS_REQUEST__");
    const finalResponse = isTtsRequest
      ? aiResponse.replace("__TTS_REQUEST__", "").trim()
      : aiResponse;

    logger.info({
      msg: "[Voice Assistant] Response generated",
      isTtsRequest,
      responsePreview: finalResponse.substring(0, 80),
      durationMs: Date.now() - tStart,
    });

    return res.json({
      response: finalResponse,
      isTtsRequest,
      originalTranscript: transcript,
    });
  } catch (error) {
    logger.error({
      msg: "[Voice Assistant] Request failed",
      error: error.message,
      status: error.response?.status,
      durationMs: Date.now() - tStart,
    });
    let statusCode = error.response?.status || 500;
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
      statusCode = 408;
    return res
      .status(statusCode)
      .json({ error: "Voice assistant processing failed." });
  }
});

// --- RASPBERRY PI AUDIO PLAYBACK ENDPOINT ---

// Endpoint for playing audio on Raspberry Pi with IQAudio Codec Zero
app.post("/api/raspberry-audio/play", async (req, res) => {
  const tStart = Date.now();

  try {
    logger.info({
      msg: "[Raspberry Audio] Playback request received",
      audioFile: req.body.audioFile?.substring(0, 100),
    });

    // Input validation
    if (!req.body.audioFile || typeof req.body.audioFile !== "string") {
      return res.status(400).json({ error: "Audio file path required" });
    }

    const audioFilePath = req.body.audioFile;
    const volume = req.body.volume || 80; // Default volume 80%

    // Check if we're running on Raspberry Pi
    const { exec } = require("child_process");
    const os = require("os");
    const fs = require("fs");
    const path = require("path");

    // Resolve audio file path
    let fullAudioPath = audioFilePath;

    // If relative path like "audio/story-123.mp3", resolve to full path
    if (!path.isAbsolute(audioFilePath)) {
      fullAudioPath = path.join(__dirname, audioFilePath);
    }

    // Verify the audio file exists
    if (!fs.existsSync(fullAudioPath)) {
      logger.error({
        msg: "[Raspberry Audio] Audio file not found",
        originalPath: audioFilePath,
        resolvedPath: fullAudioPath,
      });
      return res.status(404).json({
        error: "Audio file not found",
        path: fullAudioPath,
      });
    }

    // IQAudio Codec Zero configuration for ALSA
    const alsaDevice = "hw:1,0"; // IQAudio Codec Zero typically appears as hw:1,0
    const alsaCommand = `aplay -D ${alsaDevice} -f cd "${fullAudioPath}"`;

    // Alternative: Use omxplayer for better Pi performance
    const omxCommand = `omxplayer --vol ${(volume - 100) * 60} -o alsa:hw:1,0 "${fullAudioPath}"`;

    // Check if omxplayer exists (Pi-specific), otherwise use aplay
    const playCommand = fs.existsSync("/usr/bin/omxplayer")
      ? omxCommand
      : alsaCommand;

    logger.info({
      msg: "[Raspberry Audio] Executing audio playback",
      command: playCommand.substring(0, 100),
      device: alsaDevice,
      volume: volume,
    });

    // Execute the audio playback command
    exec(playCommand, (error, stdout, stderr) => {
      if (error) {
        logger.error({
          msg: "[Raspberry Audio] Playback failed",
          error: error.message,
          stderr: stderr,
        });
        return;
      }

      logger.info({
        msg: "[Raspberry Audio] Playback completed successfully",
        stdout: stdout?.substring(0, 200),
        durationMs: Date.now() - tStart,
      });
    });

    // Return immediately (don't wait for playback to complete)
    res.json({
      success: true,
      message: "Audio playback started on Raspberry Pi",
      device: alsaDevice,
      volume: volume,
      audioFile: fullAudioPath,
    });
  } catch (error) {
    const duration = Date.now() - tStart;

    logger.error({
      msg: "[Raspberry Audio] Request failed",
      error: error.message,
      durationMs: duration,
    });

    res.status(500).json({
      error: "Raspberry Pi audio playback failed",
      details: error.message,
    });
  }
});

// Stop audio playback
app.post("/api/raspberry-audio/stop", async (req, res) => {
  try {
    const { exec } = require("child_process");

    // Kill all audio playback processes
    exec('pkill -f "aplay|omxplayer"', (error) => {
      if (error && !error.message.includes("no process found")) {
        logger.error({
          msg: "[Raspberry Audio] Stop failed",
          error: error.message,
        });
        return res.status(500).json({ error: "Failed to stop audio playback" });
      }

      logger.info("[Raspberry Audio] Playback stopped");
      res.json({ success: true, message: "Audio playback stopped" });
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to stop audio playback" });
  }
});

// Check audio system status
app.get("/api/raspberry-audio/status", async (req, res) => {
  try {
    const os = require("os");

    // Check if we're on Raspberry Pi
    const isRaspberryPi =
      os.cpus()[0]?.model.includes("ARM") ||
      (os.platform() === "linux" && os.arch() === "arm");

    // If not on Linux, return not a Pi status immediately
    if (os.platform() !== "linux") {
      return res.json({
        isRaspberryPi: false,
        audioDevice: "not-available",
        status: "not-raspberry-pi",
        error: "Not running on Linux/Raspberry Pi",
      });
    }

    // Only check ALSA devices if we're on Linux
    const { exec } = require("child_process");
    exec("aplay -l", (error, stdout, stderr) => {
      if (error) {
        return res.json({
          isRaspberryPi,
          audioDevice: "unknown",
          status: "error",
          error: error.message,
        });
      }

      const hasIQAudio =
        stdout.includes("IQaudIOCODEC") || stdout.includes("card 1");

      res.json({
        isRaspberryPi,
        audioDevice: hasIQAudio ? "IQAudio Codec Zero" : "default",
        alsaDevices: stdout,
        status: "ready",
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check audio status" });
  }
});

// --- STT API ENDPOINT ---

// GPT-4o-mini-transcribe endpoint (new enhanced STT model)
app.post("/api/stt/transcribe", upload.single("audio"), async (req, res) => {
  const tStart = Date.now();

  try {
    logger.info({
      msg: "[STT GPT-4o-mini-transcribe] Request received",
      language: req.body.language,
      hasAudioFile: Boolean(req.file),
      audioSize: req.file?.size,
      audioType: req.file?.mimetype,
    });

    // Input validation
    if (!req.file) {
      return res.status(400).json({ error: "Audio file required" });
    }

    const { language = "tr", response_format = "json" } = req.body;

    // Audio file validation
    const audioBuffer = req.file.buffer;
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: "Invalid audio file." });
    }

    // File size check
    if (audioBuffer.length < 1000) {
      return res
        .status(400)
        .json({ error: "Audio file too short. Please record longer." });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error:
          "OpenAI API key missing. Please set OPENAI_API_KEY in backend/.env.",
      });
    }

    // Helper function to get file extension from MIME type
    const getFileExtension = (mimeType: string): string => {
      switch (mimeType) {
        case "audio/wav":
          return ".wav";
        case "audio/mp4":
          return ".mp4";
        case "audio/mpeg":
          return ".mp3";
        case "audio/mp3":
          return ".mp3";
        case "audio/webm":
          return ".webm";
        case "audio/webm;codecs=opus":
          return ".webm";
        case "audio/ogg":
          return ".ogg";
        case "audio/m4a":
          return ".m4a";
        default:
          return ".wav"; // Default to WAV for compatibility
      }
    };

    // Create form data for GPT-4o-mini-transcribe
    const formData = new FormData();
    const mimeType = req.file.mimetype || "audio/wav";
    const fileExtension = getFileExtension(mimeType);

    formData.append("file", audioBuffer, {
      filename: `audio${fileExtension}`,
      contentType: mimeType,
    });
    formData.append("model", "gpt-4o-mini-transcribe");
    formData.append("language", language);
    formData.append("response_format", response_format);

    logger.debug({
      msg: "[STT GPT-4o-mini-transcribe] Sending to OpenAI",
      model: "gpt-4o-mini-transcribe",
      language,
      audioSize: audioBuffer.length,
      mimeType,
      fileExtension,
      responseFormat: response_format,
      filename: `audio${fileExtension}`,
    });

    // Call OpenAI GPT-4o-mini-transcribe API
    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      formData,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        timeout: Number(process.env.STT_TIMEOUT_MS || 15000),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );

    // Extract transcription with enhanced metadata
    const transcriptionResult = {
      text: response.data.text?.trim() || "",
      language: response.data.language,
      duration: response.data.duration,
      segments: response.data.segments || [], // Word-level timing
      model: "gpt-4o-mini-transcribe",
    };

    // Validate transcription result
    if (!transcriptionResult.text || transcriptionResult.text.length === 0) {
      return res.status(422).json({
        error: "No text extracted from audio. Please speak more clearly.",
      });
    }

    // Log successful transcription
    const duration = Date.now() - tStart;
    logger.info({
      msg: "[STT GPT-4o-mini-transcribe] Transcription successful",
      textLength: transcriptionResult.text.length,
      durationMs: duration,
      hasSegments: transcriptionResult.segments.length > 0,
    });

    res.json(transcriptionResult);
  } catch (error) {
    const duration = Date.now() - tStart;

    // Log detailed error information
    logger.error({
      msg: "[STT GPT-4o-mini-transcribe] Transcription failed",
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      durationMs: duration,
      mimeType: req.file?.mimetype,
      audioSize: req.file?.size,
    });

    let errorMessage = "GPT-4o-mini-transcribe processing failed.";
    let statusCode = 500;

    if (error.response?.status === 401) {
      errorMessage = "OpenAI API key invalid.";
      statusCode = 401;
    } else if (error.response?.status === 400) {
      // Get more specific error from OpenAI
      const openaiError = error.response?.data?.error || {};
      errorMessage =
        `Audio file format invalid or unsupported. ${openaiError.message || ""}`.trim();
      statusCode = 400;
    } else if (error.response?.status === 429) {
      errorMessage = "API rate limit exceeded. Please try again later.";
      statusCode = 429;
    } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      errorMessage = "STT API timeout. Please try again.";
      statusCode = 408;
    }

    res.status(statusCode).json({
      error: errorMessage,
      model: "gpt-4o-mini-transcribe",
    });
  }
});

// Test route to verify server updates
app.get("/api/test/stt-transcribe", (req, res) => {
  res.json({
    message: "STT transcribe endpoint test - server updated successfully",
    timestamp: new Date().toISOString(),
  });
});

// Speech-to-Text API endpoint with OpenAI Whisper and Deepgram support (legacy)
app.post("/api/stt", upload.single("audio"), async (req, res) => {
  const tStart = Date.now();

  try {
    logger.info({
      msg: "[STT API] Request received",
      provider: req.body.provider,
      model: req.body.model,
      language: req.body.language,
      hasAudioFile: Boolean(req.file),
      audioSize: req.file?.size,
      audioType: req.file?.mimetype,
    });

    // Input validation
    if (!req.file) {
      return res.status(400).json({ error: "Ses dosyası gereklidir." });
    }

    const {
      provider = "openai",
      model,
      language = "tr",
      response_format,
      temperature,
    } = req.body;

    // Provider validation
    if (!["openai", "deepgram"].includes(provider)) {
      return res
        .status(400)
        .json({ error: "Desteklenen provider: openai, deepgram" });
    }

    // Audio file validation
    const audioBuffer = req.file.buffer;
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: "Geçersiz ses dosyası." });
    }

    // File size check (basic validation)
    if (audioBuffer.length < 1000) {
      return res.status(400).json({
        error: "Ses dosyası çok küçük. Lütfen daha uzun bir kayıt yapın.",
      });
    }

    let response;
    let transcriptionResult;

    if (provider === "openai") {
      // OpenAI Whisper API
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

      if (!OPENAI_API_KEY) {
        return res.status(500).json({
          error:
            "OpenAI API anahtarı eksik. Lütfen backend/.env dosyasında OPENAI_API_KEY'i ayarlayın.",
        });
      }

      // Create form data for OpenAI API
      const formData = new FormData();
      formData.append("file", audioBuffer, {
        filename: "audio.webm",
        contentType: req.file.mimetype || "audio/webm",
      });
      formData.append("model", model || "whisper-1");
      formData.append("language", language);
      formData.append("response_format", response_format || "json");

      if (temperature) {
        formData.append("temperature", temperature.toString());
      }

      logger.debug({
        msg: "[STT API] Sending to OpenAI Whisper",
        model: model || "whisper-1",
        language,
        audioSize: audioBuffer.length,
      });

      // Call OpenAI Whisper API
      response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            ...formData.getHeaders(),
          },
          timeout: STT_REQUEST_TIMEOUT_MS,
        },
      );

      // Extract transcription from OpenAI response
      transcriptionResult = {
        text: response.data.text?.trim() || "",
        language: response.data.language,
        duration: response.data.duration,
        confidence: 0.9, // OpenAI doesn't provide confidence, assume high
      };
    } else if (provider === "deepgram") {
      // Deepgram API
      const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

      if (!DEEPGRAM_API_KEY) {
        return res.status(500).json({
          error:
            "Deepgram API anahtarı eksik. Lütfen backend/.env dosyasında DEEPGRAM_API_KEY'i ayarlayın.",
        });
      }

      const deepgramModel = model || "nova-3";
      const smartFormat = req.body.smart_format !== false;
      const interimResults = req.body.interim_results === true;

      logger.debug({
        msg: "[STT API] Sending to Deepgram",
        model: deepgramModel,
        language,
        audioSize: audioBuffer.length,
        smartFormat,
        interimResults,
      });

      // Call Deepgram API
      response = await axios.post(
        `https://api.deepgram.com/v1/listen?model=${deepgramModel}&language=${language}&smart_format=${smartFormat}&interim_results=${interimResults}`,
        audioBuffer,
        {
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": req.file.mimetype || "audio/webm",
          },
          timeout: STT_REQUEST_TIMEOUT_MS,
        },
      );

      // Extract transcription from Deepgram response
      const results = response.data.results;
      if (results?.channels?.[0]?.alternatives?.[0]) {
        const alternative = results.channels[0].alternatives[0];
        transcriptionResult = {
          text: alternative.transcript?.trim() || "",
          confidence: alternative.confidence || 0.8,
          language: results.language || language,
          duration: results.metadata?.duration,
        };
      } else {
        throw new Error("Deepgram API'den geçersiz yanıt formatı.");
      }
    }

    // Validate transcription result
    if (!transcriptionResult?.text || transcriptionResult.text.length === 0) {
      return res.status(422).json({
        error:
          "Ses dosyasıyla metin çıkarılamadı. Lütfen daha açık konuşmayı deneyin.",
      });
    }

    // Log successful transcription
    const duration = Date.now() - tStart;
    logger.info({
      msg: "[STT API] Transcription successful",
      provider,
      textLength: transcriptionResult.text.length,
      confidence: transcriptionResult.confidence,
      durationMs: duration,
    });

    // Return standardized response
    res.json({
      text: transcriptionResult.text,
      confidence: transcriptionResult.confidence,
      language: transcriptionResult.language,
      duration: transcriptionResult.duration,
      provider,
      model: model || (provider === "openai" ? "whisper-1" : "nova-3"),
    });
  } catch (error) {
    const duration = Date.now() - tStart;

    logger.error({
      msg: "[STT API] Transcription failed",
      provider: req.body.provider,
      error: error.message,
      status: error.response?.status,
      durationMs: duration,
    });

    // Handle specific error cases
    let errorMessage = "Ses tanıma işlemi başarısız oldu.";
    let statusCode = 500;

    if (error.response?.status === 401) {
      errorMessage = `${req.body.provider || "STT"} API anahtarı geçersiz.`;
      statusCode = 401;
    } else if (error.response?.status === 400) {
      errorMessage = "Ses dosyası formatı geçersiz veya desteklenmiyor.";
      statusCode = 400;
    } else if (error.response?.status === 429) {
      errorMessage = "API rate limit aşıldı. Lütfen biraz bekleyip tekrar deneyin.";
      statusCode = 429;
    } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      errorMessage = "STT API zaman aşımına uğradı. Lütfen tekrar deneyin.";
      statusCode = 408;
    } else if (error.message.includes("file too large")) {
      errorMessage = "Ses dosyası çok büyük. Maksimum 10MB destekleniyor.";
      statusCode = 413;
    }

    res.status(statusCode).json({
      error: errorMessage,
      provider: req.body.provider || "unknown",
    });
  }
});

// --- SHARING API ENDPOINTS ---

// Masalı paylaş (unique URL oluştur)
app.post("/api/stories/:id/share", (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Masalın var olup olmadığını kontrol et
    const story = storyDb.getStory(id);
    if (!story) {
      return res.status(404).json({ error: "Paylaşılacak masal bulunamadı." });
    }

    const result = storyDb.shareStory(id);

    if (result.success) {
      const shareUrl = `${req.protocol}://${req.get("host")}/shared/${result.shareId}`;
      res.json({
        success: true,
        shareId: result.shareId,
        shareUrl: shareUrl,
        message: "Masal başarıyla paylaşıma açıldı.",
      });
    } else {
      res.status(500).json({ error: "Masal paylaşıma açılırken hata oluştu." });
    }
  } catch (error) {
    logger.error({ msg: "Masal paylaşma hatası", error: error?.message });
    res.status(500).json({ error: "Masal paylaşılırken hata oluştu." });
  }
});

// Masalın paylaşımını kaldır
app.delete("/api/stories/:id/share", (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = storyDb.unshareStory(id);

    if (result) {
      res.json({
        success: true,
        message: "Masal paylaşımdan kaldırıldı.",
      });
    } else {
      res
        .status(404)
        .json({ error: "Paylaşımı kaldırılacak masal bulunamadı." });
    }
  } catch (error) {
    logger.error({
      msg: "Masal paylaşımı kaldırma hatası",
      error: error?.message,
    });
    res
      .status(500)
      .json({ error: "Masal paylaşımı kaldırılırken hata oluştu." });
  }
});

// Paylaşılan masalı ID ile getir (public endpoint)
app.get("/api/shared/:shareId", (req, res) => {
  try {
    const shareId = req.params.shareId;
    const story = storyDb.getStoryByShareId(shareId);

    if (!story) {
      return res.status(404).json({
        error: "Paylaşılan masal bulunamadı veya artık mevcut değil.",
      });
    }

    res.json({
      id: story.share_id, // Share ID'yi public ID olarak kullan
      story_text: story.story_text,
      story_type: story.story_type,
      custom_topic: story.custom_topic,
      shared_at: story.shared_at,
      created_at: story.created_at,
      audio: story.audio,
    });
  } catch (error) {
    logger.error({
      msg: "Paylaşılan masal getirme hatası",
      error: error?.message,
    });
    res
      .status(500)
      .json({ error: "Paylaşılan masal getirilirken hata oluştu." });
  }
});

// Tüm paylaşılan masalları listele (public endpoint)
app.get("/api/shared", (req, res) => {
  try {
    const stories = storyDb.getAllSharedStories();

    // Sadece gerekli bilgileri döndür (güvenlik için)
    const publicStories = stories.map((story) => ({
      id: story.share_id,
      story_text: story.story_text.substring(0, 200) + "...", // Preview
      story_type: story.story_type,
      custom_topic: story.custom_topic,
      shared_at: story.shared_at,
      created_at: story.created_at,
      hasAudio: Boolean(story.audio),
    }));

    res.json(publicStories);
  } catch (error) {
    logger.error({
      msg: "Paylaşılan masalları listeleme hatası",
      error: error?.message,
    });
    res
      .status(500)
      .json({ error: "Paylaşılan masallar listelenirken hata oluştu." });
  }
});

// Toplu Masal Oluşturma Endpoint
app.post("/api/batch/stories", async (req, res) => {
  try {
    const { count, storyTypes, settings } = req.body;

    if (!count || count < 1 || count > 10) {
      return res
        .status(400)
        .json({ error: "Masal sayısı 1-10 arasında olmalıdır." });
    }

    if (!Array.isArray(storyTypes) || storyTypes.length === 0) {
      return res
        .status(400)
        .json({ error: "En az bir masal türü seçilmelidir." });
    }

    logger.info({ msg: "Toplu masal oluşturma başlatıldı", count, storyTypes });

    const results = [];
    const errors = [];

    // Her masal için LLM isteği gönder
    for (let i = 0; i < count; i++) {
      try {
        const selectedType =
          storyTypes[Math.floor(Math.random() * storyTypes.length)];

        // Aynı LLM logic'ini kullan (server.ts'teki /api/llm endpoint'inden)
        const systemPrompt =
          process.env.SYSTEM_PROMPT_TURKISH ||
          "5 yaşındaki bir türk kız çocuğu için uyku vaktinde okunmak üzere, uyku getirici ve kazanması istenen temel erdemleri de ders niteliğinde hikayelere iliştirecek şekilde masal yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.";

        const storyTypeMap = {
          princess: "prenses masalı",
          unicorn: "unicorn masalı",
          fairy: "peri masalı",
          butterfly: "kelebek masalı",
          mermaid: "deniz kızı masalı",
          rainbow: "gökkuşağı masalı",
        };

        const prompt = `${systemPrompt}\n\nMasal türü: ${storyTypeMap[selectedType] || selectedType}`;

        // OpenAI API çağrısı
        const apiKey = process.env.OPENAI_API_KEY;
        const endpoint =
          process.env.OPENAI_ENDPOINT || "https://api.openai.com/v1/responses";
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

        const response = await axios.post(
          endpoint,
          {
            model,
            input: prompt,
            max_output_tokens: 1500,
            temperature: 0.7,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: LLM_REQUEST_TIMEOUT_MS,
          },
        );

        let storyText = "";
        const data = response.data;
        if (data && Array.isArray(data.output)) {
          for (const item of data.output) {
            if (item?.type === "message" && Array.isArray(item.content)) {
              for (const contentItem of item.content) {
                if (contentItem?.type === "output_text" && contentItem?.text) {
                  storyText = contentItem.text;
                  break;
                }
              }
              if (storyText) break;
            }
          }
        }
        if (!storyText && data?.choices?.[0]?.message?.content) {
          storyText = data.choices[0].message.content;
        }

        if (storyText) {
          // Masalı veritabanına kaydet
          const story = storyDb.createStory({
            story_text: storyText,
            story_type: selectedType,
            custom_topic: "",
            voice_settings: settings?.voiceSettings,
          });

          results.push({
            id: story.id,
            type: selectedType,
            title: storyText.slice(0, 50) + "...",
            success: true,
          });

          logger.info({
            msg: "Toplu masal oluşturuldu",
            index: i + 1,
            storyId: story.id,
            type: selectedType,
          });
        } else {
          errors.push({
            index: i + 1,
            type: selectedType,
            error: "Masal metni alınamadı",
          });
        }

        // Rate limiting için kısa bekleme
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error({
          msg: "Toplu masal oluşturma hatası",
          index: i + 1,
          error: error?.message,
        });
        errors.push({
          index: i + 1,
          error: error?.message || "Bilinmeyen hata",
        });
      }
    }

    res.json({
      success: true,
      total: count,
      created: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    logger.error({
      msg: "Toplu masal oluşturma genel hatası",
      error: error?.message,
    });
    res
      .status(500)
      .json({ error: "Toplu masal oluşturma sırasında hata oluştu." });
  }
});

// Toplu Ses Dönüştürme Endpoint
app.post("/api/batch/audio", async (req, res) => {
  try {
    const { priority, autoGenerate = true, provider = "elevenlabs" } = req.body;

    logger.info({ msg: "Toplu ses dönüştürme başlatıldı", priority, provider });

    // Ses dosyası olmayan masalları getir
    let stories = [];

    if (priority === "favorites") {
      // Favori masalları getir (ses olmayan)
      stories = storyDb.getFavoriteStoriesWithoutAudio();
    } else if (priority === "recent") {
      // En yeni masalları getir (ses olmayan)
      stories = storyDb.getRecentStoriesWithoutAudio(10);
    } else {
      // Tüm ses olmayan masalları getir
      stories = storyDb.getAllStoriesWithoutAudio();
    }

    if (stories.length === 0) {
      return res.json({
        success: true,
        message: "Ses dönüştürülecek masal bulunamadı.",
        total: 0,
        converted: 0,
        failed: 0,
        results: [],
        errors: [],
      });
    }

    const results = [];
    const errors = [];

    // Her masal için TTS isteği gönder
    for (const story of stories.slice(0, 5)) {
      // Maksimum 5 masal
      try {
        // TTS API çağrısı (aynı logic /api/tts endpoint'inden)
        const apiKey =
          provider === "elevenlabs"
            ? process.env.ELEVENLABS_API_KEY
            : process.env.GEMINI_TTS_API_KEY;
        const endpoint =
          provider === "elevenlabs"
            ? process.env.ELEVENLABS_ENDPOINT ||
              "https://api.elevenlabs.io/v1/text-to-speech"
            : process.env.GEMINI_TTS_ENDPOINT ||
              "https://generativelanguage.googleapis.com/v1beta/models";
        const voiceId =
          provider === "elevenlabs"
            ? process.env.ELEVENLABS_VOICE_ID || "xsGHrtxT5AdDzYXTQT0d"
            : process.env.GEMINI_TTS_VOICE || "Puck";

        if (!apiKey) {
          errors.push({
            storyId: story.id,
            error: `${provider} API anahtarı eksik`,
          });
          continue;
        }

        let audioResponse;

        if (provider === "elevenlabs") {
          const fullUrl = `${endpoint}/${voiceId}`;
          audioResponse = await axios.post(
            fullUrl,
            {
              text: story.story_text,
              model_id: process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5",
              language_code: "tr",
              voice_settings: {
                similarity_boost: 0.75,
                use_speaker_boost: false,
                stability: 0.75,
                style: 0.0,
                speed: 0.9,
              },
            },
            {
              headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
              },
              responseType: "arraybuffer",
              timeout: 60000,
            },
          );
        } else {
          // Gemini TTS implementation
          const fullUrl = `${endpoint}/${process.env.GEMINI_TTS_MODEL || "gemini-2.0-flash-preview-tts"}:generateContent`;
          audioResponse = await axios.post(
            fullUrl,
            {
              contents: [
                {
                  parts: [
                    {
                      text: story.story_text,
                    },
                  ],
                },
              ],
              generationConfig: {
                speechConfig: {
                  voiceConfig: {
                    name: voiceId,
                    languageCode: "tr-TR",
                  },
                },
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              params: {
                key: apiKey,
              },
              timeout: 60000,
            },
          );
        }

        if (audioResponse.status === 200) {
          // Ses dosyasını kaydet
          const audioBuffer =
            provider === "elevenlabs"
              ? audioResponse.data
              : Buffer.from(audioResponse.data.audioContent || "", "base64");

          const audioId = storyDb.saveAudio(story.id, audioBuffer, "mp3");

          results.push({
            storyId: story.id,
            audioId,
            title: story.story_text.slice(0, 50) + "...",
            success: true,
          });

          logger.info({
            msg: "Toplu ses oluşturuldu",
            storyId: story.id,
            audioId,
          });
        } else {
          errors.push({
            storyId: story.id,
            error: "Ses dosyası oluşturulamadı",
          });
        }

        // Rate limiting için bekleme
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error({
          msg: "Toplu ses dönüştürme hatası",
          storyId: story.id,
          error: error?.message,
        });
        errors.push({
          storyId: story.id,
          error: error?.message || "Bilinmeyen hata",
        });
      }
    }

    res.json({
      success: true,
      total: stories.length,
      converted: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    logger.error({
      msg: "Toplu ses dönüştürme genel hatası",
      error: error?.message,
    });
    res
      .status(500)
      .json({ error: "Toplu ses dönüştürme sırasında hata oluştu." });
  }
});

// Toplu işlem durumu endpoint'i
app.get("/api/batch/status", (req, res) => {
  try {
    // Ses dosyası olmayan masalları getir
    const storiesWithoutAudio = storyDb.getStoriesWithoutAudio();
    const allStories = storyDb.getAllStories();

    res.json({
      storiesWithoutAudio: storiesWithoutAudio.length,
      totalStories: allStories.length,
      storiesWithAudio: allStories.length - storiesWithoutAudio.length,
    });
  } catch (error) {
    logger.error({
      msg: "Toplu işlem durumu getirme hatası",
      error: error?.message,
    });
    res.status(500).json({ error: "Durum bilgisi getirilemedi." });
  }
});

// Sunucuyu belirtilen port'ta dinlemeye başla
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `Backend proxy sunucusu http://localhost:${PORT} adresinde çalışıyor`,
    );

    // Log system prompt configuration
    const defaultSystemPrompt =
      "5 yaşındaki bir türk kız çocuğu için uyku vaktinde okunmak üzere, uyku getirici ve kazanması istenen temel erdemleri de ders niteliğinde hikayelere iliştirecek şekilde masal yaz. Masal eğitici, sevgi dolu ve rahatlatıcı olsun.";
    const systemPrompt = (
      process.env.SYSTEM_PROMPT_TURKISH || defaultSystemPrompt
    ).trim();
    const isCustomPrompt = Boolean(process.env.SYSTEM_PROMPT_TURKISH);
    logger.info({
      msg: "System prompt configuration",
      isCustomPrompt,
      promptLength: systemPrompt.length,
      promptPreview:
        systemPrompt.substring(0, 100) +
        (systemPrompt.length > 100 ? "..." : ""),
    });
  });
}

module.exports = app;

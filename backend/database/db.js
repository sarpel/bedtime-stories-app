// database/db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Veritabanı ve audio dizinlerinin konumu (ortam değişkeni ile override edilebilir)
const DB_PATH = process.env.STORIES_DB_PATH || path.join(__dirname, 'stories.db');
const AUDIO_DIR = process.env.AUDIO_DIR_PATH || path.join(__dirname, '../audio');

// Audio klasörünü oluştur
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// SQLite veritabanı bağlantısı - Optimized for Pi Zero 2W
const db = new Database(DB_PATH, {
  // Pi Zero optimizations
  readonly: false,
  fileMustExist: false,
  timeout: 5000,
  verbose: null // Disable verbose logging in production
});

// WAL modu performans için + Pi Zero specific optimizations
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL'); // Faster than FULL, safe for Pi Zero
db.pragma('cache_size = -1000'); // 1MB cache (reduced for Pi Zero)
db.pragma('temp_store = MEMORY'); // Use memory for temp tables (small amounts)
db.pragma('mmap_size = 33554432'); // 32MB memory map (reduced for Pi Zero)
db.pragma('page_size = 4096'); // Optimal for Pi Zero's ARM architecture

// Veritabanı tablolarını oluştur
function initDatabase() {
  // Stories tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_text TEXT NOT NULL,
      story_type TEXT NOT NULL,
      custom_topic TEXT,
  categories TEXT, -- JSON array (örn: ["macera","uyku"])
      content_hash TEXT, -- SHA256 hash of story content for duplicate detection
      series_id INTEGER, -- Seri ID'si (NULL ise tekil hikaye)
      series_order INTEGER, -- Serideki sıra (NULL ise tekil hikaye)
      series_title TEXT, -- Serinin başlığı
      is_favorite INTEGER DEFAULT 0,
      is_shared INTEGER DEFAULT 0,
      share_id TEXT UNIQUE,
      shared_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (series_id) REFERENCES series(id)
    )
  `);

  // Series tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      character_info TEXT, -- JSON object: karakter bilgileri ve tutarlılığı için
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- profile removed
    )
  `);

  // Profiles feature removed: profiles table no longer created

  // is_favorite sütununu varolan tabloya ekle (eğer yoksa)
  try {
    db.exec(`ALTER TABLE stories ADD COLUMN is_favorite INTEGER DEFAULT 0`);
    console.log('is_favorite sütunu eklendi');
  } catch (error) {
    // Sütun zaten varsa hata verir, bu normaldir
    if (!error.message.includes('duplicate column name')) {
      console.log('is_favorite sütunu zaten mevcut');
    }
  }

  // categories sütununu ekle (migration)
  try {
    db.exec(`ALTER TABLE stories ADD COLUMN categories TEXT`);
    console.log('categories sütunu eklendi');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('categories sütunu zaten mevcut');
    }
  }
  
  // content_hash sütununu ekle (migration)
  try {
    db.exec(`ALTER TABLE stories ADD COLUMN content_hash TEXT`);
    console.log('content_hash sütunu eklendi');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('content_hash sütunu zaten mevcut');
    }
  }
  
  // Mevcut hikayelere content_hash ekle (one-time migration)
  try {
    const storiesWithoutHash = db.prepare('SELECT id, story_text, story_type, custom_topic FROM stories WHERE content_hash IS NULL').all();
    if (storiesWithoutHash.length > 0) {
      console.log(`${storiesWithoutHash.length} hikaye için content_hash hesaplanıyor...`);
      const updateHashStmt = db.prepare('UPDATE stories SET content_hash = ? WHERE id = ?');
      const deleteStoryStmt = db.prepare('DELETE FROM stories WHERE id = ?');
      const seenHashes = new Set();
      let duplicatesRemoved = 0;
      
      const tx = db.transaction((stories) => {
        for (const story of stories) {
          const contentForHash = `${story.story_text.trim()}|${story.story_type}|${story.custom_topic || ''}`;
          const contentHash = crypto.createHash('sha256').update(contentForHash, 'utf8').digest('hex');
          
          if (seenHashes.has(contentHash)) {
            // This is a duplicate, remove it
            deleteStoryStmt.run(story.id);
            duplicatesRemoved++;
            console.log(`Removed duplicate story ID: ${story.id}`);
          } else {
            // First occurrence, update with hash
            seenHashes.add(contentHash);
            updateHashStmt.run(contentHash, story.id);
          }
        }
      });
      tx(storiesWithoutHash);
      console.log(`Content hash migration completed. Removed ${duplicatesRemoved} duplicates.`);
    }
    
    // Create unique index after migration is complete
    try {
      // Check if index already exists
      const indexExists = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='index' AND name='idx_stories_content_hash'
      `).get();
      
      if (indexExists.count === 0) {
        db.exec(`CREATE UNIQUE INDEX idx_stories_content_hash ON stories (content_hash)`);
        console.log('Content hash unique index created successfully');
      } else {
        console.log('Content hash unique index already exists');
      }
    } catch (indexError) {
      console.log('Content hash index creation error:', indexError.message);
    }
  } catch (error) {
    console.log('Content hash migration error:', error.message);
  }

  // Profiles feature removed: no profile_id migration

  // Seri sütunlarını ekle (migration)
  try {
    db.exec(`ALTER TABLE stories ADD COLUMN series_id INTEGER REFERENCES series(id)`);
    console.log('series_id sütunu eklendi');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('series_id sütunu zaten mevcut');
    }
  }

  try {
    db.exec(`ALTER TABLE stories ADD COLUMN series_order INTEGER`);
    console.log('series_order sütunu eklendi');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('series_order sütunu zaten mevcut');
    }
  }

  try {
    db.exec(`ALTER TABLE stories ADD COLUMN series_title TEXT`);
    console.log('series_title sütunu eklendi');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('series_title sütunu zaten mevcut');
    }
  }

  try {
    db.exec(`ALTER TABLE stories ADD COLUMN share_id TEXT`);
    console.log('share_id sütunu eklendi');

    // Share_id için unique index oluştur
    try {
      db.exec(`CREATE UNIQUE INDEX idx_share_id ON stories(share_id)`);
      console.log('share_id için unique index oluşturuldu');
    } catch (indexError) {
      if (!indexError.message.includes('already exists')) {
        console.log('share_id unique index zaten mevcut');
      }
    }
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('share_id sütunu zaten mevcut');
    }
  }

  try {
    db.exec(`ALTER TABLE stories ADD COLUMN shared_at DATETIME`);
    console.log('shared_at sütunu eklendi');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('shared_at sütunu zaten mevcut');
    }
  }

  // Audio files tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS audio_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      voice_id TEXT,
      voice_settings TEXT, -- JSON format
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE
    )
  `);

  // Queue tablosu (sıra tutmak için basit mapping)
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue (
      position INTEGER PRIMARY KEY,
      story_id INTEGER NOT NULL,
      FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE
    )
  `);

  // İndeksler performans için (content_hash hariç - migration sonrası yapılacak)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stories_type ON stories (story_type);
    CREATE INDEX IF NOT EXISTS idx_stories_created ON stories (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audio_story_id ON audio_files (story_id);
  `);

  // FTS (Full Text Search) tablosu oluştur
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS stories_fts USING fts5(
        story_text,
        story_type,
        custom_topic,
        content='stories',
        content_rowid='id'
      );
    `);
    console.log('FTS tablosu oluşturuldu');
  } catch (error) {
    console.log('FTS tablosu zaten mevcut veya hata:', error.message);
  }

  // FTS tablosunu mevcut verilerle doldur (sadece tablo boşsa)
  try {
    const ftsCount = db.prepare('SELECT COUNT(*) as c FROM stories_fts').get();
    if (ftsCount.c === 0) {
      db.exec(`
        INSERT OR REPLACE INTO stories_fts(rowid, story_text, story_type, custom_topic)
        SELECT id, story_text, story_type, COALESCE(custom_topic, '') FROM stories;
      `);
      console.log('FTS tablosu ilk kez dolduruldu');
    } else {
      console.log('FTS tablosu zaten dolu, toplu doldurma atlandı');
    }
  } catch (error) {
    console.log('FTS tablosu güncelleme hatası:', error.message);
  }

  // Queue indeksleri
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_queue_story_id ON queue (story_id);
  `);

  // FTS trigger'ları oluştur
  try {
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS stories_fts_insert AFTER INSERT ON stories BEGIN
        INSERT INTO stories_fts(rowid, story_text, story_type, custom_topic)
        VALUES (new.id, new.story_text, new.story_type, COALESCE(new.custom_topic, ''));
      END;
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS stories_fts_update AFTER UPDATE ON stories BEGIN
        UPDATE stories_fts SET
          story_text = new.story_text,
          story_type = new.story_type,
          custom_topic = COALESCE(new.custom_topic, '')
        WHERE rowid = new.id;
      END;
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS stories_fts_delete AFTER DELETE ON stories BEGIN
        DELETE FROM stories_fts WHERE rowid = old.id;
      END;
    `);
    console.log('FTS trigger\'ları oluşturuldu');
  } catch (error) {
    console.log('FTS trigger\'ları zaten mevcut veya hata:', error.message);
  }

  // Paylaşım sütunları ekledikten sonra indeksleri oluştur
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_stories_share_id ON stories (share_id);
      CREATE INDEX IF NOT EXISTS idx_stories_shared ON stories (is_shared);
    `);
    console.log('Paylaşım indeksleri oluşturuldu');
  } catch (error) {
    console.log('Paylaşım indeksleri zaten mevcut veya hata:', error.message);
  }

  console.log('Veritabanı başarıyla başlatıldı:', DB_PATH);

  // Boş veritabanına örnek 3 hikaye ekle (opt-in)
  try {
    const shouldSeed = process.env.SEED_SAMPLE_STORIES === 'true';
    const row = db.prepare('SELECT COUNT(*) as c FROM stories').get();
    if (shouldSeed && row.c === 0) {
      const now = new Date().toISOString();
      const insert = db.prepare('INSERT INTO stories (story_text, story_type, custom_topic, is_favorite, created_at) VALUES (?,?,?,?,?)');
      const samples = [
        ['Küçük yıldız uykuya dalarken gökyüzü onu sarıp sakladı.', 'goodnight', 'yıldız', 0, now],
        ['Minik tavşan ormanda nazik olmanın gerçek dostluk getirdiğini öğrendi.', 'kindness', 'tavşan', 0, now],
        ['Sevgi dolu rüzgar sabırlı çiçeğe büyümenin zaman aldığını fısıldadı.', 'patience', 'çiçek', 0, now]
      ];
      const tx = db.transaction(() => { samples.forEach(s => insert.run(...s)); });
      tx();
      console.log('Örnek hikayeler eklendi (SEED_SAMPLE_STORIES=true).');
    }
  } catch (e) {
    console.error('Örnek hikayeler eklenemedi:', e.message);
  }
}

// Veritabanını başlat
initDatabase();

// Prepared statements - tablolar ve sütunlar oluşturulduktan sonra
const statements = {
  // Story operations
  insertStory: db.prepare(`
  INSERT INTO stories (story_text, story_type, custom_topic, categories, content_hash)
  VALUES (?, ?, ?, ?, ?)
  `),
  
  getStoryByHash: db.prepare(`
    SELECT * FROM stories WHERE content_hash = ?
  `),

  getStoryById: db.prepare(`
    SELECT * FROM stories WHERE id = ?
  `),

  getAllStories: db.prepare(`
    SELECT s.*, a.file_name, a.file_path, a.voice_id
    FROM stories s
    LEFT JOIN audio_files a ON s.id = a.story_id
    ORDER BY s.created_at DESC
  `),

  getStoriesByType: db.prepare(`
    SELECT s.*, a.file_name, a.file_path, a.voice_id
    FROM stories s
    LEFT JOIN audio_files a ON s.id = a.story_id
    WHERE s.story_type = ?
    ORDER BY s.created_at DESC
  `),

  deleteStory: db.prepare(`
    DELETE FROM stories WHERE id = ?
  `),

  updateStory: db.prepare(`
    UPDATE stories
    SET story_text = ?, story_type = ?, custom_topic = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateStoryFavorite: db.prepare(`
    UPDATE stories
    SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // Sharing operations
  updateStorySharing: db.prepare(`
    UPDATE stories
    SET is_shared = ?, share_id = ?, shared_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  getStoryByShareId: db.prepare(`
    SELECT s.*, a.file_name, a.file_path, a.voice_id
    FROM stories s
    LEFT JOIN audio_files a ON s.id = a.story_id
    WHERE s.share_id = ? AND s.is_shared = 1
  `),

  getAllSharedStories: db.prepare(`
    SELECT s.*, a.file_name, a.file_path, a.voice_id
    FROM stories s
    LEFT JOIN audio_files a ON s.id = a.story_id
    WHERE s.is_shared = 1
    ORDER BY s.shared_at DESC
  `),

  // Search operations
  searchStoriesFTS: db.prepare(`
    SELECT s.*, a.file_name, a.file_path, a.voice_id,
           bm25(stories_fts) as rank
    FROM stories_fts
    JOIN stories s ON stories_fts.rowid = s.id
    LEFT JOIN audio_files a ON s.id = a.story_id
    WHERE stories_fts MATCH ?
    ORDER BY rank, s.created_at DESC
    LIMIT ?
  `),

  searchStoriesByTitle: db.prepare(`
    SELECT s.*, a.file_name, a.file_path, a.voice_id
    FROM stories s
    LEFT JOIN audio_files a ON s.id = a.story_id
    WHERE s.custom_topic LIKE ? OR s.story_type LIKE ?
    ORDER BY s.created_at DESC
    LIMIT ?
  `),
  searchStoriesByContent: db.prepare(`
    SELECT s.*, a.file_name, a.file_path, a.voice_id
    FROM stories s
    LEFT JOIN audio_files a ON s.id = a.story_id
    WHERE s.story_text LIKE ?
    ORDER BY s.created_at DESC
    LIMIT ?
  `),

  // Audio operations
  insertAudio: db.prepare(`
    INSERT INTO audio_files (story_id, file_name, file_path, voice_id, voice_settings)
    VALUES (?, ?, ?, ?, ?)
  `),

  getAudioByStoryId: db.prepare(`
    SELECT * FROM audio_files WHERE story_id = ?
  `),

  deleteAudioByStoryId: db.prepare(`
    DELETE FROM audio_files WHERE story_id = ?
  `),

  // Combined operations
  getStoryWithAudio: db.prepare(`
    SELECT
      s.*,
      a.id as audio_id,
      a.file_name,
      a.file_path,
      a.voice_id,
      a.voice_settings
    FROM stories s
    LEFT JOIN audio_files a ON s.id = a.story_id
    WHERE s.id = ?
  `)
  ,
  // Queue operations
  getQueueAll: db.prepare(`
    SELECT story_id FROM queue ORDER BY position ASC
  `),
  clearQueue: db.prepare(`
    DELETE FROM queue
  `),
  insertQueueItem: db.prepare(`
    INSERT INTO queue (position, story_id) VALUES (?, ?)
  `),
  deleteQueueItem: db.prepare(`
    DELETE FROM queue WHERE story_id = ?
  `),
  getMaxQueuePos: db.prepare(`
    SELECT COALESCE(MAX(position), 0) as maxpos FROM queue
  `),
};

// Arama için maksimum limit sabiti
const MAX_SEARCH_LIMIT = 50;

// Utility function to generate unique share ID
function generateShareId() {
  return crypto.randomBytes(16).toString('hex');
}

// Database functions
const storyDb = {
  // Story operations
  createStory(storyText, storyType, customTopic = null, categories = []) {
    try {
      // Create unique content hash from story text + type + topic
      const contentForHash = `${storyText.trim()}|${storyType}|${customTopic || ''}`;
      const contentHash = crypto.createHash('sha256').update(contentForHash, 'utf8').digest('hex');
      
      // Check for existing story with same hash
      const existingStory = statements.getStoryByHash.get(contentHash);
      if (existingStory) {
        console.log('Duplicate story detected, returning existing ID:', existingStory.id);
        return existingStory.id;
      }
      
      const categoriesValue = Array.isArray(categories) ? JSON.stringify(categories) : (categories || null);
      const result = statements.insertStory.run(storyText, storyType, customTopic, categoriesValue, contentHash);
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Masal oluşturma hatası:', error);
      throw error;
    }
  },

  getStory(id) {
    try {
      return statements.getStoryById.get(id);
    } catch (error) {
      console.error('Masal getirme hatası:', error);
      throw error;
    }
  },

  getAllStories() {
    try {
      const rows = statements.getAllStories.all();
      // Group audio files with stories
      const storiesMap = new Map();

      rows.forEach(row => {
        if (!storiesMap.has(row.id)) {
          storiesMap.set(row.id, {
            id: row.id,
            story_text: row.story_text,
            story_type: row.story_type,
            custom_topic: row.custom_topic,
            is_favorite: row.is_favorite,
            created_at: row.created_at,
            updated_at: row.updated_at,
            audio: null
          });
        }

        if (row.file_name) {
          storiesMap.get(row.id).audio = {
            file_name: row.file_name,
            file_path: row.file_path,
            voice_id: row.voice_id
          };
        }
      });

      return Array.from(storiesMap.values());
    } catch (error) {
      console.error('Masalları getirme hatası:', error);
      throw error;
    }
  },

  getStoriesByType(storyType) {
    try {
      return statements.getStoriesByType.all(storyType);
    } catch (error) {
      console.error('Tip bazlı masal getirme hatası:', error);
      throw error;
    }
  },

  updateStory(id, storyText, storyType, customTopic = null) {
    try {
      const result = statements.updateStory.run(storyText, storyType, customTopic, id);
      return result.changes > 0;
    } catch (error) {
      console.error('Masal güncelleme hatası:', error);
      throw error;
    }
  },

  deleteStory(id) {
    try {
      // Önce ses dosyasını fiziksel olarak sil
      const audio = statements.getAudioByStoryId.get(id);
      if (audio && fs.existsSync(audio.file_path)) {
        fs.unlinkSync(audio.file_path);
      }

      // Veritabanından sil (CASCADE sayesinde audio_files da silinir)
      const result = statements.deleteStory.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Masal silme hatası:', error);
      throw error;
    }
  },

  updateStoryFavorite(id, isFavorite) {
    try {
      const result = statements.updateStoryFavorite.run(isFavorite ? 1 : 0, id);
      if (result.changes > 0) {
        return statements.getStoryById.get(id);
      }
      return null;
    } catch (error) {
      console.error('Favori durumu güncelleme hatası:', error);
      throw error;
    }
  },

  // Audio operations
  saveAudio(storyId, fileName, filePath, voiceId, voiceSettings = null) {
    try {
      const result = statements.insertAudio.run(
        storyId,
        fileName,
        filePath,
        voiceId,
        voiceSettings ? JSON.stringify(voiceSettings) : null
      );
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Ses dosyası kaydetme hatası:', error);
      throw error;
    }
  },

  getAudioByStoryId(storyId) {
    try {
      return statements.getAudioByStoryId.get(storyId);
    } catch (error) {
      console.error('Ses dosyası getirme hatası:', error);
      throw error;
    }
  },

  // Combined operations
  getStoryWithAudio(id) {
    try {
      const row = statements.getStoryWithAudio.get(id);
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        story_text: row.story_text,
        story_type: row.story_type,
        custom_topic: row.custom_topic,
  categories: row.categories ? JSON.parse(row.categories) : [],
        created_at: row.created_at,
        updated_at: row.updated_at,
        audio: row.audio_id ? {
          id: row.audio_id,
          file_name: row.file_name,
          file_path: row.file_path,
          voice_id: row.voice_id,
          voice_settings: row.voice_settings ? JSON.parse(row.voice_settings) : null
        } : null
      };
    } catch (error) {
      console.error('Masal ve ses dosyası getirme hatası:', error);
      throw error;
    }
  },

  // Sharing operations
  shareStory(id) {
    try {
      const shareId = generateShareId();
      const result = statements.updateStorySharing.run(1, shareId, id);
      if (result.changes > 0) {
        return { success: true, shareId };
      }
      return { success: false };
    } catch (error) {
      console.error('Masal paylaşma hatası:', error);
      throw error;
    }
  },

  // Queue operations
  getQueue() {
    try {
      const rows = statements.getQueueAll.all();
      return rows.map(r => r.story_id);
    } catch (error) {
      console.error('Kuyruk getirme hatası:', error);
      throw error;
    }
  },

  setQueue(ids) {
    try {
      const tx = db.transaction((list) => {
        statements.clearQueue.run();
        list.forEach((id, idx) => {
          statements.insertQueueItem.run(idx + 1, id);
        });
      });
      tx(ids);
      return true;
    } catch (error) {
      console.error('Kuyruk güncelleme hatası:', error);
      throw error;
    }
  },

  addToQueue(id) {
    try {
      const current = this.getQueue();
      if (current.includes(id)) {
        return false;
      }
      const { maxpos } = statements.getMaxQueuePos.get();
      statements.insertQueueItem.run(maxpos + 1, id);
      return true;
    } catch (error) {
      console.error('Kuyruğa ekleme hatası:', error);
      throw error;
    }
  },

  removeFromQueue(id) {
    try {
      statements.deleteQueueItem.run(id);
      // Pozisyonları yeniden sıklaştır
      const rows = statements.getQueueAll.all();
      const tx = db.transaction(() => {
        statements.clearQueue.run();
        rows.forEach((r, idx) => statements.insertQueueItem.run(idx + 1, r.story_id));
      });
      tx();
      return true;
    } catch (error) {
      console.error('Kuyruktan çıkarma hatası:', error);
      throw error;
    }
  },

  unshareStory(id) {
    try {
      const result = statements.updateStorySharing.run(0, null, id);
      return result.changes > 0;
    } catch (error) {
      console.error('Masal paylaşımı kaldırma hatası:', error);
      throw error;
    }
  },

  getStoryByShareId(shareId) {
    try {
      const row = statements.getStoryByShareId.get(shareId);
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        story_text: row.story_text,
        story_type: row.story_type,
        custom_topic: row.custom_topic,
  categories: row.categories ? JSON.parse(row.categories) : [],
        is_favorite: row.is_favorite,
        is_shared: row.is_shared,
        share_id: row.share_id,
        shared_at: row.shared_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        audio: row.file_name ? {
          file_name: row.file_name,
          file_path: row.file_path,
          voice_id: row.voice_id
        } : null
      };
    } catch (error) {
      console.error('Paylaşım ID ile masal getirme hatası:', error);
      throw error;
    }
  },

  getAllSharedStories() {
    try {
      const rows = statements.getAllSharedStories.all();
      // Group audio files with stories
      const storiesMap = new Map();

      rows.forEach(row => {
        if (!storiesMap.has(row.id)) {
          storiesMap.set(row.id, {
            id: row.id,
            story_text: row.story_text,
            story_type: row.story_type,
            custom_topic: row.custom_topic,
            is_favorite: row.is_favorite,
            is_shared: row.is_shared,
            share_id: row.share_id,
            shared_at: row.shared_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            audio: null
          });
        }

        if (row.file_name) {
          storiesMap.get(row.id).audio = {
            file_name: row.file_name,
            file_path: row.file_path,
            voice_id: row.voice_id
          };
        }
      });

      return Array.from(storiesMap.values());
    } catch (error) {
      console.error('Paylaşılan masalları getirme hatası:', error);
      throw error;
    }
  },

  searchStoriesByTitle(query, limit = MAX_SEARCH_LIMIT) {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return [];
      }

      // Title search is based on custom_topic and story_type
      const likePattern = `%${query.trim()}%`;
      const rows = statements.searchStoriesByTitle.all(likePattern, likePattern, Math.min(limit, MAX_SEARCH_LIMIT));

      return this.processStoryRows(rows);
    } catch (error) {
      console.error('Başlık arama hatası:', error);
      throw error;
    }
  },

  searchStoriesByContent(query, limit = MAX_SEARCH_LIMIT) {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return [];
      }

      const likePattern = `%${query.trim()}%`;
      const rows = statements.searchStoriesByContent.all(likePattern, Math.min(limit, MAX_SEARCH_LIMIT));

      return this.processStoryRows(rows);
    } catch (error) {
      console.error('İçerik arama hatası:', error);
      throw error;
    }
  },

  // Ana arama metodu - FTS ve fallback LIKE araması
  searchStories(query, options = {}) {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return [];
      }

      const { limit = MAX_SEARCH_LIMIT, useFTS = true } = options;
      const searchTerm = query.trim();
      const effectiveLimit = Math.min(limit, MAX_SEARCH_LIMIT);

      // FTS arama öncelikli
      if (useFTS) {
        try {
          // FTS5 query - escape special characters and use Unicode-safe handling
          const ftsQuery = searchTerm
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (ftsQuery.length > 0) {
            const rows = statements.searchStoriesFTS.all(ftsQuery, effectiveLimit);
            const results = this.processStoryRows(rows);
            if (results.length > 0) {
              return results;
            }
          }
        } catch (ftsError) {
          console.log('FTS search failed, falling back to basic search:', ftsError.message);
        }
      }

      // Fallback: LIKE search on both title and content
      const likePattern = `%${searchTerm}%`;
      const rows = statements.searchStoriesByContent.all(likePattern, effectiveLimit);

      return this.processStoryRows(rows);
    } catch (error) {
      console.error('Arama hatası:', error);
      throw error;
    }
  },

  // Helper function to process story rows consistently
  processStoryRows(rows) {
    const storiesMap = new Map();

    rows.forEach(row => {
      if (!storiesMap.has(row.id)) {
        storiesMap.set(row.id, {
          id: row.id,
          story_text: row.story_text,
          story_type: row.story_type,
          custom_topic: row.custom_topic,
          categories: row.categories ? JSON.parse(row.categories) : [],
          is_favorite: row.is_favorite,
          is_shared: row.is_shared,
          share_id: row.share_id,
          shared_at: row.shared_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          audio: null,
          rank: row.rank || null
        });
      }

      if (row.file_name) {
        storiesMap.get(row.id).audio = {
          file_name: row.file_name,
          file_path: row.file_path,
          voice_id: row.voice_id
        };
      }
    });

    return Array.from(storiesMap.values());
  },

  // Utility functions
  getAudioDir() {
    return AUDIO_DIR;
  },

  // Profile feature removed: profile management functions deleted

  // Series management functions
  createSeries(title, description = '', characterInfo = {}) {
    const stmt = db.prepare(`
      INSERT INTO series (title, description, character_info)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(title, description, JSON.stringify(characterInfo));
    return result.lastInsertRowid;
  },

  getSeries() {
    const stmt = db.prepare(`
      SELECT s.*, COUNT(st.id) as story_count
      FROM series s
      LEFT JOIN stories st ON s.id = st.series_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    return stmt.all().map(row => ({
      ...row,
      character_info: row.character_info ? JSON.parse(row.character_info) : {}
    }));
  },

  getSeriesById(id) {
    const stmt = db.prepare('SELECT * FROM series WHERE id = ?');
    const row = stmt.get(id);
    if (row) {
      return {
        ...row,
        character_info: row.character_info ? JSON.parse(row.character_info) : {}
      };
    }
    return null;
  },

  updateSeries(id, updates) {
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.characterInfo !== undefined) {
      fields.push('character_info = ?');
      values.push(JSON.stringify(updates.characterInfo));
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      const stmt = db.prepare(`UPDATE series SET ${fields.join(', ')} WHERE id = ?`);
      values.push(id);
      return stmt.run(...values);
    }
    return null;
  },

  deleteSeries(id) {
    // Önce seriye ait tüm hikayeleri güncelle (series_id'yi null yap)
    const updateStoriesStmt = db.prepare('UPDATE stories SET series_id = NULL, series_order = NULL, series_title = NULL WHERE series_id = ?');
    updateStoriesStmt.run(id);

    // Seriyi sil
    const deleteStmt = db.prepare('DELETE FROM series WHERE id = ?');
    return deleteStmt.run(id);
  },

  getStoriesBySeries(seriesId) {
    const stmt = db.prepare(`
      SELECT * FROM stories
      WHERE series_id = ?
      ORDER BY series_order ASC, created_at ASC
    `);
    return stmt.all();
  },

  addStoryToSeries(storyId, seriesId, seriesTitle, order = null) {
    // Serideki maksimum order'ı bul
    if (order === null) {
      const maxOrderStmt = db.prepare('SELECT MAX(series_order) as max_order FROM stories WHERE series_id = ?');
      const result = maxOrderStmt.get(seriesId);
      order = (result.max_order || 0) + 1;
    }

    const stmt = db.prepare(`
      UPDATE stories
      SET series_id = ?, series_title = ?, series_order = ?
      WHERE id = ?
    `);
    return stmt.run(seriesId, seriesTitle, order, storyId);
  },

  close() {
    db.close();
  }
}

// Veritabanını başlat
initDatabase();

// Database maintenance integration
const DatabaseMaintenance = require('./maintenance');

// Export maintenance functions
storyDb.maintenance = {
  vacuum: () => new DatabaseMaintenance().vacuum(),
  analyze: () => new DatabaseMaintenance().analyze(),
  reindex: () => new DatabaseMaintenance().reindex(),
  cleanup: () => new DatabaseMaintenance().cleanup(),
  integrityCheck: () => new DatabaseMaintenance().integrityCheck(),
  getStats: () => new DatabaseMaintenance().getStats(),
  fullMaintenance: () => new DatabaseMaintenance().fullMaintenance(),
  optimize: () => new DatabaseMaintenance().optimize()
};

module.exports = storyDb;

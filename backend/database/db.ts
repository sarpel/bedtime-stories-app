// @ts-nocheck
// database/db.ts
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { randomBytes } from 'crypto';

// Type definitions
interface Story {
  id?: number;
  story_text: string;
  story_type: string;
  custom_topic?: string | null;
  categories?: string | null;
  profile_id?: number | null;
  is_favorite?: number;
  is_shared?: number;
  share_id?: string | null;
  shared_at?: string | null;
  created_at?: string;
  updated_at?: string;
  file_name?: string;
  file_path?: string;
  voice_id?: string;
}

interface Profile {
  id?: number;
  name: string;
  age?: number;
  gender?: string;
  preferences?: any;
  custom_prompt?: string | null;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

interface AudioFile {
  id?: number;
  story_id: number;
  file_name: string;
  file_path: string;
  voice_id: string;
  voice_settings?: string;
  created_at?: string;
}

interface StoryWithAudio extends Story {
  audio_id?: number;
  voice_settings?: string;
}

interface SearchResult extends Story {
  rank?: number;
}

interface DatabaseConfig {
  readonly?: boolean;
  fileMustExist?: boolean;
  timeout?: number;
  verbose?: any;
}

// Veritabanı ve audio dizinlerinin konumu (ortam değişkeni ile override edilebilir)
const DB_PATH: string = process.env.STORIES_DB_PATH || path.join(__dirname, 'stories.db');
const AUDIO_DIR: string = process.env.AUDIO_DIR_PATH || path.join(__dirname, '../audio');

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
function initDatabase(): void {
  // Profiles tablosu (önce oluşturulmalı çünkü stories tablosu buna referans verir)
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER,
      gender TEXT, -- 'girl', 'boy', 'other'
      preferences TEXT, -- JSON object with story preferences
      custom_prompt TEXT, -- Profile-specific prompt
      is_active INTEGER DEFAULT 0, -- Only one profile can be active
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Stories tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_text TEXT NOT NULL,
      story_type TEXT NOT NULL,
      custom_topic TEXT,
      categories TEXT, -- JSON array (örn: ["macera","uyku"])
      profile_id INTEGER, -- Hangi profil için oluşturulduğu
      is_favorite INTEGER DEFAULT 0,
      is_shared INTEGER DEFAULT 0,
      share_id TEXT UNIQUE,
      shared_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES profiles(id)
    )
  `);

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


  try {
    db.exec(`ALTER TABLE stories ADD COLUMN categories TEXT`);
    console.log('categories sütunu eklendi');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('categories sütunu zaten mevcut');
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

  // updated_at sütununu ekle (migration)
  try {
    db.exec(`ALTER TABLE stories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    console.log('updated_at sütunu eklendi');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('updated_at sütunu zaten mevcut');
    } else {
      console.error('updated_at sütunu eklenemedi:', error.message);
      throw error;
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

  // İndeksler performans için
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
  INSERT INTO stories (story_text, story_type, custom_topic, categories)
  VALUES (?, ?, ?, ?)
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
  return randomBytes(16).toString('hex');
}

// Database functions
const storyDb = {
  // Story operations
  createStory(storyText: string, storyType: string, customTopic: string | null = null, categories: string[] | string | null = null): number {
    try {
      const categoriesValue = Array.isArray(categories) ? JSON.stringify(categories) : (categories || null);
      const result = statements.insertStory.run(storyText, storyType, customTopic, categoriesValue);
      return result.lastInsertRowid as number;
    } catch (error) {
      console.error('Masal oluşturma hatası:', error);
      throw error;
    }
  },

  getStory(id: number): Story | null {
    try {
      return statements.getStoryById.get(id) as Story | null;
    } catch (error) {
      console.error('Masal getirme hatası:', error);
      throw error;
    }
  },

  getAllStories(): Story[] {
    try {
      const rows = statements.getAllStories.all();
      // Group audio files with stories
      const storiesMap = new Map<number, Story>();

      rows.forEach((row: any) => {
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

  // Profile management functions
  createProfile(name, age, gender, preferences = {}, customPrompt = '') {
    const stmt = db.prepare(`
      INSERT INTO profiles (name, age, gender, preferences, custom_prompt)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, age, gender, JSON.stringify(preferences), customPrompt);
    return result.lastInsertRowid;
  },

  getProfiles() {
    const stmt = db.prepare('SELECT * FROM profiles ORDER BY created_at DESC');
    return stmt.all().map(row => ({
      ...row,
      preferences: row.preferences ? JSON.parse(row.preferences) : {}
    }));
  },

  getProfile(id) {
    const stmt = db.prepare('SELECT * FROM profiles WHERE id = ?');
    const row = stmt.get(id);
    if (row) {
      return {
        ...row,
        preferences: row.preferences ? JSON.parse(row.preferences) : {}
      };
    }
    return null;
  },

  updateProfile(id, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.age !== undefined) {
      fields.push('age = ?');
      values.push(updates.age);
    }
    if (updates.gender !== undefined) {
      fields.push('gender = ?');
      values.push(updates.gender);
    }
    if (updates.preferences !== undefined) {
      fields.push('preferences = ?');
      values.push(JSON.stringify(updates.preferences));
    }
    if (updates.customPrompt !== undefined) {
      fields.push('custom_prompt = ?');
      values.push(updates.customPrompt);
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      const stmt = db.prepare(`UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`);
      values.push(id);
      return stmt.run(...values);
    }
    return null;
  },

  deleteProfile(id) {
    // Önce profile ait storyleri güncelle (profile_id'yi null yap)
    const updateStoriesStmt = db.prepare('UPDATE stories SET profile_id = NULL WHERE profile_id = ?');
    updateStoriesStmt.run(id);

    // Profile'i sil
    const deleteStmt = db.prepare('DELETE FROM profiles WHERE id = ?');
    return deleteStmt.run(id);
  },

  setActiveProfile(id) {
    // Tüm profilleri inactive yap
    db.prepare('UPDATE profiles SET is_active = 0').run();

    // Belirtilen profili active yap
    if (id) {
      const stmt = db.prepare('UPDATE profiles SET is_active = 1 WHERE id = ?');
      return stmt.run(id);
    }
    return null;
  },

  getActiveProfile() {
    const stmt = db.prepare('SELECT * FROM profiles WHERE is_active = 1 LIMIT 1');
    const row = stmt.get();
    if (row) {
      return {
        ...row,
        preferences: row.preferences ? JSON.parse(row.preferences) : {}
      };
    }
    return null;
  },

  close() {
    db.close();
  }
}

// Veritabanını başlat
initDatabase();

module.exports = storyDb;

// database/db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Veritabanı dosyasının konumu
const DB_PATH = path.join(__dirname, 'stories.db');
const AUDIO_DIR = path.join(__dirname, '../audio');

// Audio klasörünü oluştur
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// SQLite veritabanı bağlantısı
const db = new Database(DB_PATH);

// WAL modu performans için
db.pragma('journal_mode = WAL');

// Veritabanı tablolarını oluştur
function initDatabase() {
  // Stories tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_text TEXT NOT NULL,
      story_type TEXT NOT NULL,
      custom_topic TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  // İndeksler performans için
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stories_type ON stories (story_type);
    CREATE INDEX IF NOT EXISTS idx_stories_created ON stories (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audio_story_id ON audio_files (story_id);
  `);

  console.log('Veritabanı başarıyla başlatıldı:', DB_PATH);
}

// Veritabanını başlat
initDatabase();

// Prepared statements - tablolar oluşturulduktan sonra
const statements = {
  // Story operations
  insertStory: db.prepare(`
    INSERT INTO stories (story_text, story_type, custom_topic)
    VALUES (?, ?, ?)
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
};

// Database functions
const storyDb = {
  // Story operations
  createStory(storyText, storyType, customTopic = null) {
    try {
      const result = statements.insertStory.run(storyText, storyType, customTopic);
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
      if (!row) return null;
      
      return {
        id: row.id,
        story_text: row.story_text,
        story_type: row.story_type,
        custom_topic: row.custom_topic,
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

  // Utility functions
  getAudioDir() {
    return AUDIO_DIR;
  },

  close() {
    db.close();
  }
}

// Veritabanını başlat
initDatabase();

module.exports = storyDb;

// services/databaseService.js

const API_BASE_URL = 'http://localhost:3001/api';

class DatabaseService {
  // Story operations
  async getAllStories() {
    try {
      const response = await fetch(`${API_BASE_URL}/stories`);
      if (!response.ok) {
        throw new Error('Masallar alınamadı');
      }
      return await response.json();
    } catch (error) {
      console.error('Masalları getirme hatası:', error);
      throw error;
    }
  }

  async getStory(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/stories/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Masal bulunamadı');
        }
        throw new Error('Masal alınamadı');
      }
      return await response.json();
    } catch (error) {
      console.error('Masal getirme hatası:', error);
      throw error;
    }
  }

  async createStory(storyText, storyType, customTopic = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyText,
          storyType,
          customTopic
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Masal oluşturulamadı');
      }

      return await response.json();
    } catch (error) {
      console.error('Masal oluşturma hatası:', error);
      throw error;
    }
  }

  async updateStory(id, storyText, storyType, customTopic = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/stories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyText,
          storyType,
          customTopic
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Masal güncellenemedi');
      }

      return await response.json();
    } catch (error) {
      console.error('Masal güncelleme hatası:', error);
      throw error;
    }
  }

  async deleteStory(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/stories/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Masal silinemedi');
      }

      return await response.json();
    } catch (error) {
      console.error('Masal silme hatası:', error);
      throw error;
    }
  }

  async getStoriesByType(storyType) {
    try {
      const response = await fetch(`${API_BASE_URL}/stories/type/${encodeURIComponent(storyType)}`);
      if (!response.ok) {
        throw new Error('Tip bazlı masallar alınamadı');
      }
      return await response.json();
    } catch (error) {
      console.error('Tip bazlı masal getirme hatası:', error);
      throw error;
    }
  }

  // Audio operations
  getAudioUrl(fileName) {
    if (!fileName) return null;
    return `http://localhost:3001/audio/${fileName}`;
  }

  // Migration helper - localStorage'daki verileri veritabanına taşı
  async migrateFromLocalStorage() {
    try {
      const localStorageData = localStorage.getItem('bedtime-stories-history');
      if (!localStorageData) {
        console.log('Taşınacak localStorage verisi bulunamadı.');
        return { migrated: 0, skipped: 0, errors: 0 };
      }

      const stories = JSON.parse(localStorageData);
      let migrated = 0;
      let skipped = 0;
      let errors = 0;

      console.log(`${stories.length} masal localStorage'dan veritabanına taşınacak...`);

      for (const story of stories) {
        try {
          // Masalın zaten var olup olmadığını kontrol et
          const existingStories = await this.getAllStories();
          const exists = existingStories.some(existing => 
            existing.story_text === story.story && 
            existing.story_type === story.storyType
          );

          if (exists) {
            console.log('Masal zaten mevcut, atlaniyor...');
            skipped++;
            continue;
          }

          // Yeni masal oluştur
          await this.createStory(
            story.story,
            story.storyType,
            story.customTopic || null
          );

          migrated++;
          console.log(`Masal taşındı: ${story.storyType}`);

        } catch (error) {
          console.error('Masal taşınırken hata:', error);
          errors++;
        }
      }

      console.log(`Migration tamamlandı: ${migrated} taşındı, ${skipped} atlandı, ${errors} hata`);
      
      // Migration başarılıysa localStorage'ı temizle
      if (errors === 0) {
        localStorage.removeItem('bedtime-stories-history');
        console.log('localStorage temizlendi.');
      }

      return { migrated, skipped, errors };

    } catch (error) {
      console.error('Migration hatası:', error);
      throw error;
    }
  }
}

export default new DatabaseService();

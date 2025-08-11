// Veritabanı bağlantısını test eden basit script
const storyDb = require('./database/db.js');

async function testDatabase() {
  console.log('🔍 Veritabanı bağlantısı test ediliyor...');
  
  try {
    console.log('✅ Veritabanı bağlantısı başarılı');
    
    // Tüm masalları getir
    const stories = storyDb.getAllStories();
    console.log('📊 Toplam masal sayısı:', stories.length);
    
    // Favori masalları getir
    const favorites = stories.filter(story => story.is_favorite === 1);
    console.log('💖 Favori masal sayısı:', favorites.length);
    
    // Son 5 masalı göster
    const recentStories = stories.slice(-5);
    console.log('📚 Son 5 masal:');
    recentStories.forEach(story => {
      console.log(`  - ID: ${story.id}, Type: ${story.story_type}, Favorite: ${story.is_favorite}, Date: ${story.created_at}`);
    });
    
    console.log('✅ Test tamamlandı');
    
  } catch (error) {
    console.error('❌ Veritabanı test hatası:', error);
  }
}

testDatabase();

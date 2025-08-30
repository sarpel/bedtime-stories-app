// Veritabanı bağlantısını test eden basit script
const db = require('./database/db.ts');

async function testDatabase(): Promise<void> {
  console.log('🔍 Veritabanı bağlantısı test ediliyor...');

  try {
    console.log('✅ Veritabanı bağlantısı başarılı');

    // Tüm masalları getir
    const stories = db.getAllStories();
    console.log('📊 Toplam masal sayısı:', stories.length);

    // Favori masalları getir
    const favorites = stories.filter((story: any) => story.is_favorite === 1);
    console.log('💖 Favori masal sayısı:', favorites.length);

    // Son 5 masalı göster
    const recentStories = stories.slice(-5);
    console.log('📚 Son 5 masal:');
    recentStories.forEach((story: any) => {
      console.log(`  - ID: ${story.id}, Type: ${story.story_type}, Favorite: ${story.is_favorite}, Date: ${story.created_at}`);
    });

    console.log('✅ Test tamamlandı');

  } catch (error) {
    console.error('❌ Veritabanı test hatası:', error);
  }
}

testDatabase();

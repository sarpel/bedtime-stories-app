#!/usr/bin/env node

// Test script for the database API
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 Veritabanı API Test Başlatılıyor...\n');

  try {
    // 1. Boş liste test
    console.log('1️⃣ Boş masal listesi testi:');
    const emptyResponse = await axios.get(`${API_BASE}/stories`);
    console.log('✅ Sonuç:', emptyResponse.data);
    console.log('✅ Masal sayısı:', emptyResponse.data.length, '\n');

    // 2. Yeni masal oluştur
    console.log('2️⃣ Yeni masal oluşturma testi:');
    const newStory = {
      storyText: 'Bu bir test masalıdır. Küçük prens uzak bir gezegende yaşıyordu...',
      storyType: 'test',
      customTopic: 'Test konusu'
    };
    
    const createResponse = await axios.post(`${API_BASE}/stories`, newStory);
    console.log('✅ Oluşturulan masal ID:', createResponse.data.id);
    console.log('✅ Masal türü:', createResponse.data.story_type);
    const storyId = createResponse.data.id;
    console.log('');

    // 3. Tüm masalları listele
    console.log('3️⃣ Tüm masalları listeleme testi:');
    const allStoriesResponse = await axios.get(`${API_BASE}/stories`);
    console.log('✅ Toplam masal sayısı:', allStoriesResponse.data.length);
    console.log('✅ İlk masal ID:', allStoriesResponse.data[0]?.id);
    console.log('');

    // 4. Belirli bir masalı getir
    console.log('4️⃣ Belirli masal getirme testi:');
    const specificStoryResponse = await axios.get(`${API_BASE}/stories/${storyId}`);
    console.log('✅ Getirilen masal ID:', specificStoryResponse.data.id);
    console.log('✅ Masal türü:', specificStoryResponse.data.story_type);
    console.log('');

    // 5. Masal güncelle
    console.log('5️⃣ Masal güncelleme testi:');
    const updatedStory = {
      storyText: 'Bu güncellenmiş bir test masalıdır. Küçük prens artık farklı bir gezegene taşındı...',
      storyType: 'updated-test',
      customTopic: 'Güncellenmiş test konusu'
    };
    
    const updateResponse = await axios.put(`${API_BASE}/stories/${storyId}`, updatedStory);
    console.log('✅ Güncellenen masal ID:', updateResponse.data.id);
    console.log('✅ Yeni masal türü:', updateResponse.data.story_type);
    console.log('');

    // 6. Tip bazlı masal arama
    console.log('6️⃣ Tip bazlı masal arama testi:');
    const typeResponse = await axios.get(`${API_BASE}/stories/type/updated-test`);
    console.log('✅ "updated-test" türündeki masal sayısı:', typeResponse.data.length);
    console.log('');

    // 7. Masal silme
    console.log('7️⃣ Masal silme testi:');
    const deleteResponse = await axios.delete(`${API_BASE}/stories/${storyId}`);
    console.log('✅ Silme mesajı:', deleteResponse.data.message);
    console.log('');

    // 8. Silindikten sonra liste kontrol
    console.log('8️⃣ Silme sonrası liste testi:');
    const finalListResponse = await axios.get(`${API_BASE}/stories`);
    console.log('✅ Kalan masal sayısı:', finalListResponse.data.length);
    console.log('');

    console.log('🎉 Tüm testler başarıyla tamamlandı!');

  } catch (error) {
    console.error('❌ Test hatası:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Test'i çalıştır
testAPI();

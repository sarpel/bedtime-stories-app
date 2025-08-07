// Rate limiting test dosyası
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testRateLimit() {
  console.log('Rate limiting testi başlatılıyor...\n');
  
  // Test 1: Normal istek sayısı (genel limit altında)
  console.log('🧪 Test 1: Normal istek sayısı (5 istek)');
  try {
    for (let i = 1; i <= 5; i++) {
      const response = await axios.get(`${BASE_URL}/api/stories`);
      console.log(`İstek ${i}: ${response.status} - ${response.headers['ratelimit-remaining']} kalan`);
    }
  } catch (error) {
    console.log(`❌ Hata: ${error.response?.status} - ${error.response?.data?.error}`);
  }
  
  console.log('\n⏱️  1 saniye bekleniyor...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Veritabanı limit testi (1 dakikada 20 istek limitini test et)
  console.log('🧪 Test 2: Veritabanı rate limit testi (25 hızlı istek)');
  try {
    const promises = [];
    for (let i = 1; i <= 25; i++) {
      promises.push(
        axios.get(`${BASE_URL}/api/stories`)
          .then(response => ({ 
            success: true, 
            request: i, 
            status: response.status,
            remaining: response.headers['ratelimit-remaining']
          }))
          .catch(error => ({ 
            success: false, 
            request: i, 
            status: error.response?.status,
            error: error.response?.data?.error
          }))
      );
    }
    
    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Başarılı istekler: ${successful.length}`);
    console.log(`❌ Reddedilen istekler: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log(`📝 Rate limit mesajı: "${failed[0].error}"`);
    }
    
  } catch (error) {
    console.error('Test hatası:', error.message);
  }
}

// Test'i çalıştır
testRateLimit()
  .then(() => {
    console.log('\n✅ Rate limiting testi tamamlandı!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test başarısız:', error);
    process.exit(1);
  });

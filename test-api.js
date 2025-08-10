/* eslint-env node */
/* global process */
// Backend API test script - using native fetch

async function testCreateStory() {
  try {
    console.log('Testing POST /api/stories...');

    const testData = {
      storyText: "Bu bir test masalıdır. Bir zamanlar uzak diyarlarda küçük bir kız yaşarmış. Bu kız her gece yıldızları sayarak uyurmuş ve güzel rüyalar görürmüş. O kadar güzel rüyalar görürmüş ki, sabah olduğunda bile rüyalarının devamını düşünürmüş.",
      storyType: "macera",
      customTopic: ""
    };

    console.log('Sending data:', JSON.stringify(testData, null, 2));

    const BASE = process.env.BACKEND_URL;
    if (!BASE) {
      throw new Error('BACKEND_URL env değişkenini ayarlayın (örn: http://127.0.0.1:3001)');
    }
    const response = await fetch(`${BASE}/api/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('Success! Created story:', result);
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCreateStory();

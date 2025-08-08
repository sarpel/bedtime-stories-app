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
    
    const response = await fetch('http://localhost:3001/api/stories', {
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

# STT Implementation Plan - Bedtime Stories App

*Bu doküman, Raspberry Pi Zero 2W masallar uygulamasına STT (Speech-to-Text) entegrasyonu için detaylı uygulama planını içerir.*

## 📋 Proje Özeti

**Amaç**: Mevcut masallar uygulamasına ses tanıma özelliği eklenerek, velilerin ve çocukların doğal dilde masal isteyebilmesini sağlamak.

**Temel Özellikler**:
- Ses komutları ile masal türü seçimi
- Karakter ismi belirtme
- Yaş grubu belirleme
- Sesli oynatım kontrolleri
- Türkçe dil desteği

## 🏗️ Sistem Mimarisi

### Frontend Katmanı
```
┌─────────────────────────────────────┐
│           React Frontend            │
├─────────────────────────────────────┤
│  VoiceCommandPanel.tsx             │
│  ├─ Mikrofon butonu                 │
│  ├─ Kayıt durumu göstergesi         │
│  ├─ Ses dalgası animasyonu          │
│  └─ Transkript görüntüleme          │
├─────────────────────────────────────┤
│  STTService.ts                     │
│  ├─ AudioRecorder class            │
│  ├─ OpenAI/Deepgram entegrasyon    │
│  ├─ Ses komutu işleme              │
│  └─ Intent detection               │
└─────────────────────────────────────┘
```

### Backend Katmanı
```
┌─────────────────────────────────────┐
│           Node.js Backend           │
├─────────────────────────────────────┤
│  /api/stt endpoint                 │
│  ├─ Multipart file upload          │
│  ├─ Provider routing                │
│  ├─ OpenAI Whisper proxy           │
│  └─ Deepgram proxy                 │
├─────────────────────────────────────┤
│  Audio Processing                   │
│  ├─ Format conversion               │
│  ├─ Compression optimization        │
│  ├─ Duration validation             │
│  └─ Error handling                 │
└─────────────────────────────────────┘
```

## 📅 Implementation Roadmap

### Phase 1: Core STT Infrastructure (Week 1-2)

#### 1.1 Backend STT API Endpoint
```typescript
// backend/routes/stt.ts oluşturulacak

app.post('/api/stt', upload.single('audio'), async (req, res) => {
  // Provider routing (OpenAI/Deepgram)
  // Audio file validation
  // API proxy calls
  // Response normalization
});
```

**Görevler**:
- [ ] Backend'e `/api/stt` endpoint eklenmesi
- [ ] Multipart file upload middleware (multer)
- [ ] OpenAI Whisper API proxy
- [ ] Deepgram API proxy (opsiyonel)
- [ ] Error handling ve logging
- [ ] Audio format validation

**Beklenen Dosyalar**:
- `backend/routes/stt.ts`
- `backend/middleware/upload.ts`
- Package.json'a `multer` dependency

#### 1.2 Frontend STT Service
```typescript
// src/services/sttService.ts zaten oluşturuldu

const sttService = new STTService({
  sttProvider: 'openai',
  audioSettings: { sampleRate: 16000, channels: 1 }
});

await sttService.startListening();
const result = await sttService.stopListening();
```

**Görevler**:
- [x] STTService.ts implementasyonu (tamamlandı)
- [ ] AudioRecorder browser compatibility testleri
- [ ] Error handling iyileştirmeleri
- [ ] Progress callback implementasyonu

### Phase 2: Voice Interface Components (Week 2-3)

#### 2.1 Voice Command Panel Component
```typescript
// src/components/VoiceCommandPanel.tsx

interface VoiceCommandPanelProps {
  onVoiceCommand: (command: VoiceCommand) => void;
  disabled?: boolean;
}

interface VoiceCommand {
  intent: string;
  parameters: {
    storyType?: string;
    characterName?: string;
    age?: number;
    customTopic?: string;
  };
  confidence: number;
}
```

**Görevler**:
- [ ] VoiceCommandPanel component oluşturma
- [ ] Mikrofon permission handling
- [ ] Recording state management
- [ ] Audio visualization (wave animation)
- [ ] Transcription display
- [ ] Command confidence scoring

#### 2.2 Voice Control Integration
```typescript
// StoryCreator.tsx'a entegrasyon

const handleVoiceCommand = (command: VoiceCommand) => {
  if (command.intent === 'story_request') {
    setStoryType(command.parameters.storyType);
    setCharacterName(command.parameters.characterName);
    setAge(command.parameters.age);
  }
};
```

**Görevler**:
- [ ] StoryCreator component'ine voice kontrol ekleme
- [ ] AudioControls'a sesli oynatım komutları
- [ ] Settings'e STT provider seçenekleri
- [ ] Voice command feedback UI

### Phase 3: Natural Language Processing (Week 3-4)

#### 3.1 Turkish Intent Recognition
```typescript
// src/utils/intentRecognition.ts

const turkishIntents = {
  story_request: {
    patterns: ['masal anlat', 'hikaye istiyorum', 'masal oku'],
    confidence: 0.9
  },
  story_type: {
    fairy_tale: ['peri masalı', 'prenses hikayesi'],
    adventure: ['macera hikayesi', 'kahraman hikayesi'],
    educational: ['öğretici hikaye', 'bilim hikayesi']
  }
};
```

**Görevler**:
- [ ] Turkish intent patterns tanımlama
- [ ] Regex-based parameter extraction
- [ ] Confidence scoring algoritması
- [ ] Fallback intent handling
- [ ] Command validation

#### 3.2 Story Parameter Extraction
```typescript
// Örnek komutlar:
// "5 yaşındaki Elif için peri masalı anlat"
// "Ahmet adında kahraman olan macera hikayesi"
// "Hayvanlar hakkında öğretici bir hikaye"

const extractStoryParams = (text: string) => {
  const age = extractAge(text);          // "5 yaş" → 5
  const name = extractName(text);        // "Elif için" → "Elif"
  const storyType = extractType(text);   // "peri masalı" → "fairy_tale"
  const topic = extractTopic(text);      // "hayvanlar hakkında" → "animals"
};
```

**Görevler**:
- [ ] Age extraction patterns
- [ ] Character name extraction
- [ ] Story type classification
- [ ] Topic/theme extraction
- [ ] Multi-parameter command handling

### Phase 4: Audio Optimization & Pi Integration (Week 4-5)

#### 4.1 Raspberry Pi Audio Optimization
```typescript
// Pi Zero 2W optimizasyonları

const audioSettings = {
  sampleRate: 16000,        // STT için optimize
  channels: 1,              // Mono, bandwidth tasarrufu
  bitDepth: 16,             // Kalite/boyut dengesi
  bufferSize: 4096,         // Pi Zero 2W için optimize
  maxDuration: 30,          // Maksimum 30 saniye kayıt
  compressionLevel: 0.7,    // Bandwidth için sıkıştırma
};
```

**Görevler**:
- [ ] Audio capture optimizasyonu Pi için
- [ ] Network bandwidth optimization
- [ ] Memory usage monitoring
- [ ] Error recovery strategies
- [ ] Offline fallback planning

#### 4.2 Backend Audio Processing
```typescript
// backend/utils/audioProcessor.ts

class AudioProcessor {
  static async optimizeForSTT(audioBuffer: Buffer) {
    // Format conversion to WAV 16kHz mono
    // Noise reduction (basic)
    // Duration validation
    // File size optimization
  }
  
  static async validateAudio(audioBuffer: Buffer) {
    // Minimum duration check (1 second)
    // Maximum duration check (30 seconds)
    // Audio quality validation
    // Silent audio detection
  }
}
```

**Görevler**:
- [ ] Audio format conversion utilities
- [ ] Basic noise reduction
- [ ] Duration and size validation
- [ ] Silent audio detection
- [ ] Format compatibility checks

### Phase 5: Testing & Quality Assurance (Week 5-6)

#### 5.1 Voice Command Testing
```typescript
// tests/stt/voiceCommands.test.ts

describe('Voice Commands', () => {
  test('should recognize story request in Turkish', () => {
    const command = 'Elif için peri masalı anlat';
    const result = processVoiceCommand(command);
    
    expect(result.intent).toBe('story_request');
    expect(result.parameters.characterName).toBe('Elif');
    expect(result.parameters.storyType).toBe('fairy_tale');
  });
});
```

**Test Senaryoları**:
- [ ] Basic Turkish commands
- [ ] Multi-parameter commands
- [ ] Edge cases (noise, mumbling)
- [ ] Different accents
- [ ] Children's voice patterns

#### 5.2 Performance Testing
```typescript
// Performance benchmarks Pi Zero 2W

const benchmarks = {
  audioCapture: '<200ms latency',
  sttTranscription: '<5s for 10s audio',
  intentProcessing: '<100ms',
  totalVoiceToAction: '<7s',
  memoryUsage: '<50MB increase',
  networkUsage: '<100KB per command'
};
```

**Test Metrikleri**:
- [ ] Response time measurements
- [ ] Memory usage profiling
- [ ] Network bandwidth testing
- [ ] Battery consumption (if applicable)
- [ ] Concurrent user testing

## 🛠️ Technical Implementation Details

### OpenAI Whisper Integration

#### Backend Endpoint
```typescript
// backend/routes/stt.ts

app.post('/api/stt', upload.single('audio'), async (req, res) => {
  try {
    const { provider, model, language } = req.body;
    const audioFile = req.file;

    if (provider === 'openai') {
      const formData = new FormData();
      formData.append('file', audioFile.buffer, 'audio.webm');
      formData.append('model', model || 'whisper-1');
      formData.append('language', language || 'tr');
      formData.append('response_format', 'json');

      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      res.json({
        text: response.data.text,
        language: response.data.language,
        duration: response.data.duration
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'STT processing failed' });
  }
});
```

### Deepgram Integration (Optional)

#### Streaming STT for Real-time
```typescript
// Real-time streaming for better UX

const deepgramClient = new Deepgram(apiKey);
const connection = deepgramClient.listen.live({
  model: 'nova-3',
  language: 'tr',
  smart_format: true,
  interim_results: true
});

connection.on('Results', (data) => {
  const transcript = data.channel.alternatives[0].transcript;
  if (transcript && data.is_final) {
    processVoiceCommand(transcript);
  }
});
```

## 📦 Required Dependencies

### Frontend Dependencies
```json
{
  "devDependencies": {
    "@types/dom-mediacapture-record": "^1.0.11"
  }
}
```

### Backend Dependencies
```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1",
    "axios": "^1.6.0",
    "form-data": "^4.0.0"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11"
  }
}
```

## 🔧 Configuration

### Environment Variables
```env
# STT Service Configuration
OPENAI_STT_ENABLED=true
DEEPGRAM_STT_ENABLED=false
DEEPGRAM_API_KEY=your_deepgram_key_here

# Audio Processing
MAX_AUDIO_DURATION_SECONDS=30
MAX_AUDIO_FILE_SIZE_MB=10
AUDIO_COMPRESSION_ENABLED=true

# Pi Zero 2W Optimizations
LOW_BANDWIDTH_MODE=true
AUDIO_BUFFER_SIZE=4096
STT_TIMEOUT_MS=15000
```

### Frontend Settings
```typescript
// src/config/sttConfig.ts

export const sttConfig = {
  defaultProvider: 'openai',
  audioSettings: {
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    maxDuration: 30,
  },
  ui: {
    showTranscription: true,
    showConfidence: true,
    autoStartListening: false,
    visualizeAudio: true
  },
  intents: {
    confidenceThreshold: 0.6,
    fallbackToText: true,
    enableMultiIntent: true
  }
};
```

## 🚀 Deployment Strategy

### Development Phase
1. Local development with desktop microphone
2. OpenAI Whisper integration testing
3. Basic voice commands implementation
4. Turkish language optimization

### Testing Phase  
1. Raspberry Pi Zero 2W deployment
2. USB microphone testing
3. Network optimization
4. Performance profiling
5. Real user testing with children

### Production Phase
1. systemd service integration
2. Audio device configuration
3. Auto-start configuration
4. Monitoring and logging
5. Error recovery mechanisms

## 📊 Success Metrics

### Technical Metrics
- **Recognition Accuracy**: >85% for clear Turkish speech
- **Response Time**: <7 seconds end-to-end
- **Memory Usage**: <50MB additional consumption
- **Network Usage**: <100KB per voice command
- **Uptime**: >99% availability

### User Experience Metrics
- **Command Success Rate**: >80% first try
- **User Satisfaction**: Child-friendly interaction
- **Ease of Use**: Minimal learning curve
- **Accessibility**: Works for different ages

## 🔄 Future Enhancements

### Phase 2 Features (Future)
1. **Offline STT**: Local Whisper model for Pi
2. **Multi-language**: English support addition
3. **Speaker Recognition**: Different family members
4. **Conversation Mode**: Interactive storytelling
5. **Voice Cloning**: Parent's voice for stories

### Advanced Features
1. **Emotion Recognition**: Detect child's mood
2. **Interactive Stories**: Voice-driven story choices
3. **Learning Mode**: Educational content delivery
4. **Smart Home Integration**: IoT device control
5. **Mobile App**: Remote control via phone

## 🛡️ Security & Privacy

### Data Protection
- **No Cloud Storage**: Transcriptions not stored permanently
- **Local Processing**: Audio processing on-device when possible
- **API Security**: Encrypted API communications
- **Access Control**: Microphone permission management

### Privacy Compliance
- **Parental Consent**: Clear permission system
- **Data Minimization**: Only necessary data collection
- **Transparent Logging**: Clear audit trail
- **Right to Delete**: Easy data removal

---

## 📋 Implementation Checklist

### Week 1-2: Foundation
- [ ] Backend STT endpoint implementation
- [ ] OpenAI Whisper proxy setup
- [ ] Frontend STTService integration
- [ ] Basic audio recording functionality

### Week 2-3: Interface
- [ ] VoiceCommandPanel component
- [ ] StoryCreator voice integration
- [ ] Audio visualization
- [ ] Recording state management

### Week 3-4: Intelligence
- [ ] Turkish intent recognition
- [ ] Parameter extraction
- [ ] Command confidence scoring
- [ ] Multi-parameter handling

### Week 4-5: Optimization
- [ ] Pi Zero 2W audio optimization
- [ ] Network bandwidth optimization
- [ ] Memory usage optimization
- [ ] Error recovery strategies

### Week 5-6: Quality Assurance
- [ ] Voice command testing
- [ ] Performance benchmarking
- [ ] User acceptance testing
- [ ] Documentation completion

### Production Deployment
- [ ] systemd service configuration
- [ ] Audio device setup
- [ ] Monitoring implementation
- [ ] User training materials

---

*Bu plan, Raspberry Pi Zero 2W donanım sınırlamaları göz önünde bulundurularak hazırlanmıştır ve OpenAI Whisper API'sinin maliyet-performans avantajını öncelemektedir.*
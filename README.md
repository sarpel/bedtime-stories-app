# Uyku Masalları - Bedtime Stories App

A beautiful React + Vite + Tailwind CSS web application that communicates with custom LLM and TTS models to generate and play bedtime stories for a 5-year-old Turkish girl.

## 🌟 Features

- **Custom LLM Integration**: Connect to any LLM API (OpenAI, OpenAI Compatible) for story generation
- **Custom TTS Integration**: Connect to any TTS API (ElevenLabs, ElevenLabs Compatible) for audio conversion
- **Beautiful UI**: Modern bluish-blackish theme with responsive design
- **Comprehensive Settings**: Configurable endpoints, models, voices, and story parameters
- **Turkish Language**: Specifically designed for Turkish bedtime stories
- **Audio Player**: Full-featured audio player with progress tracking
- **Error Handling**: Graceful error handling with fallback stories
- **Mobile Friendly**: Responsive design that works on all devices

## 🛠️ Configuration

### LLM Settings

1. Click the "Ayarlar" (Settings) button
2. Go to the "LLM" tab
3. Configure:
   - **API Endpoint URL**: Your LLM API endpoint (e.g., `https://api.openai.com/v1/chat/completions`)
   - **Model ID**: The model to use (e.g., `gpt-4`, `gpt-4o-mini`, `gpt-4.1-mini`)
   - **API Key**: Your API authentication key

### TTS Settings

1. Go to the "TTS" tab in settings
2. Configure:
   - **API Endpoint URL**: Your TTS API endpoint (e.g., `https://api.openai.com/v1/audio/speech`)
   - **TTS Model ID**: The TTS model to use (e.g., `eleven_turbo_v2_5`)
   - **Voice ID**: The voice to use (e.g., `'xsGHrtxT5AdDzYXTQT0d', name: 'Gönül Filiz (Kadın)'`)
   - **API Key**: Your TTS API authentication key

### Backend Environment

Create a `backend/.env` file with your API keys so the proxy server can forward requests:

```bash
OPENAI_API_KEY=sk-your-openai-key
ELEVENLABS_API_KEY=xi-api-key-your-key
```

### Voice Settings

1. Go to the "Ses" (Voice) tab
2. Adjust:
   - **Konuşma Hızı** (Speech Speed): 0.5x to 2.0x
   - **Ses Tonu** (Voice Tone): Low to High
   - **Ses Seviyesi** (Voice Level): 10% to 100%

### Content Settings

1. Go to the "İçerik" (Content) tab
2. Configure:
   - **Masal Uzunluğu** (Story Length): Short (1-2 min), Medium (3-5 min), Long (5-8 min)
   - **Özel Prompt** (Custom Prompt): Customize the story generation prompt

## 📖 How to Use

1. **Open the Application**: Visit http://localhost:3000
2. **Configure Settings**: Click "Ayarlar" and set up your LLM and TTS API credentials
3. **Generate Story**: Click "Yeni Masal Oluştur" to create a new bedtime story
4. **Convert to Audio**: Click "Seslendir" to convert the story to speech
5. **Play Audio**: Use the audio player controls to play, pause, or stop the story

## 🔧 Supported API Providers

### LLM Providers
- **OpenAI**: GPT-4o-Mini
- **Custom APIs**: Any OpenAI-compatible API

### TTS Providers
- **ElevenLabs**: Premium AI voices with emotion
- **Custom APIs**: Any compatible TTS service

## 🎨 Customization

### Story Prompts
The app includes several example prompts you can use:
- "Türk kültürüne uygun, eğitici değerler içeren masallar"
- "Hayvanlar ve doğa temalı, çevre bilinci kazandıran hikayeler"
- "Arkadaşlık, paylaşım ve yardımlaşma değerlerini öğreten masallar"
- "Fantastik öğeler içeren, hayal gücünü geliştiren hikayeler"

### Voice Options
- **ElevenLabs**: Premium AI voices

## 🔒 Privacy & Security

- All API keys are stored locally in your browser
- No data is sent to our servers
- Stories and audio are processed through your configured APIs
- Settings are saved in browser localStorage

## 🛠️ Technical Details

### Built With
- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/UI**: Beautiful UI components
- **Lucide Icons**: Modern icon library

### Architecture
- **Frontend**: React SPA with responsive design
- **Services**: Modular LLM and TTS service classes
- **State Management**: React hooks and local state
- **Storage**: Browser localStorage for settings
- **Audio**: HTML5 Audio API with custom controls

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Development

### Local Setup
```bash
# Clone the repository
git clone <repository-url>
cd bedtime-stories-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure
```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   └── Settings.jsx  # Settings panel component
├── services/
│   ├── llmService.js # LLM integration service
│   └── ttsService.js # TTS integration service
├── App.jsx          # Main application component
├── App.css          # Global styles
└── main.jsx         # Application entry point
```

## 📝 API Integration Examples

### OpenAI LLM
```
import OpenAI from "openai";

const openai = new OpenAI();

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "developer", content: "You are a helpful assistant." }],
    model: "gpt-4.1-mini",
    store: true,
  });

  console.log(completion.choices[0]);
}

main();

```

### ElevenLabs TTS
```
// Create speech (POST /v1/text-to-speech/:voice_id)
const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/xsGHrtxT5AdDzYXTQT0d?output_format=mp3_44100_128", {
  method: "POST",
  headers: {
    "xi-api-key": "sk-your-api-key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "text": "Sevgi katılarak tatlı rüyalar için yapıldı.",
    "model_id": "eleven_turbo_v2_5",
    "language_code": "tr",
    "voice_settings": {
      "stability": 0.75,
      "use_speaker_boost": false,
      "similarity_boost": 0.75,
      "style": 0,
      "speed": 0.9
    }
  }),
});

const body = await response.json();
console.log(body);
```

## 🎯 Future Enhancements

- Story themes and categories
- Character customization
- Story history and favorites
- Offline mode with cached stories
- Multiple language support
- Parent dashboard
- Sleep timer functionality
- Background music options

## 📞 Support

For technical support or feature requests, please refer to the application settings panel for configuration guidance. The app includes comprehensive error messages and fallback functionality to ensure a smooth user experience.

## 📄 License

This project is created for personal use. Please ensure you comply with the terms of service of any third-party APIs you configure.

---

**Made with ❤️ for sweet dreams and beautiful stories**


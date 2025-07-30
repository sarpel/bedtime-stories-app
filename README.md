# Uyku Masalları - Bedtime Stories App

A beautiful React + Vite + Tailwind CSS web application that communicates with custom LLM and TTS models to generate and play bedtime stories for a 5-year-old Turkish girl.

## 🌟 Features

- **Custom LLM Integration**: Connect to any LLM API (OpenAI, Claude, Llama, etc.) for story generation
- **Custom TTS Integration**: Connect to any TTS API (OpenAI TTS, ElevenLabs, Azure, Google Cloud, etc.) for audio conversion
- **Beautiful UI**: Modern bluish-blackish theme with responsive design
- **Comprehensive Settings**: Configurable endpoints, models, voices, and story parameters
- **Turkish Language**: Specifically designed for Turkish bedtime stories
- **Audio Player**: Full-featured audio player with progress tracking
- **Error Handling**: Graceful error handling with fallback stories
- **Mobile Friendly**: Responsive design that works on all devices

## 🚀 Live Demo

The application is deployed and accessible at: **https://udpqrpuq.manus.space**

## 🛠️ Configuration

### LLM Settings

1. Click the "Ayarlar" (Settings) button
2. Go to the "LLM" tab
3. Configure:
   - **API Endpoint URL**: Your LLM API endpoint (e.g., `https://api.openai.com/v1/chat/completions`)
   - **Model ID**: The model to use (e.g., `gpt-4`, `claude-3-sonnet`, `llama-2`)
   - **API Key**: Your API authentication key

### TTS Settings

1. Go to the "TTS" tab in settings
2. Configure:
   - **API Endpoint URL**: Your TTS API endpoint (e.g., `https://api.openai.com/v1/audio/speech`)
   - **TTS Model ID**: The TTS model to use (e.g., `tts-1`, `elevenlabs`)
   - **Voice ID**: The voice to use (e.g., `alloy`, `nova`, `shimmer`)
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

1. **Open the Application**: Visit https://udpqrpuq.manus.space
2. **Configure Settings**: Click "Ayarlar" and set up your LLM and TTS API credentials
3. **Generate Story**: Click "Yeni Masal Oluştur" to create a new bedtime story
4. **Convert to Audio**: Click "Seslendir" to convert the story to speech
5. **Play Audio**: Use the audio player controls to play, pause, or stop the story

## 🔧 Supported API Providers

### LLM Providers
- **OpenAI**: GPT-3.5, GPT-4, GPT-4 Turbo
- **Anthropic**: Claude 3 (Haiku, Sonnet, Opus)
- **Meta**: Llama 2, Code Llama
- **Google**: Gemini Pro
- **Custom APIs**: Any OpenAI-compatible API

### TTS Providers
- **OpenAI TTS**: High-quality neural voices
- **ElevenLabs**: Premium AI voices with emotion
- **Azure Cognitive Services**: Microsoft's TTS service
- **Google Cloud TTS**: Google's text-to-speech API
- **Custom APIs**: Any compatible TTS service

## 🎨 Customization

### Story Prompts
The app includes several example prompts you can use:
- "Türk kültürüne uygun, eğitici değerler içeren masallar"
- "Hayvanlar ve doğa temalı, çevre bilinci kazandıran hikayeler"
- "Arkadaşlık, paylaşım ve yardımlaşma değerlerini öğreten masallar"
- "Fantastik öğeler içeren, hayal gücünü geliştiren hikayeler"

### Voice Options
Different providers offer various voice options:
- **OpenAI**: Alloy, Echo, Fable, Onyx, Nova, Shimmer
- **Azure**: Turkish voices (Emel, Ahmet)
- **Google Cloud**: Turkish Wavenet voices
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
Endpoint: https://api.openai.com/v1/chat/completions
Model: gpt-4
API Key: sk-...
```

### OpenAI TTS
```
Endpoint: https://api.openai.com/v1/audio/speech
Model: tts-1
Voice: nova
API Key: sk-...
```

### ElevenLabs TTS
```
Endpoint: https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Voice ID: EXAVITQu4vr4xnSDxMaL
API Key: your-elevenlabs-key
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


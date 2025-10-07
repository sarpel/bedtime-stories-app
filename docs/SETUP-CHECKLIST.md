# Quick Setup Checklist

## 🎯 Essential Steps to Deploy Your App

### ✅ 1. Create Backend Environment File

```bash
cd bedtime-stories-app/backend
cp .env.example .env
# Edit .env and add your API keys
```

**Required API Keys:**

- At least ONE LLM provider: `OPENAI_API_KEY` OR `GEMINI_LLM_API_KEY`
- At least ONE TTS provider: `ELEVENLABS_API_KEY` OR `GEMINI_TTS_API_KEY`

### ✅ 2. Build the Application

```bash
cd bedtime-stories-app
npm run build
```

This creates a generic `dist/` folder that works on ANY domain/IP.

### ✅ 3. Start the Server

```bash
# For network access:
npm run serve:network

# Or just backend:
cd backend
npm start
```

### ✅ 4. Access From Any URL

Your app now works on:

- ✅ http://localhost:4173
- ✅ http://192.168.1.x:4173
- ✅ http://your-domain.com
- ✅ Any other URL pointing to your server

---

## 🔍 Verification

### Check 1: Backend Started Successfully

```
✓ Backend started on http://0.0.0.0:3001
✓ Environment loaded from backend/.env
✓ Database connected
```

### Check 2: Frontend Accessible

Open browser to `http://your-ip:4173` (or 3001 if backend serves frontend)

### Check 3: API Keys Working

1. Go to Settings
2. Select a provider (OpenAI, Gemini, ElevenLabs)
3. Try generating a story
4. Should NOT see "No API key" errors

---

## 🐛 If Something Goes Wrong

### Error: "No API key"

**Solution:** Check `backend/.env` has the required keys for your selected provider

### Error: 404 on /api/llm or /api/tts

**Solution:** Ensure backend is running on port 3001

### Error: Works on localhost but not network

**Solution:**

1. You already fixed the code (configService.ts)
2. Did you rebuild? Run `npm run build` again
3. Is backend accessible? Check firewall/port 3001

### Error: CORS issues

**Solution:** Use relative URLs (`/api/llm`) not absolute (`http://localhost:3001/api/llm`)

---

## 📝 Files You Need

### ✅ Must Have:

- `backend/.env` - With your API keys

### ❌ Optional:

- `.env` - Only if you want to override default models/voices

### ⚠️ Never Commit:

- `backend/.env` (contains secrets)
- `.env` (if it contains any sensitive data)

---

## 🎓 Understanding the Architecture

```
Your Browser → http://your-ip:4173 → Frontend (dist/)
                                        ↓
                                   /api/llm request
                                        ↓
                                   Backend :3001
                                        ↓
                                   Reads backend/.env
                                        ↓
                                   Adds API key
                                        ↓
                                   Calls OpenAI/Gemini/ElevenLabs
```

**Key Points:**

1. Frontend NEVER sees API keys
2. Backend reads keys at startup from backend/.env
3. Backend proxies all API requests
4. One build works everywhere (no rebuilding needed)

---

## 📚 More Information

See `docs/API-Keys-Environment-Guide.md` for complete explanation of:

- Why the old approach failed
- Security implications
- Detailed troubleshooting
- Best practices

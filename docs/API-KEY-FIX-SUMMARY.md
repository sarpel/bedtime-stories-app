# API Key Issue - Root Cause and Fix Summary

## 📋 Executive Summary

**Problem:** API keys worked on `localhost:4173` but failed on network URLs (e.g., `192.168.1.x:4173`, `arven.sarpel.net`)

**Root Cause:** Frontend code tried to manage API keys using Vite's build-time environment variables (`VITE_*`), which get hardcoded into JavaScript bundles and blanked in production mode

**Solution:** Removed all API key handling from frontend. Backend now exclusively manages API keys via runtime `.env` file loading

**Impact:** One generic build now works on ANY domain/IP without rebuilding. API keys are secure (never exposed to browser).

---

## 🔧 Changes Made

### 1. Fixed `src/services/configService.ts`

**Before:**

```typescript
const isProduction = import.meta.env.PROD;
const apiKey = isProduction ? "" : import.meta.env.VITE_OPENAI_API_KEY || "";
```

**After:**

```typescript
// API keys NEVER in frontend
const apiKey = ""; // Always empty
const endpoint = "/api/llm"; // Relative URL works everywhere
```

**Why:**

- `import.meta.env` variables are baked in at build time
- Different builds had different embedded values
- Production mode intentionally blanked keys
- Insecure (keys visible in JavaScript bundle)

### 2. Updated `src/components/ApiKeyHelp.tsx`

- Changed instructions to emphasize `backend/.env` (SECURE ✅)
- Added warnings against `frontend/.env` (INSECURE ❌)
- Visual indicators showing correct vs incorrect approaches

### 3. Created Documentation

- **`docs/API-Keys-Environment-Guide.md`** - Complete technical explanation
- **`SETUP-CHECKLIST.md`** - Quick setup steps for deployment
- **`.env`** - Template for frontend configuration (non-sensitive only)
- **`.env.example`** - Updated with security warnings

---

## 🏗️ Architecture Changes

### Before (Broken)

```
Browser → Frontend (has API keys in JS) → Direct API calls
                ↓
         Keys exposed in bundle
         Different on each domain
         Required rebuild for changes
```

### After (Fixed)

```
Browser → Frontend (no API keys) → /api/llm request
                                       ↓
                                   Backend :3001
                                       ↓
                                   Reads backend/.env
                                       ↓
                                   Adds API key
                                       ↓
                                   Calls OpenAI/Gemini
```

---

## ✅ Benefits

1. **Security:** API keys never leave the server, never exposed to browser
2. **Portability:** One build works on localhost, network IPs, custom domains
3. **Maintainability:** Change API keys without rebuilding frontend
4. **Standard Practice:** Follows industry security best practices

---

## 📝 Required User Actions

### For Existing Installations

1. **Update backend/.env with API keys:**

   ```bash
   cd backend
   nano .env  # or notepad .env on Windows
   ```

   Add:

   ```bash
   OPENAI_API_KEY=sk-your-actual-key
   ELEVENLABS_API_KEY=xi-your-actual-key
   GEMINI_LLM_API_KEY=your-gemini-key
   GEMINI_TTS_API_KEY=your-gemini-key
   ```

2. **Rebuild frontend (one time only):**

   ```bash
   cd /path/to/bedtime-stories-app
   npm run build
   ```

3. **Restart backend:**

   ```bash
   cd backend
   npm start
   # or use npm run serve:network from root
   ```

4. **Verify:**
   - Access app from any URL (localhost, network IP, custom domain)
   - Check Settings page (API keys should NOT be visible)
   - Try generating a story
   - Should work without "No API key" errors

### For New Deployments

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in your API keys
3. Run `npm run build`
4. Run `npm run serve:network`
5. Access from any URL

---

## 🔍 Technical Details

### Why Vite Environment Variables Don't Work for API Keys

1. **Build-time Resolution:**

   ```typescript
   // This gets replaced at BUILD time:
   const key = import.meta.env.VITE_API_KEY;

   // Becomes in built JavaScript:
   const key = "sk-hardcoded-key-here";
   ```

2. **Once Built, Forever Hardcoded:**

   - The `dist/` folder contains the hardcoded value
   - Moving `dist/` to another machine doesn't change it
   - Changing `.env` on target machine has NO effect

3. **Production Mode Behavior:**
   - `import.meta.env.PROD === true` during production builds
   - Code intentionally blanked keys in production mode
   - This prevented keys from being embedded (good intent, wrong approach)

### Correct Pattern: Backend Proxy

1. **Frontend uses relative URLs:**

   ```typescript
   fetch("/api/llm", {
     method: "POST",
     body: JSON.stringify({ prompt: "..." }),
   });
   ```

2. **Backend adds API key at runtime:**

   ```typescript
   // Read from .env at startup (runtime)
   const apiKey = process.env.OPENAI_API_KEY;

   // Proxy request with key
   const response = await fetch("https://api.openai.com/...", {
     headers: { Authorization: `Bearer ${apiKey}` },
   });
   ```

3. **Benefits:**
   - Frontend code has NO secrets
   - One build works everywhere
   - Change keys without rebuild
   - Secure (keys never in browser)

---

## 🚀 Deployment Workflow

### Development

```bash
# Frontend and backend on different ports
npm run dev
# Frontend: localhost:5173
# Backend: localhost:3001
# Vite proxy handles /api/* → localhost:3001
```

### Production

```bash
# Build once
npm run build

# Serve on any machine/domain
npm run serve:network
# Backend: 0.0.0.0:3001 (serves frontend + API)
# Access: localhost:3001, 192.168.1.x:3001, domain.com
```

### Docker

```bash
# Build image
docker build -t bedtime-stories-app .

# Run with environment file
docker run -p 3001:3001 --env-file backend/.env bedtime-stories-app
```

---

## 🐛 Troubleshooting

### Q: Still seeing "No API key" errors?

**A:** Check `backend/.env` has the keys and restart backend

### Q: Keys work on localhost but not network?

**A:** You already fixed this! Just rebuild: `npm run build`

### Q: Do I need to rebuild when I change API keys?

**A:** No! Backend reads `.env` at startup. Just restart backend.

### Q: Can I still use frontend .env for anything?

**A:** Yes! For NON-sensitive config like model names, voice IDs, etc.

### Q: What if I have multiple environments?

**A:**

- Dev: `backend/.env`
- Production: `backend/.env.production`
- Backend loads appropriate file based on `NODE_ENV`

---

## 📚 Related Files

- `docs/API-Keys-Environment-Guide.md` - Comprehensive technical guide
- `SETUP-CHECKLIST.md` - Quick deployment steps
- `src/services/configService.ts` - Frontend config (fixed)
- `backend/server.ts` - Backend proxy (reads API keys)
- `.env.example` - Frontend template (non-sensitive)
- `backend/.env.example` - Backend template (sensitive keys)

---

## ✨ Conclusion

The issue was fundamentally about **misunderstanding how Vite environment variables work**:

- They are **build-time constants**, not runtime variables
- They get **hardcoded into JavaScript bundles**
- They are **publicly visible** to anyone who inspects the code
- They are **inappropriate for secrets** like API keys

The solution follows **standard web security practices**:

- API keys stay on the server (backend/.env)
- Frontend uses relative proxy URLs (/api/\*)
- Backend adds keys at runtime when forwarding requests
- One generic build works everywhere securely

This is now a **production-ready, secure architecture** that follows industry best practices.

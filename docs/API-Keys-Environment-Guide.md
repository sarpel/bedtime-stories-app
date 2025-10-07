# API Keys and Environment Variables - Complete Guide

## 🔴 The Problem You Experienced

### Symptom

- API keys work on `localhost:4173` but fail on network URLs (e.g., `192.168.1.100:4173` or `arven.sarpel.net`)
- Backend returns "No API key" errors when accessed from non-localhost URLs
- API keys appear in Settings on localhost but not on network URLs

### Root Cause

Your application had **two critical misunderstandings** about how environment variables work in Vite:

#### 1. **Frontend Environment Variables Are Build-Time Only**

```typescript
// ❌ WRONG: This code tried to read API keys from frontend environment
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
```

**What actually happens:**

- `import.meta.env` variables are resolved **at BUILD TIME**, not runtime
- When you run `npm run build`, Vite reads `.env` and **hardcodes** values into the JavaScript bundle
- The built `dist/` folder contains those hardcoded values forever
- Moving that `dist/` folder to another machine doesn't change the embedded values
- If you built without a `.env` file, those values are **permanently empty** in that build

#### 2. **Production Mode Intentionally Blanked All API Keys**

```typescript
// ❌ WRONG: This code intentionally set API keys to empty in production
const isProduction = import.meta.env.PROD;
const apiKey = isProduction ? "" : import.meta.env.VITE_OPENAI_API_KEY;
```

- When `import.meta.env.PROD === true` (during `npm run build` or `vite preview`)
- The code **intentionally set all API keys to empty strings** `""`
- Even if keys existed in `.env` during build, they were discarded

### Why Different URLs Showed Different Behavior

1. **Localhost:4173 sometimes worked:**

   - If running in development mode (`npm run dev`), `isProduction = false`
   - API keys from `.env` were temporarily available
   - But this was **insecure** and only worked locally

2. **Network URLs never worked:**
   - Network access typically uses production builds
   - `isProduction = true` → all keys blanked
   - Or the build was created on a different machine without `.env`

---

## ✅ The Correct Solution

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ BROWSER (Frontend)                                           │
│                                                              │
│ • NO API keys stored here (security risk!)                  │
│ • Only stores: models, voices, UI preferences               │
│ • Makes requests to relative URLs: /api/llm, /api/tts       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP Request to /api/llm
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (Node.js Server)                                     │
│                                                              │
│ • Reads API keys from backend/.env at RUNTIME               │
│ • Proxies requests to OpenAI/ElevenLabs/Gemini              │
│ • Adds API keys to outgoing requests                         │
│ • Returns results to frontend                                │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **API keys NEVER go in frontend code or environment variables**

   - Anyone can inspect JavaScript bundles and extract hardcoded keys
   - Frontend `.env` files are for **public** configuration only

2. **All API requests MUST go through backend proxy**

   - Frontend calls `/api/llm`, `/api/tts` (relative URLs)
   - Backend adds API keys and forwards to real APIs
   - Backend reads keys from `backend/.env` at runtime

3. **Use relative URLs for all API calls**
   - `/api/llm` works on any domain (localhost, network IP, custom domain)
   - Absolute URLs like `http://localhost:3001/api/llm` only work locally

---

## 📁 File Structure

```
bedtime-stories-app/
├── .env                          # Frontend config (NO SECRETS!)
│   └── Contains: VITE_BACKEND_URL (for dev only)
│
├── backend/
│   └── .env                      # Backend config (API KEYS HERE!)
│       └── Contains: OPENAI_API_KEY, ELEVENLABS_API_KEY, etc.
│
├── src/services/configService.ts  # Frontend config (fixed)
│   └── All apiKey fields = "" (empty)
│   └── All endpoints = "/api/llm" or "/api/tts" (relative)
│
└── backend/server.ts             # Backend proxy (handles API keys)
    └── Reads from backend/.env at runtime
```

---

## 🛠️ Setup Instructions

### Step 1: Create Frontend .env (Optional)

```bash
# Root directory: bedtime-stories-app/.env
# This file contains NO sensitive data

# Only needed in development if frontend/backend run on different ports
VITE_BACKEND_URL=

# Optional: Override default models (these are not sensitive)
# VITE_OPENAI_MODEL=gpt-5-nano
# VITE_ELEVENLABS_MODEL=eleven_turbo_v2_5
```

**What NOT to put here:**

- ❌ VITE_OPENAI_API_KEY
- ❌ VITE_ELEVENLABS_API_KEY
- ❌ Any other API keys or secrets

### Step 2: Create Backend .env (REQUIRED)

```bash
# Backend directory: bedtime-stories-app/backend/.env
# THIS FILE CONTAINS SENSITIVE API KEYS

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-5-nano
OPENAI_ENDPOINT=https://api.openai.com/v1/responses

# ElevenLabs Configuration
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_MODEL=eleven_turbo_v2_5
ELEVENLABS_VOICE_ID=xsGHrtxT5AdDzYXTQT0d
ELEVENLABS_ENDPOINT=https://api.elevenlabs.io/v1/text-to-speech

# Gemini LLM Configuration
GEMINI_LLM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxx
GEMINI_LLM_MODEL=gemini-2.5-flash-lite
GEMINI_LLM_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models

# Gemini TTS Configuration
GEMINI_TTS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxx
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
GEMINI_TTS_VOICE=Zephyr
GEMINI_TTS_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models

# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_PATH=./database/stories.db
```

### Step 3: Build and Deploy

```bash
# Build the application (only needs to be done once)
npm run build

# This creates dist/ folder with the compiled frontend
# The build is GENERIC and works on any domain/IP
# API keys are NOT embedded in the build

# Start the backend server (reads backend/.env at startup)
cd backend
npm start

# Or use the combined serve command
npm run serve:network
```

### Step 4: Verify Setup

1. **Check backend logs on startup:**

   ```
   ✓ Backend started on http://0.0.0.0:3001
   ✓ Environment loaded from backend/.env
   ```

2. **Test from any URL:**

   - `http://localhost:4173` ✅
   - `http://192.168.1.100:4173` ✅
   - `http://arven.sarpel.net` ✅

3. **Check browser console for errors:**
   - Should NOT see "No API key" errors
   - API calls to `/api/llm` and `/api/tts` should succeed

---

## 🔒 Security Best Practices

### ✅ DO:

- Store API keys in `backend/.env`
- Use `.gitignore` to exclude `backend/.env` from version control
- Use relative URLs (`/api/llm`) in frontend code
- Read API keys at runtime in backend code
- Use different API keys for development and production

### ❌ DON'T:

- Store API keys in frontend `.env` files
- Hardcode API keys in frontend code
- Commit `.env` files to git
- Use `VITE_*` prefix for sensitive data
- Use absolute URLs that include `localhost` or specific IPs

---

## 🐛 Troubleshooting

### Problem: "No API key" error from backend

**Solution:**

1. Check `backend/.env` exists and has API keys
2. Restart backend server (it reads `.env` on startup)
3. Check backend logs for env loading errors

### Problem: 404 errors on /api/llm or /api/tts

**Solution:**

1. Ensure backend is running on port 3001
2. Check Vite proxy configuration in `vite.config.ts`
3. In production, ensure backend serves frontend from same origin

### Problem: CORS errors

**Solution:**

1. Use relative URLs (`/api/llm`) not absolute URLs
2. Ensure backend has proper CORS headers
3. In production, serve frontend and backend from same domain

### Problem: API keys work locally but not on network

**Solution:**

1. This was the original problem - now fixed!
2. Ensure you rebuilt the app after fixing `configService.ts`
3. Verify `backend/.env` exists on the target machine
4. Check backend is accessible on network (port 3001 open)

---

## 📊 Before vs After

### Before (Broken)

```typescript
// Frontend code tried to handle API keys
const isProduction = import.meta.env.PROD;
const apiKey = isProduction ? "" : import.meta.env.VITE_OPENAI_API_KEY;
// Result: Keys worked locally but failed on network
```

### After (Fixed)

```typescript
// Frontend NEVER touches API keys
const apiKey = ""; // Always empty
const endpoint = "/api/llm"; // Relative URL works everywhere
// Backend handles all API key management
```

---

## 🎯 Summary

**Root Cause:**

- Frontend tried to manage API keys using build-time environment variables
- Keys were hardcoded into JavaScript bundles (insecure)
- Production mode intentionally blanked keys
- Different builds had different embedded values

**Solution:**

- Frontend: NO API keys, only relative URLs (`/api/llm`, `/api/tts`)
- Backend: Reads API keys from `backend/.env` at runtime
- Single build works everywhere because no hardcoded values
- Secure because API keys never leave the server

**Key Insight:**

```
Frontend .env = Public configuration (models, voices)
Backend .env = Private secrets (API keys)
```

This architecture is:

- ✅ Secure (keys never exposed to browser)
- ✅ Portable (one build works everywhere)
- ✅ Maintainable (change keys without rebuilding)
- ✅ Standard (follows industry best practices)

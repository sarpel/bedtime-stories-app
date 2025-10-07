# Default Provider Configuration Change

**Date**: October 7, 2025  
**Change**: Updated default LLM and TTS providers from OpenAI/ElevenLabs to Gemini

## Summary

Changed the default service providers in the application configuration to use Google's Gemini services for both LLM (Language Model) and TTS (Text-to-Speech) instead of OpenAI and ElevenLabs.

## Changes Made

### File Modified: `src/services/configService.ts`

#### 1. Default LLM Provider

**Changed from:**

```typescript
llmProvider: 'openai', // 'openai' or 'gemini'
```

**Changed to:**

```typescript
llmProvider: 'gemini', // 'openai' or 'gemini'
```

#### 2. Legacy LLM Compatibility Settings

**Changed from:**

```typescript
// Legacy LLM compatibility
llmEndpoint: config.openai.endpoint,
llmModelId: config.openai.model,
llmApiKey: config.openai.apiKey,
```

**Changed to:**

```typescript
// Legacy LLM compatibility
llmEndpoint: config.geminiLLM.endpoint,
llmModelId: config.geminiLLM.model,
llmApiKey: config.geminiLLM.apiKey,
```

#### 3. Default TTS Provider

**Changed from:**

```typescript
ttsProvider: 'elevenlabs', // 'elevenlabs' or 'gemini'
```

**Changed to:**

```typescript
ttsProvider: 'gemini', // 'elevenlabs' or 'gemini'
```

#### 4. Legacy TTS Compatibility Settings

**Changed from:**

```typescript
// Legacy TTS compatibility
ttsEndpoint: config.elevenlabs.endpoint,
ttsModelId: config.elevenlabs.model,
voiceId: config.elevenlabs.voiceId,
ttsApiKey: config.elevenlabs.apiKey,
```

**Changed to:**

```typescript
// Legacy TTS compatibility
ttsEndpoint: config.geminiTTS.endpoint,
ttsModelId: config.geminiTTS.model,
voiceId: config.geminiTTS.voiceId,
ttsApiKey: config.geminiTTS.apiKey,
```

## Default Models

### LLM (Language Model)

- **Provider**: Gemini
- **Model**: `gemini-2.5-flash-lite` (from VITE_GEMINI_LLM_MODEL env var)
- **Endpoint**: `/api/llm`

### TTS (Text-to-Speech)

- **Provider**: Gemini TTS
- **Model**: `gemini-2.5-flash-preview-tts` (from VITE_GEMINI_TTS_MODEL env var)
- **Voice**: `Zephyr` (from VITE_GEMINI_TTS_VOICE env var)
- **Endpoint**: `/api/tts`

## Impact

### For New Users

- New installations will now use Gemini services by default
- No configuration needed if Gemini API keys are properly set in environment variables
- Users can still switch to OpenAI/ElevenLabs in Settings if preferred

### For Existing Users

- **Existing settings are preserved** in localStorage
- Users who already have OpenAI/ElevenLabs configured will continue using those services
- Settings are only reset if user clicks "Reset to Defaults" button
- The change only affects new installations or reset configurations

### For Developers

- `getDefaultSettings()` now returns Gemini as the default provider
- Legacy compatibility properties updated to point to Gemini endpoints
- All provider options remain available and configurable
- No breaking changes to API or component interfaces

## User Experience

### Settings Panel

Users can still:

- ✅ Switch between OpenAI and Gemini for LLM
- ✅ Switch between ElevenLabs and Gemini for TTS
- ✅ Configure API keys for all providers
- ✅ Adjust model-specific settings
- ✅ Reset to defaults (now uses Gemini)

### Migration Path

If users want to switch from OpenAI/ElevenLabs to Gemini:

1. Open Settings panel
2. Go to "AI Model" tab
3. Select "Gemini" from LLM provider dropdown
4. Go to "Voice & Audio" tab
5. Select "Gemini TTS" from TTS provider dropdown
6. Save settings

Or simply click "Reset to Defaults" to use new Gemini defaults.

## Environment Variables

### Required for Gemini (Production)

```bash
# Gemini LLM
GEMINI_LLM_API_KEY=your_gemini_api_key
GEMINI_LLM_MODEL=gemini-2.5-flash-lite
GEMINI_LLM_ENDPOINT=https://generativelanguage.googleapis.com

# Gemini TTS
GEMINI_TTS_API_KEY=your_gemini_api_key
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
GEMINI_TTS_VOICE=Zephyr
GEMINI_TTS_ENDPOINT=https://generativelanguage.googleapis.com
```

### Development (.env file)

```bash
# Frontend environment variables (prefixed with VITE_)
VITE_GEMINI_LLM_API_KEY=your_gemini_api_key
VITE_GEMINI_LLM_MODEL=gemini-2.5-flash-lite
VITE_GEMINI_LLM_ENDPOINT=/api/llm

VITE_GEMINI_TTS_API_KEY=your_gemini_api_key
VITE_GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
VITE_GEMINI_TTS_VOICE=Zephyr
VITE_GEMINI_TTS_ENDPOINT=/api/tts
```

## Benefits of Gemini as Default

1. **Cost Efficiency**: Gemini models often provide better pricing
2. **Performance**: Flash-lite model offers fast response times
3. **Integration**: Single provider for both LLM and TTS simplifies configuration
4. **Quality**: Gemini 2.5 Flash provides high-quality outputs
5. **Voice Options**: Gemini TTS offers natural-sounding voices like Zephyr

## Backward Compatibility

✅ **Fully backward compatible**:

- OpenAI and ElevenLabs configurations remain functional
- Existing user settings are not affected
- All service providers remain available
- No database migrations required
- No API changes

## Testing

### Verification Steps

1. ✅ TypeScript compilation: `npm run type-check` - PASSED
2. ✅ ESLint validation: `npm run lint` - PASSED
3. ✅ Settings persist correctly
4. ✅ Default settings load with Gemini providers
5. ✅ Provider switching works in UI

### Test Scenarios

- [x] New user gets Gemini by default
- [x] Existing OpenAI user keeps OpenAI settings
- [x] Switching providers updates endpoints correctly
- [x] Reset to defaults switches to Gemini
- [x] Legacy compatibility properties work correctly

## Rollback

If needed, rollback by reverting the changes:

```typescript
// In src/services/configService.ts
llmProvider: 'openai',  // Change back from 'gemini'
ttsProvider: 'elevenlabs',  // Change back from 'gemini'

// And update legacy compatibility to use OpenAI/ElevenLabs config
```

## Notes

- This is a configuration-only change
- No code logic was modified
- All providers remain fully functional
- Users have complete control over provider selection
- The change aligns with modern AI service trends

## Related Files

- `src/services/configService.ts` - Default settings configuration
- `src/components/Settings.tsx` - UI for provider selection
- `src/services/llmService.ts` - LLM service implementation
- `src/services/ttsService.ts` - TTS service implementation
- `src/App.tsx` - Main app using default settings

## Future Considerations

- Monitor Gemini API usage and performance
- Consider adding more voice options for Gemini TTS
- Evaluate additional Gemini models as they become available
- Potentially add provider-specific features in UI
- Consider cost tracking per provider

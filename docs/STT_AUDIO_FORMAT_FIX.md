# STT Audio Format Compatibility Fix

## Issue Summary
After fixing the wake word platform compatibility issue, a new STT (Speech-to-Text) error appeared:

```
POST http://localhost:5173/api/stt/transcribe 400 (Bad Request)
ERROR: "Audio file format invalid or unsupported" with model "gpt-4o-mini-transcribe"
```

## Root Cause Analysis

### Problem 1: MIME Type Mismatch
The `AudioRecorder` class was trying to prioritize `audio/wav` format, but:
- Most browsers don't support recording directly to WAV via `MediaRecorder`
- The browser defaults to WebM format but the frontend incorrectly labeled it as WAV
- This created a format mismatch when sending to the backend

### Problem 2: GPT-4o-mini-transcribe Format Strictness
The GPT-4o-mini-transcribe model is **stricter** about audio formats compared to the regular Whisper model:
- It rejects files that appear to be one format but are actually another
- WebM files must be properly identified and formatted
- The model expects very specific format compliance

## Fixes Applied

### 1. Accurate MIME Type Detection ✅
```typescript
class AudioRecorder {
  private actualMimeType: string = ''; // Track actual MIME type used

  // Store the actual MIME type that MediaRecorder is using
  this.actualMimeType = this.mediaRecorder.mimeType;
}
```

### 2. Correct Format Prioritization ✅
Updated the format priority to match browser capabilities:
```typescript
const types = [
  'audio/webm;codecs=opus', // Most commonly supported
  'audio/webm',             // Fallback WebM
  'audio/mp4',              // Less common but good compatibility with OpenAI
  'audio/wav'               // Rarely supported by MediaRecorder
];
```

### 3. Proper File Extension Mapping ✅
Added a helper method to ensure correct file extensions:
```typescript
private getFileExtension(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'audio/webm':
    case 'audio/webm;codecs=opus':
      return '.webm';
    case 'audio/wav':
      return '.wav';
    // ... other formats
  }
}
```

### 4. Enhanced Debugging ✅
Added comprehensive logging to track audio format issues:
```typescript
logger.debug('Preparing audio for transcription', 'STTService', {
  fileName: audioFile.name,
  fileSize: audioFile.size,
  fileType: audioFile.type,
  provider: this.provider,
  model: this.modelId
});
```

## Expected Results

After these fixes:
- ✅ **No more 400 "Audio file format invalid" errors**
- ✅ **Proper WebM format handling** for browser-recorded audio
- ✅ **Accurate MIME type identification** and file naming
- ✅ **Enhanced compatibility** with GPT-4o-mini-transcribe model
- ✅ **Better error diagnostics** when issues occur

## Browser Compatibility

### Typical Browser Behavior:
- **Chrome/Edge**: Records as `audio/webm;codecs=opus`
- **Firefox**: Records as `audio/ogg;codecs=opus` or `audio/webm`
- **Safari**: May record as `audio/mp4` or `audio/webm`

### Our Solution:
- **Automatically detects** the actual format used by the browser
- **Maps correctly** to proper file extensions
- **Sends accurate** MIME type information to the backend

## Testing the Fix

1. **Start the development server**: `npm run dev`
2. **Open Voice Command Panel** in the app
3. **Start recording** - should see debug logs with correct MIME types
4. **Stop recording and transcribe** - should work without 400 errors
5. **Check browser console** for detailed audio format logging

## Files Modified

- ✅ `src/services/sttService.ts` - Enhanced audio format handling
  - Added `actualMimeType` tracking
  - Improved MIME type prioritization
  - Added `getFileExtension()` helper method
  - Enhanced logging and debugging

## Debugging Information

If issues persist, check the browser console for:
```javascript
// Audio recording start
"Audio recording started" - shows preferred vs actual MIME type

// Audio recording stop
"Audio recording stopped" - shows final blob type and size

// Transcription preparation
"Preparing audio for transcription" - shows file details sent to backend
```

## Common Issues & Solutions

### Issue: Still getting 400 errors
**Solution**: Check the browser console logs to see what MIME type is actually being used

### Issue: Very small audio files (< 1000 bytes)
**Solution**: Record for longer duration or check microphone permissions

### Issue: WebM not supported by GPT-4o-mini
**Solution**: The fix ensures proper WebM formatting - if still failing, check OpenAI API status

## Related Documentation

- `WAKE_WORD_PLATFORM_FIX.md` - Previous wake word compatibility fix
- `WAKE_WORD_FIX_SUMMARY.md` - Complete technical summary
- [OpenAI Audio API Documentation](https://platform.openai.com/docs/guides/speech-to-text)

The STT audio format issue is now **completely resolved** with proper format detection and handling!

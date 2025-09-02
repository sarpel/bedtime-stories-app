# Wake Word Platform Compatibility Fix

## Problem
The current `hey-elsa.ppn` file is causing a platform compatibility error:
```
Loading keyword file at `hey-elsa` failed with `INVALID_ARGUMENT`
Keyword file (.ppn) file has incorrect format or belongs to a different platform.
```

## Root Cause
The `.ppn` file was created for a different platform (likely mobile/desktop) but we're trying to use it in a web browser environment. Picovoice requires platform-specific models.

## Solution

### Step 1: Create Web-Compatible Wake Word Model
1. Go to [Picovoice Console](https://console.picovoice.ai/)
2. Login or create an account
3. Navigate to "Porcupine Wake Word"
4. Create a new keyword:
   - Phrase: "Hey Elsa"
   - **Important**: Select platform as **"Web (WASM)"**
5. Train the model
6. Download the generated `.ppn` file
7. Replace the current `hey-elsa.ppn` with the new web-compatible version

### Step 2: Verify Access Key
Ensure you have a valid Picovoice access key in your `.env` file:
```bash
VITE_PICOVOICE_ACCESS_KEY=your_actual_key_here
```

### Step 3: Alternative Temporary Fix (Fallback)
If you can't immediately create a new model, you can temporarily disable wake word detection:

1. Modify the configuration to disable wake word:
```typescript
// In your settings or configuration
const wakeWordEnabled = false;
```

2. Or use the demo functionality without custom wake word

## Files to Check/Modify
- `hey-elsa.ppn` (replace with web-compatible version)
- `.env` (add VITE_PICOVOICE_ACCESS_KEY)
- Configuration files that enable/disable wake word detection

## Verification
After fixing:
1. The error messages should disappear
2. Wake word detection should work in the browser
3. Saying "Hey Elsa" should trigger the STT service

## Related Files
- `src/services/wakeWordDetector.ts` (implementation)
- `src/services/configService.ts` (configuration)
- `src/components/VoiceCommandPanel.tsx` (usage)

## Platform Compatibility Notes
- **Web (WASM)**: For browser-based applications (what we need)
- **iOS**: For iOS mobile apps
- **Android**: For Android mobile apps
- **Linux**: For Linux desktop apps
- **macOS**: For macOS desktop apps
- **Windows**: For Windows desktop apps

Each platform requires its own specific `.ppn` file format.

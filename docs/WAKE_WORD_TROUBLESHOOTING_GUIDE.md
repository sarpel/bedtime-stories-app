# Wake Word Troubleshooting Guide

## Issue: Platform Compatibility Error (Code 00000136)

### Error Message:
```
Keyword file (.ppn) file has incorrect format or belongs to a different platform
Picovoice Error code 00000136
```

### What This Means:
This error occurs when:
1. The browser has cached an incompatible wake word file (.ppn)
2. The .ppn file was created for a different platform (not Web/WASM)
3. The .ppn file is corrupted or incomplete

### Solution Steps:

#### 1. Verify File Compatibility
- Ensure your `hey-elsa.ppn` file is created for the **Web (WASM)** platform
- File should be located in the project root: `./hey-elsa.ppn`
- Create custom wake words at: https://console.picovoice.ai/

#### 2. Clear Browser Cache (Automatic)
Our application now includes automatic cache-busting:
- Click the **"Clear Cache"** button in the Wake Word Detection panel
- This will clear IndexedDB and Cache API storage for Porcupine files

#### 3. Manual Browser Cache Clearing

##### Chrome:
1. Press `F12` to open DevTools
2. Right-click the refresh button and select "Empty Cache and Hard Reload"
3. Alternative: `Settings` → `Privacy and security` → `Clear browsing data`
4. Select "Cached images and files" and clear

##### Firefox:
1. Press `Ctrl+Shift+Delete` (`Cmd+Shift+Delete` on Mac)
2. Select "Cache" and click "Clear Now"
3. Or press `Ctrl+F5` for hard refresh

##### Safari:
1. Press `Cmd+Option+E` to empty cache
2. Or go to `Develop` menu → `Empty Caches`
3. Then press `Cmd+R` to reload

##### Edge:
1. Press `Ctrl+Shift+Delete`
2. Select "Cached images and files"
3. Click "Clear now"

#### 4. Incognito/Private Mode Test
- Try opening the application in an incognito/private window
- This bypasses all cached files and tests with fresh state

#### 5. Browser Compatibility Check
Our application checks for required features:
- MediaDevices API (microphone access)
- Web Audio API
- Web Workers
- WebAssembly (WASM)
- IndexedDB

If any are missing, you'll see compatibility warnings with recommendations.

### Implementation Details

#### Cache-Busting Mechanism
The application now implements multiple cache-busting strategies:

```typescript
// Timestamp-based versioning
const cacheBustedPath = `hey-elsa.ppn?v=${timestamp}&r=${random}`;

// Force reload options
const keywordConfig = {
  publicPath: cacheBustedPath,
  customWritePath: `hey-elsa-${timestamp}`,
  forceWrite: true,
  version: timestamp
};
```

#### Error Detection
Enhanced error detection for platform issues:

```typescript
if (errorMessage.includes('INVALID_ARGUMENT') ||
    errorMessage.includes('incorrect format') ||
    errorMessage.includes('different platform') ||
    errorMessage.includes('code `00000136`')) {
  // Show platform/cache-specific help
}
```

### File Requirements

#### WASM-Compatible .ppn File
- Platform: **Web (WASM)**
- Location: Project root (`./hey-elsa.ppn`)
- Size: Typically 1-5 KB for custom keywords
- Format: Binary file created by Picovoice Console

#### Creating Custom Wake Words
1. Visit https://console.picovoice.ai/
2. Create account or sign in
3. Go to "Porcupine" → "Create Custom Wake Word"
4. Enter your phrase (e.g., "Hey Elsa")
5. Select **Web (WASM)** as the platform
6. Download the generated `.ppn` file
7. Place in project root as `hey-elsa.ppn`

### Advanced Troubleshooting

#### Check Network Tab
1. Open browser DevTools (`F12`)
2. Go to Network tab
3. Refresh the page
4. Look for `hey-elsa.ppn` requests
5. Check status codes:
   - `200 OK`: File loaded successfully
   - `304 Not Modified`: Cached version used
   - `404 Not Found`: File missing
   - `500 Server Error`: Server issue

#### Console Logs
Our application logs detailed information:
```javascript
// Look for these log messages:
"Initializing Porcupine wake word detection"
"Porcupine wake word initialized successfully"
"Wake word model platform/cache issue"
"Clearing Porcupine wake word cache"
```

#### Environment Variables
Ensure proper configuration:
```env
VITE_PICOVOICE_ACCESS_KEY=your_access_key_here
```

### Common Issues and Solutions

#### Issue: "Access key is invalid"
- Verify your Picovoice access key in environment variables
- Check key hasn't expired
- For testing, you can use "demo" but with limited functionality

#### Issue: "getUserMedia is not supported"
- Ensure you're using HTTPS (required for microphone access)
- Check browser permissions for microphone
- Verify browser supports MediaDevices API

#### Issue: Wake word not detecting
- Check microphone permissions
- Verify sensitivity settings (try different levels)
- Ensure wake word pronunciation matches trained model
- Check background noise levels

#### Issue: "WebAssembly is not supported"
- Update browser to latest version
- Enable WebAssembly in browser settings
- Try different browser that supports WASM

### Testing Procedure

1. **Clear all caches** using the "Clear Cache" button
2. **Hard refresh** the browser (Ctrl+Shift+R)
3. **Check console** for any error messages
4. **Test microphone** access permission
5. **Try wake word** detection with proper pronunciation
6. **Monitor logs** for debugging information

### Success Indicators

✅ No error messages in console
✅ "Porcupine wake word initialized successfully" log
✅ Wake word detection status shows "Listening"
✅ Microphone permission granted
✅ Wake word responds to "Hey Elsa"

### If Problems Persist

1. Try a different browser
2. Verify .ppn file integrity (re-download from Picovoice Console)
3. Check network connectivity
4. Ensure HTTPS is used
5. Contact support with console logs and error details

### Performance Tips

- Use lower sensitivity for noisy environments
- Ensure stable internet connection for initial model download
- Clear cache periodically to prevent stale model issues
- Consider using Web Workers for better performance (automatically handled)

---

For additional support, check the official Picovoice documentation:
- https://picovoice.ai/docs/quick-start/porcupine-react/
- https://github.com/Picovoice/porcupine/tree/master/binding/react

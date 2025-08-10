/**
 * Audio Codec Health Monitor for IQaudio Codec Zero HAT
 * Monitors ALSA sound system and codec status on Raspberry Pi Zero 2W
 */

import { audioLogger } from './logger.js'

class AudioCodecMonitor {
  constructor() {
    this.isMonitoring = false
    this.checkInterval = null
    this.lastCheckTime = 0
    this.codecStatus = {
      isHealthy: true,
      lastError: null,
      audioDevices: [],
      currentVolume: 50
    }
    // Tarayıcı autoplay politikaları nedeniyle AudioContext ancak kullanıcı etkileşimi sonrası başlatılabilir
    this.userGestureObserved = false
    this._boundGestureHandler = null
  }

  startMonitoring() {
    if (this.isMonitoring) return
    this.isMonitoring = true

    // İlk kullanıcı etkileşimini yakalayıp Web Audio testlerini o andan sonra etkinleştir
    if (typeof window !== 'undefined' && !this.userGestureObserved) {
      this._boundGestureHandler = () => {
        this.userGestureObserved = true
        // Bir kez çalışsın
        if (this._boundGestureHandler) {
          window.removeEventListener('pointerdown', this._boundGestureHandler)
          window.removeEventListener('keydown', this._boundGestureHandler)
          window.removeEventListener('touchstart', this._boundGestureHandler)
          this._boundGestureHandler = null
        }
      }
      window.addEventListener('pointerdown', this._boundGestureHandler, { once: true })
      window.addEventListener('keydown', this._boundGestureHandler, { once: true })
      window.addEventListener('touchstart', this._boundGestureHandler, { once: true })
    }

    // Check audio system health every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkAudioHealth()
    }, 30000)

    // Initial check
    this.checkAudioHealth()
    audioLogger.info('Audio codec monitor started for IQaudio HAT')
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.isMonitoring = false
    audioLogger.info('Audio codec monitor stopped')
  }

  async checkAudioHealth() {
    try {
      this.lastCheckTime = Date.now()
      
      // Check if audio context is available
      if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        // Kullanıcı etkileşimi olmadan AudioContext yaratmaya çalışma; tarayıcı uyarısı verir
        if (!this.userGestureObserved) {
          this.codecStatus.isHealthy = false
          this.codecStatus.lastError = 'Audio context suspended (awaiting user gesture)'
          // Web Audio testini pas geç, yalnızca bilgi amaçlı durum döndür
          return
        }
        const AudioContext = window.AudioContext || window.webkitAudioContext
        try {
          const testContext = new AudioContext()
          
          // Test basic audio functionality
          const oscillator = testContext.createOscillator()
          const gainNode = testContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(testContext.destination)
          
          // Set very low volume for test
          gainNode.gain.value = 0.001
          oscillator.frequency.value = 440
          oscillator.type = 'sine'
          
          // Quick test tone (10ms)
          oscillator.start()
          oscillator.stop(testContext.currentTime + 0.01)
          
          // Clean up
          await testContext.close()
          
          this.codecStatus.isHealthy = true
          this.codecStatus.lastError = null
          
        } catch (audioError) {
          this.codecStatus.isHealthy = false
          this.codecStatus.lastError = audioError.message
          audioLogger.warn('Audio context test failed', 'AUDIO_TEST', audioError)
        }
      }

      // Check for suspended audio context (common browser issue)
      if (typeof window !== 'undefined' && window.audioContext) {
        if (window.audioContext.state === 'suspended') {
          audioLogger.warn('Audio context is suspended - user interaction required')
          this.codecStatus.isHealthy = false
          this.codecStatus.lastError = 'Audio context suspended'
        }
      }

    } catch (error) {
      this.codecStatus.isHealthy = false
      this.codecStatus.lastError = error.message
      audioLogger.error('Audio health check failed', 'HEALTH_CHECK', error)
    }
  }

  // Test audio playback capability
  async testAudioPlayback() {
    try {
      // Create a test audio element
      const testAudio = new Audio()
      
      // Use a data URL for a very short silence
      testAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Audio test timeout'))
        }, 5000)
        
        testAudio.addEventListener('canplaythrough', () => {
          clearTimeout(timeout)
          testAudio.currentTime = 0
          testAudio.volume = 0.01 // Very quiet test
          
          testAudio.play()
            .then(() => {
              audioLogger.debug('Audio playback test successful')
              resolve(true)
            })
            .catch(reject)
        })
        
        testAudio.addEventListener('error', () => {
          clearTimeout(timeout)
          reject(new Error('Audio test failed to load'))
        })
        
        testAudio.load()
      })
      
    } catch (error) {
      audioLogger.warn('Audio playback test failed', 'PLAYBACK_TEST', error)
      return false
    }
  }

  // Get current audio status
  getStatus() {
    return {
      ...this.codecStatus,
      isMonitoring: this.isMonitoring,
      lastCheckTime: this.lastCheckTime,
      timeSinceLastCheck: Date.now() - this.lastCheckTime
    }
  }

  // Recovery attempt for audio issues
  async attemptAudioRecovery() {
    try {
      audioLogger.info('Attempting audio system recovery')
      
      // Try to resume suspended audio context
      if (typeof window !== 'undefined' && window.audioContext) {
        if (window.audioContext.state === 'suspended') {
          // Mümkünse kullanıcı etkileşimini bekle
          if (!this.userGestureObserved) {
            audioLogger.warn('Cannot resume audio context before user gesture')
            return false
          }
          await window.audioContext.resume()
          audioLogger.info('Audio context resumed')
        }
      }

      // Test audio playback after recovery
      const testResult = await this.testAudioPlayback()
      if (testResult) {
        this.codecStatus.isHealthy = true
        this.codecStatus.lastError = null
        audioLogger.info('Audio recovery successful')
        return true
      }
      
      return false
      
    } catch (error) {
      audioLogger.error('Audio recovery failed', 'RECOVERY', error)
      return false
    }
  }

  // Get Pi Zero specific audio information
  getPiZeroAudioInfo() {
    return {
      codecType: 'IQaudio Codec Zero HAT (WM8960)',
      recommendedSampleRate: '48000',
      recommendedBitDepth: '16',
      maxChannels: 2,
      driverInfo: 'snd_soc_iqaudio_codec',
      alsaDevice: 'hw:0,0',
      notes: [
        'Ensure dtoverlay=iqaudio-codec in /boot/config.txt',
        'Check ALSA mixer settings with alsamixer',
        'Verify audio group permissions for playback'
      ]
    }
  }
}

// Create singleton instance
const audioCodecMonitor = new AudioCodecMonitor()

export default audioCodecMonitor

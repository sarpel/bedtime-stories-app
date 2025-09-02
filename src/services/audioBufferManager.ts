import { logger } from '@/utils/logger';

// Audio buffer management optimized for Pi Zero 2W constraints
export interface AudioBufferConfig {
  maxBufferSize: number; // Maximum buffer size in samples
  targetLatency: number; // Target latency in milliseconds
  sampleRate: number; // Audio sample rate
  channels: number; // Number of audio channels
  compressionEnabled: boolean; // Enable audio compression
  adaptiveBuffering: boolean; // Enable adaptive buffer sizing
}

export interface BufferMetrics {
  currentSize: number;
  peakSize: number;
  underruns: number;
  overruns: number;
  avgLatency: number;
  memoryUsage: number; // In bytes
}

export class AudioBufferManager {
  private config: AudioBufferConfig;
  private buffers: Map<string, Float32Array[]> = new Map();
  private bufferMetrics: Map<string, BufferMetrics> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private adaptiveTimer: NodeJS.Timeout | null = null;

  // Pi Zero 2W optimized defaults
  private readonly defaultConfig: AudioBufferConfig = {
    maxBufferSize: 2048, // Smaller buffers for limited RAM
    targetLatency: 100, // 100ms target latency
    sampleRate: 16000, // Standard for voice processing
    channels: 1, // Mono to save memory
    compressionEnabled: true, // Enable compression to save memory
    adaptiveBuffering: true // Adjust buffer sizes based on performance
  };

  constructor(config?: Partial<AudioBufferConfig>) {
    this.config = { ...this.defaultConfig, ...config };
    
    // Start cleanup routine
    this.startCleanupRoutine();
    
    // Start adaptive buffering if enabled
    if (this.config.adaptiveBuffering) {
      this.startAdaptiveBuffering();
    }

    logger.info('Audio buffer manager initialized', 'AudioBufferManager', {
      config: this.config
    });
  }

  // Create a new buffer for a service
  createBuffer(bufferId: string, initialSize?: number): boolean {
    try {
      if (this.buffers.has(bufferId)) {
        logger.warn('Buffer already exists', 'AudioBufferManager', { bufferId });
        return false;
      }

      const size = initialSize || this.getOptimalBufferSize();
      const buffer: Float32Array[] = [];
      
      this.buffers.set(bufferId, buffer);
      this.bufferMetrics.set(bufferId, {
        currentSize: 0,
        peakSize: 0,
        underruns: 0,
        overruns: 0,
        avgLatency: this.config.targetLatency,
        memoryUsage: 0
      });

      logger.debug('Audio buffer created', 'AudioBufferManager', { 
        bufferId, 
        initialSize: size 
      });

      return true;
    } catch (error) {
      logger.error('Failed to create audio buffer', 'AudioBufferManager', {
        bufferId,
        error: (error as Error)?.message
      });
      return false;
    }
  }

  // Add audio data to buffer with optimization
  addAudioData(bufferId: string, audioData: Float32Array): boolean {
    try {
      const buffer = this.buffers.get(bufferId);
      const metrics = this.bufferMetrics.get(bufferId);

      if (!buffer || !metrics) {
        logger.warn('Buffer not found', 'AudioBufferManager', { bufferId });
        return false;
      }

      // Check for buffer overflow
      if (buffer.length >= this.config.maxBufferSize) {
        metrics.overruns++;
        
        // Apply buffer management strategy
        this.handleBufferOverflow(bufferId);
        
        logger.warn('Buffer overflow handled', 'AudioBufferManager', { 
          bufferId, 
          size: buffer.length 
        });
      }

      // Compress audio data if enabled
      const processedData = this.config.compressionEnabled 
        ? this.compressAudioData(audioData)
        : new Float32Array(audioData);

      // Add to buffer
      buffer.push(processedData);
      
      // Update metrics
      metrics.currentSize = buffer.length;
      metrics.peakSize = Math.max(metrics.peakSize, buffer.length);
      metrics.memoryUsage = this.calculateBufferMemoryUsage(buffer);

      return true;

    } catch (error) {
      logger.error('Failed to add audio data', 'AudioBufferManager', {
        bufferId,
        error: (error as Error)?.message
      });
      return false;
    }
  }

  // Get audio data from buffer
  getAudioData(bufferId: string, count?: number): Float32Array[] {
    try {
      const buffer = this.buffers.get(bufferId);
      const metrics = this.bufferMetrics.get(bufferId);

      if (!buffer || !metrics) {
        logger.warn('Buffer not found for retrieval', 'AudioBufferManager', { bufferId });
        return [];
      }

      const requestedCount = count || Math.min(buffer.length, 1);
      
      if (buffer.length === 0) {
        metrics.underruns++;
        logger.debug('Buffer underrun', 'AudioBufferManager', { bufferId });
        return [];
      }

      // Extract requested audio chunks
      const audioChunks = buffer.splice(0, requestedCount);
      
      // Update metrics
      metrics.currentSize = buffer.length;
      metrics.memoryUsage = this.calculateBufferMemoryUsage(buffer);

      return audioChunks;

    } catch (error) {
      logger.error('Failed to get audio data', 'AudioBufferManager', {
        bufferId,
        error: (error as Error)?.message
      });
      return [];
    }
  }

  // Compress audio data to save memory
  private compressAudioData(audioData: Float32Array): Float32Array {
    try {
      // Simple dynamic range compression
      const compressed = new Float32Array(audioData.length);
      const threshold = 0.5;
      const ratio = 4.0;
      const makeupGain = 1.5;

      for (let i = 0; i < audioData.length; i++) {
        let sample = audioData[i];
        const magnitude = Math.abs(sample);
        
        if (magnitude > threshold) {
          const excess = magnitude - threshold;
          const compressedExcess = excess / ratio;
          sample = (sample > 0 ? 1 : -1) * (threshold + compressedExcess);
        }
        
        compressed[i] = sample * makeupGain;
      }

      return compressed;
    } catch (error) {
      logger.warn('Audio compression failed, using original', 'AudioBufferManager', {
        error: (error as Error)?.message
      });
      return new Float32Array(audioData);
    }
  }

  // Handle buffer overflow with different strategies
  private handleBufferOverflow(bufferId: string): void {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) return;

    // Strategy 1: Remove oldest data (FIFO)
    const itemsToRemove = Math.floor(buffer.length * 0.3); // Remove 30%
    buffer.splice(0, itemsToRemove);

    logger.debug('Buffer overflow handled by removing old data', 'AudioBufferManager', {
      bufferId,
      removedItems: itemsToRemove,
      remainingSize: buffer.length
    });
  }

  // Get optimal buffer size based on current performance
  private getOptimalBufferSize(): number {
    const baseSize = Math.floor(this.config.sampleRate * this.config.targetLatency / 1000);
    
    // Adjust based on system performance
    const performanceMultiplier = this.getPerformanceMultiplier();
    
    return Math.min(
      Math.floor(baseSize * performanceMultiplier),
      this.config.maxBufferSize
    );
  }

  // Get performance-based multiplier for buffer sizing
  private getPerformanceMultiplier(): number {
    // This would integrate with ResourceMonitor in real implementation
    // For now, return conservative multiplier for Pi Zero 2W
    return 0.8; // 80% of calculated size for safety
  }

  // Calculate memory usage of a buffer
  private calculateBufferMemoryUsage(buffer: Float32Array[]): number {
    let totalSize = 0;
    buffer.forEach(chunk => {
      totalSize += chunk.byteLength;
    });
    return totalSize;
  }

  // Start cleanup routine to prevent memory leaks
  private startCleanupRoutine(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 30000); // Clean up every 30 seconds
  }

  // Perform periodic cleanup
  private performCleanup(): void {
    try {
      let totalMemoryFreed = 0;
      
      this.buffers.forEach((buffer, bufferId) => {
        const metrics = this.bufferMetrics.get(bufferId);
        if (!metrics) return;

        // Clean up old buffers that haven't been accessed recently
        if (buffer.length === 0 && metrics.currentSize === 0) {
          // Buffer is empty and can be optimized
          const memoryBefore = metrics.memoryUsage;
          
          // Trigger garbage collection hint
          this.optimizeBuffer(bufferId);
          
          totalMemoryFreed += memoryBefore;
        }

        // Reset peak metrics periodically
        metrics.peakSize = metrics.currentSize;
      });

      if (totalMemoryFreed > 0) {
        logger.debug('Buffer cleanup completed', 'AudioBufferManager', {
          memoryFreed: totalMemoryFreed
        });
      }

    } catch (error) {
      logger.warn('Buffer cleanup failed', 'AudioBufferManager', {
        error: (error as Error)?.message
      });
    }
  }

  // Start adaptive buffering to optimize performance
  private startAdaptiveBuffering(): void {
    this.adaptiveTimer = setInterval(() => {
      this.adaptBufferSizes();
    }, 10000); // Adapt every 10 seconds
  }

  // Adapt buffer sizes based on performance metrics
  private adaptBufferSizes(): void {
    try {
      this.bufferMetrics.forEach((metrics, bufferId) => {
        // Increase buffer size if too many underruns
        if (metrics.underruns > 5) {
          this.config.maxBufferSize = Math.min(this.config.maxBufferSize * 1.2, 4096);
          logger.debug('Increased buffer size due to underruns', 'AudioBufferManager', {
            bufferId,
            newMaxSize: this.config.maxBufferSize
          });
        }
        
        // Decrease buffer size if consistently over-buffered and no overruns
        if (metrics.overruns === 0 && metrics.currentSize < this.config.maxBufferSize * 0.5) {
          this.config.maxBufferSize = Math.max(this.config.maxBufferSize * 0.9, 1024);
          logger.debug('Decreased buffer size for efficiency', 'AudioBufferManager', {
            bufferId,
            newMaxSize: this.config.maxBufferSize
          });
        }

        // Reset counters
        metrics.underruns = 0;
        metrics.overruns = 0;
      });

    } catch (error) {
      logger.warn('Adaptive buffering failed', 'AudioBufferManager', {
        error: (error as Error)?.message
      });
    }
  }

  // Optimize specific buffer
  private optimizeBuffer(bufferId: string): void {
    const buffer = this.buffers.get(bufferId);
    const metrics = this.bufferMetrics.get(bufferId);
    
    if (!buffer || !metrics) return;

    // Clear empty buffers
    if (buffer.length === 0) {
      buffer.length = 0; // Explicit clear
    }

    // Update metrics
    metrics.memoryUsage = this.calculateBufferMemoryUsage(buffer);
  }

  // Get buffer statistics
  getBufferStats(bufferId?: string): Map<string, BufferMetrics> | BufferMetrics | null {
    if (bufferId) {
      return this.bufferMetrics.get(bufferId) || null;
    }
    return new Map(this.bufferMetrics);
  }

  // Get total memory usage across all buffers
  getTotalMemoryUsage(): number {
    let totalMemory = 0;
    this.bufferMetrics.forEach(metrics => {
      totalMemory += metrics.memoryUsage;
    });
    return totalMemory;
  }

  // Remove buffer
  removeBuffer(bufferId: string): boolean {
    try {
      const removed = this.buffers.delete(bufferId) && this.bufferMetrics.delete(bufferId);
      
      if (removed) {
        logger.debug('Audio buffer removed', 'AudioBufferManager', { bufferId });
      }
      
      return removed;
    } catch (error) {
      logger.error('Failed to remove buffer', 'AudioBufferManager', {
        bufferId,
        error: (error as Error)?.message
      });
      return false;
    }
  }

  // Clear all buffers
  clearAllBuffers(): void {
    try {
      this.buffers.clear();
      this.bufferMetrics.clear();
      
      logger.info('All audio buffers cleared', 'AudioBufferManager');
    } catch (error) {
      logger.error('Failed to clear all buffers', 'AudioBufferManager', {
        error: (error as Error)?.message
      });
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<AudioBufferConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    logger.info('Audio buffer configuration updated', 'AudioBufferManager', {
      oldConfig,
      newConfig: this.config
    });
  }

  // Get current configuration
  getConfig(): AudioBufferConfig {
    return { ...this.config };
  }

  // Cleanup and shutdown
  cleanup(): void {
    try {
      // Stop timers
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
      
      if (this.adaptiveTimer) {
        clearInterval(this.adaptiveTimer);
        this.adaptiveTimer = null;
      }

      // Clear all buffers
      this.clearAllBuffers();

      logger.info('Audio buffer manager cleaned up', 'AudioBufferManager');

    } catch (error) {
      logger.error('Buffer manager cleanup failed', 'AudioBufferManager', {
        error: (error as Error)?.message
      });
    }
  }
}
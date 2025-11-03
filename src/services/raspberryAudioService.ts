import { logger } from "@/utils/logger";

export interface RaspberryAudioStatus {
  isRaspberryPi: boolean;
  audioDevice: string;
  alsaDevices?: string;
  status: "ready" | "error" | "playing";
  error?: string;
}

export interface RaspberryPlaybackResponse {
  success: boolean;
  message: string;
  device: string;
  volume: number;
  audioFile: string;
}

/**
 * Service for controlling audio playback on Raspberry Pi Zero 2W with IQAudio Codec Zero
 *
 * Features:
 * - Direct ALSA audio output to IQAudio Codec Zero HAT
 * - Hardware-optimized playback using omxplayer or aplay
 * - Volume control and playback management
 * - Audio device detection and status monitoring
 */
export class RaspberryAudioService {
  private baseUrl = "/api/raspberry-audio";

  /**
   * Play audio file on Raspberry Pi speakers through IQAudio Codec Zero
   * Logic: Send audio file path to backend, which uses ALSA/omxplayer for Pi playback
   */
  async playAudio(
    audioFilePath: string,
    volume = 80,
  ): Promise<RaspberryPlaybackResponse> {
    try {
      logger.info(
        "Starting Raspberry Pi audio playback",
        "RaspberryAudioService",
        {
          audioFile: audioFilePath.substring(0, 100),
          volume: volume,
        },
      );

      const response = await fetch(`${this.baseUrl}/play`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioFile: audioFilePath,
          volume: volume,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Raspberry Pi playback failed");
      }

      const result = await response.json();

      logger.info(
        "Raspberry Pi playback started successfully",
        "RaspberryAudioService",
        {
          device: result.device,
          volume: result.volume,
        },
      );

      return result;
    } catch (error) {
      logger.error("Raspberry Pi playback failed", "RaspberryAudioService", {
        error: (error as Error).message,
        audioFile: audioFilePath,
      });

      throw new Error(`Raspberry Pi audio failed: ${(error as Error).message}`);
    }
  }

  /**
   * Stop all audio playback on Raspberry Pi
   * Logic: Kill all aplay and omxplayer processes
   */
  async stopAudio(): Promise<{ success: boolean; message: string }> {
    try {
      logger.info(
        "Stopping Raspberry Pi audio playback",
        "RaspberryAudioService",
      );

      const response = await fetch(`${this.baseUrl}/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to stop Raspberry Pi audio");
      }

      const result = await response.json();

      logger.info(
        "Raspberry Pi audio stopped successfully",
        "RaspberryAudioService",
      );
      return result;
    } catch (error) {
      logger.error(
        "Failed to stop Raspberry Pi audio",
        "RaspberryAudioService",
        {
          error: (error as Error).message,
        },
      );

      throw new Error(
        `Failed to stop Raspberry Pi audio: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get Raspberry Pi audio system status and device information
   * Logic: Check if running on Pi, detect IQAudio Codec Zero, list ALSA devices
   */
  async getAudioStatus(): Promise<RaspberryAudioStatus> {
    try {
      logger.debug(
        "Checking Raspberry Pi audio status",
        "RaspberryAudioService",
      );

      const response = await fetch(`${this.baseUrl}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get audio status");
      }

      const result = await response.json();

      logger.debug(
        "Raspberry Pi audio status retrieved",
        "RaspberryAudioService",
        {
          isRaspberryPi: result.isRaspberryPi,
          audioDevice: result.audioDevice,
          status: result.status,
        },
      );

      return result;
    } catch (error) {
      logger.error(
        "Failed to get Raspberry Pi audio status",
        "RaspberryAudioService",
        {
          error: (error as Error).message,
        },
      );

      // Return fallback status on error
      return {
        isRaspberryPi: false,
        audioDevice: "unknown",
        status: "error",
        error: (error as Error).message,
      };
    }
  }

  /**
   * Convert web audio URL to local file path for Pi playback
   * Logic: Map frontend audio URLs to backend file paths
   */
  convertAudioUrlToFilePath(audioUrl: string): string {
    // Convert http://localhost:3001/audio/story-123.mp3 to /absolute/path/backend/audio/story-123.mp3
    if (audioUrl.includes("/audio/")) {
      const fileName = audioUrl.split("/audio/").pop();
      // Backend will resolve the full path server-side
      return `audio/${fileName}`;
    }

    // If already a file path, return as-is
    return audioUrl;
  }
}

// Export singleton instance
export const raspberryAudioService = new RaspberryAudioService();

import { logger } from '@/utils/logger';

export interface VoiceAssistantResponse {
  response: string;
  isTtsRequest: boolean;
  originalTranscript: string;
}

export class VoiceAssistantService {
  private endpoint: string = '/api/voice-assistant';

  /**
   * Process voice transcript through LLM for story generation or TTS commands
   * Logic: Send transcript to backend LLM with specialized system prompt
   */
  async processVoiceTranscript(transcript: string): Promise<VoiceAssistantResponse> {
    try {
      logger.info('Processing voice transcript with LLM', 'VoiceAssistantService', {
        transcriptLength: transcript.length,
        transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : '')
      });

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript: transcript
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Voice assistant API error', 'VoiceAssistantService', {
          status: response.status,
          error: errorText
        });
        throw new Error(`Voice assistant error (${response.status}): ${errorText}`);
      }

      const data: VoiceAssistantResponse = await response.json();

      logger.info('Voice assistant response received', 'VoiceAssistantService', {
        responseLength: data.response.length,
        isTtsRequest: data.isTtsRequest
      });

      return data;

    } catch (error) {
      logger.error('Voice assistant processing failed', 'VoiceAssistantService', {
        error: (error as Error)?.message
      });
      throw error;
    }
  }
}

// Singleton instance
export const voiceAssistant = new VoiceAssistantService();

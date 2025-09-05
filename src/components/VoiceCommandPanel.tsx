import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Volume2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { STTService, GPT4oMiniSTTService } from '@/services/sttService';
import { VoiceAssistantService } from '@/services/voiceAssistantService';
import { logger } from '@/utils/logger';

export interface VoiceCommand {
  intent: string;
  parameters: {
    storyType?: string;
    characterName?: string;
    age?: number;
    customTopic?: string;
  };
  confidence: number;
  originalText: string;
}

interface VoiceCommandPanelProps {
  onVoiceCommand: (command: VoiceCommand) => void;
  disabled?: boolean;
  className?: string;
  settings?: {
    sttSettings?: {
      provider?: string;
      model?: string;
      wakeWordEnabled?: boolean;
      wakeWordSensitivity?: string;
      continuousListening?: boolean;
      responseFormat?: string;
      language?: string;
    };
  };
}

interface AudioVisualizerProps {
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationTime = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isActive) {
        // Draw animated sound waves
        const centerY = canvas.height / 2;
        const amplitude = 20;
        const frequency = 0.02;

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x += 2) {
          const y = centerY + Math.sin(x * frequency + animationTime) * amplitude * (0.5 + Math.random() * 0.5);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
        animationTime += 0.1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={50}
      className="rounded border bg-gray-50 dark:bg-gray-900"
    />
  );
};

export const VoiceCommandPanel: React.FC<VoiceCommandPanelProps> = ({
  onVoiceCommand,
  disabled = false,
  className = '',
  settings
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const sttServiceRef = useRef<STTService | GPT4oMiniSTTService | null>(null);

  // Initialize STT service (manual mode only)
  useEffect(() => {
    const sttSettings = settings?.sttSettings || {};
  const modelId = sttSettings.model || 'whisper-1';

    // Choose service based on model
  if (modelId === 'gpt-4o-mini-transcribe') { // legacy enhanced model branch retained for backward compatibility
      sttServiceRef.current = new GPT4oMiniSTTService({
        sttProvider: sttSettings.provider || 'openai',
        openaiSTT: {
          modelId: modelId
        },
        audioSettings: {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          format: 'webm'
        },
        responseFormat: (sttSettings.responseFormat as 'json' | 'verbose_json') || 'verbose_json'
      });
    } else {
      sttServiceRef.current = new STTService({
        sttProvider: sttSettings.provider || 'openai',
        openaiSTT: {
          modelId: modelId
        },
        audioSettings: {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          format: 'webm'
        }
      });
    }

    // Check microphone permission
    checkMicrophonePermission();

    return () => {
      if (sttServiceRef.current) {
        sttServiceRef.current.cleanup?.();
      }
    };
  }, [settings?.sttSettings]);

  const checkMicrophonePermission = async () => {
    try {
      // First try to get user media to trigger permission request
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Close stream immediately

      const hasPermission = await STTService.checkMicrophonePermission();
      setMicrophonePermission(hasPermission ? 'granted' : 'denied');

      if (hasPermission) {
        setError(''); // Clear any permission errors
      }
    } catch (error) {
      console.error('Microphone permission error:', error);
      setMicrophonePermission('denied');
      setError('Mikrofon izni gerekli. Lütfen tarayıcı ayarlarından mikrofon erişimine izin verin.');
    }
  };

  const handleStartListening = async () => {
    if (!sttServiceRef.current || disabled || isListening || isProcessing) return;

    try {
      setError('');
      setTranscription('');
      setProgress(0);
      setIsListening(true);

      logger.debug('Starting voice recording', 'VoiceCommandPanel');
      await sttServiceRef.current.startListening();
      setMicrophonePermission('granted');

    } catch (error) {
      logger.error('Failed to start listening', 'VoiceCommandPanel', {
        error: (error as Error)?.message
      });
      setError('Mikrofon erişimi başarısız. Lütfen izin verin.');
      setIsListening(false);
      if ((error as Error)?.message?.includes('permission')) {
        setMicrophonePermission('denied');
      }
    }
  };

  const handleStopListening = async () => {
    if (!sttServiceRef.current || !isListening) return;

    try {
      setIsListening(false);
      setIsProcessing(true);
      setProgress(10);

      logger.debug('Stopping voice recording and transcribing', 'VoiceCommandPanel');

      const result = await sttServiceRef.current.stopListening((progress: number) => {
        setProgress(progress * 0.6); // STT takes 60% of progress
      });

      setTranscription(result.text);
      setProgress(70);

      // Process voice command using LLM-based Voice Assistant
      if (result.text && result.text.length > 0) {
        logger.debug('Processing voice input with LLM', 'VoiceCommandPanel', {
          text: result.text.substring(0, 100)
        });

        const voiceAssistant = new VoiceAssistantService();
        const assistantResponse = await voiceAssistant.processVoiceTranscript(result.text);

        setProgress(90);

        // Create VoiceCommand from LLM response
        const voiceCommand: VoiceCommand = {
          intent: assistantResponse.isTtsRequest ? 'generate_audio' : 'story_request',
          parameters: {
            storyType: 'custom',
            customTopic: assistantResponse.response || result.text
          },
          confidence: 0.95, // LLM responses are considered high confidence
          originalText: result.text
        };

        setLastCommand(voiceCommand);
        setProgress(100);

        logger.debug('LLM voice processing completed', 'VoiceCommandPanel', {
          intent: voiceCommand.intent,
          isTtsRequest: assistantResponse.isTtsRequest,
          response: assistantResponse.response?.substring(0, 50)
        });

        // Always call the callback - LLM handles all voice inputs appropriately
        try {
          onVoiceCommand(voiceCommand);
        } catch (callbackError) {
          console.error('🎵 [Voice Pipeline] Callback error:', callbackError);
          setError('Voice command processing failed: ' + (callbackError as Error)?.message);
        }

      } else {
        setError('Ses kaydı boş. Lütfen tekrar deneyin.');
      }

    } catch (error) {
      logger.error('Voice assistant processing failed', 'VoiceCommandPanel', {
        error: (error as Error)?.message
      });
      setError('Ses asistanı başarısız: ' + (error as Error)?.message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const getIntentDisplayName = (intent: string): string => {
    const intentMap: { [key: string]: string } = {
      story_request: 'Masal İsteği',
      fairy_tale: 'Peri Masalı',
      adventure: 'Macera',
      educational: 'Eğitici',
      animal: 'Hayvan',
      play_story: 'Oynat',
      pause_story: 'Duraklat',
      stop_story: 'Durdur',
      generate_audio: 'Sese Dönüştür',
      settings: 'Ayarlar',
      help: 'Yardım',
      unknown: 'Bilinmeyen'
    };
    return intentMap[intent] || intent;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Sesli Komut</h3>
          </div>
          {microphonePermission === 'denied' && (
            <Badge variant="destructive" className="text-xs">
              Mikrofon İzni Gerekli
            </Badge>
          )}
        </div>

        {/* Audio Visualizer */}
        <div className="flex justify-center">
          <AudioVisualizer isActive={isListening} />
        </div>

        {/* Control Button - Compact Size */}
        <div className="flex justify-center">
          <Button
            size="default"
            variant={isListening ? "destructive" : "default"}
            disabled={disabled || isProcessing || microphonePermission === 'denied'}
            onClick={isListening ? handleStopListening : handleStartListening}
            className="w-16 h-16 rounded-full p-0"
          >
            {isProcessing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
        </div>

        {/* Status Text */}
        <div className="text-center">
          {isListening ? (
            <p className="text-sm text-blue-600 font-medium">
              🎤 Dinliyorum... Konuşmayı bitirdikten sonra butona tekrar basın
            </p>
          ) : isProcessing ? (
            <p className="text-sm text-yellow-600 font-medium">
              🔄 İşleniyor...
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Sesli komut vermek için mikrofon butonuna basın
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {isProcessing && progress > 0 && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-center text-gray-500">
              {progress < 50 ? 'Ses tanınıyor...' :
               progress < 90 ? 'Komut işleniyor...' : 'Tamamlanıyor...'}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Transcription */}
        {transcription && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Anlaşılan:
              </span>
            </div>
            <p className="text-sm italic text-gray-600 dark:text-gray-400">
              "{transcription}"
            </p>
          </div>
        )}

        {/* Last Command */}
        {lastCommand && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Komut: {getIntentDisplayName(lastCommand.intent)}
              </span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getConfidenceColor(lastCommand.confidence)}`} />
                <span className="text-xs text-gray-500">
                  %{Math.round(lastCommand.confidence * 100)}
                </span>
              </div>
            </div>

            {/* Parameters */}
            {Object.keys(lastCommand.parameters).length > 0 && (
              <div className="space-y-1">
                {lastCommand.parameters.characterName && (
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-500">Karakter:</span>
                    <Badge variant="secondary" className="text-xs">
                      {lastCommand.parameters.characterName}
                    </Badge>
                  </div>
                )}
                {lastCommand.parameters.storyType && (
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-500">Tür:</span>
                    <Badge variant="secondary" className="text-xs">
                      {getIntentDisplayName(lastCommand.parameters.storyType)}
                    </Badge>
                  </div>
                )}
                {lastCommand.parameters.age && (
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-500">Yaş:</span>
                    <Badge variant="secondary" className="text-xs">
                      {lastCommand.parameters.age}
                    </Badge>
                  </div>
                )}
                {lastCommand.parameters.customTopic && (
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-500">Konu:</span>
                    <Badge variant="secondary" className="text-xs">
                      {lastCommand.parameters.customTopic}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Model Information */}
  {(settings?.sttSettings?.model === 'gpt-4o-mini-transcribe') && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
              ✓ Enhanced STT Active
            </h4>
            <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
              <div>• Gelişmiş Transcribe model (legacy)</div>
              <div>• Superior Turkish language support</div>
              <div>• Word-level timing information</div>
              {settings?.sttSettings?.wakeWordEnabled && (
                <div>• Wake word "Hey Elsa" detection enabled</div>
              )}
            </div>
          </div>
        )}

        {/* Usage Examples */}
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Örnek Komutlar:
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {settings?.sttSettings?.wakeWordEnabled ? (
              <>
                <li>• Say "Hey Elsa" to activate, then:</li>
                <li>• "Elif için peri masalı anlat"</li>
                <li>• "5 yaşında macera hikayesi istiyorum"</li>
                <li>• "Hayvanlar hakkında eğitici bir hikaye"</li>
                <li>• "Masalı oynat / durdur / duraklat"</li>
              </>
            ) : (
              <>
                <li>• "Elif için peri masalı anlat"</li>
                <li>• "5 yaşında macera hikayesi istiyorum"</li>
                <li>• "Hayvanlar hakkında eğitici bir hikaye"</li>
                <li>• "Masalı oynat / durdur / duraklat"</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

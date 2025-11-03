import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { STTService, GPT4oMiniSTTService } from "@/services/sttService";
import { logger } from "@/utils/logger";

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

interface ModernVoiceCommandPanelProps {
  onVoiceCommand: (command: VoiceCommand) => void;
  disabled?: boolean;
  className?: string;
  settings?: {
    sttSettings?: {
      provider?: string;
      model?: string;
      wakeWordEnabled?: boolean;
      wakeWordSensitivity?: "low" | "medium" | "high";
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (!isActive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#3B82F6";

      // Simple animated bars
      for (let i = 0; i < 5; i++) {
        const height = Math.random() * 20 + 5;
        ctx.fillRect(i * 8, canvas.height - height, 6, height);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    if (isActive) {
      draw();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={50}
      height={25}
      className="rounded border bg-gray-50 dark:bg-gray-900"
    />
  );
};

/**
 * Modern Voice Command Panel with integrated React-based Wake Word Detection
 * Purpose: Provides voice command recognition with official Porcupine React integration
 *
 * Logic Flow:
 * 1. Wake word detection triggers automatic speech recognition
 * 2. Manual listening also available via button controls
 * 3. STT processes audio and converts to commands
 * 4. Commands are parsed and sent to parent component
 *
 * Key Improvements over original:
 * - Uses official Porcupine React hooks instead of custom wrapper
 * - Cleaner separation of wake word and STT concerns
 * - Better error handling and user feedback
 * - More maintainable code structure
 */
export const ModernVoiceCommandPanel: React.FC<
  ModernVoiceCommandPanelProps
> = ({ onVoiceCommand, disabled = false, className = "", settings }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>("");
  const [microphonePermission, setMicrophonePermission] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");

  const sttServiceRef = useRef<STTService | GPT4oMiniSTTService | null>(null);

  // Initialize STT service (simplified - no more wake word complexity here)
  useEffect(() => {
    const sttSettings = settings?.sttSettings || {};
    const modelId = sttSettings.model || "gpt-4o-mini-transcribe";

    if (modelId === "gpt-4o-mini-transcribe") {
      // Use GPT-4o-mini-transcribe service
      sttServiceRef.current = new GPT4oMiniSTTService({
        sttProvider: sttSettings.provider || "openai",
        openaiSTT: {
          modelId: modelId,
        },
        audioSettings: {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          format: "webm",
        },
        responseFormat:
          (sttSettings.responseFormat as "json" | "verbose_json") ||
          "verbose_json",
      });
    } else {
      // Use standard STT service
      sttServiceRef.current = new STTService({
        sttProvider: sttSettings.provider || "openai",
        openaiSTT: {
          modelId: modelId,
        },
        audioSettings: {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          format: "webm",
        },
      });
    }

    // Check microphone permission
    checkMicrophonePermission();

    return () => {
      if (sttServiceRef.current) {
        sttServiceRef.current.cleanup();
      }
    };
  }, [settings?.sttSettings]);

  const checkMicrophonePermission = async () => {
    try {
      logger.debug(
        "Checking microphone permission...",
        "ModernVoiceCommandPanel",
      );
      const hasPermission = await STTService.checkMicrophonePermission();
      setMicrophonePermission(hasPermission ? "granted" : "denied");
      logger.info(
        `Microphone permission: ${hasPermission ? "granted" : "denied"}`,
        "ModernVoiceCommandPanel",
      );
    } catch (error) {
      logger.error(
        "Error checking microphone permission",
        "ModernVoiceCommandPanel",
        {
          error: (error as Error)?.message,
        },
      );
      setMicrophonePermission("denied");
    }
  };

  const handleStartListening = async () => {
    if (!sttServiceRef.current || disabled || isListening || isProcessing)
      return;

    try {
      setError("");
      setTranscription("");
      setProgress(0);
      setIsListening(true);

      logger.debug("Starting voice recording", "ModernVoiceCommandPanel");
      await sttServiceRef.current.startListening();
      setMicrophonePermission("granted");
    } catch (error) {
      const errorMessage = (error as Error)?.message || "Unknown error";
      logger.error("Failed to start listening", "ModernVoiceCommandPanel", {
        error: errorMessage,
      });

      // Provide specific error messages for common microphone issues
      if (
        errorMessage.includes("izin") ||
        errorMessage.includes("permission") ||
        errorMessage.includes("denied")
      ) {
        setError(
          "Mikrofon izni gerekli. Lütfen tarayıcınızda mikrofon erişimine izin verin ve sayfayı yenileyin.",
        );
      } else if (
        errorMessage.includes("https") ||
        errorMessage.includes("secure")
      ) {
        setError(
          "Mikrofon erişimi için güvenli bağlantı (HTTPS) gerekli. Lütfen sayfayı HTTPS üzerinden açın.",
        );
      } else if (
        errorMessage.includes("not found") ||
        errorMessage.includes("device")
      ) {
        setError(
          "Mikrofon cihazı bulunamadı. Lütfen mikrofonunuzun bağlı ve çalışır durumda olduğundan emin olun.",
        );
      } else {
        setError(`Ses kaydı başlatılamadı: ${errorMessage}`);
      }

      setIsListening(false);
      setMicrophonePermission("denied");
    }
  };

  const handleStopListening = async () => {
    if (!sttServiceRef.current || !isListening) return;

    try {
      setIsListening(false);
      setIsProcessing(true);

      logger.debug(
        "Stopping voice recording and processing",
        "ModernVoiceCommandPanel",
      );

      // Start progress simulation
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress < 90) {
          setProgress(currentProgress);
        }
      }, 200);

      const result = await sttServiceRef.current.stopListening((progress) => {
        setProgress(progress);
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (result && result.text) {
        setTranscription(result.text);
        logger.debug("Transcription received", "ModernVoiceCommandPanel", {
          transcription: result.text,
        });

        // Parse the transcription into a voice command
        const command = parseVoiceCommand(result.text);
        if (command) {
          setLastCommand(command);
          onVoiceCommand(command);
          logger.info("Voice command processed", "ModernVoiceCommandPanel", {
            intent: command.intent,
            confidence: command.confidence,
          });
        } else {
          logger.warn(
            "Unable to parse voice command",
            "ModernVoiceCommandPanel",
            {
              transcription: result.text,
            },
          );
          setError("Unable to understand the voice command. Please try again.");
        }
      } else {
        setError("No speech detected. Please try again.");
      }
    } catch (error) {
      logger.error("Failed to process voice input", "ModernVoiceCommandPanel", {
        error: (error as Error)?.message,
      });
      setError(`Failed to process voice: ${(error as Error)?.message}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  /**
   * Parse transcription into structured voice command
   * Logic: Simple keyword matching to identify intents and parameters
   */
  const parseVoiceCommand = (transcription: string): VoiceCommand | null => {
    const text = transcription.toLowerCase().trim();

    // Story creation commands
    if (
      text.includes("create") ||
      text.includes("tell") ||
      text.includes("story")
    ) {
      let storyType = "adventure";
      let characterName = "";
      let age = undefined;
      let customTopic = "";

      // Extract story type
      if (text.includes("princess") || text.includes("fairy tale"))
        storyType = "princess";
      else if (text.includes("pirate") || text.includes("treasure"))
        storyType = "pirate";
      else if (text.includes("space") || text.includes("astronaut"))
        storyType = "space";
      else if (text.includes("animal") || text.includes("jungle"))
        storyType = "animal";

      // Extract character name
      const nameMatch = text.match(/(?:about|with|character|named)\s+(\w+)/);
      if (nameMatch) {
        characterName = nameMatch[1];
      }

      // Extract age
      const ageMatch = text.match(/(\d+)\s*(?:year|age)/);
      if (ageMatch) {
        age = parseInt(ageMatch[1]);
      }

      // Extract custom topics
      const topicMatch = text.match(/(?:about|topic|theme)\s+(.+?)(?:\.|$)/);
      if (topicMatch) {
        customTopic = topicMatch[1].trim();
      }

      return {
        intent: "create_story",
        parameters: {
          storyType,
          characterName: characterName || undefined,
          age,
          customTopic: customTopic || undefined,
        },
        confidence: 0.8,
        originalText: transcription,
      };
    }

    // Other commands can be added here...

    return null;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Voice Command Panel */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isListening ? (
                <>
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-red-600">
                    Recording...
                  </span>
                  <AudioVisualizer isActive={isListening} />
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm font-medium text-blue-600">
                    Processing...
                  </span>
                </>
              ) : lastCommand ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    Command Recognized
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {lastCommand.intent.replace("_", " ")}
                  </Badge>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Ready to listen</span>
                </>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {isProcessing && progress > 0 && (
            <Progress value={progress} className="h-1" />
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Voice Recognition Error
                </p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Transcription Display */}
          {transcription && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-800">You said:</p>
              <p className="text-sm text-blue-700 mt-1">"{transcription}"</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {isListening ? (
              <Button
                onClick={handleStopListening}
                disabled={disabled}
                variant="destructive"
                size="sm"
                className="flex items-center space-x-1"
              >
                <MicOff className="h-3 w-3" />
                <span>Stop Recording</span>
              </Button>
            ) : (
              <Button
                onClick={handleStartListening}
                disabled={disabled || isProcessing}
                variant="default"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Mic className="h-3 w-3" />
                <span>Start Recording</span>
              </Button>
            )}

            {transcription && (
              <Button
                onClick={() => {
                  if ("speechSynthesis" in window && transcription) {
                    speechSynthesis.speak(
                      new SpeechSynthesisUtterance(transcription),
                    );
                  }
                }}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Volume2 className="h-3 w-3" />
                <span>Replay</span>
              </Button>
            )}
          </div>

          {/* Microphone Permission Status */}
          {microphonePermission === "denied" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 mb-2">
                Mikrofon erişimi ses komutları için gereklidir. Lütfen tarayıcı
                ayarlarınızdan mikrofon izinlerini etkinleştirin.
              </p>
              <Button
                onClick={checkMicrophonePermission}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Mic className="h-3 w-3" />
                <span>İzni Tekrar Dene</span>
              </Button>
            </div>
          )}

          {/* HTTPS Warning - only show for non-localhost HTTP */}
          {location.protocol === "http:" &&
            location.hostname !== "localhost" &&
            location.hostname !== "127.0.0.1" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  ⚠️ Mikrofon erişimi için güvenli bağlantı (HTTPS) gereklidir.
                  HTTP üzerinden mikrofon erişimi kısıtlıdır.
                </p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

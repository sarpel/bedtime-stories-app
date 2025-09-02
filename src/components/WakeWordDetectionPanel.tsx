import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, AlertCircle, CheckCircle2, Loader2, RefreshCw, Info } from 'lucide-react';
import { usePorcupineWakeWord } from '@/hooks/usePorcupineWakeWord';
import { WakeWordStatus } from '@/components/WakeWordStatus';
import { logger } from '@/utils/logger';
import { checkPorcupineCompatibility, getCacheClearingInstructions } from '@/utils/porcupineCacheUtils';

/**
 * Wake Word Detection Component using official Porcupine React SDK
 * Purpose: Provides a simple interface for wake word detection
 *
 * Logic Flow:
 * 1. Initialize Porcupine with "Hey Elsa" wake word
 * 2. Provide controls to start/stop listening
 * 3. Display detection status and results
 * 4. Handle errors gracefully with user-friendly feedback
 */

interface WakeWordDetectionPanelProps {
  onWakeWordDetected?: () => void;
  disabled?: boolean;
  className?: string;
  settings?: {
    wakeWordEnabled?: boolean;
    wakeWordSensitivity?: 'low' | 'medium' | 'high';
    autoStart?: boolean;
  };
}

// Convert sensitivity levels to numeric values
const getSensitivityValue = (level: 'low' | 'medium' | 'high'): number => {
  switch (level) {
    case 'low': return 0.3;
    case 'medium': return 0.5;
    case 'high': return 0.7;
    default: return 0.5;
  }
};

export const WakeWordDetectionPanel: React.FC<WakeWordDetectionPanelProps> = ({
  onWakeWordDetected,
  disabled = false,
  className = '',
  settings = {}
}) => {
  const {
    wakeWordEnabled = true,
    wakeWordSensitivity = 'medium',
    autoStart = false
  } = settings;

  const [isClearing, setIsClearing] = useState(false);
  const [showClearingInstructions, setShowClearingInstructions] = useState(false);

  // Check browser compatibility
  const compatibility = checkPorcupineCompatibility();

  // Use our custom hook that wraps the official Porcupine React SDK
  const {
    isLoaded,
    isListening,
    error,
    keywordDetected,
    startListening,
    stopListening,
    toggleListening,
    resetKeywordDetected,
    clearCache
  } = usePorcupineWakeWord({
    accessKey: import.meta.env.VITE_PICOVOICE_ACCESS_KEY || 'demo',
    keywordPath: '/hey-elsa_wasm.ppn',
    sensitivity: getSensitivityValue(wakeWordSensitivity),
    onWakeWordDetected: () => {
      logger.info('Wake word detected - triggering callback', 'WakeWordDetectionPanel');
      if (onWakeWordDetected) {
        onWakeWordDetected();
      }
    },
    enabled: wakeWordEnabled && !disabled
  });

  // Auto-start if configured and loaded
  useEffect(() => {
    if (autoStart && isLoaded && !isListening && !error && wakeWordEnabled) {
      logger.debug('Auto-starting wake word detection', 'WakeWordDetectionPanel');
      startListening().catch((startError) => {
        logger.error('Failed to auto-start wake word detection', 'WakeWordDetectionPanel', {
          error: (startError as Error)?.message
        });
      });
    }
  }, [autoStart, isLoaded, isListening, error, wakeWordEnabled, startListening]);

  // Reset keyword detection after a delay
  useEffect(() => {
    if (keywordDetected) {
      const timer = setTimeout(() => {
        resetKeywordDetected();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [keywordDetected, resetKeywordDetected]);

  const handleToggleListening = async () => {
    try {
      await toggleListening();
    } catch (error) {
      logger.error('Failed to toggle wake word detection', 'WakeWordDetectionPanel', {
        error: (error as Error)?.message
      });
    }
  };

  const handleClearCache = async () => {
    try {
      setIsClearing(true);
      logger.info('Clearing Porcupine cache via user request', 'WakeWordDetectionPanel');

      await clearCache();

      // Show success message briefly
      setTimeout(() => {
        setIsClearing(false);
      }, 2000);

    } catch (error) {
      logger.error('Failed to clear cache', 'WakeWordDetectionPanel', {
        error: (error as Error)?.message
      });
      setIsClearing(false);
    }
  };

  if (!wakeWordEnabled) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <MicOff className="h-4 w-4 mr-2 text-gray-500" />
            Wake Word Detection (Disabled)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Wake word detection is disabled in settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Mic className="h-4 w-4 mr-2" />
          Wake Word Detection
          {keywordDetected && (
            <Badge variant="secondary" className="ml-2 animate-pulse">
              "Hey Elsa" Detected!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center space-x-2">
          {!isLoaded ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">Loading Porcupine...</span>
            </>
          ) : error ? (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">Error</span>
            </>
          ) : isListening ? (
            <>
              <div className="h-4 w-4 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-600">Listening for "Hey Elsa"</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Ready</span>
            </>
          )}
        </div>

        {/* Error Status */}
        {error && (
          <WakeWordStatus
            isEnabled={wakeWordEnabled}
            isInitialized={isLoaded}
            error={error}
            onDisableWakeWord={() => {
              // Could emit an event to parent component to disable wake word
              logger.info('User requested to disable wake word', 'WakeWordDetectionPanel');
            }}
          />
        )}

        {/* Compatibility Warnings */}
        {!compatibility.compatible && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="flex items-center text-yellow-800 text-sm font-medium mb-2">
              <AlertCircle className="h-4 w-4 mr-2" />
              Browser Compatibility Issues
            </div>
            <ul className="text-xs text-yellow-700 space-y-1">
              {compatibility.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
            <div className="mt-2">
              <div className="text-xs text-yellow-700 font-medium">Recommendations:</div>
              <ul className="text-xs text-yellow-600 space-y-1">
                {compatibility.recommendations.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Cache Issues Help */}
        {error && (error.includes('platform') || error.includes('cache') || error.includes('INVALID_ARGUMENT')) && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="flex items-center text-blue-800 text-sm font-medium mb-2">
              <Info className="h-4 w-4 mr-2" />
              Cache/Platform Issue Detected
            </div>
            <p className="text-xs text-blue-700 mb-2">
              This error often occurs when the browser has cached an incompatible wake word file.
              Try clearing the cache below or refreshing your browser.
            </p>
            <Button
              onClick={() => setShowClearingInstructions(!showClearingInstructions)}
              variant="ghost"
              size="sm"
              className="text-blue-700 hover:text-blue-800 p-0 h-auto"
            >
              Show manual cache clearing instructions
            </Button>

            {showClearingInstructions && (
              <div className="mt-2 space-y-2">
                <div className="text-xs text-blue-700">
                  <div className="font-medium">Manual Cache Clearing:</div>
                  {getCacheClearingInstructions().general.map((instruction, index) => (
                    <div key={index}>• {instruction}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleToggleListening}
            disabled={!isLoaded || disabled}
            variant={isListening ? "destructive" : "default"}
            size="sm"
            className="flex items-center space-x-1"
          >
            {isListening ? (
              <>
                <MicOff className="h-3 w-3" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="h-3 w-3" />
                <span>Start Listening</span>
              </>
            )}
          </Button>

          <Button
            onClick={handleClearCache}
            disabled={isClearing}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1"
          >
            {isClearing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Clearing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                <span>Clear Cache</span>
              </>
            )}
          </Button>

          {keywordDetected && (
            <Button
              onClick={resetKeywordDetected}
              variant="outline"
              size="sm"
            >
              Clear Detection
            </Button>
          )}
        </div>

        {/* Information */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <div><strong>Wake Word:</strong> "Hey Elsa"</div>
          <div><strong>Sensitivity:</strong> {wakeWordSensitivity} ({getSensitivityValue(wakeWordSensitivity)})</div>
          <div><strong>Status:</strong> {
            !isLoaded ? 'Loading...'
            : error ? 'Error'
            : isListening ? 'Active'
            : 'Inactive'
          }</div>
        </div>
      </CardContent>
    </Card>
  );
};

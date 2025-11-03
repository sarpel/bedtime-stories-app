import React from "react";
import { AlertTriangle, ExternalLink, Info } from "lucide-react";

interface WakeWordStatusProps {
  isEnabled: boolean;
  isInitialized: boolean;
  error?: string;
  onDisableWakeWord?: () => void;
}

export const WakeWordStatus: React.FC<WakeWordStatusProps> = ({
  isEnabled,
  isInitialized,
  error,
  onDisableWakeWord,
}) => {
  // Check if it's a platform compatibility error
  const isPlatformError = error?.includes("Platform compatibility error");

  if (!isEnabled) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Info className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-700">
            Wake word detection is disabled
          </span>
        </div>
      </div>
    );
  }

  if (isPlatformError) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-amber-800">
              Wake Word Platform Issue
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              The wake word model file was created for a different platform.
              Voice recognition will work, but you'll need to manually start
              listening.
            </p>

            <div className="mt-3 space-y-2">
              <div className="text-sm text-amber-700">
                <strong>To fix this:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>
                    Visit{" "}
                    <a
                      href="https://console.picovoice.ai/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-800 underline hover:text-amber-900 inline-flex items-center"
                    >
                      Picovoice Console{" "}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </li>
                  <li>Create a new "Hey Elsa" wake word</li>
                  <li>
                    <strong>Select "Web (WASM)" as the platform</strong>
                  </li>
                  <li>Download and replace the hey-elsa.ppn file</li>
                </ol>
              </div>

              {onDisableWakeWord && (
                <button
                  onClick={onDisableWakeWord}
                  className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded border border-amber-300"
                >
                  Disable Wake Word for Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">
              Wake Word Error
            </h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            {onDisableWakeWord && (
              <button
                onClick={onDisableWakeWord}
                className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded border border-red-300"
              >
                Disable Wake Word
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isInitialized) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-700">
            Wake word "Hey Elsa" is active and listening
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center space-x-2">
        <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-yellow-700">
          Initializing wake word detector...
        </span>
      </div>
    </div>
  );
};

export default WakeWordStatus;

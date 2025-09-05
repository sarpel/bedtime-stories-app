import React from 'react';
import { ModernVoiceCommandPanel } from '@/components/ModernVoiceCommandPanel';
import { VoiceCommand } from '@/components/VoiceCommandPanel';

/**
 * Example usage of the new React-based Porcupine wake word implementation
 * Purpose: Demonstrates how to use the modernized voice command panel
 *
 * Key Features:
 * - Official Porcupine React SDK integration
 * - Cleaner separation of wake word and STT concerns
 * - Better error handling
 * - Simplified state management
 */

export const VoiceCommandExample: React.FC = () => {
  const handleVoiceCommand = (command: VoiceCommand) => {
    console.log('Voice command received:', command);

    // Handle different command intents
    switch (command.intent) {
      case 'create_story':
        console.log('Creating story with parameters:', command.parameters);
        // Trigger story creation logic
        break;
      default:
        console.log('Unknown command intent:', command.intent);
    }
  };

  const exampleSettings = {
    sttSettings: {
      provider: 'openai',
      model: 'gpt-4o-mini-transcribe',
      wakeWordEnabled: true,
      wakeWordSensitivity: 'medium' as const,
      continuousListening: true,
      responseFormat: 'verbose_json',
      language: 'en'
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Modern Voice Command Panel</h1>
        <p className="text-gray-600 mb-4">
          This example demonstrates the new React-based Porcupine wake word implementation
          following the official Picovoice React documentation.
        </p>
      </div>

      <ModernVoiceCommandPanel
        onVoiceCommand={handleVoiceCommand}
        settings={exampleSettings}
        className="w-full"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">How to use:</h3>
        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
          <li>Wait for the wake word detection to initialize</li>
          <li>Say "Hey Elsa" to trigger automatic listening</li>
          <li>Or click "Start Recording" to manually start listening</li>
          <li>Speak your command (e.g., "Create an adventure story about a princess")</li>
          <li>Watch as the system processes your voice into commands</li>
        </ol>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Key Improvements:</h3>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li><strong>Official React SDK:</strong> Uses @picovoice/porcupine-react hooks</li>
          <li><strong>Automatic Audio Processing:</strong> Via @picovoice/web-voice-processor</li>
          <li><strong>Better Error Handling:</strong> Platform compatibility checks</li>
          <li><strong>Cleaner Code:</strong> Separation of concerns between wake word and STT</li>
          <li><strong>React Hooks:</strong> Proper React state management</li>
        </ul>
      </div>
    </div>
  );
};

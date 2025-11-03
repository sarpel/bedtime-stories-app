/**
 * Turkish Intent Recognition Utilities
 * Processes voice commands in Turkish for bedtime story requests
 */

export interface Intent {
  name: string;
  patterns: string[];
  confidence: number;
}

export interface ExtractedParameters {
  characterName?: string;
  age?: number;
  storyType?: string;
  customTopic?: string;
  action?: string;
}

export interface IntentResult {
  intent: string;
  parameters: ExtractedParameters;
  confidence: number;
}

// Turkish intent patterns with confidence scoring
export const turkishIntents: { [key: string]: Intent } = {
  story_request: {
    name: "story_request",
    patterns: [
      "masal anlat",
      "hikaye anlat",
      "masal oku",
      "hikaye oku",
      "bir masal",
      "bir hikaye",
      "masal istiyorum",
      "hikaye istiyorum",
      "masal söyle",
      "hikaye söyle",
      "öykü anlat",
      "öykü oku",
      "masalı",
      "hikayesi",
      "için masal",
      "için hikaye",
    ],
    confidence: 0.9,
  },

  // Story types
  fairy_tale: {
    name: "fairy_tale",
    patterns: [
      "peri masalı",
      "peri hikayesi",
      "prenses masalı",
      "prenses hikayesi",
      "şehzade masalı",
      "kral masalı",
      "kraliçe masalı",
      "cadı masalı",
      "büyücü masalı",
      "sihirli masal",
      "büyülü masal",
      "ejder masalı",
      "dev masalı",
      "cin masalı",
    ],
    confidence: 0.85,
  },

  adventure: {
    name: "adventure",
    patterns: [
      "macera hikayesi",
      "macera masalı",
      "macera",
      "kahraman hikayesi",
      "kahraman masalı",
      "kahramanlık",
      "yolculuk hikayesi",
      "keşif masalı",
      "serüven",
      "cesaret hikayesi",
      "cesur kahraman",
      "maceracı",
    ],
    confidence: 0.8,
  },

  educational: {
    name: "educational",
    patterns: [
      "öğretici hikaye",
      "eğitici masal",
      "bilim hikayesi",
      "matematik masalı",
      "doğa hikayesi",
      "hayvan hikayesi",
      "tarih masalı",
      "coğrafya hikayesi",
      "öğretici",
      "bilgi verici",
      "eğitim",
      "öğrenme",
    ],
    confidence: 0.8,
  },

  animal: {
    name: "animal",
    patterns: [
      "hayvan hikayesi",
      "hayvan masalı",
      "kedi masalı",
      "köpek hikayesi",
      "kuş hikayesi",
      "balık masalı",
      "orman hikayesi",
      "çiftlik masalı",
      "aslan masalı",
      "kartal hikayesi",
      "tavşan masalı",
      "ayı hikayesi",
      "yaban hayvanları",
      "evcil hayvanlar",
      "hayvanlar hakkında",
    ],
    confidence: 0.8,
  },

  // Audio controls
  play_story: {
    name: "play_story",
    patterns: [
      "oynat",
      "çal",
      "başlat",
      "dinle",
      "masalı oynat",
      "hikayeyi çal",
      "ses ver",
      "sesli oku",
      "dinlemek istiyorum",
    ],
    confidence: 0.9,
  },

  pause_story: {
    name: "pause_story",
    patterns: [
      "duraklat",
      "bekle",
      "dur",
      "ara ver",
      "masalı duraklat",
      "biraz dur",
      "durakla",
      "ara",
      "mola",
    ],
    confidence: 0.9,
  },

  stop_story: {
    name: "stop_story",
    patterns: [
      "bitir",
      "kes",
      "kapat",
      "durdur",
      "masalı bitir",
      "hikayeyi kes",
      "son",
      "yeter",
      "kapalı",
    ],
    confidence: 0.9,
  },

  // Generate audio/TTS
  generate_audio: {
    name: "generate_audio",
    patterns: [
      "sese dönüştür",
      "seslendir",
      "sesli yap",
      "oku",
      "sesle",
      "masalı sese dönüştür",
      "hikayeyi seslendir",
      "sesli oku",
      "ses oluştur",
      "sesli ver",
      "oku bunu",
      "sesini dinle",
      "sesli hale getir",
      "ses kaydı yap",
      "dinlemek istiyorum",
    ],
    confidence: 0.9,
  },

  // Settings and help
  settings: {
    name: "settings",
    patterns: [
      "ayarlar",
      "ayar",
      "seçenekler",
      "konfigürasyon",
      "ayarları aç",
      "ayar menüsü",
      "seçenek",
      "tercihler",
    ],
    confidence: 0.8,
  },

  help: {
    name: "help",
    patterns: [
      "yardım",
      "nasıl",
      "ne yapabilirim",
      "komutlar",
      "yardım et",
      "nasıl kullanıyorum",
      "ne diyebilirim",
      "hangi komutlar",
      "yardıma ihtiyacım var",
    ],
    confidence: 0.8,
  },
};

/**
 * Extract age from Turkish text
 */
export const extractAge = (text: string): number | undefined => {
  const agePatterns = [
    /(\d+)\s*yaş/gi,
    /(\d+)\s*yaşında/gi,
    /yaş[ıi]\s*(\d+)/gi,
    /(\d+)\s*sene/gi,
  ];

  for (const pattern of agePatterns) {
    const match = text.match(pattern);
    if (match) {
      const ageStr = match[0].match(/\d+/)?.[0];
      if (ageStr) {
        const age = parseInt(ageStr);
        if (age >= 1 && age <= 18) {
          return age;
        }
      }
    }
  }

  return undefined;
};

/**
 * Extract character name from Turkish text
 */
export const extractCharacterName = (text: string): string | undefined => {
  const namePatterns = [
    /(\w+)\s*adında/gi,
    /(\w+)\s*isminde/gi,
    /(\w+)\s*için/gi,
    /kahraman\s*(\w+)/gi,
    /(\w+)\s*karakteri/gi,
    /ana\s*karakter\s*(\w+)/gi,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      // Filter out common words that aren't names
      const stopWords = [
        "bir",
        "bu",
        "şu",
        "o",
        "benim",
        "senin",
        "onun",
        "masal",
        "hikaye",
        "için",
        "hakkında",
        "ile",
        "ve",
        "yaş",
        "yaşında",
        "kahraman",
        "karakter",
      ];

      if (!stopWords.includes(name.toLowerCase()) && name.length >= 2) {
        // Capitalize first letter
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      }
    }
  }

  return undefined;
};

/**
 * Extract custom topic from Turkish text
 */
export const extractCustomTopic = (text: string): string | undefined => {
  const topicPatterns = [
    /(\w+)\s*hakkında/gi,
    /(\w+)\s*ile\s*ilgili/gi,
    /(\w+)\s*konulu/gi,
    /(\w+)\s*temal[ıi]/gi,
    /konu\s*(\w+)/gi,
    /tema\s*(\w+)/gi,
  ];

  for (const pattern of topicPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const topic = match[1].trim();
      if (topic.length >= 3) {
        return topic.toLowerCase();
      }
    }
  }

  return undefined;
};

/**
 * Detect intent from Turkish text
 */
export const detectIntent = (
  text: string,
): { intent: string; confidence: number } => {
  const normalizedText = text.toLowerCase().trim();
  let bestIntent = "unknown";
  let bestConfidence = 0;

  // Check each intent pattern
  for (const [intentName, intentData] of Object.entries(turkishIntents)) {
    for (const pattern of intentData.patterns) {
      if (normalizedText.includes(pattern)) {
        // Calculate confidence based on pattern match quality
        let confidence = intentData.confidence;

        // Boost confidence for exact matches
        if (normalizedText === pattern) {
          confidence += 0.1;
        }

        // Boost confidence for word boundaries
        const regex = new RegExp(`\\b${pattern}\\b`, "gi");
        if (regex.test(normalizedText)) {
          confidence += 0.05;
        }

        if (confidence > bestConfidence) {
          bestIntent = intentName;
          bestConfidence = Math.min(confidence, 1.0);
        }
      }
    }
  }

  return { intent: bestIntent, confidence: bestConfidence };
};

/**
 * Extract story type from text
 */
export const extractStoryType = (text: string): string | undefined => {
  const normalizedText = text.toLowerCase();

  // Check for story type patterns
  const storyTypes = ["fairy_tale", "adventure", "educational", "animal"];

  for (const storyType of storyTypes) {
    const patterns = turkishIntents[storyType]?.patterns || [];
    for (const pattern of patterns) {
      if (normalizedText.includes(pattern)) {
        return storyType;
      }
    }
  }

  return undefined;
};

/**
 * Main function to process Turkish voice commands
 */
export const processTurkishVoiceCommand = (text: string): IntentResult => {
  const normalizedText = text.toLowerCase().trim();

  // Detect primary intent
  const { intent, confidence } = detectIntent(normalizedText);

  // Extract parameters
  const parameters: ExtractedParameters = {};

  // Extract character name
  const characterName = extractCharacterName(text);
  if (characterName) {
    parameters.characterName = characterName;
  }

  // Extract age
  const age = extractAge(text);
  if (age) {
    parameters.age = age;
  }

  // Extract story type
  const storyType = extractStoryType(text);
  if (storyType) {
    parameters.storyType = storyType;
  }

  // Extract custom topic
  const customTopic = extractCustomTopic(text);
  if (customTopic) {
    parameters.customTopic = customTopic;
  }

  // Special handling for story requests
  if (intent === "story_request" || Object.keys(parameters).length > 0) {
    // If we have story parameters but no explicit story request, assume it's a story request
    if (
      intent === "unknown" &&
      (parameters.storyType || parameters.characterName)
    ) {
      return {
        intent: "story_request",
        parameters,
        confidence: Math.max(confidence, 0.7),
      };
    }
  }

  // Boost confidence if we have multiple parameters
  let finalConfidence = confidence;
  const paramCount = Object.keys(parameters).length;
  if (paramCount > 0) {
    finalConfidence += paramCount * 0.05;
    finalConfidence = Math.min(finalConfidence, 1.0);
  }

  return {
    intent,
    parameters,
    confidence: finalConfidence,
  };
};

/**
 * Get suggested commands based on current context
 */
export const getSuggestedCommands = (): string[] => {
  return [
    "Elif için peri masalı anlat",
    "5 yaşında macera hikayesi istiyorum",
    "Hayvanlar hakkında eğitici bir hikaye",
    "Ahmet adında kahraman olan bir masal",
    "Masalı sese dönüştür",
    "Masalı oynat",
    "Masalı durdur",
    "Ayarları aç",
    "Yardım",
  ];
};

/**
 * Validate command confidence and provide feedback
 */
export const validateCommandConfidence = (
  result: IntentResult,
): {
  isValid: boolean;
  feedback?: string;
} => {
  if (result.confidence < 0.4) {
    return {
      isValid: false,
      feedback: "Komut anlaşılamadı. Lütfen daha açık konuşun.",
    };
  }

  if (result.confidence < 0.6) {
    return {
      isValid: false,
      feedback:
        "Komut belirsiz. Lütfen tekrar deneyin veya farklı kelimeler kullanın.",
    };
  }

  if (result.intent === "unknown") {
    return {
      isValid: false,
      feedback:
        "Bu komut desteklenmiyor. 'Yardım' diyerek mevcut komutları öğrenebilirsiniz.",
    };
  }

  return { isValid: true };
};

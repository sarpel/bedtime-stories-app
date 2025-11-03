import { logger } from "./logger.ts";

// Yardımcı fonksiyon
type StoryType =
  | "animals"
  | "princess"
  | "adventure"
  | "friendship"
  | "nature"
  | "magic"
  | "custom";

function getStoryTypeName(storyType: StoryType) {
  const typeNames = {
    animals: "Hayvan",
    princess: "Prenses",
    adventure: "Macera",
    friendship: "Arkadaşlık",
    nature: "Doğa",
    magic: "Sihirli",
    custom: "Özel",
  };
  return typeNames[storyType] || "Genel";
}

// Masal paylaşım yardımcı fonksiyonları

export const shareStory = async (
  story: string,
  storyType: string,
  customTopic: string = "",
) => {
  const storyTypeName = getStoryTypeName(storyType as StoryType);
  const topicText = customTopic ? `Konu: ${customTopic}\n\n` : "";
  const shareText = `${storyTypeName} Masalı\n\n${topicText}${story.substring(0, 200)}...\n\nBedtime Stories App ile oluşturuldu 💙`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Benim Masalım",
        text: shareText,
        url: window.location.href,
      });
      return { success: true, method: "native" };
    } else {
      // Fallback: clipboard'a kopyala
      await navigator.clipboard.writeText(shareText);
      return { success: true, method: "clipboard" };
    }
  } catch (error) {
    logger.error("Paylaşım hatası", "ShareUtil", {
      error: (error as Error)?.message,
    });
    return { success: false, error: (error as Error).message };
  }
};

export type SupportedPlatform =
  | "twitter"
  | "facebook"
  | "whatsapp"
  | "telegram";

export const shareToSocialMedia = (
  story: string,
  storyType: string,
  platform: SupportedPlatform,
) => {
  const storyTypeName = getStoryTypeName(storyType as StoryType);
  const shareText = `${storyTypeName} Masalı\n\n${story.substring(0, 100)}...`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(window.location.href);

  const urls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };

  const url = urls[platform];
  if (url) {
    window.open(url, "_blank", "width=600,height=400");
    return { success: true, platform };
  }

  return { success: false, error: "Platform desteklenmiyor" };
};

export const downloadStory = (story: string, storyType: string) => {
  const storyTypeName = getStoryTypeName(storyType as StoryType);
  const filename = `${storyTypeName}_Masali_${new Date().toISOString().split("T")[0]}.txt`;

  const content = `Bedtime Stories App - ${storyTypeName} Masalı
Oluşturulma Tarihi: ${new Date().toLocaleDateString("tr-TR")}

${story}

---
Bu masal Bedtime Stories App ile oluşturulmuştur.
`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  return { success: true, filename };
};

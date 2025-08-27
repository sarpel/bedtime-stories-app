import { logger } from '../utils/logger.js'

// Masal paylaşım servisi
class SharingService {
  baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:3001';
  }

  // Masalı paylaşıma aç
  async shareStory(storyId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/stories/${storyId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Paylaşım başarısız');
      }

      const data = await response.json();
      return {
        success: true,
        shareId: data.shareId,
        shareUrl: data.shareUrl,
        message: data.message
      };
    } catch (error) {
      logger.error('Paylaşım hatası', 'SharingService', { error: (error as Error)?.message });
      return {
        success: false,
        error: (error as Error).message || 'Masal paylaşılırken bir hata oluştu'
      };
    }
  }

  // Masalın paylaşımını kaldır
  async unshareStory(storyId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/stories/${storyId}/share`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Paylaşım kaldırma başarısız');
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      logger.error('Paylaşım kaldırma hatası:', 'SharingService', { error: (error as Error)?.message });
      return {
        success: false,
        error: (error as Error).message || 'Paylaşım kaldırılırken bir hata oluştu'
      };
    }
  }

  // Paylaşılan masalı getir
  async getSharedStory(shareId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/shared/${shareId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Paylaşılan masal bulunamadı');
      }

      const story = await response.json();
      return {
        success: true,
        story
      };
    } catch (error) {
      logger.error('Paylaşılan masal getirme hatası:', 'SharingService', { error: (error as Error)?.message });
      return {
        success: false,
        error: (error as Error).message || 'Paylaşılan masal getirilirken bir hata oluştu'
      };
    }
  }

  // Paylaşılan masalların listesini getir
  async getSharedStories() {
    try {
      const response = await fetch(`${this.baseUrl}/api/shared`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Paylaşılan masallar getirilemedi');
      }

      const stories = await response.json();
      return {
        success: true,
        stories
      };
    } catch (error) {
      logger.error('Paylaşılan masallar listeleme hatası:', 'SharingService', { error: (error as Error)?.message });
      return {
        success: false,
        error: (error as Error).message || 'Paylaşılan masallar listelenirken bir hata oluştu'
      };
    }
  }

  // Paylaşılan masalın ses URL'ini oluştur
  getSharedAudioUrl(shareId: string) {
    return `${this.baseUrl}/api/shared/${shareId}/audio`;
  }

  // Paylaşım URL'ini oluştur (frontend tarafında)
  createShareUrl(shareId: string) {
    const currentHost = window.location.origin;
    return `${currentHost}/shared/${shareId}`;
  }

  // Sosyal medya paylaşımı için URL'ler oluştur
  createSocialShareUrls(shareUrl: string, storyTitle: string = 'Bedtime Story') {
    const text = encodeURIComponent(`${storyTitle} - Bedtime Stories App ile oluşturuldu`);
    const url = encodeURIComponent(shareUrl);

    return {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
    };
  }

  // Clipboard'a link kopyala
  async copyToClipboard(shareUrl: string) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      return { success: true };
    } catch (error) {
      logger.error('Clipboard kopyalama hatası:', 'SharingService', { error: (error as Error)?.message });
      return {
        success: false,
        error: 'Link kopyalanamadı'
      };
    }
  }
}

export default new SharingService();

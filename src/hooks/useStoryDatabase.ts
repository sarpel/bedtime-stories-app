import { useState, useEffect } from "react";
import databaseService from "../services/optimizedDatabaseService";
import { Story } from "../utils/storyTypes";

interface UseStoryDatabaseReturn {
  stories: Story[];
  loading: boolean;
  error: string | null;
  loadStories: () => Promise<void>;
  createStory: (
    storyText: string,
    storyType: string,
    customTopic?: string | null,
  ) => Promise<Story>;
  updateStory: (
    id: string | number,
    storyText: string,
    storyType: string,
    customTopic?: string | null,
  ) => Promise<Story>;
  deleteStory: (id: string | number) => Promise<void>;
  getStory: (id: string | number) => Promise<Story | null>;
  getAudioUrl: (fileName: string) => string | null;
  findStoryById: (id: string | number) => Story | undefined;
  getStoriesByType: (storyType: string) => Promise<Story[]>;
}

export function useStoryDatabase(): UseStoryDatabaseReturn {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Tüm masalları yükle
  const loadStories = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await databaseService.getAllStories();
      setStories(data || []);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(errorMessage);
      console.error("Masalları yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  // Yeni masal oluştur
  const createStory = async (
    storyText: string,
    storyType: string,
    customTopic: string | null = null,
  ): Promise<Story> => {
    setLoading(true);
    setError(null);
    try {
      const newStory = await databaseService.createStory(
        storyText,
        storyType,
        customTopic,
      );
      await loadStories(); // Listeyi yenile
      return newStory;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(errorMessage);
      console.error("Masal oluşturma hatası:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Masal güncelle
  const updateStory = async (
    id: string | number,
    storyText: string,
    storyType: string,
    customTopic: string | null = null,
  ): Promise<Story> => {
    setLoading(true);
    setError(null);
    try {
      const updatedStory = await databaseService.updateStory(
        String(id),
        storyText,
        storyType,
        customTopic,
      );
      await loadStories(); // Listeyi yenile
      return updatedStory;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(errorMessage);
      console.error("Masal güncelleme hatası:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Masal sil
  const deleteStory = async (id: string | number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[useStoryDatabase] deleteStory called with id: ${id}`);
      await databaseService.deleteStory(String(id));
      await loadStories(); // Listeyi yenile
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(errorMessage);
      console.error("Masal silme hatası:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Tek masal getir
  const getStory = async (id: string | number): Promise<Story | null> => {
    setLoading(true);
    setError(null);
    try {
      const story = await databaseService.getStory(String(id));
      return story;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(errorMessage);
      console.error("Masal getirme hatası:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Türüne göre masalları getir
  const getStoriesByType = async (storyType: string): Promise<Story[]> => {
    setLoading(true);
    setError(null);
    try {
      const stories = await databaseService.getStoriesByType(storyType);
      return stories || [];
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(errorMessage);
      console.error("Türe göre masal getirme hatası:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Ses dosyası URL'i al
  const getAudioUrl = (fileName: string): string | null => {
    return databaseService.getAudioUrl(fileName);
  };

  // ID'ye göre masal bul (yerel state'de ara)
  const findStoryById = (id: string | number): Story | undefined => {
    return stories.find((story) => story.id === id);
  };

  // İlk yükleme
  useEffect(() => {
    loadStories();
  }, []);

  return {
    stories,
    loading,
    error,
    loadStories,
    createStory,
    updateStory,
    deleteStory,
    getStory,
    getStoriesByType,
    getAudioUrl,
    findStoryById,
  };
}

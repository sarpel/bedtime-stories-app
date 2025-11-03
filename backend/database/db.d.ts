// Type declarations for database module
declare module "./db" {
  interface Story {
    id: number;
    story_text: string;
    story_type: string;
    custom_topic?: string | null;
    is_favorite: number;
    created_at: string;
    [key: string]: any;
  }

  interface DatabaseModule {
    getAllStories(): Story[];
    createStory(
      storyText: string,
      storyType: string,
      customTopic?: string | null,
    ): number;
    getStory(id: number): Story | null;
    close(): void;
    [key: string]: any;
  }

  const storyDb: DatabaseModule;
  export = storyDb;
}

// Analytics Service for tracking app usage and metrics

interface AnalyticsEvent {
  type: string;
  timestamp: number;
  sessionId: string;
  data: any;
}

interface StoryGenerationData {
  storyType: string | null;
  customTopic: string | null;
  success: boolean;
  duration: number;
  error: string | null;
}

interface AudioGenerationData {
  storyId: string;
  voiceId: string;
  success: boolean;
  duration: number;
  error: string | null;
}

interface AudioPlaybackData {
  storyId: string;
  action: string;
  position: number;
}

interface FavoriteActionData {
  storyId: string;
  action: string;
}

interface ErrorData {
  type: string;
  message: string;
  stack?: string;
}

interface TimeRange {
  start: number;
  end: number;
}

class AnalyticsService {
  events: AnalyticsEvent[];
  sessionStart: number;
  sessionId: string;

  constructor() {
    this.events = [];
    this.sessionStart = Date.now();
    this.sessionId = this.generateSessionId();
  }

  generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Event tracking methods
  trackStoryGeneration(
    storyType: string | null,
    customTopic: string | null,
    success: boolean,
    duration: number,
    error: string | null = null,
  ): void {
    const event: AnalyticsEvent = {
      type: "story_generation",
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        storyType,
        customTopic: customTopic || null,
        success,
        duration: duration || 0,
        error: error || null,
      },
    };
    this.events.push(event);
    this.saveEvent(event);
  }

  trackAudioGeneration(
    storyId: string,
    voiceId: string,
    success: boolean,
    duration: number,
    error: string | null = null,
  ): void {
    const event: AnalyticsEvent = {
      type: "audio_generation",
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        storyId,
        voiceId,
        success,
        duration: duration || 0,
        error: error || null,
      },
    };
    this.events.push(event);
    this.saveEvent(event);
  }

  trackAudioPlayback(storyId: string, action: string, position = 0): void {
    const event: AnalyticsEvent = {
      type: "audio_playback",
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        storyId,
        action, // 'play', 'pause', 'stop', 'complete'
        position,
      },
    };
    this.events.push(event);
    this.saveEvent(event);
  }

  trackFavoriteAction(storyId: string, action: string): void {
    const event: AnalyticsEvent = {
      type: "favorite_action",
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        storyId,
        action, // 'add', 'remove'
      },
    };
    this.events.push(event);
    this.saveEvent(event);
  }

  trackError(errorType: string, errorMessage: string, context: any = {}): void {
    const event: AnalyticsEvent = {
      type: "error",
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        errorType,
        errorMessage,
        context,
      },
    };
    this.events.push(event);
    this.saveEvent(event);
  }

  // Save event to localStorage (backup storage)
  saveEvent(event: AnalyticsEvent): void {
    try {
      const existingEvents = JSON.parse(
        localStorage.getItem("analytics_events") || "[]",
      );
      existingEvents.push(event);
      // Keep only last 1000 events
      if (existingEvents.length > 1000) {
        existingEvents.splice(0, existingEvents.length - 1000);
      }
      localStorage.setItem("analytics_events", JSON.stringify(existingEvents));
    } catch (error) {
      console.error("Analytics save error:", error);
    }
  }

  // Analytics calculation methods
  async getStoryGenerationMetrics(timeRange = "7d"): Promise<any> {
    try {
      const events = this.getEventsFromStorage("story_generation", timeRange);

      const total = events.length;
      const successful = events.filter(
        (e: AnalyticsEvent) => e.data.success,
      ).length;
      const failed = total - successful;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      // Average generation time
      const successfulEvents = events.filter(
        (e: AnalyticsEvent) => e.data.success && e.data.duration > 0,
      );
      const avgDuration =
        successfulEvents.length > 0
          ? successfulEvents.reduce(
              (sum: number, e: AnalyticsEvent) => sum + e.data.duration,
              0,
            ) / successfulEvents.length
          : 0;

      return {
        total,
        successful,
        failed,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: Math.round(avgDuration),
      };
    } catch (error) {
      console.error("Error getting story generation metrics:", error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        avgDuration: 0,
      };
    }
  }

  async getStoryTypePopularity(timeRange = "7d"): Promise<any> {
    try {
      const events = this.getEventsFromStorage("story_generation", timeRange);
      const storyTypes: { [key: string]: number } = {};

      events.forEach((event: AnalyticsEvent) => {
        const type = event.data.storyType || "custom";
        storyTypes[type] = (storyTypes[type] || 0) + 1;
      });

      return Object.entries(storyTypes)
        .map(([type, count]: [string, number]) => ({ type, count }))
        .sort(
          (
            a: { type: string; count: number },
            b: { type: string; count: number },
          ) => b.count - a.count,
        );
    } catch (error) {
      console.error("Error getting story type popularity:", error);
      return [];
    }
  }

  async getAudioMetrics(timeRange = "7d"): Promise<any> {
    try {
      const generationEvents = this.getEventsFromStorage(
        "audio_generation",
        timeRange,
      );
      const playbackEvents = this.getEventsFromStorage(
        "audio_playback",
        timeRange,
      );

      const totalGenerated = generationEvents.length;
      const successfulGenerated = generationEvents.filter(
        (e: AnalyticsEvent) => e.data.success,
      ).length;
      const audioSuccessRate =
        totalGenerated > 0 ? (successfulGenerated / totalGenerated) * 100 : 0;

      // Playback metrics
      const playEvents = playbackEvents.filter(
        (e: AnalyticsEvent) => e.data.action === "play",
      );
      const completeEvents = playbackEvents.filter(
        (e: AnalyticsEvent) => e.data.action === "complete",
      );
      const completionRate =
        playEvents.length > 0
          ? (completeEvents.length / playEvents.length) * 100
          : 0;

      return {
        totalGenerated,
        successfulGenerated,
        audioSuccessRate: Math.round(audioSuccessRate * 100) / 100,
        totalPlays: playEvents.length,
        completions: completeEvents.length,
        completionRate: Math.round(completionRate * 100) / 100,
      };
    } catch (error) {
      console.error("Error getting audio metrics:", error);
      return {
        totalGenerated: 0,
        successfulGenerated: 0,
        audioSuccessRate: 0,
        totalPlays: 0,
        completions: 0,
        completionRate: 0,
      };
    }
  }

  async getFavoriteMetrics(): Promise<any> {
    try {
      const events = this.getEventsFromStorage("favorite_action");
      const addEvents = events.filter(
        (e: AnalyticsEvent) => e.data.action === "add",
      );
      const removeEvents = events.filter(
        (e: AnalyticsEvent) => e.data.action === "remove",
      );

      return {
        totalAdded: addEvents.length,
        totalRemoved: removeEvents.length,
        netFavorites: addEvents.length - removeEvents.length,
      };
    } catch (error) {
      console.error("Error getting favorite metrics:", error);
      return { totalAdded: 0, totalRemoved: 0, netFavorites: 0 };
    }
  }

  async getErrorMetrics(timeRange = "7d"): Promise<any> {
    try {
      const events = this.getEventsFromStorage("error", timeRange);
      const errorTypes: { [key: string]: number } = {};

      events.forEach((event: AnalyticsEvent) => {
        const type = event.data.errorType || "unknown";
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });

      return {
        totalErrors: events.length,
        errorTypes: Object.entries(errorTypes)
          .map(([type, count]: [string, unknown]) => ({
            type,
            count: count as number,
          }))
          .sort(
            (
              a: { type: string; count: number },
              b: { type: string; count: number },
            ) => b.count - a.count,
          ),
      };
    } catch (error) {
      console.error("Error getting error metrics:", error);
      return { totalErrors: 0, errorTypes: [] };
    }
  }

  // Helper method to get events from localStorage
  getEventsFromStorage(
    eventType: string | null = null,
    timeRange = "30d",
  ): AnalyticsEvent[] {
    try {
      const events = JSON.parse(
        localStorage.getItem("analytics_events") || "[]",
      );

      // Filter by time range
      const cutoffTime = this.getTimeRangeCutoff(timeRange);
      let filteredEvents = events.filter(
        (event: AnalyticsEvent) => event.timestamp >= cutoffTime,
      );

      // Filter by event type if specified
      if (eventType) {
        filteredEvents = filteredEvents.filter(
          (event: AnalyticsEvent) => event.type === eventType,
        );
      }

      return filteredEvents;
    } catch (error) {
      console.error("Error getting events from storage:", error);
      return [];
    }
  }

  getTimeRangeCutoff(timeRange: string): number {
    const now = Date.now();
    const ranges: { [key: string]: number } = {
      "1d": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };
    return now - (ranges[timeRange] || ranges["30d"]);
  }

  // Get overall app usage stats
  async getUsageOverview(): Promise<any> {
    try {
      const allEvents = this.getEventsFromStorage();
      const sessions = Array.from(
        new Set(allEvents.map((e: AnalyticsEvent) => e.sessionId)),
      ).length;

      const storyMetrics = await this.getStoryGenerationMetrics();
      const audioMetrics = await this.getAudioMetrics();
      const favoriteMetrics = await this.getFavoriteMetrics();
      const errorMetrics = await this.getErrorMetrics();

      return {
        totalSessions: sessions,
        totalEvents: allEvents.length,
        story: storyMetrics,
        audio: audioMetrics,
        favorites: favoriteMetrics,
        errors: errorMetrics,
      };
    } catch (error) {
      console.error("Error getting usage overview:", error);
      return null;
    }
  }

  // Clear analytics data
  clearAnalyticsData() {
    try {
      localStorage.removeItem("analytics_events");
      this.events = [];
      console.log("Analytics data cleared");
    } catch (error) {
      console.error("Error clearing analytics data:", error);
    }
  }
}

export default new AnalyticsService();

/**
 * Utility functions for date calculations used across the application
 */
export class DateUtil {
  /**
   * Get date from 24 hours ago
   */
  static getLast24Hours(): Date {
    return new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  /**
   * Get date from 7 days ago
   */
  static getLast7Days(): Date {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Get date from specified number of days ago
   */
  static getDaysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  /**
   * Get date range with start and end dates
   */
  static getDateRange(days: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /**
   * Get hourly buckets for the last 24 hours
   */
  static getHourlyBuckets(): Array<{ start: Date; end: Date }> {
    const buckets: Array<{ start: Date; end: Date }> = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(now.getTime() - (24 - i) * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      buckets.push({ start: hourStart, end: hourEnd });
    }
    
    return buckets;
  }

  /**
   * Format hour for display (HH:MM)
   */
  static formatHour(date: Date): string {
    return date.toISOString().substring(11, 16);
  }
}


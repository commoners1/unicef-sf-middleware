/**
 * Utility functions for transforming groupBy query results
 */
export class GroupByUtil {
  /**
   * Reduce groupBy results to a simple key-value record
   */
  static reduceGroupByResults<T extends { [key: string]: any }>(
    items: T[],
    groupKey: keyof T,
    countKey: string = '_count'
  ): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = item[groupKey];
      const count = item[countKey]?.[groupKey] ?? 0;
      
      if (key !== undefined && key !== null) {
        acc[String(key)] = count;
      }
      
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Transform status code groupBy results to success/error counts
   */
  static transformStatusCodeResults(
    items: Array<{ statusCode: number; _count: { statusCode: number } }>
  ): { success: number; error: number; warning: number } {
    const successCount =
      items.find((s) => s.statusCode >= 200 && s.statusCode < 300)?._count
        .statusCode || 0;
    const errorCount =
      items.find((s) => s.statusCode >= 400)?._count.statusCode || 0;

    return {
      success: successCount,
      error: errorCount,
      warning: 0,
    };
  }
}


export class CsvUtil {
  static escapeCsvField(field: any): string {
    if (field === null || field === undefined) {
      return '';
    }
    const str = String(field);
    // Only quote if field contains comma, quote, or newline
    if (
      str.includes(',') ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

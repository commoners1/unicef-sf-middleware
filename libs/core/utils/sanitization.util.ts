/**
 * Utility functions for input sanitization to prevent XSS attacks
 */
export class SanitizationUtil {
  /**
   * Sanitize string input to prevent XSS attacks
   */
  static sanitizeString(input: string | null | undefined): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove HTML tags and dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:text\/html/gi, '') // Remove data URIs with HTML
      .trim();
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize search query input
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // Remove SQL injection patterns
    const sqlPatterns = [
      /('|(\\')|(;)|(--)|(#)|(\/\*)|(\*\/)|(xp_)|(sp_)|(exec)|(execute)|(union)|(select)|(insert)|(update)|(delete)|(drop)|(create)|(alter)|(grant)|(revoke)|(truncate)|(declare)|(cast)|(convert))/gi,
    ];

    let sanitized = query;
    for (const pattern of sqlPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Also sanitize as string for XSS
    return this.sanitizeString(sanitized);
  }

  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(email: string): string | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = email.trim().toLowerCase();
    
    if (!emailRegex.test(sanitized)) {
      return null;
    }

    // Additional security: remove dangerous characters
    if (/[<>'"&]/.test(sanitized)) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate and sanitize URL
   */
  static sanitizeUrl(url: string): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = url.toLowerCase().trim();
    
    if (dangerousProtocols.some((protocol) => lowerUrl.startsWith(protocol))) {
      return null;
    }

    // Only allow http, https protocols
    if (!/^https?:\/\//i.test(url)) {
      return null;
    }

    return url.trim();
  }

  /**
   * Escape HTML entities
   */
  static escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}


/**
 * Utility functions for password validation and security
 */
export class PasswordUtil {
  /**
   * Validates password strength
   */
  static validatePasswordStrength(
    password: string,
    minLength: number = 8,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password',
      'password123',
      '12345678',
      'qwerty',
      'abc123',
      'letmein',
      'welcome',
      'admin',
    ];

    if (commonPasswords.some((weak) => password.toLowerCase().includes(weak))) {
      errors.push('Password is too common or weak');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password contains user information (email, name, etc.)
   */
  static containsUserInfo(
    password: string,
    userInfo: {
      email?: string;
      name?: string;
      company?: string;
    },
  ): boolean {
    const lowerPassword = password.toLowerCase();

    if (userInfo.email) {
      const emailParts = userInfo.email.toLowerCase().split('@')[0];
      if (lowerPassword.includes(emailParts)) {
        return true;
      }
    }

    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(' ');
      if (
        nameParts.some(
          (part) => part.length > 2 && lowerPassword.includes(part),
        )
      ) {
        return true;
      }
    }

    if (userInfo.company) {
      const companyParts = userInfo.company.toLowerCase().split(' ');
      if (
        companyParts.some(
          (part) => part.length > 2 && lowerPassword.includes(part),
        )
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + special;

    // Ensure at least one character from each category
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}

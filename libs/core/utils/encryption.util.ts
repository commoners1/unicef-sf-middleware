// libs/core/utils/encryption.util.ts
import crypto from 'node:crypto';

/**
 * Encryption utility using AES-256-GCM for secure encryption/decryption
 * GCM mode provides authenticated encryption, ensuring data integrity
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16; // 16 bytes for AES
  private static readonly SALT_LENGTH = 64; // 64 bytes for salt
  private static readonly TAG_LENGTH = 16; // 16 bytes for GCM auth tag
  private static readonly KEY_LENGTH = 32; // 32 bytes for AES-256

  /**
   * Derives a key from the encryption secret using PBKDF2
   */
  private static deriveKey(
    secret: string,
    salt: Buffer,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        secret,
        salt,
        100000, // 100k iterations for security
        32, // 32 bytes = 256 bits
        'sha256',
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        },
      );
    });
  }

  /**
   * Encrypts a plaintext string
   * @param plaintext - The text to encrypt
   * @param encryptionKey - The encryption key from environment variables
   * @returns Encrypted string in format: salt:iv:authTag:encryptedData (all base64)
   */
  static async encrypt(
    plaintext: string,
    encryptionKey: string,
  ): Promise<string> {
    if (!encryptionKey) {
      throw new Error('Encryption key is required');
    }

    // Generate random salt and IV
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    // Derive key from secret
    const key = await this.deriveKey(encryptionKey, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return format: salt:iv:authTag:encryptedData
    return [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted,
    ].join(':');
  }

  /**
   * Decrypts an encrypted string
   * @param encryptedData - The encrypted string in format: salt:iv:authTag:encryptedData
   * @param encryptionKey - The encryption key from environment variables
   * @returns Decrypted plaintext string
   */
  static async decrypt(
    encryptedData: string,
    encryptionKey: string,
  ): Promise<string> {
    if (!encryptionKey) {
      throw new Error('Encryption key is required');
    }

    try {
      // Split the encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }

      const [saltBase64, ivBase64, authTagBase64, encrypted] = parts;

      // Decode from base64
      const salt = Buffer.from(saltBase64, 'base64');
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Derive key from secret
      const key = await this.deriveKey(encryptionKey, salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // If decryption fails (wrong key, corrupted data, etc.)
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if a string is encrypted (has the expected format)
   */
  static isEncrypted(data: string): boolean {
    const parts = data.split(':');
    return parts.length === 4;
  }
}


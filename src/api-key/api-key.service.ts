// src/api-key/api-key.service.ts
import {
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infra/prisma.service';
import { EncryptionUtil } from '@core/utils/encryption.util';
import crypto from 'node:crypto';

interface ApiKeyValidationResult {
  valid: boolean;
  reason?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    company?: string | null;
    role: string;
    isActive: boolean;
  };
  apiKey?: {
    id: string;
    key: string;
    name: string;
    description?: string | null;
    isActive: boolean;
    permissions: string[];
    environment: string;
  };
}

@Injectable()
export class ApiKeyService {
  private readonly encryptionKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.encryptionKey = this.configService.getOrThrow<string>(
      'encryption.key',
      'ENCRYPTION_KEY environment variable is required',
    );
  }

  async createUser(
    email: string,
    name: string,
    password: string,
    company?: string,
  ) {
    return this.prisma.user.create({
      data: { email, name, password, company },
    });
  }

  /**
   * Creates a SHA-256 hash of the API key for fast lookup during validation
   */
  private hashKey(plainKey: string): string {
    return crypto.createHash('sha256').update(plainKey).digest('hex');
  }

  async generateApiKey(
    userId: string,
    name: string,
    description?: string,
    permissions: string[] = ['read'],
    environment: string = 'production',
  ): Promise<string> {
    // Generate the plain API key
    const plainKey = `sk_${crypto.randomBytes(32).toString('hex')}`;

    // Create hash for fast lookup (like password validation)
    const keyHash = this.hashKey(plainKey);

    // Encrypt the key for storage (for decryption when displaying to user)
    const encryptedKey = await EncryptionUtil.encrypt(
      plainKey,
      this.encryptionKey,
    );

    await this.prisma.apiKey.create({
      data: {
        key: encryptedKey, // Encrypted version (for decryption/display)
        keyHash, // Hash for fast validation lookup
        name,
        description,
        permissions,
        environment,
        userId,
      },
    });

    // Return the plain key so user can copy it immediately
    // After this, the key is only stored as hash + encrypted
    return plainKey;
  }

  async validateApiKey(
    key: string,
    environment: string,
  ): Promise<ApiKeyValidationResult> {
    // Hash the incoming key (like password validation)
    const keyHash = this.hashKey(key);

    // First, try fast lookup by hash (for new keys)
    let apiKey = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        environment,
      },
      include: { user: true },
    });

    // If not found by hash, fallback to decrypting all keys (for legacy keys without hash)
    if (!apiKey) {
      const apiKeys = await this.prisma.apiKey.findMany({
        where: {
          isActive: true,
          environment,
          keyHash: null, // Only check keys without hash (legacy keys)
        },
        include: { user: true },
      });

      // Try to find matching key by decrypting and comparing
      for (const legacyKey of apiKeys) {
        try {
          const decryptedKey = await EncryptionUtil.decrypt(
            legacyKey.key,
            this.encryptionKey,
          );
          if (decryptedKey === key) {
            apiKey = legacyKey;
            break;
          }
        } catch (error) {
          // If decryption fails, skip this key
          continue;
        }
      }
    }

    // If no key found, it's invalid
    if (!apiKey) {
      return {
        valid: false,
        reason: `Invalid API key for ${environment} environment`,
      };
    }

    // Check if user account is active
    if (!apiKey.user.isActive) {
      return {
        valid: false,
        reason: 'User account is inactive',
      };
    }

    // Key is valid! Return user and API key info
    return {
      valid: true,
      user: {
        id: apiKey.user.id,
        email: apiKey.user.email,
        name: apiKey.user.name,
        company: apiKey.user.company,
        role: apiKey.user.role,
        isActive: apiKey.user.isActive,
      },
      apiKey: {
        id: apiKey.id,
        key: key, // Return the provided key (we don't store plain keys)
        name: apiKey.name,
        description: apiKey.description,
        isActive: apiKey.isActive,
        permissions: apiKey.permissions,
        environment: apiKey.environment,
      },
    };
  }

  async revokeApiKey(key: string): Promise<void> {
    // Hash the key for fast lookup
    const keyHash = this.hashKey(key);

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { isActive: false },
    });
  }

  async getUserApiKeys(userId: string): Promise<any[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        permissions: true,
        environment: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Decrypt keys for frontend display
    const decryptedKeys = await Promise.all(
      keys.map(async (keyRecord) => {
        try {
          const decryptedKey = await EncryptionUtil.decrypt(
            keyRecord.key,
            this.encryptionKey,
          );
          return {
            ...keyRecord,
            key: decryptedKey, // Return decrypted key so user can copy it
          };
        } catch (error) {
          // If decryption fails, return masked key
          return {
            ...keyRecord,
            key: '***DECRYPTION_ERROR***',
          };
        }
      }),
    );

    return decryptedKeys;
  }

  async getUserApiKeysByEnvironment(
    userId: string,
    environment: string,
  ): Promise<any[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId, environment },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        permissions: true,
        environment: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Decrypt keys for frontend display
    const decryptedKeys = await Promise.all(
      keys.map(async (keyRecord) => {
        try {
          const decryptedKey = await EncryptionUtil.decrypt(
            keyRecord.key,
            this.encryptionKey,
          );
          return {
            ...keyRecord,
            key: decryptedKey, // Return decrypted key so user can copy it
          };
        } catch (error) {
          // If decryption fails, return masked key
          return {
            ...keyRecord,
            key: '***DECRYPTION_ERROR***',
          };
        }
      }),
    );

    return decryptedKeys;
  }

  async deleteApiKey(key: string, userId: string): Promise<void> {
    // Hash the key for fast lookup
    const keyHash = this.hashKey(key);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        userId,
      },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    await this.prisma.apiKey.delete({
      where: { id: apiKey.id },
    });
  }

  async activateApiKey(key: string, userId: string): Promise<void> {
    // Hash the key for fast lookup
    const keyHash = this.hashKey(key);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        userId,
      },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { isActive: true },
    });
  }
}

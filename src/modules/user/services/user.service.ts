import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@infra/database/prisma.service';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { UserRole } from '@modules/user/entities/user.entity';
import { PasswordUtil } from '@utils/password.util';
import { SanitizationUtil } from '@utils/sanitization.util';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    email: string,
    name: string,
    password: string,
    company?: string,
    role: UserRole = UserRole.USER,
  ) {
    // Sanitize input to prevent XSS attacks
    const sanitizedEmail = SanitizationUtil.sanitizeEmail(email);
    if (!sanitizedEmail) {
      throw new BadRequestException('Invalid email format');
    }

    const sanitizedName = SanitizationUtil.sanitizeString(name);
    if (!sanitizedName || sanitizedName.length < 2) {
      throw new BadRequestException('Invalid name format');
    }

    const sanitizedCompany = company
      ? SanitizationUtil.sanitizeString(company)
      : undefined;

    // Get min password from settings DB
    const pwSetting = await this.prisma.systemSetting.findUnique({
      where: {
        category_key: { category: 'security', key: 'passwordMinLength' },
      },
    });
    const minLength = pwSetting ? Number(pwSetting.value) : 8;

    // Check if user already exists
    const existingUser = await this.findByEmail(sanitizedEmail);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Enhanced password strength validation
    const passwordValidation = PasswordUtil.validatePasswordStrength(
      password,
      minLength,
    );
    if (!passwordValidation.valid) {
      throw new BadRequestException(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
      );
    }

    // Check if password contains user information
    if (
      PasswordUtil.containsUserInfo(password, {
        email: sanitizedEmail,
        name: sanitizedName,
        company: sanitizedCompany,
      })
    ) {
      throw new BadRequestException(
        'Password cannot contain your name, email, or company information',
      );
    }

    // Use bcrypt rounds of 12 for better security (was 10)
    const hashedPassword = await bcrypt.hash(password, 12);
    return this.prisma.user.create({
      data: {
        email: sanitizedEmail,
        name: sanitizedName,
        password: hashedPassword,
        company: sanitizedCompany,
        role,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  // Role management methods
  async updateUserRole(userId: string, newRole: UserRole, requesterId: string) {
    // Check if requester has permission to update roles
    const requester = await this.findById(requesterId);
    if (!requester) {
      throw new NotFoundException('Requester not found');
    }

    // Only ADMIN and SUPER_ADMIN can update roles
    if (requester.role !== 'ADMIN' && requester.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Insufficient permissions to update user roles',
      );
    }

    // SUPER_ADMIN can update any role, ADMIN can only update to USER
    if (requester.role === 'ADMIN' && newRole !== 'USER') {
      throw new ForbiddenException('ADMIN can only assign USER role');
    }

    // Check if target user exists
    const targetUser = await this.findById(userId);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-demotion from SUPER_ADMIN
    if (
      userId === requesterId &&
      targetUser.role === 'SUPER_ADMIN' &&
      newRole !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException('Cannot demote yourself from SUPER_ADMIN');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async getAllUsers(requesterId: string, page: number = 1, limit: number = 50) {
    const requester = await this.findById(requesterId);
    if (!requester) {
      throw new NotFoundException('Requester not found');
    }

    // Only ADMIN and SUPER_ADMIN can view all users
    if (requester.role !== 'ADMIN' && requester.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Insufficient permissions to view all users',
      );
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: skip,
        take: limit,
        include: {
          apiKeys: {
            select: {
              id: true,
              isActive: true,
            },
          },
          auditLogs: {
            where: {
              action: 'LOGIN',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    // Transform users to include computed fields
    const transformedUsers = users.map((user: any) => ({
      ...user,
      apiKeyCount: user.apiKeys.filter((key: any) => key.isActive).length,
      lastLogin: user.auditLogs.length > 0 ? user.auditLogs[0].createdAt : null,
      // Remove the nested objects
      apiKeys: undefined,
      auditLogs: undefined,
    }));

    return {
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAllUsersCount(requesterId: string) {
    const requester = await this.findById(requesterId);
    if (!requester) {
      throw new NotFoundException('Requester not found');
    }

    if (requester.role !== 'ADMIN' && requester.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Insufficient permissions to view all users count',
      );
    }

    const count = await this.prisma.user.count({
      where: {
        isActive: true,
      },
    });
    return { count };
  }

  async getUserById(userId: string, requesterId: string) {
    const requester = await this.findById(requesterId);
    if (!requester) {
      throw new NotFoundException('Requester not found');
    }

    // Users can view their own profile, ADMIN and SUPER_ADMIN can view any user
    if (
      userId !== requesterId &&
      requester.role !== 'ADMIN' &&
      requester.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to view this user',
      );
    }

    return this.findById(userId);
  }

  // New method to create user with API key
  async createUserWithApiKey(
    email: string,
    name: string,
    password: string,
    company?: string,
    apiKeyName?: string,
    permissions: string[] = ['read'],
    role: UserRole = UserRole.USER,
  ) {
    const user = await this.create(email, name, password, company, role);

    // Generate API key immediately
    const apiKeyService = new ApiKeyService(this.prisma, this.configService);
    const apiKey = await apiKeyService.generateApiKey(
      user.id,
      apiKeyName || 'Default API Key',
      'Auto-generated API key',
      permissions,
    );

    return { user, apiKey };
  }

  public getPrisma() {
    return this.prisma;
  }
}

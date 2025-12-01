import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
  Post,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import {
  Cache,
  CacheInterceptor,
  InvalidateCache,
  InvalidateCacheInterceptor,
} from '@infra/cache';
import { JwtAuthGuard } from '@modules/auth/jwt/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserService } from '@modules/user/services/user.service';
import { UpdateRoleDto } from '@modules/user/dtos/update-role.dto';
import { UserRole } from '@modules/user/entities/user.entity';
import type { RequestWithUser } from '@localTypes/request.types';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @Cache({
    module: 'user',
    endpoint: 'profile',
    includeUserId: true,
    ttl: 5 * 60 * 1000,
  })
  @UseInterceptors(CacheInterceptor)
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }

  @Put('profile')
  @InvalidateCache({ module: 'user', endpoint: 'profile', includeUserId: true })
  @UseInterceptors(InvalidateCacheInterceptor)
  updateProfile(
    @Request() req: RequestWithUser,
    @Body() updateData: Record<string, unknown>,
  ) {
    return this.userService.updateProfile(req.user.id, updateData);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Cache({
    module: 'user',
    endpoint: 'all',
    includeQuery: true,
    ttl: 60 * 1000,
  })
  @UseInterceptors(CacheInterceptor)
  async getAllUsers(
    @Request() req: RequestWithUser,
    @Query('page', new ParseIntPipe()) page: number = 1,
    @Query('limit', new ParseIntPipe()) limit: number = 50,
  ) {
    return this.userService.getAllUsers(
      req.user.id,
      Number(page),
      Number(limit),
    );
  }

  @Get('all/count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Cache({
    module: 'user',
    endpoint: 'allCount',
    includeQuery: true,
    ttl: 60 * 1000,
  })
  @UseInterceptors(CacheInterceptor)
  async getAllUsersCount(@Request() req: RequestWithUser) {
    return this.userService.getAllUsersCount(req.user.id);
  }

  @Get(':id')
  @Cache({ module: 'user', endpoint: 'byId', ttl: 2 * 60 * 1000 })
  @UseInterceptors(CacheInterceptor)
  async getUserById(
    @Request() req: RequestWithUser,
    @Param('id') userId: string,
  ) {
    return this.userService.getUserById(userId, req.user.id);
  }

  @Post(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateUserRole(
    @Request() req: RequestWithUser,
    @Param('id') userId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.userService.updateUserRole(
      userId,
      updateRoleDto.role,
      req.user.id,
    );
  }

  @Get('roles/available')
  @Cache({
    module: 'user',
    endpoint: 'roles:available',
    ttl: 24 * 60 * 60 * 1000,
  })
  @UseInterceptors(CacheInterceptor)
  getAvailableRoles() {
    return {
      roles: Object.values(UserRole),
      descriptions: {
        [UserRole.USER]: 'Standard user with basic access',
        [UserRole.ADMIN]: 'Administrator with user management capabilities',
        [UserRole.SUPER_ADMIN]: 'Super administrator with full system access',
      },
    };
  }
}

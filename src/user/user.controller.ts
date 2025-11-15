// src/user/user.controller.ts
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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserService } from './user.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserRole } from './entities/user.entity';
import type { RequestWithUser } from '../types/request.types';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }

  @Put('profile')
  updateProfile(
    @Request() req: RequestWithUser,
    @Body() updateData: Record<string, unknown>,
  ) {
    return this.userService.updateProfile(req.user.id, updateData);
  }

  // Admin endpoints for user management
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAllUsers(
    @Request() req: RequestWithUser,
    @Query('page', new ParseIntPipe()) page: number = 1,
    @Query('limit', new ParseIntPipe()) limit: number = 50,
  ) {
    return this.userService.getAllUsers(req.user.id, Number(page), Number(limit));
  }

  @Get(':id')
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

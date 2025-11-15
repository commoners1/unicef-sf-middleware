// src/types/request.types.ts
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  apiKey: ApiKeyInfo;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

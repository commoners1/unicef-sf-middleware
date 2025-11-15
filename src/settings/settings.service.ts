import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@infra/prisma.service';

export type SettingsObject = Record<string, Record<string, any>>;

export async function getLiveSettings(prisma: PrismaService) {
  const records = await prisma.systemSetting.findMany({
    where: { category: { in: ['general', 'security'] } },
  });
  const grouped: { general: Record<string, any>; security: Record<string, any> } = { general: {}, security: {} };
  for (const s of records) {
    if (s.category === 'general') grouped.general[s.key] = (s.valueType === 'boolean' ? s.value === 'true' : s.valueType === 'number' ? Number(s.value) : s.valueType === 'json' ? JSON.parse(s.value) : s.value);
    if (s.category === 'security') grouped.security[s.key] = (s.valueType === 'boolean' ? s.value === 'true' : s.valueType === 'number' ? Number(s.value) : s.valueType === 'json' ? JSON.parse(s.value) : s.value);
  }
  return grouped;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSettings(): Promise<SettingsObject> {
    const records = await this.prisma.systemSetting.findMany();
    const grouped: SettingsObject = {};
    for (const s of records) {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = this.parseValue(s.value, s.valueType);
    }
    return grouped;
  }

  async updateSettings(patch: SettingsObject, userRole?: string): Promise<SettingsObject> {
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only admin can update settings');
    }
    for (const [category, keys] of Object.entries(patch)) {
      for (const [key, value] of Object.entries(keys)) {
        const detectedType = this.detectType(value);
        await this.prisma.systemSetting.upsert({
          where: { category_key: { category, key } },
          update: { value: this.serializeValue(value, detectedType), valueType: detectedType },
          create: { category, key, value: this.serializeValue(value, detectedType), valueType: detectedType },
        });
      }
    }
    return this.getAllSettings();
  }

  private detectType(value: any): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value) || typeof value === 'object') return 'json';
    return 'string';
  }
  private parseValue(val: string, type: string) {
    switch(type) {
      case 'boolean': return val === 'true';
      case 'number': return Number(val);
      case 'json':
        try { return JSON.parse(val); } catch { return null; }
      default: return val;
    }
  }
  private serializeValue(val: any, type: string) {
    if (type === 'json') return JSON.stringify(val);
    return String(val);
  }
}

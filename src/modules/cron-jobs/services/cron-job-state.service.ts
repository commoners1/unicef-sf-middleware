import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma.service';

@Injectable()
export class CronJobStateService implements OnModuleInit {
  private readonly logger = new Logger(CronJobStateService.name);
  // Store enabled/disabled state for each job type
  private jobStates = new Map<string, boolean>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Load states from database on startup
    await this.loadStatesFromDatabase();
  }

  private async loadStatesFromDatabase() {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: {
          category: 'cronJobs',
        },
      });

      // If no settings exist, create default ones
      if (settings.length === 0) {
        await this.initializeDefaultSettings();
        return;
      }

      // Load settings into memory
      for (const setting of settings) {
        const enabled =
          setting.valueType === 'boolean' ? setting.value === 'true' : true; // Default to enabled if parsing fails
        this.jobStates.set(setting.key, enabled);
      }

      this.logger.log(
        `Loaded ${settings.length} cron job states from database`,
      );
    } catch (error) {
      this.logger.error('Failed to load cron job states from database:', error);
      // Fall back to defaults if database fails
      this.initializeDefaultStates();
    }
  }

  private async initializeDefaultSettings() {
    const defaultStates = [
      { key: 'pledge', enabled: true },
      { key: 'oneoff', enabled: true },
      { key: 'recurring', enabled: true },
      { key: 'hourly', enabled: true },
    ];

    for (const { key, enabled } of defaultStates) {
      this.jobStates.set(key, enabled);

      try {
        await this.prisma.systemSetting.create({
          data: {
            category: 'cronJobs',
            key,
            value: String(enabled),
            valueType: 'boolean',
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to create default setting for ${key}:`,
          error,
        );
      }
    }

    this.logger.log('Initialized default cron job settings in database');
  }

  private initializeDefaultStates() {
    const defaultStates: Array<[string, boolean]> = [
      ['pledge', true],
      ['oneoff', true],
      ['recurring', true],
      ['hourly', true],
    ];

    this.jobStates = new Map<string, boolean>(defaultStates);
    this.logger.warn('Using in-memory fallback states (database unavailable)');
  }

  isJobEnabled(jobType: string): boolean {
    return this.jobStates.get(jobType) ?? true;
  }

  async setJobEnabled(jobType: string, enabled: boolean): Promise<void> {
    // Update in-memory state
    this.jobStates.set(jobType, enabled);

    // Persist to database
    try {
      await this.prisma.systemSetting.upsert({
        where: {
          category_key: {
            category: 'cronJobs',
            key: jobType,
          },
        },
        update: {
          value: String(enabled),
          updatedAt: new Date(),
        },
        create: {
          category: 'cronJobs',
          key: jobType,
          value: String(enabled),
          valueType: 'boolean',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist state for ${jobType}:`, error);
      // Continue even if database fails - at least memory state is updated
    }
  }

  getAllStates(): Record<string, boolean> {
    const states: Record<string, boolean> = {};
    for (const [type, enabled] of this.jobStates.entries()) {
      states[type] = enabled;
    }
    return states;
  }

  getJobState(jobType: string): boolean {
    return this.jobStates.get(jobType) ?? true;
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '@modules/settings/services/settings.service';
import { PrismaService } from '@infra/database/prisma.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockPrisma = {
    setting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllSettings', () => {
    it('should return all settings', async () => {
      const mockSettings = [
        {
          key: 'general.maintenanceMode',
          value: false,
        },
        {
          key: 'api.rateLimit',
          value: 1000,
        },
      ];

      mockPrisma.setting.findMany.mockResolvedValue(mockSettings);

      const result = await service.getAllSettings();

      expect(result).toBeDefined();
      expect(mockPrisma.setting.findMany).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should update settings', async () => {
      const updateDto = {
        general: {
          maintenanceMode: true,
        },
      };

      mockPrisma.setting.upsert.mockResolvedValue({
        key: 'general.maintenanceMode',
        value: true,
      });

      const result = await service.updateSettings(updateDto, 'ADMIN');

      expect(result).toBeDefined();
      expect(mockPrisma.setting.upsert).toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from '@modules/settings/controllers/settings.controller';
import { SettingsService } from '@modules/settings/services/settings.service';
import { JwtAuthGuard } from '@modules/auth/jwt/jwt-auth.guard';

describe('SettingsController', () => {
  let controller: SettingsController;

  const mockSettingsService = {
    getAllSettings: jest.fn(),
    updateSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('get', () => {
    it('should return all settings', async () => {
      const mockSettings = {
        general: {
          maintenanceMode: false,
        },
        api: {
          rateLimit: 1000,
        },
      };

      mockSettingsService.getAllSettings.mockResolvedValue(mockSettings);

      const result = await controller.get();

      expect(result).toEqual(mockSettings);
      expect(mockSettingsService.getAllSettings).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update settings', async () => {
      const updateDto = {
        general: {
          maintenanceMode: true,
        },
      };

      const mockUpdatedSettings = {
        general: {
          maintenanceMode: true,
        },
      };

      mockSettingsService.updateSettings.mockResolvedValue(mockUpdatedSettings);

      const result = await controller.update(updateDto, {
        user: { role: 'ADMIN' },
      } as any);

      expect(result).toEqual(mockUpdatedSettings);
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith(
        updateDto,
        'ADMIN',
      );
    });
  });
});

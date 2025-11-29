import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const mockReportsService = {
    getAllReports: jest.fn(),
    getReportById: jest.fn(),
    generateReport: jest.fn(),
    getReportFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllReports', () => {
    it('should return all reports', async () => {
      const mockReports = [
        { id: '1', name: 'Report 1' },
        { id: '2', name: 'Report 2' },
      ];

      mockReportsService.getAllReports.mockResolvedValue(mockReports);

      const result = await controller.getAllReports();

      expect(result).toEqual(mockReports);
      expect(mockReportsService.getAllReports).toHaveBeenCalled();
    });
  });

  describe('generate', () => {
    it('should generate a report', async () => {
      const mockReport = {
        id: '1',
        name: 'Test Report',
        status: 'generating',
      };

      mockReportsService.generateReport.mockResolvedValue(mockReport);

      const result = await controller.generate('1');

      expect(result).toEqual(mockReport);
      expect(mockReportsService.generateReport).toHaveBeenCalledWith('1');
    });
  });

  describe('download', () => {
    it('should download a report file', async () => {
      const mockFile = {
        filePath: '/path/to/report.pdf',
        fileName: 'report.pdf',
      };

      const mockResponse = {
        download: jest.fn(),
      };

      mockReportsService.getReportFile.mockResolvedValue(mockFile);

      await controller.download('1', mockResponse as any);

      expect(mockResponse.download).toHaveBeenCalledWith(
        mockFile.filePath,
        mockFile.fileName,
      );
    });
  });
});


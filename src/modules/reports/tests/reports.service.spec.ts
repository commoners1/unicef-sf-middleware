import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@infra/database/prisma.service';
import { ReportsService } from '@modules/reports/services/reports.service';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockPrisma = {
    report: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllReports', () => {
    it('should return all reports', async () => {
      const mockReports = [
        { id: '1', name: 'Report 1' },
        { id: '2', name: 'Report 2' },
      ];

      mockPrisma.report.findMany.mockResolvedValue(mockReports);

      const result = await service.getAllReports();

      expect(result).toEqual(mockReports);
      expect(mockPrisma.report.findMany).toHaveBeenCalled();
    });
  });

  describe('getReportById', () => {
    it('should return a report by id', async () => {
      const mockReport = { id: '1', name: 'Test Report' };
      mockPrisma.report.findUnique.mockResolvedValue(mockReport);

      const result = await service.getReportById('1');

      expect(result).toEqual(mockReport);
      expect(mockPrisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if report not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      await expect(service.getReportById('1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateReport', () => {
    it('should generate a report', async () => {
      const mockReport = {
        id: '1',
        name: 'Test Report',
        status: 'ready',
      };

      mockPrisma.report.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.report.update.mockResolvedValue(mockReport);

      const result = await service.generateReport('1');

      expect(result).toEqual(mockReport);
      expect(mockPrisma.report.update).toHaveBeenCalled();
    });
  });
});

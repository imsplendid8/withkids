import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CrawlMonitoringService } from './crawl-monitoring.service';
import { CrawlHistory, CrawlStatus } from './entities/crawl-history.entity';
import { AdapterState } from './entities/adapter-state.entity';

describe('CrawlMonitoringService', () => {
  let service: CrawlMonitoringService;
  let mockCrawlHistoryRepository: any;
  let mockAdapterStateRepository: any;

  beforeEach(async () => {
    mockCrawlHistoryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockAdapterStateRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrawlMonitoringService,
        {
          provide: getRepositoryToken(CrawlHistory),
          useValue: mockCrawlHistoryRepository,
        },
        {
          provide: getRepositoryToken(AdapterState),
          useValue: mockAdapterStateRepository,
        },
      ],
    }).compile();

    service = module.get<CrawlMonitoringService>(CrawlMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startCrawl', () => {
    it('should create a new crawl record with RUNNING status', async () => {
      const crawlData = {
        id: 'crawl-1',
        adapterName: 'mock-adapter',
        crawlStartedAt: expect.any(Date),
        status: CrawlStatus.RUNNING,
      };

      mockCrawlHistoryRepository.create.mockReturnValue(crawlData);
      mockCrawlHistoryRepository.save.mockResolvedValue(crawlData);

      const result = await service.startCrawl('mock-adapter');

      expect(result.status).toBe(CrawlStatus.RUNNING);
      expect(result.adapterName).toBe('mock-adapter');
      expect(mockCrawlHistoryRepository.save).toHaveBeenCalled();
    });
  });

  describe('completeCrawl', () => {
    const crawlRecord = () => ({
      id: 'crawl-1',
      adapterName: 'test-adapter',
      crawlStartedAt: new Date(),
      crawlCompletedAt: null,
      status: CrawlStatus.RUNNING,
      programsFound: 0,
    });

    beforeEach(() => {
      mockCrawlHistoryRepository.save.mockImplementation(async (entity: unknown) => entity);
      mockAdapterStateRepository.save.mockImplementation(async (entity: unknown) => entity);
      // TypeORM의 create()처럼 컬럼 기본값 없이 엔티티 인스턴스를 만든다.
      mockAdapterStateRepository.create.mockImplementation((data: Partial<AdapterState>) =>
        Object.assign(new AdapterState(), data),
      );
    });

    it('should update crawl record with completion status and stats', async () => {
      mockCrawlHistoryRepository.findOne.mockResolvedValue(crawlRecord());
      mockAdapterStateRepository.findOne.mockResolvedValue(null);

      const result = await service.completeCrawl('crawl-1', CrawlStatus.SUCCESS, {
        programsFound: 10,
        programsCreated: 5,
        changesDetected: 3,
      });

      expect(result.status).toBe(CrawlStatus.SUCCESS);
      expect(result.crawlCompletedAt).toBeInstanceOf(Date);
      expect(result.programsFound).toBe(10);
      expect(result.programsCreated).toBe(5);
      expect(result.programsUpdated).toBe(0);
      expect(result.errorMessage).toBeNull();
    });

    it('should reset consecutive failures on success', async () => {
      const state = Object.assign(new AdapterState(), {
        adapterName: 'test-adapter',
        consecutiveFailures: 3,
      });
      mockCrawlHistoryRepository.findOne.mockResolvedValue(crawlRecord());
      mockAdapterStateRepository.findOne.mockResolvedValue(state);

      await service.completeCrawl('crawl-1', CrawlStatus.SUCCESS, {});

      const saved = mockAdapterStateRepository.save.mock.calls[0][0] as AdapterState;
      expect(saved.consecutiveFailures).toBe(0);
      expect(saved.lastSuccessfulCrawlAt).toBeInstanceOf(Date);
    });

    it('should count the first failure of a new adapter as 1', async () => {
      mockCrawlHistoryRepository.findOne.mockResolvedValue(crawlRecord());
      mockAdapterStateRepository.findOne.mockResolvedValue(null);

      await service.completeCrawl('crawl-1', CrawlStatus.FAILURE, { errorMessage: 'timeout' });

      const saved = mockAdapterStateRepository.save.mock.calls[0][0] as AdapterState;
      expect(saved.consecutiveFailures).toBe(1);
      expect(saved.isDisabled).toBeFalsy();
    });

    it('should disable the adapter after 5 consecutive failures', async () => {
      const state = Object.assign(new AdapterState(), {
        adapterName: 'test-adapter',
        consecutiveFailures: 4,
        isDisabled: false,
      });
      mockCrawlHistoryRepository.findOne.mockResolvedValue(crawlRecord());
      mockAdapterStateRepository.findOne.mockResolvedValue(state);

      await service.completeCrawl('crawl-1', CrawlStatus.FAILURE, { errorMessage: 'timeout' });

      const saved = mockAdapterStateRepository.save.mock.calls[0][0] as AdapterState;
      expect(saved.consecutiveFailures).toBe(5);
      expect(saved.isDisabled).toBe(true);
    });

    it('should throw when the crawl record does not exist', async () => {
      mockCrawlHistoryRepository.findOne.mockResolvedValue(null);

      await expect(service.completeCrawl('missing', CrawlStatus.SUCCESS, {})).rejects.toThrow(
        'Crawl record not found',
      );
    });
  });

  describe('getCrawlHistory', () => {
    it('should retrieve crawl history for an adapter', async () => {
      const mockHistory = [
        {
          id: 'crawl-1',
          adapterName: 'test-adapter',
          status: CrawlStatus.SUCCESS,
        },
      ];

      mockCrawlHistoryRepository.find.mockResolvedValue(mockHistory);

      const result = await service.getCrawlHistory('test-adapter', 100);

      expect(result).toEqual(mockHistory);
      expect(mockCrawlHistoryRepository.find).toHaveBeenCalledWith({
        where: { adapterName: 'test-adapter' },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });
  });

  describe('getFailedCrawls', () => {
    it('실패와 부분 실패를 지정 시간 이후로 찾는다', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-29T12:00:00Z'));
      mockCrawlHistoryRepository.find.mockResolvedValue([]);

      await service.getFailedCrawls(6);

      const { where, order } = mockCrawlHistoryRepository.find.mock.calls[0][0];
      expect(where.status.type).toBe('in');
      expect(where.status.value).toEqual([CrawlStatus.FAILURE, CrawlStatus.PARTIAL_FAILURE]);
      expect(where.createdAt.type).toBe('moreThan');
      expect(where.createdAt.value).toEqual(new Date('2026-09-29T06:00:00Z'));
      expect(order).toEqual({ createdAt: 'DESC' });
      jest.useRealTimers();
    });
  });

  describe('getAdapterState', () => {
    it('should retrieve adapter state', async () => {
      const mockState = {
        id: 'state-1',
        adapterName: 'test-adapter',
        isDisabled: false,
        consecutiveFailures: 0,
      };

      mockAdapterStateRepository.findOne.mockResolvedValue(mockState);

      const result = await service.getAdapterState('test-adapter');

      expect(result).toEqual(mockState);
      expect(result?.isDisabled).toBe(false);
    });
  });

  describe('resetAdapterState', () => {
    it('should reset disabled adapter back to healthy state', async () => {
      const disabledAdapter = {
        id: 'state-1',
        adapterName: 'test-adapter',
        isDisabled: true,
        consecutiveFailures: 5,
        disableReason: 'Disabled after 5 consecutive failures',
      };

      mockAdapterStateRepository.findOne.mockResolvedValue(disabledAdapter);
      mockAdapterStateRepository.save.mockResolvedValue({
        ...disabledAdapter,
        isDisabled: false,
        consecutiveFailures: 0,
        disableReason: null,
      });

      const result = await service.resetAdapterState('test-adapter');

      expect(result.isDisabled).toBe(false);
      expect(result.consecutiveFailures).toBe(0);
    });

    it('should throw error if adapter state not found', async () => {
      mockAdapterStateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetAdapterState('nonexistent-adapter'),
      ).rejects.toThrow('Adapter state not found');
    });
  });
});

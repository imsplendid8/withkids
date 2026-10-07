import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingPatternsService } from './booking-patterns.service';
import { BookingPattern, PatternType } from './entities/booking-pattern.entity';
import { PatternEvidence } from './entities/pattern-evidence.entity';
import { BookingPrediction } from './entities/booking-prediction.entity';

describe('BookingPatternsService', () => {
  let service: BookingPatternsService;
  let mockPatternRepository: any;
  let mockEvidenceRepository: any;
  let mockPredictionRepository: any;

  beforeEach(async () => {
    mockPatternRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockEvidenceRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    mockPredictionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingPatternsService,
        {
          provide: getRepositoryToken(BookingPattern),
          useValue: mockPatternRepository,
        },
        {
          provide: getRepositoryToken(PatternEvidence),
          useValue: mockEvidenceRepository,
        },
        {
          provide: getRepositoryToken(BookingPrediction),
          useValue: mockPredictionRepository,
        },
      ],
    }).compile();

    service = module.get<BookingPatternsService>(BookingPatternsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPattern', () => {
    it('should create a new booking pattern', async () => {
      const patternData = {
        id: 'pattern-1',
        experienceId: 'exp-1',
        patternType: PatternType.FIXED_DAY_OF_MONTH,
        patternRule: 'FIXED_DAY_OF_MONTH:3',
        timeOfDay: '10:00',
        confidence: 0.8,
        evidenceCount: 0,
      };

      mockPatternRepository.create.mockReturnValue(patternData);
      mockPatternRepository.save.mockResolvedValue(patternData);

      const result = await service.createPattern(
        patternData.experienceId,
        patternData.patternType,
        patternData.patternRule,
        patternData.timeOfDay,
        patternData.confidence,
      );

      expect(result.id).toBe('pattern-1');
      expect(result.patternType).toBe(PatternType.FIXED_DAY_OF_MONTH);
    });
  });

  describe('calculateAccuracy', () => {
    it('should calculate pattern accuracy from evidence', async () => {
      const mockEvidence = [
        { id: '1', matched: true },
        { id: '2', matched: true },
        { id: '3', matched: false },
      ];

      mockEvidenceRepository.find.mockResolvedValue(mockEvidence);

      const result = await service.calculateAccuracy('pattern-1');

      expect(result.accuracy).toBe(66.66666666666666);
      expect(result.totalMatches).toBe(2);
      expect(result.totalTests).toBe(3);
    });

    it('should return 0 accuracy with no evidence', async () => {
      mockEvidenceRepository.find.mockResolvedValue([]);

      const result = await service.calculateAccuracy('pattern-1');

      expect(result.accuracy).toBe(0);
      expect(result.totalTests).toBe(0);
    });
  });

  describe('getPatternsByExperience', () => {
    it('should retrieve patterns for an experience ordered by confidence', async () => {
      const mockPatterns = [
        {
          id: 'p1',
          experienceId: 'exp-1',
          confidence: 0.9,
        },
        {
          id: 'p2',
          experienceId: 'exp-1',
          confidence: 0.7,
        },
      ];

      mockPatternRepository.find.mockResolvedValue(mockPatterns);

      const result = await service.getPatternsByExperience('exp-1');

      expect(result).toEqual(mockPatterns);
      expect(mockPatternRepository.find).toHaveBeenCalledWith({
        where: { experienceId: 'exp-1' },
        order: { confidence: 'DESC' },
      });
    });
  });

  describe('createPrediction', () => {
    it('should create a booking prediction', async () => {
      const predictionData = {
        id: 'pred-1',
        experienceId: 'exp-1',
        predictedBookingOpenAt: new Date('2024-01-15T10:00:00'),
        confidence: 0.85,
      };

      mockPredictionRepository.create.mockReturnValue(predictionData);
      mockPredictionRepository.save.mockResolvedValue(predictionData);

      const result = await service.createPrediction(
        predictionData.experienceId,
        predictionData.predictedBookingOpenAt,
        predictionData.confidence,
      );

      expect(result.id).toBe('pred-1');
      expect(result.confidence).toBe(0.85);
    });
  });
  describe('getHighConfidencePatterns', () => {
    it('기준 이상인 패턴을 신뢰도 높은 순으로 찾는다', async () => {
      mockPatternRepository.find.mockResolvedValue([]);

      await service.getHighConfidencePatterns(0.7);

      const { where, order } = mockPatternRepository.find.mock.calls[0][0];
      // 전에는 confidence === 0.7 인 것만 찾았다.
      expect(where.confidence.type).toBe('moreThanOrEqual');
      expect(where.confidence.value).toBe(0.7);
      expect(order).toEqual({ confidence: 'DESC' });
    });
  });

  describe('getUpcomingPredictions', () => {
    it('지금부터 지정한 시간 안에 열릴 예측만 찾는다', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-29T00:00:00Z'));
      mockPredictionRepository.find.mockResolvedValue([]);

      await service.getUpcomingPredictions(48);

      const { where } = mockPredictionRepository.find.mock.calls[0][0];
      // 전에는 predictedBookingOpenAt === 지금 인 것만 찾아 항상 비어 있었다.
      expect(where.predictedBookingOpenAt.type).toBe('between');
      expect(where.predictedBookingOpenAt.value).toEqual([
        new Date('2026-09-29T00:00:00Z'),
        new Date('2026-10-01T00:00:00Z'),
      ]);
      jest.useRealTimers();
    });
  });

  describe('prediction query builders', () => {
    // 쿼리빌더에는 컬럼명(snake_case)이 아니라 엔티티 속성명을 써야 한다.
    const mockQueryBuilder = () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockPredictionRepository.createQueryBuilder = jest.fn().mockReturnValue(qb);
      return qb;
    };
    const allClauses = (qb: any) =>
      [qb.where, qb.andWhere, qb.orderBy, qb.addOrderBy]
        .flatMap((fn) => fn.mock.calls.map((call: unknown[]) => String(call[0])))
        .join(' ');

    it('getPredictionsForExperience는 속성명으로 조회한다', async () => {
      const qb = mockQueryBuilder();

      await service.getPredictionsForExperience('exp-1');

      expect(qb.where).toHaveBeenCalledWith('p.experienceId = :experienceId', { experienceId: 'exp-1' });
      expect(allClauses(qb)).toContain('p.expiresAt');
      expect(allClauses(qb)).not.toMatch(/p\.[a-z]+_[a-z]/);
    });

    it('만료 포함 조회에는 만료 조건을 붙이지 않는다', async () => {
      const qb = mockQueryBuilder();

      await service.getPredictionsForExperience('exp-1', true);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('getHighConfidencePredictions는 속성명으로 조회한다', async () => {
      const qb = mockQueryBuilder();

      await service.getHighConfidencePredictions(0.8, 10);

      expect(qb.where).toHaveBeenCalledWith('p.confidence >= :threshold', { threshold: 0.8 });
      expect(allClauses(qb)).toContain('p.verifiedAt IS NULL');
      expect(allClauses(qb)).not.toMatch(/p\.[a-z]+_[a-z]/);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });
});

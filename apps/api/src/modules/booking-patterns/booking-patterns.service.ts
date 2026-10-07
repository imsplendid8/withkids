import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { BookingPattern, PatternType } from './entities/booking-pattern.entity';
import { PatternEvidence } from './entities/pattern-evidence.entity';
import { BookingPrediction } from './entities/booking-prediction.entity';

@Injectable()
export class BookingPatternsService {
  constructor(
    @InjectRepository(BookingPattern)
    private bookingPatternsRepository: Repository<BookingPattern>,
    @InjectRepository(PatternEvidence)
    private patternEvidenceRepository: Repository<PatternEvidence>,
    @InjectRepository(BookingPrediction)
    private bookingPredictionsRepository: Repository<BookingPrediction>,
  ) {}

  async createPattern(
    experienceId: string,
    patternType: PatternType,
    patternRule: string,
    timeOfDay?: string,
    confidence: number = 0.5,
  ): Promise<BookingPattern> {
    const pattern = this.bookingPatternsRepository.create({
      experienceId,
      patternType,
      patternRule,
      timeOfDay,
      confidence,
      evidenceCount: 0,
    });

    return this.bookingPatternsRepository.save(pattern);
  }

  async getPatternsByExperience(
    experienceId: string,
  ): Promise<BookingPattern[]> {
    return this.bookingPatternsRepository.find({
      where: { experienceId },
      order: { confidence: 'DESC' },
    });
  }

  async updatePattern(
    patternId: string,
    updates: Partial<BookingPattern>,
  ): Promise<BookingPattern> {
    await this.bookingPatternsRepository.update(patternId, {
      ...updates,
      updatedAt: new Date(),
    });

    const pattern = await this.bookingPatternsRepository.findOne({
      where: { id: patternId },
    });

    if (!pattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    return pattern;
  }

  async recordEvidence(
    patternId: string,
    experienceRunId: string,
    predictedTime?: Date,
    actualTime?: Date,
    matched?: boolean,
  ): Promise<PatternEvidence> {
    const evidence = this.patternEvidenceRepository.create({
      bookingPatternId: patternId,
      experienceRunId,
      predictedBookingOpenAt: predictedTime,
      actualBookingOpenAt: actualTime,
      matched,
    });

    return this.patternEvidenceRepository.save(evidence);
  }

  async getEvidenceForPattern(
    patternId: string,
    limit: number = 50,
  ): Promise<PatternEvidence[]> {
    return this.patternEvidenceRepository.find({
      where: { bookingPatternId: patternId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async calculateAccuracy(patternId: string): Promise<{
    accuracy: number;
    totalMatches: number;
    totalTests: number;
  }> {
    const evidence = await this.patternEvidenceRepository.find({
      where: { bookingPatternId: patternId },
    });

    const testedEvidence = evidence.filter((e) => e.matched !== null);
    const matches = testedEvidence.filter((e) => e.matched === true).length;

    return {
      accuracy:
        testedEvidence.length > 0
          ? (matches / testedEvidence.length) * 100
          : 0,
      totalMatches: matches,
      totalTests: testedEvidence.length,
    };
  }

  async getHighConfidencePatterns(threshold: number = 0.7): Promise<BookingPattern[]> {
    return this.bookingPatternsRepository.find({
      where: { confidence: MoreThanOrEqual(threshold) },
      order: { confidence: 'DESC' },
    });
  }

  async analyzeBookingTimes(
    experienceId: string,
  ): Promise<Map<PatternType, number>> {
    const patterns = await this.getPatternsByExperience(experienceId);
    const result = new Map<PatternType, number>();

    for (const pattern of patterns) {
      const accuracy = await this.calculateAccuracy(pattern.id);
      if (accuracy.accuracy > 0) {
        result.set(pattern.patternType, accuracy.accuracy);
      }
    }

    return result;
  }

  async createPrediction(
    experienceId: string,
    predictedBookingOpenAt: Date,
    confidence: number,
    patternId?: string,
    predictedExperienceDate?: string,
    expiresAt?: Date,
  ): Promise<BookingPrediction> {
    const prediction = this.bookingPredictionsRepository.create({
      experienceId,
      predictedBookingOpenAt,
      confidence,
      patternId,
      predictedExperienceDate,
      expiresAt,
    });

    return this.bookingPredictionsRepository.save(prediction);
  }

  async getPredictionsForExperience(
    experienceId: string,
    includeExpired: boolean = false,
  ): Promise<BookingPrediction[]> {
    const now = new Date();
    const qb = this.bookingPredictionsRepository
      .createQueryBuilder('p')
      .where('p.experienceId = :experienceId', { experienceId });

    if (!includeExpired) {
      qb.andWhere('(p.expiresAt IS NULL OR p.expiresAt > :now)', { now });
    }

    return qb.orderBy('p.predictedBookingOpenAt', 'ASC').getMany();
  }

  async getUpcomingPredictions(
    hoursAhead: number = 168,
  ): Promise<BookingPrediction[]> {
    const now = new Date();
    const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return this.bookingPredictionsRepository.find({
      where: { predictedBookingOpenAt: Between(now, future) },
      order: { predictedBookingOpenAt: 'ASC' },
    });
  }

  async verifyPrediction(
    predictionId: string,
    actualBookingOpenAt: Date,
  ): Promise<BookingPrediction> {
    const prediction = await this.bookingPredictionsRepository.findOne({
      where: { id: predictionId },
    });

    if (!prediction) {
      throw new Error('Prediction not found');
    }

    prediction.actualBookingOpenAt = actualBookingOpenAt;
    prediction.verifiedAt = new Date();

    return this.bookingPredictionsRepository.save(prediction);
  }

  async getHighConfidencePredictions(
    threshold: number = 0.8,
    limit: number = 50,
  ): Promise<BookingPrediction[]> {
    const now = new Date();

    return this.bookingPredictionsRepository
      .createQueryBuilder('p')
      .where('p.confidence >= :threshold', { threshold })
      .andWhere('(p.expiresAt IS NULL OR p.expiresAt > :now)', { now })
      .andWhere('p.verifiedAt IS NULL')
      .orderBy('p.confidence', 'DESC')
      .addOrderBy('p.predictedBookingOpenAt', 'ASC')
      .take(limit)
      .getMany();
  }
}

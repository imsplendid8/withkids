import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from '@/modules/institutions/entities/institution.entity';
import { Experience } from '@/modules/experiences/entities/experience.entity';
import { ExperienceRun } from '@/modules/experience-runs/experience-runs.entity';
import { DataLoaderAdapter } from './adapters/data-loader.adapter';
import { SeoulPublicServiceAdapter } from './adapters/seoul-public-service.adapter';
import { MuseumAdapter } from './adapters/museum.adapter';
import { ScienceCenterAdapter } from './adapters/science-center.adapter';
import { FactoryTourAdapter } from './adapters/factory-tour.adapter';
import { BroadcastingAdapter } from './adapters/broadcasting.adapter';
import { CrawlResult, Adapter, ExperienceData } from './adapter.interface';
import { CrawlMonitoringService } from '@/modules/crawler/crawl-monitoring.service';
import { CrawlStatus } from '@/modules/crawler/entities/crawl-history.entity';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private adapters: Map<string, Adapter> = new Map();

  constructor(
    dataLoaderAdapter: DataLoaderAdapter,
    seoulAdapter: SeoulPublicServiceAdapter,
    museumAdapter: MuseumAdapter,
    scienceCenterAdapter: ScienceCenterAdapter,
    factoryTourAdapter: FactoryTourAdapter,
    broadcastingAdapter: BroadcastingAdapter,
    @InjectRepository(Institution)
    private institutionsRepository: Repository<Institution>,
    @InjectRepository(Experience)
    private experiencesRepository: Repository<Experience>,
    @InjectRepository(ExperienceRun)
    private experienceRunsRepository: Repository<ExperienceRun>,
    private crawlMonitoring: CrawlMonitoringService,
  ) {
    this.registerAdapter(dataLoaderAdapter);
    this.registerAdapter(seoulAdapter);
    this.registerAdapter(museumAdapter);
    this.registerAdapter(scienceCenterAdapter);
    this.registerAdapter(factoryTourAdapter);
    this.registerAdapter(broadcastingAdapter);
  }

  registerAdapter(adapter: Adapter): void {
    this.adapters.set(adapter.metadata.name, adapter);
    this.logger.log(`✅ Registered adapter: ${adapter.metadata.name}`);
  }

  async crawlAll(): Promise<CrawlResult[]> {
    this.logger.log('🕷️ Starting crawl for all adapters...');
    const results: CrawlResult[] = [];

    for (const [name, adapter] of this.adapters) {
      if (!adapter.metadata.enabled) {
        this.logger.warn(`⏭️ Skipping disabled adapter: ${name}`);
        continue;
      }
      results.push(await this.runAdapter(adapter));
    }

    return results;
  }

  async crawlByName(adapterName: string): Promise<CrawlResult> {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterName}`);
    }
    return this.runAdapter(adapter);
  }

  /** 어댑터 하나를 돌려 저장하고, 결과를 crawl_history에 남긴다(앱 화면에서 보여준다). */
  private async runAdapter(adapter: Adapter): Promise<CrawlResult> {
    const name = adapter.metadata.name;
    const record = await this.crawlMonitoring.startCrawl(name);
    this.logger.log(`🔄 Crawling with adapter: ${name}`);

    try {
      const programs = await adapter.fetchPrograms();
      const { newCount, updatedCount } = await this.persistPrograms(programs, adapter);
      await this.crawlMonitoring.completeCrawl(record.id, CrawlStatus.SUCCESS, {
        programsFound: programs.length,
        programsCreated: newCount,
        programsUpdated: updatedCount,
      });
      this.logger.log(`✅ ${name}: 신규 ${newCount}건, 갱신 ${updatedCount}건 저장`);
      return {
        adapterName: name,
        success: true,
        programs,
        newCount,
        updatedCount,
        crawledAt: new Date(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ ${name}: ${message}`);
      await this.crawlMonitoring.completeCrawl(record.id, CrawlStatus.FAILURE, {
        errorMessage: message,
        errorStacktrace: error instanceof Error ? error.stack : undefined,
      });
      return {
        adapterName: name,
        success: false,
        programs: [],
        newCount: 0,
        updatedCount: 0,
        errors: [message],
        crawledAt: new Date(),
      };
    }
  }

  /**
   * 크롤한 프로그램을 institutions / experiences / experience_runs에 반영한다.
   * externalSource + externalId를 기준으로 같은 프로그램은 갱신한다.
   */
  private async persistPrograms(
    programs: ExperienceData[],
    adapter: Adapter,
  ): Promise<{ newCount: number; updatedCount: number }> {
    let newCount = 0;
    let updatedCount = 0;

    for (const program of programs) {
      const institution = await this.findOrCreateInstitution(
        program.institutionName,
      );
      const { experience, created } = await this.upsertExperience(
        program,
        institution.id,
      );

      created ? newCount++ : updatedCount++;

      if (program.experienceDate) {
        await this.upsertExperienceRun(program, experience.id, adapter);
      }
    }

    return { newCount, updatedCount };
  }

  private async findOrCreateInstitution(name: string): Promise<Institution> {
    const existing = await this.institutionsRepository.findOne({
      where: { institutionName: name },
    });
    if (existing) return existing;

    return await this.institutionsRepository.save(
      this.institutionsRepository.create({ institutionName: name }),
    );
  }

  private async upsertExperience(
    program: ExperienceData,
    institutionId: string,
  ): Promise<{ experience: Experience; created: boolean }> {
    const { targetAgeMin, targetAgeMax } = this.parseAgeGroup(program.ageGroup);
    const fields = {
      institutionId,
      programName: program.programName,
      description: program.description,
      programUrl: program.programUrl,
      bookingUrl: program.bookingUrl,
      bookingMethod: program.bookingMethod,
      targetAgeMin,
      targetAgeMax,
      lastVerifiedAt: new Date(),
      isActive: true,
    };

    const existing = await this.experiencesRepository.findOne({
      where: {
        externalSource: program.externalSource,
        externalId: program.externalId,
      },
    });

    if (existing) {
      Object.assign(existing, fields);
      return {
        experience: await this.experiencesRepository.save(existing),
        created: false,
      };
    }

    const experience = await this.experiencesRepository.save(
      this.experiencesRepository.create({
        ...fields,
        externalSource: program.externalSource,
        externalId: program.externalId,
      }),
    );
    return { experience, created: true };
  }

  private async upsertExperienceRun(
    program: ExperienceData,
    experienceId: string,
    adapter: Adapter,
  ): Promise<void> {
    const fields = {
      experienceId,
      experienceDate: program.experienceDate!,
      bookingOpenAt: program.bookingOpenAt ?? undefined,
      bookingCloseAt: program.bookingCloseAt ?? undefined,
      bookingMethod: program.bookingMethod,
      capacity: program.capacity,
      price: program.price ?? null,
      status: program.status,
      automationStatus: adapter.metadata.automationInfo?.isAutomatable
        ? 'AVAILABLE'
        : 'MANUAL_REQUIRED',
      automationNote: adapter.metadata.automationInfo?.notes,
    };

    const existing = await this.experienceRunsRepository.findOne({
      where: { experienceId, externalRunId: program.externalId },
    });

    if (existing) {
      Object.assign(existing, fields);
      await this.experienceRunsRepository.save(existing);
      return;
    }

    await this.experienceRunsRepository.save(
      this.experienceRunsRepository.create({
        ...fields,
        externalRunId: program.externalId,
      }),
    );
  }

  /** "6-12" / "6세 이상" 형태의 대상 연령 문자열을 최소/최대 나이로 변환 */
  private parseAgeGroup(ageGroup?: string): {
    targetAgeMin?: number;
    targetAgeMax?: number;
  } {
    if (!ageGroup) return {};

    const numbers = ageGroup.match(/\d+/g)?.map(Number) ?? [];
    if (numbers.length === 0) return {};

    return {
      targetAgeMin: numbers[0],
      targetAgeMax: numbers.length > 1 ? numbers[1] : undefined,
    };
  }

  getAdapters(): Array<{
    name: string;
    enabled: boolean;
    schedule: string;
  }> {
    return Array.from(this.adapters.values()).map((adapter) => ({
      name: adapter.metadata.name,
      enabled: adapter.metadata.enabled,
      schedule: adapter.metadata.schedule,
    }));
  }
}

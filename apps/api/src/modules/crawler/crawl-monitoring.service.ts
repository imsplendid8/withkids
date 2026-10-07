import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, MoreThan } from 'typeorm';
import { CrawlHistory, CrawlStatus } from './entities/crawl-history.entity';
import { AdapterState } from './entities/adapter-state.entity';

@Injectable()
export class CrawlMonitoringService {
  constructor(
    @InjectRepository(CrawlHistory)
    private crawlHistoryRepository: Repository<CrawlHistory>,
    @InjectRepository(AdapterState)
    private adapterStateRepository: Repository<AdapterState>,
  ) {}

  async startCrawl(adapterName: string): Promise<CrawlHistory> {
    const crawlRecord = this.crawlHistoryRepository.create({
      adapterName,
      crawlStartedAt: new Date(),
      status: CrawlStatus.RUNNING,
    });

    return this.crawlHistoryRepository.save(crawlRecord);
  }

  async completeCrawl(
    crawlId: string,
    status: CrawlStatus,
    stats: {
      programsFound?: number;
      programsUpdated?: number;
      programsCreated?: number;
      changesDetected?: number;
      errorMessage?: string;
      errorStacktrace?: string;
    },
  ): Promise<CrawlHistory> {
    const crawl = await this.crawlHistoryRepository.findOne({
      where: { id: crawlId },
    });

    if (!crawl) {
      throw new Error('Crawl record not found');
    }

    crawl.crawlCompletedAt = new Date();
    crawl.status = status;
    crawl.programsFound = stats.programsFound || 0;
    crawl.programsUpdated = stats.programsUpdated || 0;
    crawl.programsCreated = stats.programsCreated || 0;
    crawl.changesDetected = stats.changesDetected || 0;
    crawl.errorMessage = stats.errorMessage || null;
    crawl.errorStacktrace = stats.errorStacktrace || null;

    const saved = await this.crawlHistoryRepository.save(crawl);

    await this.updateAdapterState(crawl.adapterName, status);

    return saved;
  }

  private async updateAdapterState(
    adapterName: string,
    status: CrawlStatus,
  ): Promise<void> {
    let adapterState = await this.adapterStateRepository.findOne({
      where: { adapterName },
    });

    if (!adapterState) {
      adapterState = this.adapterStateRepository.create({ adapterName });
    }

    if (status === CrawlStatus.SUCCESS) {
      adapterState.recordSuccess();
    } else {
      adapterState.recordFailure();
    }

    await this.adapterStateRepository.save(adapterState);
  }

  /** 어댑터마다 가장 최근 수집 기록 하나. 한 번도 돌지 않았으면 null. */
  async getLatestCrawls(
    adapterNames: string[],
  ): Promise<Array<{ adapterName: string; lastCrawl: CrawlHistory | null }>> {
    return Promise.all(
      adapterNames.map(async (adapterName) => ({
        adapterName,
        lastCrawl: await this.crawlHistoryRepository.findOne({
          where: { adapterName },
          order: { crawlStartedAt: 'DESC' },
        }),
      })),
    );
  }

  async getCrawlHistory(
    adapterName: string,
    limit: number = 100,
  ): Promise<CrawlHistory[]> {
    return this.crawlHistoryRepository.find({
      where: { adapterName },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getAdapterState(adapterName: string): Promise<AdapterState | null> {
    return this.adapterStateRepository.findOne({
      where: { adapterName },
    });
  }

  async getFailedCrawls(
    hours: number = 24,
  ): Promise<CrawlHistory[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.crawlHistoryRepository.find({
      where: {
        status: In([CrawlStatus.FAILURE, CrawlStatus.PARTIAL_FAILURE]),
        createdAt: MoreThan(since),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnhealthyAdapters(): Promise<AdapterState[]> {
    return this.adapterStateRepository.find({
      where: {
        isDisabled: true,
      },
    });
  }

  async getRecentCrawlStats(hours: number = 24): Promise<{
    totalCrawls: number;
    successfulCrawls: number;
    failedCrawls: number;
    averageDuration: number;
    totalProgramsFound: number;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const crawls = await this.crawlHistoryRepository.find({
      where: {
        createdAt: MoreThan(since),
      },
    });

    const successful = crawls.filter((c) => c.isSuccess()).length;
    const failed = crawls.filter((c) => c.isFailed()).length;

    const durations = crawls
      .map((c) => c.getDuration())
      .filter((d) => d !== null) as number[];
    const averageDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const totalPrograms = crawls.reduce((sum, c) => sum + c.programsFound, 0);

    return {
      totalCrawls: crawls.length,
      successfulCrawls: successful,
      failedCrawls: failed,
      averageDuration,
      totalProgramsFound: totalPrograms,
    };
  }

  async resetAdapterState(adapterName: string): Promise<AdapterState> {
    const adapterState = await this.adapterStateRepository.findOne({
      where: { adapterName },
    });

    if (!adapterState) {
      throw new Error('Adapter state not found');
    }

    adapterState.isDisabled = false;
    adapterState.consecutiveFailures = 0;
    adapterState.disableReason = null;

    return this.adapterStateRepository.save(adapterState);
  }
}

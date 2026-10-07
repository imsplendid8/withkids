import axios, { AxiosInstance } from 'axios';
import { AdapterMetadata, ExperienceData, CrawlResult, CrawlSchedule } from '../adapter.interface';

export abstract class BaseAdapter {
  protected http: AxiosInstance;
  metadata: AdapterMetadata;

  constructor(protected name: string, protected baseUrl: string, protected schedule: CrawlSchedule = CrawlSchedule.DAILY) {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'WithDKIS-Crawler/1.0',
      },
    });

    this.metadata = {
      name,
      baseUrl,
      schedule,
      enabled: true,
      automationInfo: {
        isAutomatable: false,
        blockers: [],
      },
    };
  }

  abstract fetchPrograms(): Promise<ExperienceData[]>;

  async fetchProgramUpdates(
    lastCrawlAt: Date,
    previousPrograms: ExperienceData[],
  ): Promise<CrawlResult> {
    try {
      const programs = await this.fetchPrograms();
      const previousIds = previousPrograms.map((p) => p.externalId);
      const newPrograms = programs.filter((p) => !previousIds.includes(p.externalId));

      return {
        adapterName: this.metadata.name,
        success: true,
        programs,
        newCount: newPrograms.length,
        updatedCount: programs.length - newPrograms.length,
        crawledAt: new Date(),
      };
    } catch (error) {
      return {
        adapterName: this.metadata.name,
        success: false,
        programs: [],
        newCount: 0,
        updatedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        crawledAt: new Date(),
      };
    }
  }

  protected parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return !isNaN(date.getTime()) ? date : null;
  }

  protected normalizePrice(price: unknown): number | null {
    if (price === null || price === undefined) return null;
    if (typeof price === 'string') {
      const parsed = parseInt(price.replace(/[^0-9]/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
    return typeof price === 'number' ? price : null;
  }

  protected getAgeGroup(ageText: string): string | null {
    if (!ageText) return null;
    const match = ageText.match(/(\d+)[-~](\d+)/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    return null;
  }
}

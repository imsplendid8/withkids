import { Injectable } from '@nestjs/common';
import { ExperienceData, CrawlSchedule } from '../adapter.interface';
import { BaseAdapter } from './base.adapter';
import * as fs from 'fs';
import * as path from 'path';

type RawProgram = Record<string, unknown>;

const BOOKING_METHODS: ExperienceData['bookingMethod'][] = ['FIRST_COME', 'LOTTERY', 'ALWAYS_AVAILABLE'];
const STATUSES: ExperienceData['status'][] = ['OPENING_SOON', 'OPEN', 'CLOSED', 'UNKNOWN'];

/**
 * DataLoader Adapter - Import programs from JSON/CSV files
 * Supports loading experience data from local files for batch imports
 */
@Injectable()
export class DataLoaderAdapter extends BaseAdapter {
  private dataDir = path.resolve(__dirname, '../data');

  constructor() {
    super('data-loader', 'file://', CrawlSchedule.DAILY);

    this.metadata.automationInfo = {
      isAutomatable: false,
      blockers: [],
      notes: 'Loads programs from JSON files in apps/api/src/crawler/data directory',
    };
  }

  async fetchPrograms(): Promise<ExperienceData[]> {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        return [];
      }

      const files = fs.readdirSync(this.dataDir).filter((f) => f.endsWith('.json'));

      if (files.length === 0) {
        console.log(`No data files found in ${this.dataDir}`);
        return [];
      }

      const allPrograms: ExperienceData[] = [];

      for (const file of files) {
        try {
          const filePath = path.join(this.dataDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);

          // Support both single object and array of objects
          const programs = Array.isArray(data) ? data : [data];

          // Validate and normalize programs
          for (const program of programs) {
            if (this.isValidProgram(program)) {
              allPrograms.push(this.normalizeProgram(program));
            }
          }

          console.log(`✅ Loaded ${programs.length} programs from ${file}`);
        } catch (error) {
          console.error(`❌ Error loading ${file}:`, error);
        }
      }

      return allPrograms;
    } catch (error) {
      console.error('DataLoader adapter error:', error);
      return [];
    }
  }

  private isValidProgram(program: unknown): program is RawProgram {
    if (!program || typeof program !== 'object') return false;
    const p = program as RawProgram;
    return Boolean(
      p.externalId &&
        p.institutionName &&
        p.programName &&
        BOOKING_METHODS.includes(p.bookingMethod as ExperienceData['bookingMethod']) &&
        STATUSES.includes(p.status as ExperienceData['status']),
    );
  }

  private normalizeProgram(program: RawProgram): ExperienceData {
    const text = (value: unknown) => (value ? String(value) : undefined);
    const date = (value: unknown) => (value ? new Date(String(value)) : undefined);

    return {
      externalId: String(program.externalId),
      institutionName: String(program.institutionName),
      programName: String(program.programName),
      description: text(program.description),
      programUrl: text(program.programUrl),
      bookingUrl: text(program.bookingUrl),
      experienceDate: date(program.experienceDate),
      bookingOpenAt: date(program.bookingOpenAt),
      bookingCloseAt: date(program.bookingCloseAt),
      capacity: program.capacity ? Number(program.capacity) : undefined,
      // 값이 없으면 "무료"가 아니라 "모름"이다. 0으로 채우면 유료 프로그램이 무료로 보인다.
      price: this.parsePriceValue(program.price),
      ageGroup: text(program.ageGroup),
      bookingMethod: program.bookingMethod as ExperienceData['bookingMethod'],
      status: program.status as ExperienceData['status'],
      externalSource: text(program.externalSource) ?? 'data-loader',
    };
  }

  private parsePriceValue(price: unknown): number | undefined {
    if (typeof price === 'number') return Number.isFinite(price) ? price : undefined;
    if (typeof price === 'string' && price.trim() !== '') {
      if (price.includes('무료')) return 0;
      const parsed = parseInt(price.replace(/[^0-9]/g, ''), 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }
}

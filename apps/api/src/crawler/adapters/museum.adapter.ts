import { Injectable } from '@nestjs/common';
import { ExperienceData, CrawlSchedule } from '../adapter.interface';
import { BaseAdapter } from './base.adapter';

interface MuseumProgram {
  id: string;
  name: string;
  description: string;
  museum: string;
  url: string;
  bookingUrl: string;
  targetAge: string;
  startDate: string;
  endDate: string;
  capacity: number;
  fee: number;
  bookingMethod: string;
}

@Injectable()
export class MuseumAdapter extends BaseAdapter {
  constructor() {
    super(
      'museum',
      'https://museum-api.example.com',
      CrawlSchedule.EVERY_6_HOURS,
    );

    // 대상 사이트가 정해지지 않은 골격 어댑터. baseUrl이 존재하지 않는 호스트라
    // 활성화하면 크롤마다 타임아웃만 발생한다. 실제 엔드포인트를 붙일 때 다시 켠다.
    this.metadata.enabled = false;
    this.metadata.automationInfo = {
      isAutomatable: false,
      blockers: [
        'Individual museum APIs with different structures',
        'No unified Korean museum API exists',
        'Requires web scraping or manual integration per museum',
      ],
      notes: 'Placeholder - needs real museum API integrations',
    };
  }

  async fetchPrograms(): Promise<ExperienceData[]> {
    try {
      const museums = [
        { name: '국립중앙박물관', id: 'nmuseum-1', url: '/central' },
        { name: '서울역사박물관', id: 'smuseum-1', url: '/history' },
        { name: '서울암사동선사유적박물관', id: 'smuseum-2', url: '/neolithic' },
      ];

      let allPrograms: ExperienceData[] = [];

      for (const museum of museums) {
        try {
          const response = await this.http.get(`${museum.url}/programs`);
          const programs = response.data.programs || [];
          const mapped = programs.map((p: MuseumProgram) =>
            this.mapProgram(p, museum.name),
          );
          allPrograms = allPrograms.concat(mapped);
        } catch (error) {
          console.warn(`Failed to fetch from ${museum.name}:`, error);
        }
      }

      return allPrograms;
    } catch (error) {
      console.error('Museum adapter error:', error);
      return [];
    }
  }

  private mapProgram(program: MuseumProgram, museumName: string): ExperienceData {
    return {
      externalId: program.id,
      institutionName: museumName,
      programName: program.name,
      description: program.description,
      programUrl: program.url,
      bookingUrl: program.bookingUrl,
      experienceDate: this.parseDate(program.startDate) || undefined,
      bookingOpenAt: this.parseDate(program.startDate),
      bookingCloseAt: this.parseDate(program.endDate),
      capacity: program.capacity,
      price: program.fee,
      ageGroup: this.getAgeGroup(program.targetAge) || undefined,
      bookingMethod: this.mapBookingMethod(program.bookingMethod),
      status: this.determineStatus(program.startDate, program.endDate),
      externalSource: 'museum',
    };
  }

  private mapBookingMethod(method: string): 'FIRST_COME' | 'LOTTERY' | 'ALWAYS_AVAILABLE' {
    if (!method) return 'FIRST_COME';
    const lower = method.toLowerCase();
    if (lower.includes('선착순')) return 'FIRST_COME';
    if (lower.includes('추첨')) return 'LOTTERY';
    if (lower.includes('상시')) return 'ALWAYS_AVAILABLE';
    return 'FIRST_COME';
  }

  private determineStatus(
    startDate: string,
    endDate: string,
  ): 'OPENING_SOON' | 'OPEN' | 'CLOSED' | 'UNKNOWN' {
    const now = new Date();
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);

    if (!start || !end) return 'UNKNOWN';
    if (now < start) return 'OPENING_SOON';
    if (now <= end) return 'OPEN';
    return 'CLOSED';
  }
}

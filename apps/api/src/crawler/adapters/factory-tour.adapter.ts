import { Injectable } from '@nestjs/common';
import { ExperienceData, CrawlSchedule } from '../adapter.interface';
import { BaseAdapter } from './base.adapter';

interface FactoryTourProgram {
  id: string;
  factoryName: string;
  tourName: string;
  description: string;
  location: string;
  tourUrl: string;
  bookingUrl: string;
  availableAges: string;
  tourDate: string;
  bookingStartDate: string;
  bookingEndDate: string;
  maxParticipants: number;
  fee: number;
  tourType: string;
}

@Injectable()
export class FactoryTourAdapter extends BaseAdapter {
  constructor() {
    super(
      'factory-tour',
      'https://factory-tour-api.example.com',
      CrawlSchedule.DAILY,
    );

    // 대상 사이트가 정해지지 않은 골격 어댑터. baseUrl이 존재하지 않는 호스트라
    // 활성화하면 크롤마다 타임아웃만 발생한다. 실제 엔드포인트를 붙일 때 다시 켠다.
    this.metadata.enabled = false;
    this.metadata.automationInfo = {
      isAutomatable: false,
      blockers: [
        'Factory tours require individual booking system integration',
        'Many factories have internal booking systems or phone-only bookings',
      ],
      notes: 'Covers food factories, manufacturing plants, beverage plants with child programs',
    };
  }

  async fetchPrograms(): Promise<ExperienceData[]> {
    try {
      const factories = [
        { name: '삼양 라면 공장', id: 'samyang-1', url: '/samyang' },
        { name: '서울우유 축산목장', id: 'seoul-milk-1', url: '/seoul-milk' },
        { name: '롯데 초콜릿 공장', id: 'lotte-choco-1', url: '/lotte-choco' },
      ];

      let allPrograms: ExperienceData[] = [];

      for (const factory of factories) {
        try {
          const response = await this.http.get(`${factory.url}/tours`);
          const programs = response.data.tours || [];
          const mapped = programs.map((p: FactoryTourProgram) =>
            this.mapProgram(p),
          );
          allPrograms = allPrograms.concat(mapped);
        } catch (error) {
          console.warn(`Failed to fetch tours from ${factory.name}:`, error);
        }
      }

      return allPrograms;
    } catch (error) {
      console.error('Factory tour adapter error:', error);
      return [];
    }
  }

  private mapProgram(program: FactoryTourProgram): ExperienceData {
    return {
      externalId: program.id,
      institutionName: program.factoryName,
      programName: program.tourName,
      description: program.description,
      programUrl: program.tourUrl,
      bookingUrl: program.bookingUrl,
      experienceDate: this.parseDate(program.tourDate) || undefined,
      bookingOpenAt: this.parseDate(program.bookingStartDate),
      bookingCloseAt: this.parseDate(program.bookingEndDate),
      capacity: program.maxParticipants,
      price: program.fee,
      ageGroup: this.getAgeGroup(program.availableAges) || undefined,
      bookingMethod: this.mapTourType(program.tourType),
      status: this.determineStatus(program.bookingStartDate, program.bookingEndDate),
      externalSource: 'factory-tour',
    };
  }

  private mapTourType(tourType: string): 'FIRST_COME' | 'LOTTERY' | 'ALWAYS_AVAILABLE' {
    if (!tourType) return 'FIRST_COME';
    const lower = tourType.toLowerCase();
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

import { Injectable } from '@nestjs/common';
import { ExperienceData, CrawlSchedule } from '../adapter.interface';
import { BaseAdapter } from './base.adapter';

interface BroadcastingProgram {
  id: string;
  broadcaster: string;
  studioName: string;
  tourDescription: string;
  studioUrl: string;
  bookingUrl: string;
  targetAgeGroup: string;
  scheduledDate: string;
  reservationOpenDate: string;
  reservationCloseDate: string;
  maximumCapacity: number;
  admissionFee: number;
  reservationType: string;
}

@Injectable()
export class BroadcastingAdapter extends BaseAdapter {
  constructor() {
    super(
      'broadcasting',
      'https://broadcasting-api.example.com',
      CrawlSchedule.DAILY,
    );

    // 대상 사이트가 정해지지 않은 골격 어댑터. baseUrl이 존재하지 않는 호스트라
    // 활성화하면 크롤마다 타임아웃만 발생한다. 실제 엔드포인트를 붙일 때 다시 켠다.
    this.metadata.enabled = false;
    this.metadata.automationInfo = {
      isAutomatable: false,
      blockers: [
        'Broadcast stations have proprietary booking systems',
        'Tours often require advance notice and security clearance',
      ],
      notes: 'Covers MBC, KBS, SBS, EBS studio tours for children',
    };
  }

  async fetchPrograms(): Promise<ExperienceData[]> {
    try {
      const broadcasters = [
        { name: 'MBC', id: 'mbc-1', url: '/mbc' },
        { name: 'KBS', id: 'kbs-1', url: '/kbs' },
        { name: 'SBS', id: 'sbs-1', url: '/sbs' },
        { name: 'EBS', id: 'ebs-1', url: '/ebs' },
      ];

      let allPrograms: ExperienceData[] = [];

      for (const broadcaster of broadcasters) {
        try {
          const response = await this.http.get(`${broadcaster.url}/studio-tours`);
          const programs = response.data.tours || [];
          const mapped = programs.map((p: BroadcastingProgram) =>
            this.mapProgram(p),
          );
          allPrograms = allPrograms.concat(mapped);
        } catch (error) {
          console.warn(`Failed to fetch tours from ${broadcaster.name}:`, error);
        }
      }

      return allPrograms;
    } catch (error) {
      console.error('Broadcasting adapter error:', error);
      return [];
    }
  }

  private mapProgram(program: BroadcastingProgram): ExperienceData {
    return {
      externalId: program.id,
      institutionName: `${program.broadcaster} 방송국`,
      programName: program.studioName,
      description: program.tourDescription,
      programUrl: program.studioUrl,
      bookingUrl: program.bookingUrl,
      experienceDate: this.parseDate(program.scheduledDate) || undefined,
      bookingOpenAt: this.parseDate(program.reservationOpenDate),
      bookingCloseAt: this.parseDate(program.reservationCloseDate),
      capacity: program.maximumCapacity,
      price: program.admissionFee,
      ageGroup: this.getAgeGroup(program.targetAgeGroup) || undefined,
      bookingMethod: this.mapReservationType(program.reservationType),
      status: this.determineStatus(program.reservationOpenDate, program.reservationCloseDate),
      externalSource: 'broadcasting',
    };
  }

  private mapReservationType(reservationType: string): 'FIRST_COME' | 'LOTTERY' | 'ALWAYS_AVAILABLE' {
    if (!reservationType) return 'FIRST_COME';
    const lower = reservationType.toLowerCase();
    if (lower.includes('선착순')) return 'FIRST_COME';
    if (lower.includes('추첨')) return 'LOTTERY';
    if (lower.includes('상시')) return 'ALWAYS_AVAILABLE';
    return 'FIRST_COME';
  }

  private determineStatus(
    openDate: string,
    closeDate: string,
  ): 'OPENING_SOON' | 'OPEN' | 'CLOSED' | 'UNKNOWN' {
    const now = new Date();
    const open = this.parseDate(openDate);
    const close = this.parseDate(closeDate);

    if (!open || !close) return 'UNKNOWN';
    if (now < open) return 'OPENING_SOON';
    if (now <= close) return 'OPEN';
    return 'CLOSED';
  }
}

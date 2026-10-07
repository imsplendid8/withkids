import { Injectable } from '@nestjs/common';
import { ExperienceData, CrawlSchedule } from '../adapter.interface';
import { BaseAdapter } from './base.adapter';

interface ScienceProgram {
  id: string;
  title: string;
  summary: string;
  centerName: string;
  detailUrl: string;
  scheduleStartDate: string;
  scheduleEndDate: string;
  participantLimit: number;
  cost: number;
  participantAge: string;
  recruitmentMethod: string;
}

@Injectable()
export class ScienceCenterAdapter extends BaseAdapter {
  constructor() {
    super(
      'science-center',
      'https://science-api.example.com',
      CrawlSchedule.EVERY_6_HOURS,
    );

    // 대상 사이트가 정해지지 않은 골격 어댑터. baseUrl이 존재하지 않는 호스트라
    // 활성화하면 크롤마다 타임아웃만 발생한다. 실제 엔드포인트를 붙일 때 다시 켠다.
    this.metadata.enabled = false;
    this.metadata.automationInfo = {
      isAutomatable: false,
      blockers: [
        'Each science center has its own website structure',
        'Requires per-center web scraping or API integration',
      ],
      notes: 'Covers National Science Museum, Busan Science Center, Daegu Science Center, etc.',
    };
  }

  async fetchPrograms(): Promise<ExperienceData[]> {
    try {
      const centers = [
        { name: '국립과학관', id: 'nsci-1', url: '/national' },
        { name: '서울과학관', id: 'ssci-1', url: '/seoul' },
        { name: '부산과학관', id: 'bsci-1', url: '/busan' },
      ];

      let allPrograms: ExperienceData[] = [];

      for (const center of centers) {
        try {
          const response = await this.http.get(`${center.url}/programs`);
          const programs = response.data.programs || [];
          const mapped = programs.map((p: ScienceProgram) =>
            this.mapProgram(p, center.name),
          );
          allPrograms = allPrograms.concat(mapped);
        } catch (error) {
          console.warn(`Failed to fetch from ${center.name}:`, error);
        }
      }

      return allPrograms;
    } catch (error) {
      console.error('Science center adapter error:', error);
      return [];
    }
  }

  private mapProgram(program: ScienceProgram, centerName: string): ExperienceData {
    return {
      externalId: program.id,
      institutionName: centerName,
      programName: program.title,
      description: program.summary,
      programUrl: program.detailUrl,
      bookingUrl: program.detailUrl,
      experienceDate: this.parseDate(program.scheduleStartDate) || undefined,
      bookingOpenAt: this.parseDate(program.scheduleStartDate),
      bookingCloseAt: this.parseDate(program.scheduleEndDate),
      capacity: program.participantLimit,
      price: program.cost,
      ageGroup: this.getAgeGroup(program.participantAge) || undefined,
      bookingMethod: this.mapRecruitmentMethod(program.recruitmentMethod),
      status: this.determineStatus(program.scheduleStartDate, program.scheduleEndDate),
      externalSource: 'science-center',
    };
  }

  private mapRecruitmentMethod(method: string): 'FIRST_COME' | 'LOTTERY' | 'ALWAYS_AVAILABLE' {
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

export enum CrawlSchedule {
  HOURLY = 'hourly',
  EVERY_6_HOURS = 'every_6_hours',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export interface AdapterMetadata {
  name: string;
  baseUrl?: string;
  schedule: CrawlSchedule;
  enabled: boolean;
  automationInfo?: {
    isAutomatable: boolean;
    blockers?: string[];
    notes?: string;
  };
}

export interface ExperienceData {
  externalId: string;
  institutionName: string;
  programName: string;
  description?: string;
  programUrl?: string;
  bookingUrl?: string;
  experienceDate?: Date | null;
  bookingOpenAt?: Date | null;
  bookingCloseAt?: Date | null;
  capacity?: number;
  price?: number;
  ageGroup?: string;
  /** 기관이 적은 참여 대상 원문 (예: "초등 1~3학년 및 보호자", "만 5~7세") */
  targetInfo?: string;
  /** 이용(운영) 기간 끝. 시작은 experienceDate. 상시 프로그램은 시작이 몇 년 전일 수 있다 */
  serviceEndAt?: Date | null;
  /** 분류 (예: 교육체험 > 자연/과학) */
  category?: string;
  /** 자치구 등 지역 */
  area?: string;
  /** 요금 안내 원문 (무료/유료) */
  paymentInfo?: string;
  imageUrl?: string;
  contact?: string;
  /** 기관이 쓰는 상태 이름 (접수중/안내중/예약마감 등) */
  statusLabel?: string;
  bookingMethod: 'FIRST_COME' | 'LOTTERY' | 'ALWAYS_AVAILABLE';
  status: 'OPENING_SOON' | 'OPEN' | 'CLOSED' | 'UNKNOWN';
  externalSource: string;
}

export interface CrawlResult {
  adapterName: string;
  success: boolean;
  programs: ExperienceData[];
  newCount: number;
  updatedCount: number;
  errors?: string[];
  crawledAt: Date;
}

export interface Adapter {
  metadata: AdapterMetadata;
  fetchPrograms(): Promise<ExperienceData[]>;
  fetchProgramUpdates?(lastCrawlAt: Date, previousPrograms: ExperienceData[]): Promise<CrawlResult>;
}

import type { ApiClientContract, LatestCrawl } from './api';
import { BASE_PATH } from './staticMode';
import { daysFromToday, parseYmd, toLocalYmd } from './bookingDates';
import { CHILDREN_KEY, getChildren, isValidChild } from './children';
import { bookingState, servicePeriodOverlaps, type BookingState } from './programInfo';
import { periodRange } from './festivals';
import {
  evaluateProgram,
  matchesEligibility,
  referenceDate,
  type Child,
  type EligibilityFilter,
} from './eligibility';

/**
 * 서버 없이(GitHub Pages) 돌 때 쓰는 API 클라이언트.
 * - 프로그램: GitHub Actions가 매일 만든 data/programs.json (읽기 전용)
 * - 예약·후기·프로필: 이 브라우저의 localStorage (기기마다 따로 저장)
 * 서버 ApiClient와 같은 메서드·응답 모양을 지켜 화면 코드를 바꾸지 않는다.
 */

// ── 저장 형태 ───────────────────────────────────────────────

interface StaticProgram {
  id: string;
  programName: string;
  institutionName: string;
  description: string | null;
  programUrl: string | null;
  bookingUrl: string | null;
  experienceDate: string | null;
  bookingOpenAt: string | null;
  bookingCloseAt: string | null;
  price: number | null;
  ageGroup: string | null;
  /** 기관이 적은 참여 대상 원문 (예전 파일에는 없을 수 있다) */
  targetInfo?: string | null;
  // 서울시 공공서비스예약 상세 (예전 파일에는 없을 수 있다)
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  category?: string | null;
  area?: string | null;
  paymentInfo?: string | null;
  imageUrl?: string | null;
  contact?: string | null;
  statusLabel?: string | null;
  /** 당일 예약(online)·현장 접수(onsite)·당일 불가(no), 모르면 null */
  sameDay?: 'online' | 'onsite' | 'no' | null;
  sameDayNote?: string | null;
  targetAgeMin: number | null;
  targetAgeMax: number | null;
  bookingMethod: string;
  status: string;
  source: string;
}

interface ProgramsFile {
  generatedAt: string | null;
  sources: Array<{
    adapterName: string;
    ok: boolean;
    programsFound: number;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string;
  }>;
  programs: StaticProgram[];
}

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

interface LocalBooking {
  id: string;
  userId: string;
  experienceId: string;
  /** 프로그램이 목록에서 사라져도 보이도록 예약 시점의 정보를 같이 둔다 */
  experience: {
    id: string;
    programName: string;
    institution: { institutionName: string };
    price?: number;
    description?: string;
  };
  experienceDate: string;
  selectedChildren: Array<{ id: string; name: string; age: number }>;
  specialRequests?: string;
  totalPrice?: number;
  numberOfParticipants: number;
  status: BookingStatus;
  confirmationNumber: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalReview {
  id: string;
  bookingId: string;
  experienceId: string;
  rating: number;
  reviewText: string;
  helpfulCount: number;
  createdAt: string;
}

interface LocalProfile {
  id: string;
  email: string;
  profileName?: string;
  childrenAges?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface BackupFile {
  app: 'withdkis';
  version: 1;
  exportedAt: string;
  profile: LocalProfile;
  bookings: LocalBooking[];
  reviews: LocalReview[];
  preferences: Record<string, unknown>;
  notificationReads: string[];
  bookmarks: unknown[];
  /** 예전 백업에는 없다 */
  children?: Child[];
}

// ── localStorage ───────────────────────────────────────────

const KEY = {
  profile: 'withdkis.profile',
  bookings: 'withdkis.bookings',
  reviews: 'withdkis.reviews',
  preferences: 'withdkis.preferences',
  notificationReads: 'withdkis.notificationReads',
  // bookmarkStore가 이미 쓰는 키
  bookmarks: 'bookmarks',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const nowIso = () => new Date().toISOString();

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** axios 오류와 같은 모양으로 던져 화면의 오류 처리(err.response.data.message)가 그대로 동작하게 한다 */
function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { response: { status, data: { message } } });
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// ── 프로필 ─────────────────────────────────────────────────

export const LOCAL_USER_ID = 'local';

export function getLocalProfile(): LocalProfile {
  const stored = read<LocalProfile | null>(KEY.profile, null);
  if (stored) return stored;
  const created = { id: LOCAL_USER_ID, email: '', createdAt: nowIso(), updatedAt: nowIso() };
  write(KEY.profile, created);
  return created;
}

// ── 백업 ──────────────────────────────────────────────────

export function exportLocalData(): BackupFile {
  return {
    app: 'withdkis',
    version: 1,
    exportedAt: nowIso(),
    profile: getLocalProfile(),
    bookings: read(KEY.bookings, []),
    reviews: read(KEY.reviews, []),
    preferences: read(KEY.preferences, {}),
    notificationReads: read(KEY.notificationReads, []),
    bookmarks: read(KEY.bookmarks, []),
    children: getChildren(),
  };
}

/** 백업 파일로 이 브라우저의 데이터를 덮어쓴다. 형식이 다르면 아무것도 바꾸지 않고 오류를 던진다. */
export function importLocalData(data: unknown): { bookings: number } {
  const backup = data as Partial<BackupFile>;
  if (
    !backup ||
    backup.app !== 'withdkis' ||
    backup.version !== 1 ||
    !Array.isArray(backup.bookings) ||
    !Array.isArray(backup.reviews)
  ) {
    throw new Error('WITHKIDS 백업 파일이 아닙니다.');
  }
  if (backup.profile) write(KEY.profile, backup.profile);
  write(KEY.bookings, backup.bookings);
  write(KEY.reviews, backup.reviews);
  write(KEY.preferences, backup.preferences ?? {});
  write(KEY.notificationReads, backup.notificationReads ?? []);
  write(KEY.bookmarks, backup.bookmarks ?? []);
  if (Array.isArray(backup.children)) write(CHILDREN_KEY, backup.children.filter(isValidChild));
  return { bookings: backup.bookings.length };
}

// ── 프로그램 (programs.json) ───────────────────────────────

let programsPromise: Promise<ProgramsFile> | null = null;

function loadPrograms(): Promise<ProgramsFile> {
  if (!programsPromise) {
    programsPromise = fetch(`${BASE_PATH}/data/programs.json`, { cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ProgramsFile | null) => data ?? { generatedAt: null, sources: [], programs: [] })
      .catch(() => {
        programsPromise = null; // 네트워크 문제는 다음에 다시 시도
        return { generatedAt: null, sources: [], programs: [] };
      });
  }
  return programsPromise;
}

function eligibilityOf(program: StaticProgram, children: Child[], today: Date) {
  return evaluateProgram(
    program.targetInfo,
    children,
    referenceDate(program.experienceDate, today)
  );
}

function toExperience(
  program: StaticProgram,
  children: Child[] = getChildren(),
  today = new Date()
) {
  return {
    id: program.id,
    programName: program.programName,
    institution: { institutionName: program.institutionName },
    description: program.description ?? undefined,
    price: program.price ?? undefined,
    targetAgeMin: program.targetAgeMin ?? undefined,
    targetAgeMax: program.targetAgeMax ?? undefined,
    bookingMethod: program.bookingMethod,
    externalSource: program.source,
    programUrl: program.programUrl,
    bookingUrl: program.bookingUrl,
    experienceDate: program.experienceDate,
    bookingOpenAt: program.bookingOpenAt,
    bookingCloseAt: program.bookingCloseAt,
    status: program.status,
    targetInfo: program.targetInfo ?? null,
    serviceStartDate: program.serviceStartDate ?? program.experienceDate,
    serviceEndDate: program.serviceEndDate ?? null,
    category: program.category ?? null,
    area: program.area ?? null,
    paymentInfo: program.paymentInfo ?? null,
    imageUrl: program.imageUrl ?? null,
    contact: program.contact ?? null,
    statusLabel: program.statusLabel ?? null,
    sameDay: program.sameDay ?? null,
    sameDayNote: program.sameDayNote ?? null,
    eligibility: eligibilityOf(program, children, today),
  };
}

/** 서울형 키즈카페 (회차 예약이 많아 목록을 가득 채운다) */
export function isSeoulKidsCafe(program: {
  programName: string;
  institutionName: string;
}): boolean {
  return /서울형\s*키즈\s*카페/.test(`${program.programName} ${program.institutionName}`);
}

/** 지역(구) 목록과 프로그램 수. 서울 25개 구를 가나다순, 그 밖은 뒤로 */
function areaCounts(programs: StaticProgram[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of programs) {
    if (p.area) counts.set(p.area, (counts.get(p.area) ?? 0) + 1);
  }
  const inSeoul = (name: string) => /구$/.test(name);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort(
      (a, b) =>
        Number(inSeoul(b.name)) - Number(inSeoul(a.name)) || a.name.localeCompare(b.name, 'ko')
    );
}

/** "6-10" 같은 연령대 필터가 프로그램 대상 연령과 겹치는지 */
function matchesAgeGroup(program: StaticProgram, ageGroup: string): boolean {
  const [min, max] = ageGroup.split('-').map(Number);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return true;
  const from = program.targetAgeMin ?? 0;
  const to = program.targetAgeMax ?? program.targetAgeMin ?? 99;
  return from <= max && to >= min;
}

// ── 클라이언트 ─────────────────────────────────────────────

export class LocalApiClient implements ApiClientContract {
  // 인증: 이 모드에는 로그인이 없다. 데이터는 이 브라우저에만 있다.
  async getSetupStatus() {
    return { needsSetup: false };
  }

  async register(): Promise<never> {
    throw httpError(400, '이 버전은 로그인 없이 사용합니다.');
  }

  async login(): Promise<never> {
    throw httpError(400, '이 버전은 로그인 없이 사용합니다.');
  }

  async refreshToken(): Promise<never> {
    throw httpError(400, '이 버전은 로그인 없이 사용합니다.');
  }

  async getMe() {
    return getLocalProfile();
  }

  async getCurrentUser() {
    const profile = getLocalProfile();
    return { userId: profile.id, email: profile.email };
  }

  async updatePassword(): Promise<never> {
    throw httpError(400, '이 버전은 비밀번호를 쓰지 않습니다.');
  }

  // 프로필·설정
  async updateProfile(profileName: string, childrenAges: number[]) {
    const updated = { ...getLocalProfile(), profileName, childrenAges, updatedAt: nowIso() };
    write(KEY.profile, updated);
    return updated;
  }

  async getPreferences() {
    return read<Record<string, unknown>>(KEY.preferences, {});
  }

  async updatePreferences(preferences: Record<string, unknown>) {
    const updated = { ...read<Record<string, unknown>>(KEY.preferences, {}), ...preferences };
    write(KEY.preferences, updated);
    return updated;
  }

  // 찜은 bookmarkStore가 localStorage에 직접 저장한다
  async addBookmark() {
    return {};
  }

  async removeBookmark() {
    return {};
  }

  // 프로그램
  async getExperiences() {
    const { programs } = await loadPrograms();
    const children = getChildren();
    const today = new Date();
    return programs.map((p) => toExperience(p, children, today));
  }

  async searchExperiences(params: Record<string, unknown>) {
    const { programs } = await loadPrograms();
    const search = String(params.search ?? '')
      .trim()
      .toLowerCase();
    const ageGroup = params.ageGroup ? String(params.ageGroup) : '';
    const eligibility = (
      params.eligibility ? String(params.eligibility) : 'all'
    ) as EligibilityFilter;
    const area = params.area ? String(params.area) : '';
    // 접수: available(접수 중+예정) / open / soon / all
    const booking = params.booking ? String(params.booking) : 'all';
    // 이용일: today / weekend
    const useDate = params.useDate ? String(params.useDate) : '';
    // 당일: online(당일 온라인 예약) / any(당일 예약 또는 현장 접수)
    const sameDay = params.sameDay ? String(params.sameDay) : '';
    const excludeKidsCafe = Boolean(params.excludeKidsCafe);
    const now = new Date();
    const useRange: [string, string] | null =
      useDate === 'today'
        ? [toLocalYmd(now), toLocalYmd(now)]
        : useDate === 'weekend'
          ? periodRange('weekend', now)
          : null;
    const matchesBooking = (state: BookingState) =>
      booking === 'all' || (booking === 'available' ? state !== 'closed' : state === booking);
    const limit = Number(params.limit) || 12;
    const offset = Number(params.offset) || 0;
    const children = getChildren();
    const today = new Date();

    let list = programs.filter((p) => {
      if (search) {
        const haystack =
          `${p.programName} ${p.institutionName} ${p.description ?? ''} ${p.targetInfo ?? ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (area && (p.area || '') !== area) return false;
      if (excludeKidsCafe && isSeoulKidsCafe(p)) return false;
      if (!matchesBooking(bookingState(p, now))) return false;
      if (sameDay === 'online' && p.sameDay !== 'online') return false;
      if (sameDay === 'any' && p.sameDay !== 'online' && p.sameDay !== 'onsite') return false;
      if (
        useRange &&
        !servicePeriodOverlaps(
          p.serviceStartDate ?? p.experienceDate,
          p.serviceEndDate,
          useRange[0],
          useRange[1]
        )
      ) {
        return false;
      }
      if (
        eligibility !== 'all' &&
        !matchesEligibility(eligibilityOf(p, children, today), eligibility)
      ) {
        return false;
      }
      return ageGroup ? matchesAgeGroup(p, ageGroup) : true;
    });

    switch (params.sort) {
      case 'price-low':
        list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        break;
      case 'price-high':
        list = [...list].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
        break;
      case 'name':
        list = [...list].sort((a, b) => a.programName.localeCompare(b.programName, 'ko'));
        break;
      case 'closing': {
        // 접수 마감이 가까운 것부터 (마감일 없는 것은 뒤로)
        const key = (p: StaticProgram) => p.bookingCloseAt ?? '9999';
        list = [...list].sort((a, b) => key(a).localeCompare(key(b)));
        break;
      }
      default:
        // 최신순: 최근에 접수를 시작한(또는 시작할) 것부터
        list = [...list].sort((a, b) =>
          (b.bookingOpenAt ?? '').localeCompare(a.bookingOpenAt ?? '')
        );
    }

    return {
      data: list.slice(offset, offset + limit).map((p) => toExperience(p, children, today)),
      total: list.length,
      areas: areaCounts(programs),
    };
  }

  async getBookingSchedule(days = 14) {
    const { programs } = await loadPrograms();
    const now = Date.now();
    const until = now + days * 24 * 60 * 60 * 1000;

    return programs
      .filter((p) => {
        if (!p.bookingOpenAt) return false;
        const open = Date.parse(p.bookingOpenAt);
        const close = p.bookingCloseAt ? Date.parse(p.bookingCloseAt) : null;
        const openingSoon = open >= now && open <= until;
        const openNow = open <= now && close !== null && close >= now;
        return openingSoon || openNow;
      })
      .sort((a, b) => (a.bookingOpenAt ?? '').localeCompare(b.bookingOpenAt ?? ''))
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        bookingOpenAt: p.bookingOpenAt,
        bookingCloseAt: p.bookingCloseAt,
        price: p.price,
        experience: {
          id: p.id,
          programName: p.programName,
          programUrl: p.programUrl,
          bookingUrl: p.bookingUrl,
          institution: { institutionName: p.institutionName },
          area: p.area ?? null,
        },
      }));
  }

  async getExperienceById(id: string) {
    const { programs } = await loadPrograms();
    const program = programs.find((p) => p.id === id);
    if (program) return toExperience(program);

    // 목록에서 사라진 프로그램이라도 예약해 둔 적이 있으면 그때 정보를 보여준다
    const booked = this.bookings().find((b) => b.experienceId === id);
    if (booked) return booked.experience;
    throw httpError(404, '프로그램을 찾을 수 없습니다.');
  }

  // 예약
  private bookings(): LocalBooking[] {
    return read<LocalBooking[]>(KEY.bookings, []);
  }

  private saveBookings(bookings: LocalBooking[]): void {
    write(KEY.bookings, bookings);
  }

  async createBooking(data: {
    experienceId: string;
    experienceDate: string;
    selectedChildren: Array<{ id: string; name: string; age: number }>;
    specialRequests?: string;
    totalPrice?: number;
  }) {
    if (!YMD.test(data.experienceDate)) throw httpError(400, '체험 날짜를 선택해주세요.');
    if (!data.selectedChildren?.length)
      throw httpError(400, '최소 1명 이상의 자녀 정보를 입력해주세요.');

    const experience = await this.getExperienceById(data.experienceId);
    const stamp = toLocalYmd(new Date()).replace(/-/g, '');
    const booking: LocalBooking = {
      id: newId(),
      userId: LOCAL_USER_ID,
      experienceId: data.experienceId,
      experience: {
        id: experience.id,
        programName: experience.programName,
        institution: { institutionName: experience.institution.institutionName },
        price: experience.price,
        description: experience.description,
      },
      experienceDate: data.experienceDate,
      selectedChildren: data.selectedChildren,
      specialRequests: data.specialRequests,
      totalPrice: data.totalPrice,
      numberOfParticipants: data.selectedChildren.length,
      status: 'CONFIRMED',
      confirmationNumber: `BK-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.saveBookings([...this.bookings(), booking]);
    return booking;
  }

  async getBookings() {
    return [...this.bookings()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getBookingById(id: string) {
    const booking = this.bookings().find((b) => b.id === id);
    if (!booking) throw httpError(404, '예약을 찾을 수 없습니다.');
    return booking;
  }

  async searchBookings(params: {
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    sort?: 'newest' | 'oldest' | 'price_low' | 'price_high';
  }) {
    const keyword = params.keyword?.trim().toLowerCase();
    let list = this.bookings().filter((b) => {
      if (keyword) {
        const haystack =
          `${b.experience.programName} ${b.experience.institution.institutionName}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      if (params.dateFrom && b.experienceDate < params.dateFrom) return false;
      if (params.dateTo && b.experienceDate > params.dateTo) return false;
      if (params.status && b.status !== params.status) return false;
      return true;
    });

    switch (params.sort) {
      case 'oldest':
        list = list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case 'price_low':
        list = list.sort((a, b) => (a.totalPrice ?? 0) - (b.totalPrice ?? 0));
        break;
      case 'price_high':
        list = list.sort((a, b) => (b.totalPrice ?? 0) - (a.totalPrice ?? 0));
        break;
      default:
        list = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list;
  }

  async updateBooking(id: string, data: Record<string, unknown>) {
    const bookings = this.bookings();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) throw httpError(404, '예약을 찾을 수 없습니다.');

    // 서버와 같이 날짜와 요청사항만 바꿀 수 있다
    if (data.experienceDate !== undefined) {
      if (!YMD.test(String(data.experienceDate)))
        throw httpError(400, 'experienceDate must be YYYY-MM-DD');
      booking.experienceDate = String(data.experienceDate);
    }
    if (data.specialRequests !== undefined) booking.specialRequests = String(data.specialRequests);
    booking.updatedAt = nowIso();
    this.saveBookings(bookings);
    return booking;
  }

  async cancelBooking(id: string) {
    const bookings = this.bookings();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) throw httpError(404, '예약을 찾을 수 없습니다.');
    booking.status = 'CANCELLED';
    booking.updatedAt = nowIso();
    this.saveBookings(bookings);
    return booking;
  }

  // 후기
  private reviews(): LocalReview[] {
    return read<LocalReview[]>(KEY.reviews, []);
  }

  async createReview(data: { bookingId: string; rating: number; reviewText: string }) {
    const booking = await this.getBookingById(data.bookingId);
    const review: LocalReview = {
      id: newId(),
      bookingId: data.bookingId,
      experienceId: booking.experienceId,
      rating: data.rating,
      reviewText: data.reviewText,
      helpfulCount: 0,
      createdAt: nowIso(),
    };
    // 예약 하나에 후기 하나: 다시 쓰면 바꾼다
    write(KEY.reviews, [...this.reviews().filter((r) => r.bookingId !== data.bookingId), review]);
    return review;
  }

  async getReviewsByExperience(experienceId: string, limit = 10, offset = 0) {
    return this.reviews()
      .filter((r) => r.experienceId === experienceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(offset, offset + limit);
  }

  async getReviewByBooking(bookingId: string) {
    return this.reviews().find((r) => r.bookingId === bookingId) ?? null;
  }

  async getUserReviews(limit = 20, offset = 0) {
    return [...this.reviews()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(offset, offset + limit);
  }

  async markReviewAsHelpful(reviewId: string) {
    const reviews = this.reviews();
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) throw httpError(404, '후기를 찾을 수 없습니다.');
    review.helpfulCount += 1;
    write(KEY.reviews, reviews);
    return review;
  }

  async getExperienceRating(experienceId: string) {
    const ratings = this.reviews()
      .filter((r) => r.experienceId === experienceId)
      .map((r) => r.rating);
    const average = ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
    return { average, count: ratings.length };
  }

  // 알림: 서버가 없으니 예약과 찜 목록에서 그때그때 만든다
  private async buildNotifications() {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).toISOString();
    const items: Array<{
      id: string;
      title: string;
      message: string;
      type: 'reminder' | 'program';
      createdAt: string;
      actionUrl: string;
      actionLabel: string;
    }> = [];

    for (const booking of this.bookings()) {
      if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') continue;
      const days = daysFromToday(parseYmd(booking.experienceDate), today);
      if (days < 0 || days > 7) continue;
      const when = days === 0 ? '오늘' : days === 1 ? '내일' : `${days}일 후`;
      items.push({
        // 날짜가 바뀌면 새 알림이 되도록 남은 일수를 id에 넣는다
        id: `booking-${booking.id}-d${days}`,
        title: `${when} 체험이 있어요`,
        message: `${booking.experience.programName} · ${booking.experience.institution.institutionName}`,
        type: 'reminder',
        createdAt: startOfToday,
        actionUrl: `/bookings/${booking.id}`,
        actionLabel: '예약 보기',
      });
    }

    const bookmarkedIds = new Set(read<Array<{ id: string }>>(KEY.bookmarks, []).map((b) => b.id));
    if (bookmarkedIds.size > 0) {
      const { programs } = await loadPrograms();
      for (const program of programs) {
        if (!bookmarkedIds.has(program.id) || !program.bookingOpenAt) continue;
        const days = daysFromToday(new Date(program.bookingOpenAt), today);
        if (days < 0 || days > 3) continue;
        items.push({
          id: `open-${program.id}-${program.bookingOpenAt}`,
          title:
            days === 0
              ? '찜한 프로그램 접수가 오늘 시작돼요'
              : `찜한 프로그램 접수가 ${days}일 후 시작돼요`,
          message: program.programName,
          type: 'program',
          createdAt: startOfToday,
          actionUrl: `/experiences/${program.id}`,
          actionLabel: '프로그램 보기',
        });
      }
    }
    return items;
  }

  async getNotifications(params?: Record<string, unknown>) {
    const reads = new Set(read<string[]>(KEY.notificationReads, []));
    const all = (await this.buildNotifications()).map((n) => ({ ...n, isRead: reads.has(n.id) }));
    return params?.includeRead ? all : all.filter((n) => !n.isRead);
  }

  async markNotificationAsRead(id: string) {
    const reads = new Set(read<string[]>(KEY.notificationReads, []));
    reads.add(id);
    write(KEY.notificationReads, [...reads]);
    return { id, isRead: true };
  }

  async markAllNotificationsAsRead() {
    const reads = new Set(read<string[]>(KEY.notificationReads, []));
    for (const n of await this.buildNotifications()) reads.add(n.id);
    write(KEY.notificationReads, [...reads]);
    return {};
  }

  // 수집: GitHub Actions가 돌리고 결과는 programs.json에 들어 있다
  async getCrawlerStats() {
    return {};
  }

  async getNotificationDeliveryStats() {
    return {};
  }

  async getLatestCrawls(): Promise<LatestCrawl[]> {
    const { generatedAt, sources } = await loadPrograms();
    return sources.map((source) => ({
      adapterName: source.adapterName,
      lastCrawl: {
        id: `${generatedAt}-${source.adapterName}`,
        status: source.ok ? 'SUCCESS' : 'FAILURE',
        crawlStartedAt: source.startedAt,
        crawlCompletedAt: source.completedAt,
        programsFound: source.programsFound,
        programsCreated: source.programsFound,
        programsUpdated: 0,
        errorMessage: source.errorMessage,
      },
    }));
  }

  async triggerCrawler(): Promise<never> {
    throw httpError(400, '수집은 GitHub Actions에서 실행됩니다.');
  }

  async triggerNotificationDelivery() {
    return {};
  }
}

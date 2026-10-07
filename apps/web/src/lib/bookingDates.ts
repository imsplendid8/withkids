const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 'YYYY-MM-DD'를 로컬 자정의 Date로 만든다.
 * new Date('2026-10-05')는 UTC 자정으로 해석되어 UTC보다 늦은 시간대에서는
 * 전날이 되고, 이르면(한국) 오전 9시가 되므로 직접 만든다.
 */
export function parseYmd(ymd: string): Date {
  const [year, month, day] = ymd.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Date를 로컬 기준 'YYYY-MM-DD'로. toISOString()은 UTC라 한국 자정이 전날이 된다. */
export function toLocalYmd(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

/** 오늘(로컬)로부터 며칠 뒤인지. 시각은 무시하고 달력 날짜로만 센다. */
export function daysFromToday(date: Date, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // 서머타임이 있는 시간대에서도 하루가 23/25시간인 날을 반올림으로 흡수한다.
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function dDayLabel(days: number): string {
  if (days === 0) return '오늘';
  if (days === 1) return '내일';
  return `D-${days}`;
}

export function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export interface DatedBooking {
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  experienceDate: string;
  totalPrice?: number | null;
}

/** 대기·확정 상태이면서 오늘 이후인 예약을 가까운 날짜 순으로. */
export function selectUpcoming<T extends DatedBooking>(
  bookings: T[],
  now: Date = new Date(),
): Array<{ booking: T; date: Date; days: number }> {
  return bookings
    .filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED')
    .map((booking) => {
      const date = parseYmd(booking.experienceDate);
      return { booking, date, days: daysFromToday(date, now) };
    })
    .filter(({ days }) => days >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** 체험일이 이번 달인 예약의 금액 합. 취소한 예약은 뺀다. */
export function sumMonthSpend(bookings: DatedBooking[], now: Date = new Date()): number {
  return bookings
    .filter((b) => b.status !== 'CANCELLED')
    .filter((b) => {
      const date = parseYmd(b.experienceDate);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    })
    .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
}

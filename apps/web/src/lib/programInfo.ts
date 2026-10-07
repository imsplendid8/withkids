import { formatMonthDay, formatTime } from './bookingDates';

/**
 * 서울시 공공서비스예약 정보(이용기간·접수기간·상태)를 화면 문구로 바꾼다.
 * 상시 프로그램은 이용 시작일이 몇 년 전(예: 2015년)인 경우가 많아 그대로 보여주면 헷갈린다.
 */

const dot = (ymd: string) => ymd.replace(/-/g, '.');

/** 이용 기간. 이미 시작했으면 "상시 운영 · ~끝"으로 */
export function servicePeriodLabel(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (!start && !end) return null;
  const todayYmd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  if (start && start <= todayYmd) {
    if (!end) return '운영 중';
    if (end < todayYmd) return `운영 종료 (${dot(end)})`;
    return `운영 중 · ${dot(end)}까지`;
  }
  if (start && end && start !== end) return `${dot(start)} ~ ${dot(end)}`;
  return dot((start ?? end) as string);
}

/** 접수 기간 한 줄 요약 */
export function bookingWindowLabel(
  openAt: string | null | undefined,
  closeAt: string | null | undefined,
  now: Date = new Date()
): string | null {
  const open = openAt ? new Date(openAt) : null;
  const close = closeAt ? new Date(closeAt) : null;
  const at = (d: Date) => `${formatMonthDay(d)} ${formatTime(d)}`;

  if (open && open > now) return `${at(open)} 접수 시작`;
  if (close && close < now) return `접수 마감 (${formatMonthDay(close)})`;
  if (close) return `${at(close)} 접수 마감`;
  if (open) return '접수 중';
  return null;
}

/** 접수 기간 전체 (상세 화면). 오래전에 시작해 계속 접수 중이면 마감만 보여준다 */
export function bookingRangeLabel(
  openAt: string | null | undefined,
  closeAt: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (!openAt && !closeAt) return null;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
      d.getDate()
    ).padStart(2, '0')} ${formatTime(d)}`;
  };
  const opened = openAt ? new Date(openAt) <= now : true;
  const closed = closeAt ? new Date(closeAt) < now : false;
  if (opened && !closed) return closeAt ? `접수 중 · ${fmt(closeAt)} 마감` : '접수 중';
  return `${openAt ? fmt(openAt) : ''} ~ ${closeAt ? fmt(closeAt) : ''}`.trim();
}

export type StatusTone = 'open' | 'soon' | 'closed' | 'unknown';

/** 서울시 상태 이름(접수중/안내중/예약마감/접수종료…)의 색 */
export function statusTone(statusLabel: string | null | undefined, status?: string): StatusTone {
  const label = statusLabel ?? '';
  if (/접수중|예약가능/.test(label) || (!label && status === 'OPEN')) return 'open';
  if (/안내중|예정/.test(label) || (!label && status === 'OPENING_SOON')) return 'soon';
  if (/마감|종료|만료|취소/.test(label) || (!label && status === 'CLOSED')) return 'closed';
  return 'unknown';
}

/** GitHub Pages(https)에서 http 이미지는 막히므로 https로 */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) return trimmed.replace(/^http:/i, 'https:');
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return null;
}

export type BookingState = 'open' | 'soon' | 'closed';

export interface BookingStateFields {
  status?: string;
  statusLabel?: string | null;
  bookingOpenAt?: string | null;
  bookingCloseAt?: string | null;
  serviceEndDate?: string | null;
}

const ymdOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * 지금 신청할 수 있는지. 서울시 상태 이름이 마감이거나, 접수 마감·운영 종료일이 지났으면 마감.
 * 접수 시작 전이거나 '안내중'이면 예정. 그 밖은 접수 중.
 */
export function bookingState(program: BookingStateFields, now: Date = new Date()): BookingState {
  const tone = statusTone(program.statusLabel, program.status);
  const close = program.bookingCloseAt ? new Date(program.bookingCloseAt) : null;
  const open = program.bookingOpenAt ? new Date(program.bookingOpenAt) : null;
  if (tone === 'closed') return 'closed';
  if (close && close < now) return 'closed';
  if (program.serviceEndDate && program.serviceEndDate < ymdOf(now)) return 'closed';
  if ((open && open > now) || tone === 'soon') return 'soon';
  return 'open';
}

export function bookingStateLabel(program: BookingStateFields, now: Date = new Date()): string {
  const state = bookingState(program, now);
  if (state === 'open') return '접수 중';
  if (state === 'soon') return '접수 예정';
  // 서울시가 '예약마감'(정원 참)처럼 이유를 적었으면 그대로
  return program.statusLabel && /마감|종료|만료|취소/.test(program.statusLabel)
    ? program.statusLabel
    : '마감';
}

/** 이용 기간이 [from, to] (YYYY-MM-DD) 와 겹치는지. 기간 정보가 없으면 false */
export function servicePeriodOverlaps(
  start: string | null | undefined,
  end: string | null | undefined,
  from: string,
  to: string
): boolean {
  if (!start && !end) return false;
  const s = start ?? '0000-01-01';
  const e = end ?? '9999-12-31';
  return s <= to && e >= from;
}

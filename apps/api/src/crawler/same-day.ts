/**
 * 상세 안내 글에서 "당일에 가서/당일에 예약해서 이용할 수 있는지"를 읽는다.
 * 서울시 자료에 따로 항목이 없어 문구로 판단한다. 취소·환불 규칙 문장("당일 취소 불가")은 보지 않는다.
 *
 * - online: 이용 당일에도 온라인 예약 가능 ("당일예약은 오전 9시까지 가능", "이용당일 08:00까지 예약")
 * - onsite: 현장 접수·현장 참여 가능 ("잔여석 현장 접수", "예약 없이 현장 방문")
 * - no: 당일 신청 불가 ("수업 당일 신청 시 수강이 어렵습니다", "이용 1일 전까지", "전날 23:59까지 접수")
 */
export type SameDayBooking = 'online' | 'onsite' | 'no';

export interface SameDayResult {
  status: SameDayBooking | null;
  /** 판단 근거가 된 문장 */
  note: string | null;
}

const IGNORE = /취소|환불|불참|노쇼|NO-SHOW|결석|부도|결제|입금|문자|안내문자|연락/i;
const BOOKING_WORDS = /예약|신청|접수|입장|관람|참여|방문/;

const ONLINE = [
  /당일\s*(예약|신청|접수)[은는도]?\s*(가능|(오전|오후)?\s*\d{1,2}\s*시[^.]{0,8}까지\s*가능)/,
  /(이용|관람|교육|체험)\s*당일\s*\d{1,2}\s*[:시][^.]{0,6}까지[^.]{0,6}(예약|신청|접수)?[^.]{0,4}가능/,
  /이용일\s*\d{1,2}:\d{2}\s*까지\s*(예약|신청|접수)/,
  /이용\s*당일\s*운영\s*전까지/,
  /당일까지\s*(예약|신청|접수)\s*(이\s*)?가능/,
];

const ONSITE = [
  /현장\s*(접수|예약|신청|참여|입장|관람)[^.]{0,20}(가능|실시|진행|운영|받습니다)/,
  /(잔여|여유)\s*(석|좌석|인원)[^.]{0,12}현장/,
  /현장\s*(선착순|추가)?\s*(접수|신청|참여)/,
  /예약\s*없이[^.]{0,10}현장/,
  /당일\s*현장\s*(접수|예약|참여)/,
];

const ONSITE_NEGATIVE =
  /현장[^.]{0,15}(불가|어렵|받지\s*않|없습니다|할\s*수\s*없)|전원\s*온라인|현장[,\s]*사전예약\s*불가/;

const NO = [
  /당일[^.]{0,6}(신청|접수|예약)[^.]{0,12}(어렵|불가|받지\s*않|안\s*됩)/,
  /당일에는[^.]{0,10}(예약|신청|접수)이?\s*불가/,
  /\d+\s*일\s*전[^.]{0,20}(까지|마감)[^.]{0,10}(예약|신청|접수)/,
  /(예약|신청|접수)[^.]{0,25}\d+\s*일\s*\s*전[^.]{0,10}(까지|마감)/,
  /(전날|전일|하루\s*전)[^.]{0,20}(까지|마감)[^.]{0,10}(예약|신청|접수)/,
  /(예약|신청|접수)[^.]{0,25}(전날|전일|하루\s*전)[^.]{0,15}까지/,
  /이용일을?\s*미포함/,
  // "예약 기간 : 관람일 14일 전 ~ 관람일 전날 오후 11시" 처럼 기간 끝이 전날·며칠 전
  /(예약|신청|접수)[^.]{0,40}~[^.]{0,12}(전날|전일|\d+\s*일\s*전)/,
  /(\d+\s*일|하루)\s*전[^.]{0,6}(예약|신청)\s*필수/,
];

const tidy = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/^[-*※■□○◎▶►▹✤⦁ㅇ·•\d.)\s]+/, '')
    .trim();

export function detectSameDay(description: string | null | undefined): SameDayResult {
  if (!description) return { status: null, note: null };
  const sentences = description
    .split(/\n|(?<=[.!])\s+/)
    .map(tidy)
    .filter((s) => s && BOOKING_WORDS.test(s) && !IGNORE.test(s));

  const find = (patterns: RegExp[], exclude?: RegExp) =>
    sentences.find((s) => patterns.some((p) => p.test(s)) && !(exclude && exclude.test(s)));

  const online = find(ONLINE);
  if (online) return { status: 'online', note: online.slice(0, 120) };
  const onsite = find(ONSITE, ONSITE_NEGATIVE);
  if (onsite) return { status: 'onsite', note: onsite.slice(0, 120) };
  const no = find(NO);
  if (no) return { status: 'no', note: no.slice(0, 120) };
  return { status: null, note: null };
}

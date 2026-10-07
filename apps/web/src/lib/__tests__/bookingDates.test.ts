import {
  dDayLabel,
  daysFromToday,
  formatMonthDay,
  formatTime,
  parseYmd,
  selectUpcoming,
  sumMonthSpend,
  toLocalYmd,
  type DatedBooking,
} from '../bookingDates';

// 모든 기준 시각은 로컬 생성자로 만든다. 어느 시간대에서 돌려도 같은 결과여야 한다.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('parseYmd / toLocalYmd', () => {
  it('YYYY-MM-DD를 그 날짜의 로컬 자정으로 만든다', () => {
    const date = parseYmd('2026-10-05');
    expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([2026, 10, 5]);
    expect([date.getHours(), date.getMinutes()]).toEqual([0, 0]);
  });

  it('시간이 붙은 값은 날짜 부분만 쓴다', () => {
    expect(toLocalYmd(parseYmd('2026-10-05T15:00:00.000Z'))).toBe('2026-10-05');
  });

  it('자정 직후도 전날로 밀리지 않는다', () => {
    // toISOString()을 쓰면 UTC+9에서 이 값이 2026-09-30이 된다.
    expect(toLocalYmd(at(2026, 10, 1, 0, 5))).toBe('2026-10-01');
  });

  it('왕복해도 날짜가 바뀌지 않는다', () => {
    for (const ymd of ['2026-01-01', '2026-02-28', '2028-02-29', '2026-12-31']) {
      expect(toLocalYmd(parseYmd(ymd))).toBe(ymd);
    }
  });
});

describe('daysFromToday', () => {
  const now = at(2026, 9, 29, 23, 30); // 밤 11시 반

  it('시각과 무관하게 달력 날짜 차이를 센다', () => {
    expect(daysFromToday(at(2026, 9, 29, 0, 0), now)).toBe(0);
    expect(daysFromToday(at(2026, 9, 30, 0, 0), now)).toBe(1);
    expect(daysFromToday(at(2026, 9, 28, 23, 59), now)).toBe(-1);
  });

  it('월·연도 경계를 넘어도 정확하다', () => {
    expect(daysFromToday(parseYmd('2026-10-05'), now)).toBe(6);
    expect(daysFromToday(parseYmd('2027-01-01'), now)).toBe(94);
  });
});

describe('dDayLabel', () => {
  it('오늘·내일은 말로, 그 이후는 D-n으로', () => {
    expect(dDayLabel(0)).toBe('오늘');
    expect(dDayLabel(1)).toBe('내일');
    expect(dDayLabel(11)).toBe('D-11');
  });
});

describe('formatMonthDay / formatTime', () => {
  it('요일까지 한국어로 표기한다', () => {
    expect(formatMonthDay(parseYmd('2026-10-05'))).toBe('10월 5일 (월)');
    expect(formatMonthDay(parseYmd('2026-09-29'))).toBe('9월 29일 (화)');
  });

  it('시각은 24시간제 두 자리로', () => {
    expect(formatTime(at(2026, 10, 1, 9, 5))).toBe('09:05');
    expect(formatTime(at(2026, 10, 1, 14, 0))).toBe('14:00');
  });
});

describe('selectUpcoming', () => {
  const now = at(2026, 9, 29, 10, 0);
  const booking = (
    id: string,
    experienceDate: string,
    status: DatedBooking['status'] = 'CONFIRMED',
  ) => ({ id, experienceDate, status });

  it('대기·확정이면서 오늘 이후인 예약만, 가까운 순으로', () => {
    const result = selectUpcoming(
      [
        booking('later', '2026-10-10', 'PENDING'),
        booking('past', '2026-09-22'),
        booking('today', '2026-09-29'),
        booking('cancelled', '2026-10-01', 'CANCELLED'),
        booking('completed', '2026-10-02', 'COMPLETED'),
        booking('tomorrow', '2026-09-30'),
      ],
      now,
    );

    expect(result.map((r) => r.booking.id)).toEqual(['today', 'tomorrow', 'later']);
    expect(result.map((r) => r.days)).toEqual([0, 1, 11]);
  });

  it('예약이 없으면 빈 배열', () => {
    expect(selectUpcoming([], now)).toEqual([]);
  });
});

describe('sumMonthSpend', () => {
  const now = at(2026, 9, 29, 10, 0);

  it('체험일이 이번 달인 예약 금액을 더하고 취소 건은 뺀다', () => {
    const total = sumMonthSpend(
      [
        { status: 'CONFIRMED', experienceDate: '2026-09-30', totalPrice: 96000 },
        { status: 'COMPLETED', experienceDate: '2026-09-08', totalPrice: 50000 },
        { status: 'CANCELLED', experienceDate: '2026-09-18', totalPrice: 35000 },
        { status: 'CONFIRMED', experienceDate: '2026-10-01', totalPrice: 70000 },
        { status: 'PENDING', experienceDate: '2026-09-01', totalPrice: null },
      ],
      now,
    );
    expect(total).toBe(146000);
  });

  it('작년 같은 달은 포함하지 않는다', () => {
    expect(
      sumMonthSpend([{ status: 'CONFIRMED', experienceDate: '2025-09-10', totalPrice: 10000 }], now),
    ).toBe(0);
  });

  it('월 첫날과 마지막 날을 경계로 정확히 나눈다', () => {
    const bookings: DatedBooking[] = [
      { status: 'CONFIRMED', experienceDate: '2026-08-31', totalPrice: 1 },
      { status: 'CONFIRMED', experienceDate: '2026-09-01', totalPrice: 10 },
      { status: 'CONFIRMED', experienceDate: '2026-09-30', totalPrice: 100 },
      { status: 'CONFIRMED', experienceDate: '2026-10-01', totalPrice: 1000 },
    ];
    expect(sumMonthSpend(bookings, now)).toBe(110);
  });
});

import { detectSameDay } from './same-day';

// 서울시 공공서비스예약 상세 안내에 실제로 나오는 문장들
describe('detectSameDay', () => {
  it.each([
    ['- 당일예약은 오전 9시까지 가능합니다.', 'online'],
    ['■ 예약 : 이용당일 08:00 까지 예약이 가능합니다.', 'online'],
    ['※ 접수 일시 : 이용일 08:00까지 예약가능합니다.', 'online'],
    ['※ 예약 및 변경은 이용당일 운영 전까지만 가능합니다.', 'online'],
    ['* 인터넷 신청 마감시 현장참여신청 가능(유료시 계좌이체 후)', 'onsite'],
    ['- 예약이 우선이며 잔여 인원에 한해 현장접수가 가능합니다 .', 'onsite'],
    ['※ 예약없이 현장접수도 가능(프로그램 운영시간 : 10:00~18:00)', 'onsite'],
    ['예약방법 : 공공예약사이트, 당일현장예약', 'onsite'],
    ['□ 접수방법: 서울시 공공서비스예약 홈페이지 접수, 현장 접수', 'onsite'],
    ['○ 관람일 당일에는 온라인 예약이 불가하며 현장 접수로만 이용 가능합니다 .', 'onsite'],
    ['- 수업 당일 신청 시 수강이 어렵습니다.', 'no'],
    ['■ 예약은 해당 이용일 3 일전까지 가능합니다 .', 'no'],
    ['■ 접수허용일시 : 이용일을 미포함하여 이용일로부터 30일 전 00시 ~ 이용 1일 전까지', 'no'],
    ['○ 예약 기간 : 관람일 14 일 전 오전 9 시 ~ 관람일 전날 오후 11 시', 'no'],
    ['이용 예정일 전날 17:00까지 예약이 가능합니다.', 'no'],
    [
      '☞ 심폐소생술 교육은 사전준비가 필요하므로 당일 접수는 받지 않으며, 반드시 사전에 예약하시기 바랍니다.',
      'no',
    ],
  ])('%s → %s', (text, expected) => {
    expect(detectSameDay(text).status).toBe(expected);
  });

  it('취소·환불 규칙과 상관없는 문장은 판단하지 않는다', () => {
    expect(detectSameDay('- 당일취소는 불가합니다. (당일 00시 기준)').status).toBeNull();
    expect(
      detectSameDay('2. 사용일 7일 전까지 취소한 경우 또는 예약당일 취소: 이용료 전액 반환').status
    ).toBeNull();
    expect(detectSameDay('강의 당일 강사님께서 답변해 주실 예정입니다.').status).toBeNull();
    expect(detectSameDay(null).status).toBeNull();
  });

  it('현장 접수를 받지 않는다고 하면 현장 가능으로 보지 않는다', () => {
    expect(
      detectSameDay('* 현장 추가 접수는 불가하며 사전 신청 인원만 참여 가능합니다.').status
    ).not.toBe('onsite');
    expect(detectSameDay('○ 현장 관람은 전원 온라인 사전예약입니다.').status).not.toBe('onsite');
    expect(detectSameDay('선정되지 않은 경우, 현장 참여는 어렵습니다.').status).not.toBe('onsite');
  });

  it('여러 문장 중 당일 가능이 우선, 근거 문장을 남긴다', () => {
    const result = detectSameDay(
      '■ 예약은 해당 이용일 3일전까지 가능합니다.\n- 잔여석 현장 접수 가능'
    );
    expect(result).toEqual({ status: 'onsite', note: '잔여석 현장 접수 가능' });
  });
});

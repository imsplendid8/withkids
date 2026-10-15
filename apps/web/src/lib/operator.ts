/**
 * 운영자 도구(데이터 수집 상태·지금 수집하기)는 일반 사용자에게 보이지 않게 한다.
 * /settings?operator=1 로 한 번 켜 두면 그 기기에서만 보인다. 보안 기능이 아니라 화면 정리용이다
 * (수집 실행은 GitHub 권한이 있어야 하므로 링크가 보여도 남이 실행할 수 없다).
 */
const OPERATOR_KEY = 'withkids.operator';

export function isOperator(): boolean {
  try {
    return localStorage.getItem(OPERATOR_KEY) === '1';
  } catch {
    return false;
  }
}

export function setOperator(on: boolean): void {
  try {
    if (on) localStorage.setItem(OPERATOR_KEY, '1');
    else localStorage.removeItem(OPERATOR_KEY);
  } catch {
    /* 저장소를 못 쓰면 이번 방문에만 */
  }
}

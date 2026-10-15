import type { Child } from './eligibility';

/**
 * 아이 이름·생일. 참여 대상 필터가 쓴다.
 * 이 브라우저에 저장하고, 구글 로그인을 쓰면 계정(Firestore users/{uid})에도 올라간다 (cloud.ts).
 * 개인정보처리방침(pages/privacy.tsx)에 적힌 내용과 맞춰야 한다.
 */
export const CHILDREN_KEY = 'withdkis.children';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isValidChild(value: unknown): value is Child {
  const child = value as Child;
  return (
    Boolean(child) &&
    typeof child.id === 'string' &&
    typeof child.name === 'string' &&
    typeof child.birthDate === 'string' &&
    YMD.test(child.birthDate)
  );
}

export function getChildren(): Child[] {
  try {
    const raw = localStorage.getItem(CHILDREN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidChild) : [];
  } catch {
    return [];
  }
}

/** 생일 순(첫째가 앞)으로 저장한다 */
export function saveChildren(children: Child[]): Child[] {
  const sorted = [...children].sort((a, b) => a.birthDate.localeCompare(b.birthDate));
  localStorage.setItem(CHILDREN_KEY, JSON.stringify(sorted));
  return sorted;
}

const ORDINALS = ['첫째', '둘째', '셋째', '넷째', '다섯째'];

export function defaultChildName(index: number): string {
  return ORDINALS[index] ?? `${index + 1}째`;
}

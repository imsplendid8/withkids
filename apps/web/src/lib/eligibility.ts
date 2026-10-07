/**
 * 기관이 적은 "이용 대상" 문구(서울시 USETGTINFO 등)를 읽어 아이별 참여 가능 여부를 판단한다.
 *
 * 문구는 "구분(세부), 구분(세부)" 모양이다. 예)
 *   "가족(만3세 이상 유아 및 초등학교 저학년 어린이와 이를 동반한 보호자)"
 *   "성인(성인), 청소년(중,고등학생), 초등학생(2019년생~2014년생)"
 *   "제한없음(초등6학년까지 보호자 동반 필수)"   ← 나이 제한이 아니라 보호자 규칙
 * 구분 하나라도 아이를 받아주면 참여 가능으로 본다.
 *
 * 나이는 기본적으로 만 나이로 읽는다(2023년부터 법정 기준). "만"이 붙은 숫자는 항상 만 나이다.
 * 학년은 3월에 시작하는 학기 기준, 제 나이에 입학했다고 가정한다.
 */

export type AgeBasis = 'international' | 'year';

export interface ChildFacts {
  /** 만 나이 */
  age: number;
  /** "N세"(만 표시 없음)를 읽을 때 쓰는 나이 */
  defaultAge: number;
  months: number;
  /** 1~6 초등, 7~9 중, 10~12 고. 0 이하는 취학 전 */
  grade: number;
  birthYear: number;
}

type Pred = (child: ChildFacts) => boolean;

export interface TargetRule {
  /** 문구가 없어 판단할 수 없음 */
  known: boolean;
  /** 보호자(어른)도 함께 참여하는 형태인지 — 가족·제한없음 대상이거나 동반 문구가 있음 */
  adultsJoin: boolean;
  admits: Pred;
}

// ── 아이 정보 ────────────────────────────────────────────────

/** YYYY-MM-DD 생일과 기준일로 나이·학년을 계산한다 */
export function childFacts(
  birthDate: string,
  on: Date,
  basis: AgeBasis = 'international'
): ChildFacts {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const y = on.getFullYear();
  const m = on.getMonth() + 1;
  const d = on.getDate();

  const hadBirthday = m > bm || (m === bm && d >= bd);
  const age = y - by - (hadBirthday ? 0 : 1);
  const months = (y - by) * 12 + (m - bm) - (d < bd ? 1 : 0);
  const schoolYear = m >= 3 ? y : y - 1;

  return {
    age,
    defaultAge: basis === 'year' ? y - by : age,
    months,
    grade: schoolYear - by - 6,
    birthYear: by,
  };
}

// ── 문구 해석 ────────────────────────────────────────────────

type Stage =
  'infant' | 'preschool' | 'child' | 'elementary' | 'middle' | 'high' | 'teen' | 'adult' | 'any';

interface Point {
  lo: Pred;
  hi: Pred;
  /** 숫자(나이·학년·개월·출생연도)로 적힌 조건 */
  numeric: boolean;
  birthYear?: boolean;
  /** "5~7세", "2014~2020년생" 처럼 이미 양쪽 경계가 있는 조건 (뒤의 이상·까지는 무시) */
  range?: boolean;
  stage?: Stage;
}

interface Token extends Point {
  start: number;
  end: number;
}

interface Term {
  pred: Pred;
  bound: 'exact' | 'lo' | 'hi';
  numeric: boolean;
  birthYear: boolean;
  stage?: Stage;
  /** 유아/어린이 같은 명사가 숫자 조건과 붙어 하나가 된 경우 */
  merged: boolean;
  /** 구절 안의 위치 (붙어 있는 조건인지 보려고) */
  start: number;
  end: number;
}

const yes: Pred = () => true;
const gradeAtLeast =
  (g: number): Pred =>
  (c) =>
    c.grade >= g;
const gradeAtMost =
  (g: number): Pred =>
  (c) =>
    c.grade <= g;

const STAGES: Record<Stage, { lo: Pred; hi: Pred }> = {
  infant: { lo: yes, hi: (c) => c.months < 36 },
  preschool: { lo: yes, hi: gradeAtMost(0) },
  child: { lo: yes, hi: gradeAtMost(6) },
  elementary: { lo: gradeAtLeast(1), hi: gradeAtMost(6) },
  middle: { lo: gradeAtLeast(7), hi: gradeAtMost(9) },
  high: { lo: gradeAtLeast(10), hi: gradeAtMost(12) },
  teen: { lo: gradeAtLeast(7), hi: gradeAtMost(12) },
  adult: { lo: (c) => c.age >= 19, hi: yes },
  any: { lo: yes, hi: yes },
};

const KID_STAGES: Stage[] = ['infant', 'preschool', 'child', 'elementary'];
const GENERIC_CHILD: Stage[] = ['child'];
const MERGEABLE: Stage[] = ['infant', 'preschool', 'child'];

const ELEM_PREFIX = '(?:초등학교|초등학생|초등생|초등|초교생|초교|초)';

const agePred =
  (explicitMan: boolean, cmp: (age: number) => boolean): Pred =>
  (c) =>
    cmp(explicitMan ? c.age : c.defaultAge);

function numericRange(lo: Pred, hi: Pred, extra: Partial<Point> = {}): Point {
  return { lo, hi, numeric: true, ...extra };
}

/** 앞에 있는 규칙이 우선. 겹치는 자리는 건너뛴다 */
const TOKEN_RULES: Array<{ re: RegExp; point: (m: RegExpExecArray) => Point }> = [
  {
    // 2021년생 5세 이상 → 2021년 이전 출생
    re: /((?:19|20)\d{2})년생(?:\d{1,2}세)?(?:이상|이전)/g,
    point: (m) => numericRange((c) => c.birthYear <= +m[1], yes, { birthYear: true }),
  },
  {
    re: /((?:19|20)\d{2})년?생?[~-]((?:19|20)\d{2})년?생?/g,
    point: (m) => {
      const [a, b] = [+m[1], +m[2]].sort((x, y) => x - y);
      // 먼저 태어난 쪽(작은 연도)이 나이 많은 쪽
      return numericRange(
        (c) => c.birthYear <= b,
        (c) => c.birthYear >= a,
        {
          birthYear: true,
          range: true,
        }
      );
    },
  },
  {
    re: /((?:19|20)\d{2})년생/g,
    point: (m) =>
      numericRange(
        (c) => c.birthYear <= +m[1],
        (c) => c.birthYear >= +m[1],
        { birthYear: true }
      ),
  },
  {
    re: /(\d{1,3})개월/g,
    point: (m) =>
      numericRange(
        (c) => c.months >= +m[1],
        (c) => c.months <= +m[1]
      ),
  },
  {
    re: new RegExp(`${ELEM_PREFIX}?(\\d)[~-]${ELEM_PREFIX}?(\\d)학년`, 'g'),
    point: (m) => numericRange(gradeAtLeast(+m[1]), gradeAtMost(+m[2]), { range: true }),
  },
  {
    re: new RegExp(`${ELEM_PREFIX}?((?:\\d,)+\\d)학년`, 'g'),
    point: (m) => {
      const grades = m[1].split(',').map(Number);
      return numericRange(gradeAtLeast(Math.min(...grades)), gradeAtMost(Math.max(...grades)), {
        range: true,
      });
    },
  },
  {
    re: new RegExp(`${ELEM_PREFIX}(\\d)(?!\\d)(?:학년|년)?|(\\d)학년`, 'g'),
    point: (m) => {
      const g = +(m[1] ?? m[2]);
      return numericRange(gradeAtLeast(g), gradeAtMost(g));
    },
  },
  {
    re: /(?:초등학교|초등학생|초등생|초등|초교)?(저학년|고학년|전학년)/g,
    point: (m) => {
      const [a, b] = m[1] === '저학년' ? [1, 3] : m[1] === '고학년' ? [4, 6] : [1, 6];
      return numericRange(gradeAtLeast(a), gradeAtMost(b), { range: true });
    },
  },
  {
    re: /(만)?(\d{1,2})세?[~-](만)?(\d{1,2})세/g,
    point: (m) => {
      const man = Boolean(m[1] || m[3]);
      return numericRange(
        agePred(man, (age) => age >= +m[2]),
        agePred(man, (age) => age <= +m[4]),
        { range: true }
      );
    },
  },
  {
    re: /(만)?((?:\d{1,2}세?,)+\d{1,2})세/g,
    point: (m) => {
      const ages = m[2].split(',').map((v) => parseInt(v, 10));
      const man = Boolean(m[1]);
      return numericRange(
        agePred(man, (age) => age >= Math.min(...ages)),
        agePred(man, (age) => age <= Math.max(...ages)),
        { range: true }
      );
    },
  },
  {
    re: /(만)?(\d{1,2})세/g,
    point: (m) => {
      const man = Boolean(m[1]);
      return numericRange(
        agePred(man, (age) => age >= +m[2]),
        agePred(man, (age) => age <= +m[2])
      );
    },
  },
];

const STAGE_WORDS: Array<[RegExp, Stage | [Stage, Stage]]> = [
  [/초,?중,?고등?(?:학생|학교)?/g, ['elementary', 'high']],
  [/중,?고등?학생|중,?고등|중·고등|중고교/g, 'teen'],
  [/영유아/g, 'preschool'],
  [/영아/g, 'infant'],
  [/어린이집|유치원|원아|미취학|유아/g, 'preschool'],
  [/초등학교|초등학생|초등생|초등|초교생|초교/g, 'elementary'],
  [/어린이|아동|아이|자녀/g, 'child'],
  [/중학생|중학교|중등/g, 'middle'],
  [/고등학생|고등학교|고교/g, 'high'],
  [/청소년|미성년/g, 'teen'],
  [/성인|어른/g, 'adult'],
  [/누구나|가족|제한없음/g, 'any'],
];

function tokenize(text: string): Token[] {
  const taken: Array<[number, number]> = [];
  const tokens: Token[] = [];
  const free = (start: number, end: number) => taken.every(([s, e]) => end <= s || start >= e);
  const add = (start: number, end: number, point: Point) => {
    if (!free(start, end)) return;
    taken.push([start, end]);
    tokens.push({ start, end, ...point });
  };

  for (const rule of TOKEN_RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text))) add(m.index, m.index + m[0].length, rule.point(m));
  }
  for (const [re, stage] of STAGE_WORDS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const point: Point = Array.isArray(stage)
        ? { lo: STAGES[stage[0]].lo, hi: STAGES[stage[1]].hi, numeric: false, stage: stage[0] }
        : { ...STAGES[stage], numeric: false, stage };
      add(m.index, m.index + m[0].length, point);
    }
  }
  return tokens.sort((a, b) => a.start - b.start);
}

const and =
  (...preds: Pred[]): Pred =>
  (c) =>
    preds.every((p) => p(c));
const or =
  (preds: Pred[]): Pred =>
  (c) =>
    preds.some((p) => p(c));

/** 한 구절(쉼표로 나눈 조각)의 조건들 */
function clauseTerms(clause: string): Term[] {
  const tokens = tokenize(clause);
  const terms: Term[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const next = tokens[i + 1];
    const gap = clause.slice(tok.end, next ? next.start : clause.length);
    const base = {
      numeric: tok.numeric,
      birthYear: Boolean(tok.birthYear),
      stage: tok.stage,
      merged: false,
      start: tok.start,
      end: tok.end,
    };

    // 범위: "6세~초등학생", "6세이상~성인", "초등학생 ~ 고등학생"
    if (next && /^[()]*(?:이상|부터)?[~-][()]*$/.test(gap)) {
      terms.push({
        ...base,
        numeric: tok.numeric || next.numeric,
        stage: KID_STAGES.includes(tok.stage as Stage) ? tok.stage : next.stage,
        pred: and(tok.lo, next.hi),
        bound: 'exact',
        end: next.end,
      });
      i++;
      continue;
    }

    const after = gap.replace(/^[()]+/, '');
    if (tok.range) terms.push({ ...base, pred: and(tok.lo, tok.hi), bound: 'exact' });
    else if (/^(?:이상|부터|이후)/.test(after)) terms.push({ ...base, pred: tok.lo, bound: 'lo' });
    else if (/^초과/.test(after)) terms.push({ ...base, pred: (c) => !tok.hi(c), bound: 'lo' });
    else if (/^(?:이하|까지)/.test(after)) terms.push({ ...base, pred: tok.hi, bound: 'hi' });
    else if (/^미만/.test(after)) terms.push({ ...base, pred: (c) => !tok.lo(c), bound: 'hi' });
    else terms.push({ ...base, pred: and(tok.lo, tok.hi), bound: 'exact' });
  }

  // "만3세 이상 유아", "5~7세 유아", "유아(36개월이상)" → 숫자 조건과 그 명사를 함께 만족
  // "유아.초등 저학년"처럼 구분 기호로 나열한 것은 따로 본다
  const adjacent = (a: Term, b: Term) =>
    /^[()]*(?:이상|이하|부터|까지|미만|이후)?[()]*(?:의|인)?[()]*$/.test(
      clause.slice(a.end, b.start)
    );
  const merged: Term[] = [];
  for (let i = 0; i < terms.length; i++) {
    const cur = terms[i];
    const nxt = terms[i + 1];
    if (nxt && !adjacent(cur, nxt)) {
      merged.push(cur);
    } else if (nxt && cur.numeric && !nxt.numeric && MERGEABLE.includes(nxt.stage as Stage)) {
      merged.push({
        ...cur,
        pred: and(cur.pred, nxt.pred),
        bound: 'exact',
        stage: nxt.stage,
        merged: true,
      });
      i++;
    } else if (nxt && !cur.numeric && MERGEABLE.includes(cur.stage as Stage) && nxt.numeric) {
      merged.push({
        ...nxt,
        pred: and(cur.pred, nxt.pred),
        bound: 'exact',
        stage: cur.stage,
        merged: true,
      });
      i++;
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

const GROUP_ONLY = /단체|학급|기관|어린이집|유치원|원아|돌봄|지역아동센터|동아리/;
const NOT_GROUP = /가족|개인|동반/;
const SPECIAL_AUDIENCE = /난임|임산부|임신부|예비|다문화|외국인만|특수학급|갱년기/;
const GUARDIAN_RULE = /보호자|동반필수|동반必|동행|동반신청|동반참여/;
const GUARDIAN_SCOPE = /까지|이하|미만|미취학|미성년|영유아|아동은|저학년은|노약자|동반시/;
const NEGATION = /불가|제외|X\)*$|x\)*$/;

/** 세부 문구에서 조건 목록을 뽑는다. 보호자 규칙·제외 문구는 나이 조건으로 보지 않는다 */
function detailTerms(detail: string): Term[] {
  const clauses = detail.split(/,(?!\d)|\/|※|=|;/);
  const terms: Term[] = [];
  for (const clause of clauses) {
    if (!clause) continue;
    if (NEGATION.test(clause)) {
      // "미취학 아동 참여 불가" → 초등학생부터
      if (/미취학/.test(clause)) {
        terms.push({
          pred: gradeAtLeast(1),
          bound: 'lo',
          numeric: true,
          birthYear: false,
          merged: false,
          start: 0,
          end: 0,
        });
      }
      continue;
    }
    if (GUARDIAN_RULE.test(clause) && GUARDIAN_SCOPE.test(clause) && !/이상|부터/.test(clause))
      continue;
    terms.push(...clauseTerms(clause));
  }
  return terms;
}

function combine(terms: Term[]): Pred {
  const exact = terms.filter((t) => t.bound === 'exact').map((t) => t.pred);
  const los = terms.filter((t) => t.bound === 'lo').map((t) => t.pred);
  const his = terms.filter((t) => t.bound === 'hi').map((t) => t.pred);
  const bounded =
    los.length || his.length ? [and(los.length ? or(los) : yes, his.length ? or(his) : yes)] : [];
  return or([...exact, ...bounded]);
}

const isKidTerm = (t: Term) => t.numeric || KID_STAGES.includes(t.stage as Stage);

/** 세부 문구의 조건. 조건이 없으면 null (구분의 기본값을 쓴다) */
function detailPred(terms: Term[]): { pred: Pred; kid: boolean; hasLo: boolean } | null {
  let kid = terms.filter(isKidTerm);
  if (kid.some((t) => t.birthYear)) kid = kid.filter((t) => t.numeric);
  else if (kid.some((t) => t.numeric)) {
    // "만3세 이상 유아 및 초등 저학년 어린이"의 '어린이'는 앞 조건을 부르는 말일 뿐
    kid = kid.filter((t) => t.merged || !GENERIC_CHILD.includes(t.stage as Stage));
  }

  if (kid.length) {
    const bounded = terms.filter((t) => !isKidTerm(t) && t.bound !== 'exact');
    const used = [...kid, ...bounded];
    return {
      pred: combine(used),
      kid: true,
      hasLo: used.some(
        (t) => isKidTerm(t) && (t.bound === 'lo' || (t.bound === 'exact' && t.numeric))
      ),
    };
  }
  if (terms.some((t) => t.stage === 'any')) return { pred: yes, kid: false, hasLo: false };
  const others = terms.filter((t) => t.stage !== 'any');
  if (others.length) {
    return {
      pred: combine(others),
      kid: false,
      hasLo: false,
    };
  }
  return null;
}

type LabelKind = 'open' | 'kid' | 'teen' | 'adult' | 'none';

const LABELS: Record<string, { kind: LabelKind; stage?: Stage; widenedBy?: RegExp }> = {
  제한없음: { kind: 'open' },
  가족: { kind: 'open' },
  // "유아(유아.초등 저학년 동반 부모)" 처럼 세부 문구가 다른 단계까지 적었을 때만 넓힌다
  유아: { kind: 'kid', stage: 'preschool', widenedBy: /초등|초교|학년|학생/ },
  어린이: { kind: 'kid', stage: 'child', widenedBy: /중학|고등|청소년/ },
  초등학생: { kind: 'kid', stage: 'elementary', widenedBy: /유아|미취학|영아|\d세/ },
  청소년: { kind: 'teen', stage: 'teen' },
  중학생: { kind: 'teen', stage: 'middle' },
  고등학생: { kind: 'teen', stage: 'high' },
  성인: { kind: 'adult' },
};

/** 괄호 밖의 쉼표로만 나눈다 */
function splitSegments(text: string): Array<{ label: string; detail: string }> {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);

  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const open = part.indexOf('(');
      if (open < 0) return { label: part, detail: '' };
      const inner = part.slice(open + 1).replace(/\)\s*$/, '');
      return { label: part.slice(0, open).trim(), detail: inner };
    });
}

function segmentPred(label: string, rawDetail: string): Pred | null {
  const detail = rawDetail.replace(/\s+/g, '');
  const info: (typeof LABELS)[string] = LABELS[label] ?? { kind: 'none' };
  if (info.kind === 'none') return null;
  if (detail && SPECIAL_AUDIENCE.test(detail)) return null;
  if (detail && GROUP_ONLY.test(detail) && !NOT_GROUP.test(detail)) return null;

  const parsed = detail ? detailPred(detailTerms(detail)) : null;
  const labelPred = info.stage ? and(STAGES[info.stage].lo, STAGES[info.stage].hi) : yes;

  switch (info.kind) {
    case 'open':
      return parsed?.pred ?? yes;
    case 'kid':
      if (!parsed) return labelPred;
      // "유아(5~7세)"는 취학 전 아이만: 만 7세 초등 1학년은 빠진다
      return info.widenedBy?.test(detail) ? parsed.pred : and(parsed.pred, labelPred);
    case 'teen':
      return parsed?.kid ? parsed.pred : labelPred;
    case 'adult':
      // "성인(초등5학년 이상 보호자와 함께)" 처럼 아이 하한이 적힌 경우만 아이도 참여
      return parsed?.kid && parsed.hasLo ? parsed.pred : null;
    default:
      return null;
  }
}

const ADULT_LABELS = /제한없음|가족|성인/;
const ACCOMPANY = /동반|가족|보호자|부모|양육자|함께/;

export function parseTarget(targetInfo: string | null | undefined): TargetRule {
  const text = (targetInfo ?? '').trim();
  if (!text) return { known: false, adultsJoin: false, admits: () => false };

  const segments = splitSegments(text);
  const preds = segments
    .map((s) => segmentPred(s.label, s.detail))
    .filter((p): p is Pred => p !== null);

  return {
    known: true,
    adultsJoin: segments.some((s) => ADULT_LABELS.test(s.label)) || ACCOMPANY.test(text),
    admits: or(preds),
  };
}

// ── 필터 ─────────────────────────────────────────────────

export interface Child {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  birthDate: string;
}

export interface ChildEligibility {
  childId: string;
  name: string;
  eligible: boolean;
  age: number;
}

export interface ProgramEligibility {
  known: boolean;
  adultsJoin: boolean;
  children: ChildEligibility[];
}

/** 참여 시점 나이로 본다. 체험일이 지났거나 모르면 오늘 기준 */
export function referenceDate(experienceDate: string | null | undefined, today: Date): Date {
  if (!experienceDate) return today;
  const [y, m, d] = experienceDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) || date < today ? today : date;
}

export function evaluateProgram(
  targetInfo: string | null | undefined,
  children: Child[],
  on: Date,
  basis: AgeBasis = 'international'
): ProgramEligibility {
  const rule = parseTarget(targetInfo);
  return {
    known: rule.known,
    adultsJoin: rule.adultsJoin,
    children: children.map((child) => {
      const facts = childFacts(child.birthDate, on, basis);
      return {
        childId: child.id,
        name: child.name,
        eligible: rule.known && rule.admits(facts),
        age: facts.age,
      };
    }),
  };
}

/**
 * 참여 대상 필터
 * - all: 전체
 * - family: 온 가족 함께 (아이 모두 + 보호자 참여)
 * - kids: 아이 모두 참여 가능
 * - with:<id>: 그 아이가 참여 가능 (다른 아이는 상관없음)
 * - only:<id>: 아이들 중 그 아이만 참여 가능
 */
export type EligibilityFilter = 'all' | 'family' | 'kids' | `with:${string}` | `only:${string}`;

export function matchesEligibility(result: ProgramEligibility, filter: EligibilityFilter): boolean {
  if (filter === 'all') return true;
  if (!result.known || result.children.length === 0) return false;

  const eligible = result.children.filter((c) => c.eligible);
  const everyone = eligible.length === result.children.length;
  if (filter === 'family') return everyone && result.adultsJoin;
  if (filter === 'kids') return everyone;

  const [mode, childId] = filter.split(':');
  const target = result.children.find((c) => c.childId === childId);
  if (!target?.eligible) return false;
  return mode === 'with' || eligible.length === 1;
}

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { IconType } from 'react-icons';
import {
  FiArchive,
  FiBookOpen,
  FiCamera,
  FiCheck,
  FiCoffee,
  FiDroplet,
  FiFeather,
  FiFlag,
  FiHeart,
  FiHome,
  FiImage,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiShoppingBag,
  FiSliders,
  FiSmile,
  FiStar,
  FiSun,
  FiTool,
  FiTrash2,
  FiTriangle,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { SourceNote } from '@/components/SourceNote';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuthStore } from '@/store/authStore';
import { defaultChildName, getChildren } from '@/lib/children';
import type { Child } from '@/lib/eligibility';
import { mapSearchUrl, tourFits } from '@/lib/places';
import { PLACE_CATEGORIES, type PlaceCategory } from '@/data/placesGuide';
import {
  DEFAULT_GUIDE_FILTER,
  EMPTY_MY_PLACES,
  GUIDE_FESTIVALS,
  GUIDE_PLACES,
  GUIDE_TOURS,
  SEASON_LABEL,
  filterGuide,
  groupByArea,
  importMarksFromMemo,
  loadMyPlaces,
  makeCustomPlace,
  placeArea,
  regionOf,
  saveMyPlaces,
  seasonOf,
  setMark,
  type GuideFilter,
  type GuidePlace,
  type MarkFilter,
  type MyPlaces,
  type PlaceMark,
  type Region,
  type Season,
} from '@/lib/placeGuide';

type Tab = 'places' | 'tours' | 'festivals';

const chip = (on: boolean) =>
  `shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium ${
    on ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`;

const REGIONS: Array<[Region | '', string]> = [
  ['', '전체'],
  ['seoul', '서울'],
  ['metro', '경기·인천'],
  ['other', '그 밖'],
];

const MARKS: Array<[MarkFilter, string]> = [
  ['all', '전체'],
  ['notVisited', '안 가 본 곳'],
  ['want', '가 보고 싶은 곳'],
  ['visited', '가 본 곳'],
  ['revisit', '또 갈 곳'],
];

export default function PlacesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [mine, setMine] = useState<MyPlaces>(EMPTY_MY_PLACES);
  const [kids, setKids] = useState<Child[]>([]);
  const [tab, setTab] = useState<Tab>('places');
  const [filter, setFilter] = useState<GuideFilter>(DEFAULT_GUIDE_FILTER);
  const [open, setOpen] = useState<GuidePlace | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setMine(loadMyPlaces());
    setKids(getChildren());
  }, []);

  const save = (next: MyPlaces) => {
    saveMyPlaces(next);
    setMine(next);
  };
  const set = (patch: Partial<GuideFilter>) => setFilter((f) => ({ ...f, ...patch }));

  const allPlaces = useMemo(() => [...GUIDE_PLACES, ...mine.custom], [mine.custom]);
  const shown = useMemo(
    () => filterGuide(allPlaces, mine.marks, filter, today),
    [allPlaces, mine.marks, filter, today]
  );
  const groups = useMemo(() => groupByArea(shown), [shown]);

  const areas = useMemo(
    () =>
      groupByArea(
        allPlaces.filter((p) => !filter.region || regionOf(p.sido) === filter.region)
      ).map((g) => g.area),
    [allPlaces, filter.region]
  );
  const categories = useMemo(
    () => PLACE_CATEGORIES.filter((c) => c !== '기타' && allPlaces.some((p) => p.category === c)),
    [allPlaces]
  );
  const markLabel = Object.fromEntries(MARKS) as Record<MarkFilter, string>;
  type Active = { label: string; clear: Partial<GuideFilter> };
  const extraFilters = (
    [
      filter.sigungu ? { label: filter.sigungu, clear: { sigungu: '' } } : null,
      filter.category ? { label: filter.category, clear: { category: '' } } : null,
      filter.indoor ? { label: '실내', clear: { indoor: false } } : null,
      filter.outdoor ? { label: '야외', clear: { outdoor: false } } : null,
      filter.thisSeason
        ? { label: `${SEASON_LABEL[seasonOf(today)]}에 좋은 곳`, clear: { thisSeason: false } }
        : null,
      filter.night ? { label: '야경', clear: { night: false } } : null,
      filter.mark !== 'all'
        ? { label: markLabel[filter.mark], clear: { mark: 'all' as MarkFilter } }
        : null,
    ] as Array<Active | null>
  ).filter((f): f is Active => f !== null);
  const visitedCount = Object.values(mine.marks).filter((m) => m.visited).length;
  const revisitCount = Object.values(mine.marks).filter((m) => m.revisit).length;
  const season = seasonOf(today);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-5">
          <h1 className="text-3xl font-bold text-gray-900">가볼 만한 곳</h1>
          <p className="text-gray-600 mt-1">
            {GUIDE_PLACES.length}곳{visitedCount > 0 && ` · 가 본 곳 ${visitedCount}`}
            {revisitCount > 0 && ` · 또 갈 곳 ${revisitCount}`}
          </p>
        </div>

        <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 mb-5">
          {(
            [
              ['places', '장소'],
              ['tours', '나이별 견학'],
              ['festivals', '축제 달력'],
            ] as Array<[Tab, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`py-2 rounded-lg text-sm font-semibold ${
                tab === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'places' && (
          <>
            <div className="relative mb-3">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filter.search}
                onChange={(e) => set({ search: e.target.value })}
                placeholder="과학관, 파주처럼 검색"
                className="input-field pl-10"
              />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-1.5 overflow-x-auto flex-1 -ml-4 pl-4 pr-1">
                {REGIONS.map(([value, label]) => (
                  <button
                    key={value || 'all'}
                    type="button"
                    onClick={() => set({ region: value, sigungu: '' })}
                    className={chip(filter.region === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setFiltering(true)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border ${
                  extraFilters.length
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-gray-200 text-gray-700 bg-white'
                }`}
              >
                <FiSliders size={14} />
                필터{extraFilters.length > 0 && ` ${extraFilters.length}`}
              </button>
            </div>

            {extraFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {extraFilters.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => set(f.clear)}
                    className="inline-flex items-center gap-1 pl-3 pr-2 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium"
                    aria-label={`${f.label} 조건 빼기`}
                  >
                    {f.label}
                    <FiX size={14} />
                  </button>
                ))}
              </div>
            )}

            <p className="text-sm text-gray-500 mb-4">
              <span className="font-semibold text-gray-900 tabular-nums">{shown.length}</span>곳
            </p>

            {groups.length === 0 ? (
              <p className="text-center text-gray-500 py-12">조건에 맞는 곳이 없어요</p>
            ) : (
              <div className="space-y-4">
                {groups.map(({ area, places }) => (
                  <section key={area}>
                    <h2 className="sticky top-14 lg:top-16 z-10 -mx-4 px-4 py-2 bg-slate-50 text-sm font-semibold text-gray-600">
                      {area} <span className="font-normal text-gray-400">{places.length}</span>
                    </h2>
                    <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                      {places.map((p) => (
                        <PlaceRow
                          key={p.id}
                          place={p}
                          mark={mine.marks[p.id]}
                          onOpen={() => setOpen(p)}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            <div className="flex flex-col items-center gap-2 mt-8">
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="btn-secondary inline-flex items-center gap-1.5"
              >
                <FiPlus /> 목록에 없는 곳 추가
              </button>
              <button
                type="button"
                onClick={() => setImporting(true)}
                className="text-xs text-gray-500 underline"
              >
                예전 메모에서 가 본 곳 표시 가져오기
              </button>
            </div>
          </>
        )}

        {tab === 'tours' && <ToursTab kids={kids} today={today} />}
        {tab === 'festivals' && <FestivalsTab today={today} />}
        <SourceNote
          sources={[]}
          note="아이와 직접 다녀온 곳을 정리한 목록이에요 (2026년 10월). 운영 시간·요금·나이 조건은 방문 전에 꼭 확인하세요."
        />
      </div>

      {open && (
        <PlaceSheet
          place={open}
          mark={mine.marks[open.id] ?? {}}
          onClose={() => setOpen(null)}
          onMark={(mark) => save(setMark(mine, open.id, mark))}
          onDelete={
            open.custom
              ? () => {
                  save(
                    setMark(
                      { ...mine, custom: mine.custom.filter((c) => c.id !== open.id) },
                      open.id,
                      {}
                    )
                  );
                  setOpen(null);
                }
              : undefined
          }
        />
      )}
      {adding && (
        <AddSheet
          onClose={() => setAdding(false)}
          onAdd={(place) => {
            save({ ...mine, custom: [...mine.custom, place] });
            setAdding(false);
          }}
        />
      )}
      {filtering && (
        <FilterSheet
          filter={filter}
          areas={areas}
          categories={categories}
          season={season}
          onChange={set}
          onReset={() =>
            setFilter({ ...DEFAULT_GUIDE_FILTER, search: filter.search, region: filter.region })
          }
          onClose={() => setFiltering(false)}
        />
      )}
      {importing && (
        <ImportSheet
          onClose={() => setImporting(false)}
          onImport={(text) => {
            const result = importMarksFromMemo(mine, text);
            save(result.data);
            return result;
          }}
        />
      )}
    </MainLayout>
  );
}

const CATEGORY_ICON: Record<PlaceCategory, IconType> = {
  박물관: FiArchive,
  '미술관·전시': FiImage,
  과학관: FiZap,
  체험: FiTool,
  실내놀이: FiSmile,
  '공원·자연': FiSun,
  '동물·농장': FiFeather,
  테마파크: FiFlag,
  물놀이: FiDroplet,
  역사: FiHome,
  명소: FiCamera,
  '도서관·책': FiBookOpen,
  '카페·식당': FiCoffee,
  캠핑: FiTriangle,
  쇼핑몰: FiShoppingBag,
  기타: FiMapPin,
};

function PlaceRow({
  place,
  mark,
  onOpen,
}: {
  place: GuidePlace;
  mark?: PlaceMark;
  onOpen: () => void;
}) {
  const Icon = CATEGORY_ICON[place.category];
  const where =
    place.indoor && place.outdoor ? '' : place.indoor ? '실내' : place.outdoor ? '야외' : '';
  const meta = [
    place.category !== '기타' ? place.category : '',
    where,
    ...place.seasons.map((s) => SEASON_LABEL[s]),
    place.night ? '야경' : '',
    place.weekdayOnly ? '평일만' : '',
    place.note,
  ].filter(Boolean);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        <span className="w-9 h-9 shrink-0 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
          <Icon size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {place.name}
            {place.custom && (
              <span className="ml-1.5 text-xs font-medium text-gray-500">내가 추가</span>
            )}
          </p>
          {meta.length > 0 && <p className="text-sm text-gray-500 truncate">{meta.join(' · ')}</p>}
        </div>
        {mark?.revisit ? (
          <span className="shrink-0 text-xs font-semibold text-amber-600">또 갈 곳</span>
        ) : mark?.visited ? (
          <span className="shrink-0 text-xs font-semibold text-gray-400">가 봄</span>
        ) : null}
      </button>
    </li>
  );
}

function FilterSheet({
  filter,
  areas,
  categories,
  season,
  onChange,
  onReset,
  onClose,
}: {
  filter: GuideFilter;
  areas: string[];
  categories: PlaceCategory[];
  season: Season;
  onChange: (patch: Partial<GuideFilter>) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-5">
      <p className="text-sm font-semibold text-gray-900 mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
  return (
    <Sheet title="필터" onClose={onClose}>
      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-900 mb-2">시·군·구</p>
        <select
          value={filter.sigungu}
          onChange={(e) => onChange({ sigungu: e.target.value })}
          className="input-field"
        >
          <option value="">전체</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <Group title="종류">
        <button
          type="button"
          onClick={() => onChange({ category: '' })}
          className={chip(!filter.category)}
        >
          전체
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ category: filter.category === c ? '' : c })}
            className={chip(filter.category === c)}
          >
            {c}
          </button>
        ))}
      </Group>
      <Group title="조건">
        <button
          type="button"
          onClick={() => onChange({ indoor: !filter.indoor, outdoor: false })}
          className={chip(filter.indoor)}
        >
          실내
        </button>
        <button
          type="button"
          onClick={() => onChange({ outdoor: !filter.outdoor, indoor: false })}
          className={chip(filter.outdoor)}
        >
          야외
        </button>
        <button
          type="button"
          onClick={() => onChange({ thisSeason: !filter.thisSeason })}
          className={chip(filter.thisSeason)}
        >
          {SEASON_LABEL[season]}에 좋은 곳
        </button>
        <button
          type="button"
          onClick={() => onChange({ night: !filter.night })}
          className={chip(filter.night)}
        >
          야경
        </button>
      </Group>
      <Group title="내 표시">
        {MARKS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange({ mark: value })}
            className={chip(filter.mark === value)}
          >
            {label}
          </button>
        ))}
      </Group>
      <div className="flex gap-2">
        <button type="button" onClick={onReset} className="btn-secondary">
          초기화
        </button>
        <button type="button" onClick={onClose} className="btn-primary flex-1">
          보기
        </button>
      </div>
    </Sheet>
  );
}

// ── 나이별 견학 ─────────────────────────────────────────────

function ToursTab({ kids, today }: { kids: Child[]; today: Date }) {
  const names = kids.map((k, i) => k.name || defaultChildName(i));
  const labels = [...new Set(GUIDE_TOURS.map((t) => t.label))];
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        공장·기관 견학은 나이 제한이 있는 곳이 많아요. 예약 조건은 바뀔 수 있으니 신청 전에
        확인하세요.
      </p>
      {kids.length === 0 && (
        <p className="text-sm text-gray-600 bg-gray-100 rounded-xl p-3">
          <Link href="/profile" className="text-blue-600 font-medium">
            프로필
          </Link>
          에 아이 생일을 넣으면 아이마다 갈 수 있는지 알려 줘요.
        </p>
      )}
      {labels.map((label) => (
        <section key={label}>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">{label}</h2>
          <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {GUIDE_TOURS.filter((t) => t.label === label).map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    {(t.sido || t.note) && (
                      <p className="text-sm text-gray-500">
                        {[t.sido, t.note].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <a
                    href={`https://search.naver.com/search.naver?query=${encodeURIComponent(`${t.name} 예약`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sm text-blue-600 font-medium"
                  >
                    예약 찾기
                  </a>
                </div>
                {kids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tourFits(t.rule, kids, today, names).map((fit) => (
                      <span
                        key={fit.childName}
                        className={`badge ${fit.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {fit.childName} {fit.ok ? '갈 수 있어요' : (fit.from ?? '나이 지남')}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ── 축제 달력 ───────────────────────────────────────────────

function FestivalsTab({ today }: { today: Date }) {
  const thisMonth = today.getMonth() + 1;
  const order = Array.from({ length: 12 }, (_, i) => ((thisMonth - 1 + i) % 12) + 1);
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        해마다 열리는 축제를 달별로 모았어요. 정확한 날짜는{' '}
        <Link href="/festivals" className="text-blue-600 font-medium">
          축제 일정
        </Link>
        이나 공식 안내에서 확인하세요.
      </p>
      {order.map((m) => {
        const list = GUIDE_FESTIVALS.filter((f) => f.months.includes(m));
        if (!list.length) return null;
        return (
          <section
            key={m}
            className={`rounded-2xl border p-4 ${m === thisMonth ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}
          >
            <h2 className="text-base font-bold text-gray-900 mb-2">
              {m}월
              {m === thisMonth && (
                <span className="text-blue-600 text-sm font-semibold ml-2">이번 달</span>
              )}
            </h2>
            <ul className="space-y-1.5">
              {list.map((f) => (
                <li key={f.id} className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-gray-900">{f.name}</span>
                  <span className="text-xs text-gray-500 text-right">
                    {[
                      f.sigungu || f.sido,
                      f.months.length > 1
                        ? `${f.months[0]}~${f.months[f.months.length - 1]}월`
                        : '',
                      f.note,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ── 아래에서 올라오는 창 ─────────────────────────────────────

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -m-1.5 text-gray-500 hover:text-gray-900"
            aria-label="닫기"
          >
            <FiX size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MarkButton({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex flex-col items-center gap-1 py-3 rounded-xl text-sm font-medium ${
        on ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PlaceSheet({
  place,
  mark,
  onClose,
  onMark,
  onDelete,
}: {
  place: GuidePlace;
  mark: PlaceMark;
  onClose: () => void;
  onMark: (mark: PlaceMark) => void;
  onDelete?: () => void;
}) {
  const [memo, setMemo] = useState(mark.memo ?? '');
  const update = (patch: PlaceMark) => onMark({ ...mark, ...patch });
  return (
    <Sheet title={place.name} onClose={onClose}>
      <p className="text-sm text-gray-600 -mt-2 mb-4">
        {[placeArea(place), place.category !== '기타' ? place.category : '', place.note]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MarkButton
          on={Boolean(mark.visited)}
          onClick={() =>
            update({
              visited: !mark.visited,
              want: mark.visited ? mark.want : undefined,
              revisit: mark.visited ? undefined : mark.revisit,
            })
          }
          icon={<FiCheck size={18} />}
          label="가 봤어요"
        />
        <MarkButton
          on={Boolean(mark.revisit)}
          onClick={() =>
            update({
              revisit: !mark.revisit,
              visited: !mark.revisit ? true : mark.visited,
              want: undefined,
            })
          }
          icon={<FiStar size={18} />}
          label="또 갈래요"
        />
        <MarkButton
          on={Boolean(mark.want)}
          onClick={() => update({ want: !mark.want })}
          icon={<FiHeart size={18} />}
          label="가 보고 싶어요"
        />
      </div>
      <label className="flex items-center justify-between gap-3 py-2 mb-2 cursor-pointer">
        <span className="text-sm text-gray-700">어른만 가 봤어요 (아이는 아직)</span>
        <input
          type="checkbox"
          checked={Boolean(mark.kidNotYet)}
          onChange={(e) => update({ kidNotYet: e.target.checked || undefined })}
          className="w-5 h-5 accent-blue-600"
        />
      </label>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onBlur={() => update({ memo: memo.trim() || undefined })}
        placeholder="내 메모 (예: 둘째가 크면 다시, 주차 편함)"
        rows={2}
        className="input-field resize-none mb-4"
      />
      <div className="flex gap-2">
        <a
          href={mapSearchUrl({ name: place.name, region: place.sigungu || place.sido })}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5"
        >
          <FiMapPin size={16} /> 지도에서 보기
        </a>
        {onDelete && (
          <button
            type="button"
            onClick={() => window.confirm(`'${place.name}'을(를) 지울까요?`) && onDelete()}
            className="btn-secondary text-red-600"
            aria-label="지우기"
          >
            <FiTrash2 size={16} />
          </button>
        )}
      </div>
    </Sheet>
  );
}

const SIDO_LIST = [
  '서울',
  '경기',
  '인천',
  '강원',
  '충북',
  '충남',
  '대전',
  '세종',
  '전북',
  '전남',
  '광주',
  '경북',
  '경남',
  '대구',
  '울산',
  '부산',
  '제주',
];

function AddSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (place: GuidePlace) => void }) {
  const [name, setName] = useState('');
  const [sido, setSido] = useState('서울');
  const [sigungu, setSigungu] = useState('');
  const [category, setCategory] = useState<PlaceCategory>('체험');
  const [note, setNote] = useState('');
  return (
    <Sheet title="목록에 없는 곳 추가" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="input-field"
          autoFocus
        />
        <div className="flex gap-2">
          <select
            value={sido}
            onChange={(e) => setSido(e.target.value)}
            className="input-field w-28"
          >
            {SIDO_LIST.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            value={sigungu}
            onChange={(e) => setSigungu(e.target.value)}
            placeholder="시·군·구 (예: 마포구)"
            className="input-field flex-1"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PlaceCategory)}
          className="input-field"
        >
          {PLACE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="한 줄 설명 (선택)"
          className="input-field"
        />
      </div>
      <button
        type="button"
        disabled={!name.trim()}
        onClick={() => onAdd(makeCustomPlace({ name, sido, sigungu, category, note }))}
        className="btn-primary w-full"
      >
        추가
      </button>
    </Sheet>
  );
}

function ImportSheet({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (text: string) => { matched: number; unmatched: string[] };
}) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ matched: number; unmatched: string[] } | null>(null);
  return (
    <Sheet title="예전 메모에서 표시 가져오기" onClose={onClose}>
      {result ? (
        <div className="space-y-3">
          <p className="text-gray-900">
            <b>{result.matched}</b>곳에 표시를 붙였어요.
          </p>
          {result.unmatched.length > 0 && (
            <p className="text-sm text-gray-600">
              목록에서 못 찾은 곳 {result.unmatched.length}개:{' '}
              {result.unmatched.slice(0, 12).join(', ')}
              {result.unmatched.length > 12 && ' …'}
            </p>
          )}
          <button type="button" onClick={onClose} className="btn-primary w-full">
            확인
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-3">
            &lsquo;지역 : 가 볼 곳 / 가 본 곳&rsquo;, ☆(또 갈 곳)·◇(어른만) 표시로 적어 둔 메모가
            있으면 붙여넣으세요. 목록의 같은 곳에 가 본 곳·또 갈 곳 표시만 옮겨요.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="여기에 붙여넣기"
            className="input-field mb-3"
          />
          <button
            type="button"
            disabled={!text.trim()}
            onClick={() => setResult(onImport(text))}
            className="btn-primary w-full"
          >
            표시 가져오기
          </button>
        </>
      )}
    </Sheet>
  );
}

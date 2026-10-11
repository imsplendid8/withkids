import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FiPlus, FiClipboard, FiSearch, FiMapPin, FiTrash2, FiX } from 'react-icons/fi';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuthStore } from '@/store/authStore';
import { getChildren, defaultChildName } from '@/lib/children';
import type { Child } from '@/lib/eligibility';
import {
  EMPTY_PLACES,
  createPlace,
  groupByRegion,
  loadPlaces,
  mapSearchUrl,
  matchesPlaceFilter,
  mergePlaces,
  parseAgeRule,
  parsePlacesText,
  savePlaces,
  tourFits,
  type Place,
  type PlaceArea,
  type PlaceFilter,
  type PlacesData,
} from '@/lib/places';

type Tab = 'places' | 'tours' | 'months';

const chip = (on: boolean) =>
  `px-3.5 py-1.5 rounded-full text-sm font-medium ${
    on ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`;

const FILTERS: Array<{ value: PlaceFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'todo', label: '가 볼 곳' },
  { value: 'visited', label: '가 본 곳' },
  { value: 'revisit', label: '☆ 또 갈 곳' },
  { value: 'kidNotYet', label: '◇ 아이는 아직' },
];

const FORMAT_HELP = `강서 : 가볼곳1 가볼곳2 / 가본곳 ☆또갈곳 ◇아이는안가본곳
종로 : 국립기상박물관 / ☆경찰박물관 경복궁
--------          ← 아래부터 근교·지방
파주 : 뮤지엄헤이 / 헤이리마을
초1 : 어묵체험 방송국체험     ← 나이 제한 견학
----              ← 아래부터 달마다 열리는 축제
5월 중랑장미 고양꽃박람회`;

export default function PlacesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [data, setData] = useState<PlacesData>(EMPTY_PLACES);
  const [children, setChildren] = useState<Child[]>([]);
  const [tab, setTab] = useState<Tab>('places');
  const [filter, setFilter] = useState<PlaceFilter>('all');
  const [area, setArea] = useState<PlaceArea | ''>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Place | 'new' | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setData(loadPlaces());
    setChildren(getChildren());
  }, []);

  const update = (next: PlacesData) => {
    savePlaces(next);
    setData(next);
  };

  const counts = useMemo(
    () => ({
      visited: data.places.filter((p) => p.visited).length,
      todo: data.places.filter((p) => !p.visited).length,
      revisit: data.places.filter((p) => p.revisit).length,
    }),
    [data.places]
  );

  const groups = useMemo(() => {
    const q = search.trim().replace(/\s/g, '').toLowerCase();
    const shown = data.places.filter(
      (p) =>
        matchesPlaceFilter(p, filter) &&
        (!area || p.area === area) &&
        (!q || `${p.region}${p.name}${p.memo ?? ''}`.replace(/\s/g, '').toLowerCase().includes(q))
    );
    return groupByRegion(shown);
  }, [data.places, filter, area, search]);

  const regions = useMemo(() => [...new Set(data.places.map((p) => p.region))], [data.places]);
  const isEmpty = !data.places.length && !data.tours.length && !data.months.length;
  const thisMonth = new Date().getMonth() + 1;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">내 장소</h1>
            <p className="text-gray-600 mt-1">가 본 곳, 가 볼 곳, 또 갈 곳을 모아 두는 노트</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="메모 붙여넣기"
              aria-label="메모 붙여넣기"
            >
              <FiClipboard size={18} />
            </button>
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              title="장소 추가"
              aria-label="장소 추가"
            >
              <FiPlus size={18} />
            </button>
          </div>
        </div>

        {isEmpty ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <p className="font-semibold text-gray-900">아직 적어 둔 곳이 없어요</p>
            <p className="text-sm text-gray-600 mt-1">
              메모장에 정리해 둔 목록이 있으면 그대로 붙여넣으세요. 지역·가 본 곳·☆ 표시를 알아서
              나눠요.
            </p>
            <div className="flex justify-center gap-2 mt-5">
              <button type="button" onClick={() => setImporting(true)} className="btn-primary">
                메모 붙여넣기
              </button>
              <button type="button" onClick={() => setEditing('new')} className="btn-secondary">
                하나씩 추가
              </button>
            </div>
          </div>
        ) : (
          <>
            <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 mb-5">
              {(
                [
                  ['places', `장소 ${data.places.length}`],
                  ['tours', `견학 ${data.tours.length}`],
                  ['months', '축제 달력'],
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
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    ['가 본 곳', counts.visited, 'visited'],
                    ['가 볼 곳', counts.todo, 'todo'],
                    ['또 갈 곳', counts.revisit, 'revisit'],
                  ].map(([label, count, value]) => (
                    <button
                      key={value as string}
                      type="button"
                      onClick={() => setFilter(filter === value ? 'all' : (value as PlaceFilter))}
                      className={`rounded-2xl p-3 text-left border ${
                        filter === value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{count}</p>
                    </button>
                  ))}
                </div>

                <div className="relative mb-3">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="이름·지역·메모 검색"
                    className="input-field pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFilter(f.value)}
                      className={chip(filter === f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {(
                    [
                      ['', '모든 지역'],
                      ['seoul', '서울'],
                      ['nearby', '근교·지방'],
                    ] as Array<[PlaceArea | '', string]>
                  ).map(([value, label]) => (
                    <button
                      key={value || 'all'}
                      type="button"
                      onClick={() => setArea(value)}
                      className={chip(area === value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {groups.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">조건에 맞는 곳이 없어요</p>
                ) : (
                  <div className="space-y-5">
                    {groups.map(({ region, places }) => (
                      <section key={region}>
                        <h2 className="text-base font-bold text-gray-900 mb-2">
                          {region}{' '}
                          <span className="text-gray-400 font-medium">{places.length}</span>
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                          {places.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setEditing(p)}
                              className={`px-3 py-1.5 rounded-lg text-sm border ${
                                p.visited
                                  ? 'bg-gray-100 border-gray-100 text-gray-700'
                                  : 'bg-white border-gray-200 text-gray-900'
                              }`}
                              title={p.memo}
                            >
                              {p.revisit && <span className="text-amber-500 mr-0.5">★</span>}
                              {p.kidNotYet && <span className="text-blue-600 mr-0.5">◇</span>}
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-8">
                  흰 칸은 가 볼 곳, 회색 칸은 가 본 곳이에요. 눌러서 바꾸거나 지도에서 볼 수 있어요.
                </p>
              </>
            )}

            {tab === 'tours' && <ToursTab data={data} kids={children} onChange={update} />}

            {tab === 'months' && <MonthsTab data={data} thisMonth={thisMonth} onChange={update} />}
          </>
        )}
      </div>

      {editing && (
        <PlaceSheet
          place={editing === 'new' ? null : editing}
          regions={regions}
          onClose={() => setEditing(null)}
          onSave={(place) => {
            const exists = data.places.some((p) => p.id === place.id);
            update({
              ...data,
              places: exists
                ? data.places.map((p) => (p.id === place.id ? place : p))
                : [...data.places, place],
            });
            setEditing(null);
          }}
          onDelete={(id) => {
            update({ ...data, places: data.places.filter((p) => p.id !== id) });
            setEditing(null);
          }}
        />
      )}

      {importing && (
        <ImportSheet
          hasData={!isEmpty}
          onClose={() => setImporting(false)}
          onImport={(parsed, replace) => {
            update(replace ? parsed : mergePlaces(data, parsed));
            setImporting(false);
            setTab('places');
          }}
        />
      )}
    </MainLayout>
  );
}

// ── 견학 ─────────────────────────────────────────────────────

function ToursTab({
  data,
  kids,
  onChange,
}: {
  data: PlacesData;
  kids: Child[];
  onChange: (next: PlacesData) => void;
}) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const today = new Date();
  const names = kids.map((k, i) => k.name || defaultChildName(i));
  const labels = [...new Set(data.tours.map((t) => t.label))];

  const add = () => {
    if (!name.trim() || !label.trim()) return;
    onChange({
      ...data,
      tours: [
        ...data.tours,
        {
          id: `t-${Date.now()}`,
          name: name.trim(),
          label: label.trim(),
          rule: parseAgeRule(label),
        },
      ],
    });
    setName('');
  };

  return (
    <div className="space-y-5">
      {labels.map((l) => (
        <section key={l}>
          <h2 className="text-base font-bold text-gray-900 mb-2">{l}</h2>
          <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {data.tours
              .filter((t) => t.label === l)
              .map((t) => (
                <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    {kids.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {tourFits(t.rule, kids, today, names).map((fit) => (
                          <span
                            key={fit.childName}
                            className={`badge ${fit.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {fit.childName} {fit.ok ? '가능' : (fit.from ?? '지남')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ ...data, tours: data.tours.filter((x) => x.id !== t.id) })
                    }
                    className="p-1.5 text-gray-400 hover:text-red-600"
                    aria-label={`${t.name} 지우기`}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
      {kids.length === 0 && data.tours.length > 0 && (
        <p className="text-sm text-gray-500">
          프로필에 아이 생일을 넣으면 아이마다 갈 수 있는지 보여 줘요.
        </p>
      )}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="font-semibold text-gray-900 mb-3">견학 추가</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="나이 (초1, 6세, 모든연령)"
            className="input-field sm:w-48"
            list="tour-labels"
          />
          <datalist id="tour-labels">
            {['모든연령', '6세', '초1', '초3', '초등', '중학생', ...labels].map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="견학 이름"
            className="input-field flex-1"
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button type="button" onClick={add} className="btn-primary shrink-0">
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 축제 달력 ────────────────────────────────────────────────

function MonthsTab({
  data,
  thisMonth,
  onChange,
}: {
  data: PlacesData;
  thisMonth: number;
  onChange: (next: PlacesData) => void;
}) {
  const [month, setMonth] = useState(thisMonth);
  const [name, setName] = useState('');
  // 이번 달부터 한 바퀴
  const order = Array.from({ length: 12 }, (_, i) => ((thisMonth - 1 + i) % 12) + 1);

  const add = () => {
    if (!name.trim()) return;
    onChange({
      ...data,
      months: [...data.months, { id: `m-${Date.now()}`, name: name.trim(), months: [month] }],
    });
    setName('');
  };

  return (
    <div className="space-y-3">
      {order.map((m) => {
        const notes = data.months.filter((n) => n.months.includes(m));
        if (!notes.length && m !== thisMonth) return null;
        return (
          <section
            key={m}
            className={`rounded-2xl border p-4 ${
              m === thisMonth ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
          >
            <h2 className="text-base font-bold text-gray-900 mb-2">
              {m}월{' '}
              {m === thisMonth && (
                <span className="text-blue-600 text-sm font-semibold ml-1">이번 달</span>
              )}
            </h2>
            {notes.length ? (
              <div className="flex flex-wrap gap-1.5">
                {notes.map((n) => (
                  <span
                    key={n.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-900"
                  >
                    {n.name}
                    {n.months.length > 1 && (
                      <span className="text-gray-500 text-xs">
                        {n.months[0]}~{n.months[n.months.length - 1]}월
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ ...data, months: data.months.filter((x) => x.id !== n.id) })
                      }
                      className="text-gray-400 hover:text-red-600"
                      aria-label={`${n.name} 지우기`}
                    >
                      <FiX size={14} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">적어 둔 축제가 없어요</p>
            )}
          </section>
        );
      })}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="font-semibold text-gray-900 mb-3">축제 추가</p>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="input-field w-24"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="축제 이름"
            className="input-field flex-1"
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button type="button" onClick={add} className="btn-primary shrink-0">
            추가
          </button>
        </div>
      </div>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900"
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

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 cursor-pointer">
      <span>
        <span className="block font-medium text-gray-900">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-blue-600"
      />
    </label>
  );
}

function PlaceSheet({
  place,
  regions,
  onClose,
  onSave,
  onDelete,
}: {
  place: Place | null;
  regions: string[];
  onClose: () => void;
  onSave: (place: Place) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Place>(
    place ?? createPlace({ name: '', region: regions[0] ?? '' })
  );
  const set = (patch: Partial<Place>) => setDraft((d) => ({ ...d, ...patch }));
  const valid = draft.name.trim() && draft.region.trim();

  return (
    <Sheet title={place ? place.name : '장소 추가'} onClose={onClose}>
      <div className="space-y-3">
        <input
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="이름"
          className="input-field"
        />
        <input
          value={draft.region}
          onChange={(e) => set({ region: e.target.value })}
          placeholder="지역 (강서, 파주 …)"
          className="input-field"
          list="place-regions"
        />
        <datalist id="place-regions">
          {regions.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>
      <div className="divide-y divide-gray-100 my-2">
        <Toggle
          label="가 봤어요"
          checked={draft.visited}
          onChange={(v) => set({ visited: v, revisit: v && draft.revisit })}
        />
        <Toggle
          label="☆ 또 갈 곳"
          hint="아이가 크면 다시 가고 싶은 곳"
          checked={draft.revisit}
          onChange={(v) => set({ revisit: v, visited: v || draft.visited })}
        />
        <Toggle
          label="◇ 아이는 아직"
          hint="어른만 가 본 곳"
          checked={draft.kidNotYet}
          onChange={(v) => set({ kidNotYet: v })}
        />
      </div>
      <textarea
        value={draft.memo ?? ''}
        onChange={(e) => set({ memo: e.target.value || undefined })}
        placeholder="메모 (예: 평일만, 예약 필수)"
        rows={2}
        className="input-field resize-none mb-4"
      />
      <div className="flex gap-2">
        {place && (
          <>
            <a
              href={mapSearchUrl(draft)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center gap-1.5"
            >
              <FiMapPin size={16} /> 지도
            </a>
            <button
              type="button"
              onClick={() =>
                window.confirm(`'${place.name}'을(를) 지울까요?`) && onDelete(place.id)
              }
              className="btn-ghost text-red-600"
              aria-label="지우기"
            >
              <FiTrash2 size={16} />
            </button>
          </>
        )}
        <button
          type="button"
          disabled={!valid}
          onClick={() =>
            onSave({
              ...draft,
              name: draft.name.trim(),
              region: draft.region.trim(),
              area: place ? draft.area : createPlace(draft).area,
            })
          }
          className="btn-primary flex-1"
        >
          저장
        </button>
      </div>
    </Sheet>
  );
}

function ImportSheet({
  hasData,
  onClose,
  onImport,
}: {
  hasData: boolean;
  onClose: () => void;
  onImport: (data: PlacesData, replace: boolean) => void;
}) {
  const [text, setText] = useState('');
  const parsed = useMemo(() => parsePlacesText(text), [text]);
  const total = parsed.places.length + parsed.tours.length + parsed.months.length;

  return (
    <Sheet title="메모 붙여넣기" onClose={onClose}>
      <p className="text-sm text-gray-600 mb-2">
        메모장에 정리한 글을 그대로 붙여넣으세요. 이런 형식을 읽어요.
      </p>
      <pre className="text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 whitespace-pre-wrap text-gray-700">
        {FORMAT_HELP}
      </pre>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="여기에 붙여넣기"
        className="input-field mb-3"
        autoFocus
      />
      {text.trim() && (
        <p className="text-sm text-gray-700 mb-3">
          장소 <b>{parsed.places.length}</b>곳 (가 본 곳{' '}
          {parsed.places.filter((p) => p.visited).length}) · 견학 <b>{parsed.tours.length}</b> ·
          축제 <b>{parsed.months.length}</b>
        </p>
      )}
      <div className="flex gap-2">
        {hasData && (
          <button
            type="button"
            disabled={!total}
            onClick={() =>
              window.confirm('지금 적어 둔 내용을 모두 지우고 바꿀까요?') && onImport(parsed, true)
            }
            className="btn-secondary"
          >
            모두 바꾸기
          </button>
        )}
        <button
          type="button"
          disabled={!total}
          onClick={() => onImport(parsed, false)}
          className="btn-primary flex-1"
        >
          {hasData ? '더하기' : '가져오기'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-3">잘못 나뉜 이름은 가져온 뒤 눌러서 고치면 돼요.</p>
    </Sheet>
  );
}

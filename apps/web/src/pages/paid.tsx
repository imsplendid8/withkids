import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FiExternalLink, FiMapPin, FiSearch, FiStar, FiAlertCircle, FiUsers } from 'react-icons/fi';
import { MainLayout } from '@/components/layouts/MainLayout';
import { ProgramImage } from '@/components/ProgramInfo';
import { useAuthStore } from '@/store/authStore';
import { getChildren } from '@/lib/children';
import type { Child } from '@/lib/eligibility';
import {
  ageFits,
  countBy,
  externalSearchLinks,
  filterPaid,
  loadPaid,
  normalizeGugun,
  won,
  type PaidFile,
  type PaidFilter,
} from '@/lib/paid';

const REGIONS = ['', '서울', '경기', '인천'];
const PAGE = 24;

export default function PaidPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [file, setFile] = useState<PaidFile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [shown, setShown] = useState(PAGE);
  const [filter, setFilter] = useState<PaidFilter>({
    region: '',
    gugun: '',
    category: '',
    who: 'all',
    sameDayOnly: false,
    source: '',
    search: '',
    sort: 'recommended',
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadPaid().then(setFile);
    setChildren(getChildren());
  }, [isAuthenticated]);

  const update = (patch: Partial<PaidFilter>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
    setShown(PAGE);
  };

  const items = useMemo(() => file?.items ?? [], [file]);
  const inRegion = useMemo(
    () => items.filter((i) => !filter.region || i.sido === filter.region),
    [items, filter.region]
  );
  const guguns = useMemo(() => countBy(inRegion.map((i) => normalizeGugun(i.gugun))), [inRegion]);
  const categories = useMemo(
    () => countBy(items.flatMap((i) => i.categories)).slice(0, 14),
    [items]
  );
  const list = useMemo(() => filterPaid(items, filter, children), [items, filter, children]);
  const failed = (file?.sources ?? []).filter((s) => !s.ok);
  const nolbalNote = file?.sources.find((s) => s.id === 'nolbal' && s.ok)?.note;

  const whoOptions: Array<{ value: PaidFilter['who']; label: string }> = [
    { value: 'all', label: '전체' },
    ...(children.length > 1 ? [{ value: 'kids' as const, label: '아이 모두' }] : []),
    ...children.map((c) => ({ value: `child:${c.id}` as const, label: `${c.name} 가능` })),
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">유료 체험</h1>
          <p className="text-gray-600 mt-2">
            서울·경기·인천의 아이 체험·이용권(놀이의발견)과 체험관광지(대한민국 구석구석)를
            모았어요.
          </p>
        </div>

        {/* 다른 곳 바로가기 */}
        <div className="bg-white rounded-lg shadow p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900">다른 곳에서 찾아보기</p>
          <div className="flex flex-wrap gap-2">
            {externalSearchLinks(filter.search.trim() || '서울 아이 체험').map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                {link.name}
                <FiExternalLink size={13} />
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            마이리얼트립·프립은 검색 결과로 바로 연결해요(마이리얼트립은 자동 수집을 허용하지
            않아요). 위 검색창에 입력한 단어로 검색돼요.
          </p>
        </div>

        {/* 필터 */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                value={filter.search}
                onChange={(e) => update({ search: e.target.value })}
                placeholder="이름, 장소, 종류 검색 (예: 키즈카페, 워터파크)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filter.gugun}
              onChange={(e) => update({ gugun: e.target.value })}
              aria-label="구·시"
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">{filter.region ? `${filter.region} 전체` : '구·시 전체'}</option>
              {guguns.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name} ({g.count})
                </option>
              ))}
            </select>
            <select
              value={filter.sort}
              onChange={(e) => update({ sort: e.target.value as PaidFilter['sort'] })}
              aria-label="정렬"
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="recommended">추천순 (평점·후기)</option>
              <option value="discount">할인율 높은순</option>
              <option value="price">가격 낮은순</option>
            </select>
          </div>

          <ChipRow label="지역">
            {REGIONS.map((r) => (
              <Chip
                key={r || 'all'}
                active={filter.region === r}
                onClick={() => update({ region: r, gugun: '' })}
              >
                {r || '전체'}
              </Chip>
            ))}
          </ChipRow>

          {children.length > 0 && (
            <ChipRow label="아이">
              {whoOptions.map((o) => (
                <Chip
                  key={o.value}
                  active={filter.who === o.value}
                  onClick={() => update({ who: o.value })}
                >
                  {o.label}
                </Chip>
              ))}
            </ChipRow>
          )}

          <ChipRow label="조건">
            <Chip
              active={filter.sameDayOnly}
              onClick={() => update({ sameDayOnly: !filter.sameDayOnly })}
            >
              당일 사용 가능
            </Chip>
            <Chip
              active={filter.source === 'nolbal'}
              onClick={() => update({ source: filter.source === 'nolbal' ? '' : 'nolbal' })}
            >
              판매 상품만 (놀이의발견)
            </Chip>
            <Chip
              active={filter.source === 'visitkorea'}
              onClick={() => update({ source: filter.source === 'visitkorea' ? '' : 'visitkorea' })}
            >
              장소만 (구석구석)
            </Chip>
          </ChipRow>

          {categories.length > 0 && (
            <ChipRow label="종류">
              <Chip active={!filter.category} onClick={() => update({ category: '' })}>
                전체
              </Chip>
              {categories.map((c) => (
                <Chip
                  key={c.name}
                  active={filter.category === c.name}
                  onClick={() => update({ category: filter.category === c.name ? '' : c.name })}
                >
                  {c.name}
                </Chip>
              ))}
            </ChipRow>
          )}
        </div>

        {file === null ? (
          <p className="text-center py-12 text-gray-600">불러오는 중...</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">총 {list.length}개</p>
            {list.length === 0 ? (
              <p className="text-center py-12 text-gray-600">조건에 맞는 체험이 없어요.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.slice(0, shown).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow overflow-hidden flex flex-col"
                  >
                    <ProgramImage src={item.imageUrl} alt={item.title} className="w-full h-44" />
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="flex flex-wrap gap-1.5">
                        {item.price?.percent ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                            {item.price.percent}% 할인
                          </span>
                        ) : null}
                        {item.sameDay && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            당일 사용 가능
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          {item.source === 'nolbal' ? '놀이의발견' : '구석구석'}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 line-clamp-2">{item.title}</h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1.5 min-w-0">
                        <FiMapPin size={14} className="text-blue-600 shrink-0" />
                        <span className="font-semibold text-gray-800 shrink-0">
                          {item.sido} {normalizeGugun(item.gugun) ?? ''}
                        </span>
                        {item.place && item.place !== item.title && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="truncate">{item.place}</span>
                          </>
                        )}
                      </p>
                      {item.price && (item.price.sale || item.price.original) && (
                        <div className="text-sm">
                          {item.price.original &&
                            item.price.sale &&
                            item.price.original > item.price.sale && (
                              <span className="text-gray-400 line-through mr-1.5">
                                {won(item.price.original)}
                              </span>
                            )}
                          <span className="font-bold text-gray-900">
                            {won((item.price.sale ?? item.price.original) as number)}
                          </span>
                          {item.price.option && (
                            <p className="text-xs text-gray-500 truncate">{item.price.option}</p>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                        {item.rating !== null && (
                          <span className="inline-flex items-center gap-1">
                            <FiStar size={13} className="text-yellow-400 fill-yellow-400" />
                            {item.rating.toFixed(1)} ({item.reviewCount ?? 0})
                          </span>
                        )}
                        {(item.minAge !== null || item.maxAge !== null) && (
                          <span className="inline-flex items-center gap-1">
                            <FiUsers size={13} />
                            {item.minAge ?? 0}~{item.maxAge ?? ''}세
                          </span>
                        )}
                        {item.availableUntil && <span>사용 {item.availableUntil}</span>}
                      </div>
                      {children.length > 0 && (item.minAge !== null || item.maxAge !== null) && (
                        <div className="flex flex-wrap gap-1.5">
                          {children.map((c) => (
                            <span
                              key={c.id}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                ageFits(item, c)
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-500 line-through'
                              }`}
                            >
                              {c.name} {ageFits(item, c) ? '가능' : '불가'}
                            </span>
                          ))}
                        </div>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
                      >
                        {item.source === 'nolbal' ? '놀이의발견에서 보기' : '구석구석에서 보기'}
                        <FiExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {list.length > shown && (
              <div className="text-center">
                <button
                  onClick={() => setShown((n) => n + PAGE)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  더 보기 ({list.length - shown}개 남음)
                </button>
              </div>
            )}

            {nolbalNote && (
              <p className="text-xs text-gray-500">
                놀이의발견: {nolbalNote}. 매일 조금씩 새로 확인해요.
              </p>
            )}
            {failed.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900 space-y-1">
                {failed.map((s) => (
                  <p key={s.id} className="flex gap-2">
                    <FiAlertCircle className="shrink-0 mt-0.5" />
                    <span>
                      {s.name}: {s.errorMessage}
                    </span>
                  </p>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">
              가격·재고·사용 조건은 바뀔 수 있어요. 구매 전에 판매 페이지에서 꼭 확인해 주세요.
            </p>
          </>
        )}
      </div>
    </MainLayout>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-gray-900 w-12 shrink-0">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

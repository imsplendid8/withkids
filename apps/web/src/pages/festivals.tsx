import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FiExternalLink, FiMapPin, FiSearch, FiCalendar, FiAlertCircle } from 'react-icons/fi';
import { MainLayout } from '@/components/layouts/MainLayout';
import { ProgramImage } from '@/components/ProgramInfo';
import { useAuthStore } from '@/store/authStore';
import {
  districtsOf,
  festivalPeriodLabel,
  filterFestivals,
  loadFestivals,
  type FestivalPeriod,
  type FestivalRegion,
  type FestivalsFile,
} from '@/lib/festivals';

const REGIONS: Array<{ value: FestivalRegion | ''; label: string }> = [
  { value: '', label: '전체' },
  { value: '서울', label: '서울' },
  { value: '경기', label: '경기' },
  { value: '인천', label: '인천' },
];

const PERIODS: Array<{ value: FestivalPeriod; label: string }> = [
  { value: 'weekend', label: '이번 주말' },
  { value: 'two-weeks', label: '2주 안' },
  { value: 'month', label: '이번 달' },
  { value: 'all', label: '전체 일정' },
];

const SOURCE_LABELS: Record<string, string> = {
  'seoul-culture': '서울시 문화행사',
  'tour-api': '한국관광공사 (서울·경기·인천)',
};

const PAGE = 24;

export default function FestivalsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [file, setFile] = useState<FestivalsFile | null>(null);
  const [region, setRegion] = useState<FestivalRegion | ''>('');
  const [district, setDistrict] = useState('');
  const [period, setPeriod] = useState<FestivalPeriod>('two-weeks');
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    loadFestivals().then(setFile);
  }, []);

  const festivals = useMemo(() => file?.festivals ?? [], [file]);
  const districts = useMemo(() => districtsOf(festivals, region), [festivals, region]);
  const filtered = useMemo(
    () => filterFestivals(festivals, { region, district, period, search }),
    [festivals, region, district, period, search]
  );

  useEffect(() => setShown(PAGE), [region, district, period, search]);

  const failed = (file?.sources ?? []).filter((s) => !s.ok);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">서울·근교 축제</h1>
          <p className="text-gray-600 mt-2">서울·경기·인천에서 열리는 축제 일정이에요</p>
        </div>

        {/* 지역 */}
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button
              key={r.label}
              onClick={() => {
                setRegion(r.value);
                setDistrict('');
              }}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${
                region === r.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* 기간 */}
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="축제 이름, 장소 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <FiMapPin className="absolute left-3 top-3 text-gray-400" size={18} />
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              aria-label="시·구"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{region ? `${region} 전체` : '시·구 전체'}</option>
              {districts.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {file === null ? (
          <p className="text-center py-12 text-gray-600">축제 일정을 불러오는 중...</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">총 {filtered.length}개의 축제</p>

            {filtered.length === 0 ? (
              <p className="text-center py-12 text-gray-600">조건에 맞는 축제가 없어요.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.slice(0, shown).map((f) => (
                  <div
                    key={f.id}
                    className="bg-white rounded-lg shadow overflow-hidden flex flex-col"
                  >
                    <ProgramImage src={f.imageUrl} alt={f.title} className="w-full h-44" />
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                          {f.region}
                        </span>
                        {f.isFree === true && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800">
                            무료
                          </span>
                        )}
                        {f.isFree === false && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800">
                            유료
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 line-clamp-2">{f.title}</h3>
                      <p className="text-sm text-gray-700 flex items-center gap-1.5">
                        <FiCalendar size={14} className="text-gray-400 shrink-0" />
                        {festivalPeriodLabel(f)}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1.5 min-w-0">
                        <FiMapPin size={14} className="text-blue-600 shrink-0" />
                        {f.district && (
                          <span className="font-semibold text-gray-800 shrink-0">{f.district}</span>
                        )}
                        {f.district && f.place && <span className="text-gray-300">·</span>}
                        <span className="truncate">{f.place}</span>
                      </p>
                      {f.target && <p className="text-xs text-gray-500">대상 {f.target}</p>}
                      {f.link && (
                        <a
                          href={f.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
                        >
                          자세히 보기
                          <FiExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filtered.length > shown && (
              <div className="text-center">
                <button
                  onClick={() => setShown((n) => n + PAGE)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  더 보기 ({filtered.length - shown}개 남음)
                </button>
              </div>
            )}

            {failed.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900 space-y-1">
                {failed.map((s) => (
                  <p key={s.name} className="flex gap-2">
                    <FiAlertCircle className="shrink-0 mt-0.5" />
                    <span>
                      {SOURCE_LABELS[s.name] ?? s.name}: {s.errorMessage}
                    </span>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

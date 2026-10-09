import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { useBookmarkStore } from '@/store/bookmarkStore';
import { apiClient } from '@/lib/api';
import { MainLayout } from '@/components/layouts/MainLayout';
import { EligibilityBadges } from '@/components/EligibilityBadges';
import {
  ProgramBadges,
  ProgramImage,
  ProgramSchedule,
  type SeoulProgramFields,
} from '@/components/ProgramInfo';
import { STATIC_MODE } from '@/lib/staticMode';
import { getChildren } from '@/lib/children';
import type { Child, EligibilityFilter, ProgramEligibility } from '@/lib/eligibility';
import Link from 'next/link';
import {
  FiSearch,
  FiFilter,
  FiDollarSign,
  FiUsers,
  FiBookmark,
  FiStar,
  FiMapPin,
} from 'react-icons/fi';

interface Experience extends SeoulProgramFields {
  id: string;
  programName: string;
  institution: {
    institutionName: string;
  };
  description?: string;
  price?: number | string;
  targetAgeMin?: number | string;
  targetAgeMax?: number | string;
  bookingMethod: string;
  rating?: number;
  reviewCount?: number;
  externalSource?: string;
  targetInfo?: string | null;
  eligibility?: ProgramEligibility;
}

interface SearchResponse {
  data: Experience[];
  total: number;
  /** 정적 모드: 지역(구)별 프로그램 수 */
  areas?: Array<{ name: string; count: number }>;
}

export default function ExperiencesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { addBookmark, removeBookmark, isBookmarked, hydrate } = useBookmarkStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<'recent' | 'closing' | 'price-low' | 'price-high' | 'name'>(
    'recent'
  );
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [children, setChildren] = useState<Child[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityFilter>('all');
  const [area, setArea] = useState('');
  // 기본은 신청할 수 있는 것(접수 중+예정)만
  const [bookingFilter, setBookingFilter] = useState<'available' | 'open' | 'soon' | 'all'>(
    'available'
  );
  const [useDate, setUseDate] = useState<'' | 'today' | 'weekend'>('');
  const [sameDay, setSameDay] = useState<'' | 'online' | 'any'>('');
  const [excludeKidsCafe, setExcludeKidsCafe] = useState(false);
  const [areas, setAreas] = useState<Array<{ name: string; count: number }>>([]);

  const itemsPerPage = 12;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    hydrate();
    if (STATIC_MODE) {
      setChildren(getChildren());
      // 자주 보는 구는 이 브라우저에 기억해 둔다
      try {
        setArea(localStorage.getItem(AREA_KEY) ?? '');
        setExcludeKidsCafe(localStorage.getItem(KIDS_CAFE_KEY) === '1');
      } catch {
        /* 저장소를 못 쓰면 전체 지역 */
      }
    }
  }, [hydrate]);

  const handleAreaChange = (value: string) => {
    setArea(value);
    setCurrentPage(1);
    try {
      if (value) localStorage.setItem(AREA_KEY, value);
      else localStorage.removeItem(AREA_KEY);
    } catch {
      /* 무시 */
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchExperiences = async () => {
      try {
        setIsLoadingData(true);
        setError(null);

        // Parse age group for API
        let ageGroupParam: string | undefined;
        if (selectedAgeGroup && selectedAgeGroup !== '전체') {
          const ageMap: Record<string, string> = {
            '4-6세': '4-6',
            '6-10세': '6-10',
            '10-14세': '10-14',
            '14-18세': '14-18',
          };
          ageGroupParam = ageMap[selectedAgeGroup];
        }

        const response: SearchResponse = await apiClient.searchExperiences({
          search: searchQuery || undefined,
          ageGroup: ageGroupParam,
          eligibility: STATIC_MODE ? eligibility : undefined,
          area: STATIC_MODE && area ? area : undefined,
          booking: STATIC_MODE ? bookingFilter : undefined,
          useDate: STATIC_MODE && useDate ? useDate : undefined,
          sameDay: STATIC_MODE && sameDay ? sameDay : undefined,
          excludeKidsCafe: STATIC_MODE && excludeKidsCafe ? true : undefined,
          sort: sortBy,
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
        });

        setExperiences(response.data || []);
        setTotalResults(response.total || 0);
        if (response.areas) setAreas(response.areas);

        // Fetch ratings for each experience
        const newRatings: Record<string, number> = {};
        for (const exp of response.data) {
          try {
            const ratingData = await apiClient.getExperienceRating(exp.id);
            newRatings[exp.id] = ratingData.average || 0;
          } catch (err) {
            newRatings[exp.id] = 0;
          }
        }
        setRatings(newRatings);
      } catch (err) {
        console.error('프로그램 데이터 로드 실패:', err);
        setExperiences([]);
        setTotalResults(0);
        setError('프로그램 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchExperiences();
  }, [
    isAuthenticated,
    searchQuery,
    selectedAgeGroup,
    eligibility,
    area,
    bookingFilter,
    useDate,
    sameDay,
    excludeKidsCafe,
    sortBy,
    currentPage,
  ]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalResults / itemsPerPage);

  const handleViewDetails = (experienceId: string) => {
    router.push(`/experiences/${experienceId}`);
  };

  const handleToggleBookmark = (exp: Experience) => {
    if (isBookmarked(exp.id)) {
      removeBookmark(exp.id);
    } else {
      addBookmark({
        id: exp.id,
        name: exp.programName,
        institution: exp.institution.institutionName,
        price: Number(exp.price) || 0,
        ageGroup:
          exp.targetAgeMin && exp.targetAgeMax
            ? `${Number(exp.targetAgeMin)}-${Number(exp.targetAgeMax)}`
            : '',
        rating: ratings[exp.id] || 0,
        bookmarkedAt: new Date().toISOString(),
      });
    }
  };

  const getAgeGroupLabel = (minAge?: number | string, maxAge?: number | string): string => {
    if (!minAge || !maxAge) return '';
    return `${Number(minAge)}-${Number(maxAge)}세`;
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Error Message */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">{error}</p>
          </div>
        )}

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">프로그램 둘러보기</h1>
          <p className="text-gray-600 mt-2">
            {STATIC_MODE
              ? '서울시 공공서비스예약(교육체험·문화행사)에 올라온 프로그램이에요'
              : '아이들을 위한 다양한 경험 프로그램을 찾아보세요'}
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className={`relative ${STATIC_MODE ? 'md:col-span-2' : 'md:col-span-3'}`}>
              <FiSearch className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="프로그램, 기관명 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 지역(구) */}
            {STATIC_MODE && (
              <div className="relative">
                <FiMapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                <select
                  value={area}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  aria-label="지역"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">서울 전체</option>
                  {area && !areas.some((a) => a.name === area) && (
                    <option value={area}>{area}</option>
                  )}
                  {areas.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name} ({a.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {STATIC_MODE ? (
                <>
                  <option value="recent">최근 접수 시작순</option>
                  <option value="closing">접수 마감 임박순</option>
                  <option value="name">이름순</option>
                </>
              ) : (
                <>
                  <option value="recent">최신순</option>
                  <option value="price-low">가격 낮음</option>
                  <option value="price-high">가격 높음</option>
                  <option value="name">이름순</option>
                </>
              )}
            </select>
          </div>

          {/* Advanced Filters Toggle (평점은 서버 모드에만) */}
          {!STATIC_MODE && (
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              <FiFilter size={18} />
              {showAdvancedFilters ? '필터 숨기기' : '고급 필터'}
            </button>
          )}

          {/* Advanced Filters */}
          {!STATIC_MODE && showAdvancedFilters && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-6">
              {/* Minimum Rating */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  최소 평점: {minRating.toFixed(1)} ⭐
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(parseFloat(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* 접수 상태 · 이용일 */}
        {STATIC_MODE && (
          <div className="space-y-3">
            <FilterRow
              label="접수"
              value={bookingFilter}
              onChange={(v) => {
                setBookingFilter(v);
                setCurrentPage(1);
              }}
              options={[
                {
                  value: 'available',
                  label: '신청 가능',
                  hint: '접수 중이거나 접수 예정 (마감 제외)',
                },
                { value: 'open', label: '지금 접수 중', hint: '지금 바로 신청할 수 있는 것' },
                { value: 'soon', label: '접수 예정', hint: '아직 접수 시작 전' },
                { value: 'all', label: '마감 포함 전체', hint: '마감·종료된 것까지' },
              ]}
            />
            <FilterRow
              label="이용일"
              value={useDate}
              onChange={(v) => {
                setUseDate(v);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: '언제든', hint: '이용 날짜 상관없이' },
                { value: 'today', label: '오늘', hint: '오늘이 이용(운영) 기간에 들어가는 것' },
                {
                  value: 'weekend',
                  label: '이번 주말',
                  hint: '이번 토·일이 이용(운영) 기간에 들어가는 것',
                },
              ]}
            />
            <FilterRow
              label="당일"
              value={sameDay}
              onChange={(v) => {
                setSameDay(v);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: '상관없음', hint: '당일 예약 여부와 상관없이' },
                {
                  value: 'any',
                  label: '당일 예약·현장 접수',
                  hint: '당일 온라인 예약이 되거나 현장에서 접수할 수 있는 곳',
                },
                {
                  value: 'online',
                  label: '당일 온라인 예약',
                  hint: '이용 당일에도 서울시 사이트에서 예약할 수 있는 곳',
                },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 w-12 shrink-0">제외</span>
              <button
                onClick={() => {
                  const next = !excludeKidsCafe;
                  setExcludeKidsCafe(next);
                  setCurrentPage(1);
                  try {
                    if (next) localStorage.setItem(KIDS_CAFE_KEY, '1');
                    else localStorage.removeItem(KIDS_CAFE_KEY);
                  } catch {
                    /* 무시 */
                  }
                }}
                aria-pressed={excludeKidsCafe}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium ${
                  excludeKidsCafe
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                    excludeKidsCafe ? 'bg-white border-white text-blue-600' : 'border-gray-400'
                  }`}
                >
                  {excludeKidsCafe ? '✓' : ''}
                </span>
                서울형 키즈카페 빼고 보기
              </button>
            </div>
            {(useDate || sameDay) && (
              <div className="text-xs text-gray-500 space-y-0.5">
                {useDate && (
                  <p>
                    이용일은 서울시 자료의 운영 기간으로 골랐어요. 요일·회차별 운영은 상세 안내에서
                    확인해 주세요.
                  </p>
                )}
                {sameDay && (
                  <p>
                    당일 예약·현장 접수는 상세 안내 문구로 판단했어요. 안내에 적힌 곳만 나오고, 근거
                    문장은 상세 화면에서 볼 수 있어요.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 누가 갈 수 있나요 (정적 모드: 등록한 아이 생일로 판단) */}
        {STATIC_MODE ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">누가 갈 수 있나요?</p>
            {children.length === 0 ? (
              <p className="text-sm text-gray-600">
                <Link href="/profile" className="text-blue-600 underline">
                  프로필 → 자녀
                </Link>
                에 아이 생일을 넣으면 아이별로 참여 가능한 프로그램만 골라 볼 수 있어요.
              </p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {eligibilityOptions(children).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setEligibility(option.value);
                      setCurrentPage(1);
                    }}
                    title={option.hint}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${
                      eligibility === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {['전체', '4-6세', '6-10세', '10-14세', '14-18세'].map((age) => (
              <button
                key={age}
                onClick={() => {
                  setSelectedAgeGroup(selectedAgeGroup === age ? null : age);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${
                  selectedAgeGroup === age
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {age}
              </button>
            ))}
          </div>
        )}

        {/* Results Info */}
        <div className="text-sm text-gray-600">총 {totalResults}개의 프로그램</div>

        {/* Experiences Grid */}
        {isLoadingData ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">프로그램을 불러오는 중...</div>
          </div>
        ) : experiences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <ProgramImage src={exp.imageUrl} alt={exp.programName} className="w-full h-48" />

                {/* Content */}
                <div className="p-4">
                  {STATIC_MODE && (
                    <div className="mb-2">
                      <ProgramBadges program={exp} />
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{exp.programName}</h3>
                  <p className="text-sm text-gray-600 mb-3 flex items-center gap-1.5 min-w-0">
                    {STATIC_MODE && exp.area && (
                      <span className="inline-flex items-center gap-0.5 font-semibold text-gray-800 shrink-0">
                        <FiMapPin size={14} className="text-blue-600" />
                        {exp.area}
                      </span>
                    )}
                    {STATIC_MODE && exp.area && <span className="text-gray-300">·</span>}
                    <span className="truncate">{exp.institution.institutionName}</span>
                  </p>

                  {STATIC_MODE && (
                    <div className="mb-3">
                      <ProgramSchedule program={exp} />
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-1 mb-3 text-sm text-gray-600">
                    {!STATIC_MODE && exp.price !== undefined && (
                      <div className="flex items-center gap-2">
                        <FiDollarSign size={16} />
                        {exp.price.toLocaleString()}원
                      </div>
                    )}
                    {!STATIC_MODE && exp.targetAgeMin && exp.targetAgeMax && (
                      <div className="flex items-center gap-2">
                        <FiUsers size={16} />
                        {getAgeGroupLabel(exp.targetAgeMin, exp.targetAgeMax)}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <EligibilityBadges targetInfo={exp.targetInfo} eligibility={exp.eligibility} />
                  </div>

                  {/* Rating (서버 모드: 후기 평점) */}
                  {!STATIC_MODE && (
                    <div className="flex items-center gap-2 mb-4">
                      <FiStar size={16} className="text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold text-gray-900">
                        {ratings[exp.id]?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(exp.id)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                    >
                      자세히 보기
                    </button>
                    <button
                      onClick={() => handleToggleBookmark(exp)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        isBookmarked(exp.id)
                          ? 'bg-blue-100 text-blue-600'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <FiBookmark
                        size={20}
                        className={isBookmarked(exp.id) ? 'fill-blue-600' : ''}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-600">검색 결과가 없습니다.</div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                const distance = Math.abs(page - currentPage);
                return distance <= 2 || page === 1 || page === totalPages;
              })
              .map((page, index, arr) => (
                <React.Fragment key={page}>
                  {index > 0 && arr[index - 1] !== page - 1 && <span className="px-2">...</span>}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function eligibilityOptions(
  children: Child[]
): Array<{ value: EligibilityFilter; label: string; hint: string }> {
  const options: Array<{ value: EligibilityFilter; label: string; hint: string }> = [
    { value: 'all', label: '전체', hint: '모든 프로그램' },
    {
      value: 'family',
      label: '온 가족 함께',
      hint: '나이 조건이 없거나 가족 대상이고, 아이 모두 참여할 수 있는 프로그램',
    },
  ];
  if (children.length > 1) {
    options.push({
      value: 'kids',
      label: '아이 모두',
      hint: '등록한 아이 모두 참여할 수 있는 프로그램',
    });
  }
  for (const child of children) {
    options.push({
      value: `with:${child.id}`,
      label: `${child.name} 가능`,
      hint: `${child.name} 참여 가능 (다른 아이는 상관없음)`,
    });
    if (children.length > 1) {
      options.push({
        value: `only:${child.id}`,
        label: `${child.name}만`,
        hint: `아이들 중 ${child.name}만 참여 가능`,
      });
    }
  }
  return options;
}

const AREA_KEY = 'withdkis.area';
const KIDS_CAFE_KEY = 'withdkis.excludeKidsCafe';

function FilterRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; hint: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-gray-900 w-12 shrink-0">{label}</span>
      {options.map((option) => (
        <button
          key={option.value || 'any'}
          onClick={() => onChange(option.value)}
          title={option.hint}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${
            value === option.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { useBookmarkStore } from '@/store/bookmarkStore';
import { apiClient } from '@/lib/api';
import { MainLayout } from '@/components/layouts/MainLayout';
import { CrawlStatusPanel } from '@/components/CrawlStatusPanel';
import { dDayLabel, daysFromToday, formatMonthDay, formatTime } from '@/lib/bookingDates';
import { FiBookmark, FiClock, FiExternalLink, FiMapPin } from 'react-icons/fi';
import { festivalsInMonth, loadMyPlaces, type MyPlaces } from '@/lib/placeGuide';

interface ScheduleRun {
  id: string;
  bookingOpenAt: string | null;
  bookingCloseAt: string | null;
  price: number | null;
  experience: {
    id: string;
    programName: string;
    programUrl?: string | null;
    bookingUrl?: string | null;
    institution?: { institutionName: string };
    area?: string | null;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { bookmarks, hydrate: hydrateBookmarks } = useBookmarkStore();
  const [myPlaces, setMyPlaces] = useState<MyPlaces | null>(null);

  useEffect(() => {
    setMyPlaces(loadMyPlaces());
  }, []);

  const [schedule, setSchedule] = useState<ScheduleRun[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [scheduleError, setScheduleError] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const load = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const data = await apiClient.getBookingSchedule(14);
      setSchedule(Array.isArray(data) ? data : []);
      setScheduleError(false);
    } catch {
      setScheduleError(true);
    }

    setIsLoadingData(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    hydrateBookmarks();
    load();
  }, [isAuthenticated, hydrateBookmarks, load]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  const today = new Date();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 인사 */}
        <section className="pt-1">
          <p className="text-sm font-medium text-gray-500">{formatMonthDay(today)}</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
            안녕하세요, {user?.profileName || '보호자'}님
          </h1>
        </section>

        {/* 요약 */}
        <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="찜한 프로그램"
            value={`${bookmarks.length}개`}
            icon={<FiBookmark className="text-purple-600" size={22} />}
            iconBg="bg-purple-100"
            href="/experiences/saved"
          />
        </section>

        {/* 내 장소: 이번 달·다음 달 축제 메모 */}
        {myPlaces && <MonthNotesCard data={myPlaces} today={today} />}

        {/* 접수 일정 */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">접수 일정</h2>
            <p className="text-xs text-gray-500 mt-1">
              접수 중이거나 2주 안에 접수가 시작되는 프로그램
            </p>
          </div>

          {isLoadingData ? (
            <p className="text-gray-500 py-8 text-center">불러오는 중...</p>
          ) : scheduleError ? (
            <p className="text-red-600 py-8 text-center">접수 일정을 불러오지 못했습니다.</p>
          ) : schedule.length === 0 ? (
            <p className="text-gray-600 py-8 text-center text-sm">
              지금 확인된 접수 일정이 없어요.
              <br />
              아래에서 수집을 돌리면 새 프로그램이 여기에 표시됩니다.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {schedule.slice(0, 8).map((run) => (
                <ScheduleItem key={run.id} run={run} />
              ))}
            </ul>
          )}

          <CrawlStatusPanel onCompleted={load} />
        </section>
      </div>
    </MainLayout>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg shadow p-4 sm:p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-gray-600 text-sm whitespace-nowrap">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 whitespace-nowrap">
            {value}
          </p>
        </div>
        <div className={`${iconBg} p-2.5 rounded-lg shrink-0 hidden sm:block`}>{icon}</div>
      </div>
    </Link>
  );
}

function ScheduleItem({ run }: { run: ScheduleRun }) {
  const now = new Date();
  const openAt = run.bookingOpenAt ? new Date(run.bookingOpenAt) : null;
  const closeAt = run.bookingCloseAt ? new Date(run.bookingCloseAt) : null;
  const isOpen = openAt !== null && openAt <= now;
  const externalUrl = run.experience.bookingUrl || run.experience.programUrl;

  const body = (
    <div className="py-3 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 truncate">{run.experience.programName}</p>
        <p className="text-xs text-gray-500 truncate">
          {run.experience.area && (
            <span className="font-semibold text-gray-700">{run.experience.area} · </span>
          )}
          {run.experience.institution?.institutionName ?? '-'}
        </p>
        <p className="text-sm mt-1 flex items-center gap-1 text-gray-700">
          <FiClock size={13} />
          {isOpen
            ? closeAt
              ? `${formatMonthDay(closeAt)} ${formatTime(closeAt)} 마감`
              : '접수 중'
            : openAt
              ? `${formatMonthDay(openAt)} ${formatTime(openAt)} 접수 시작`
              : '접수 일정 미정'}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {isOpen ? (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800">
            접수 중
          </span>
        ) : openAt ? (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
            {dDayLabel(daysFromToday(openAt))}
          </span>
        ) : null}
        {externalUrl && <FiExternalLink size={14} className="text-gray-400" />}
      </div>
    </div>
  );

  return (
    <li>
      {externalUrl ? (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:bg-gray-50 -mx-2 px-2 rounded"
        >
          {body}
        </a>
      ) : (
        <Link
          href={`/experiences/${run.experience.id}`}
          className="block hover:bg-gray-50 -mx-2 px-2 rounded"
        >
          {body}
        </Link>
      )}
    </li>
  );
}

function MonthNotesCard({ data, today }: { data: MyPlaces; today: Date }) {
  const thisMonth = today.getMonth() + 1;
  const months = [thisMonth, (thisMonth % 12) + 1];
  const revisit = Object.values(data.marks).filter((m) => m.revisit).length;
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">이번 달 축제</h2>
        <Link
          href="/places"
          className="text-sm font-medium text-blue-600 inline-flex items-center gap-1"
        >
          <FiMapPin size={14} /> 가볼 만한 곳
        </Link>
      </div>
      <div className="space-y-2">
        {months.map((month) => {
          const list = festivalsInMonth(month);
          return (
            <div key={month} className="flex gap-3">
              <span className="w-10 shrink-0 text-sm font-semibold text-gray-500 tabular-nums">
                {month}월
              </span>
              <p className="text-sm text-gray-900">
                {list.length ? (
                  list.map((f) => f.name).join(' · ')
                ) : (
                  <span className="text-gray-400">없음</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
      {revisit > 0 && (
        <p className="text-xs text-gray-500 mt-3">또 갈 곳으로 표시한 곳 {revisit}곳</p>
      )}
    </section>
  );
}

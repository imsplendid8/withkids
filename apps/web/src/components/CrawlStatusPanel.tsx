import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiRefreshCw, FiAlertCircle, FiCheckCircle, FiExternalLink } from 'react-icons/fi';
import { apiClient, type LatestCrawl } from '@/lib/api';
import { formatMonthDay, formatTime } from '@/lib/bookingDates';
import { CRAWL_WORKFLOW_URL, STATIC_MODE } from '@/lib/staticMode';

const ADAPTER_LABELS: Record<string, string> = {
  'seoul-public-service': '서울시 공공서비스예약',
  'data-loader': '직접 추가한 프로그램',
};

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;
// 이보다 오래 "수집 중"이면 서버가 도중에 꺼진 것으로 본다.
const STALE_RUNNING_MS = 30 * 60 * 1000;

type Crawl = NonNullable<LatestCrawl['lastCrawl']>;

function describe(crawl: Crawl): { tone: 'ok' | 'error' | 'running'; text: string } {
  if (crawl.status === 'RUNNING') {
    const stale = Date.now() - new Date(crawl.crawlStartedAt).getTime() > STALE_RUNNING_MS;
    return stale
      ? { tone: 'error', text: '수집이 도중에 멈췄습니다. 다시 시도해주세요.' }
      : { tone: 'running', text: '수집 중...' };
  }
  if (crawl.status === 'FAILURE') {
    return { tone: 'error', text: crawl.errorMessage || '수집에 실패했습니다.' };
  }
  const { programsFound, programsCreated, programsUpdated } = crawl;
  if (programsFound === 0) return { tone: 'ok', text: '가져온 프로그램 없음' };
  return {
    tone: 'ok',
    // 정적 배포는 매번 전체를 새로 받으므로 신규/갱신 구분이 없다
    text: STATIC_MODE
      ? `${programsFound.toLocaleString()}건`
      : `${programsFound.toLocaleString()}건 (새로 ${programsCreated.toLocaleString()} · 갱신 ${programsUpdated.toLocaleString()})`,
  };
}

/** 모든 수집원이 트리거 이전과 다른, 끝난 기록을 갖게 되면 완료로 본다. */
function isFinishedSince(latest: LatestCrawl[], before: Map<string, string | undefined>): boolean {
  return latest.every(
    ({ adapterName, lastCrawl }) =>
      lastCrawl && lastCrawl.id !== before.get(adapterName) && lastCrawl.status !== 'RUNNING'
  );
}

export function CrawlStatusPanel({ onCompleted }: { onCompleted?: () => void }) {
  const [latest, setLatest] = useState<LatestCrawl[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiClient.getLatestCrawls();
      setLatest(data);
      setLoadError(false);
      return data;
    } catch {
      setLoadError(true);
      return null;
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [load]);

  const handleRun = async () => {
    setNotice(null);
    setIsRunning(true);
    const before = new Map((latest ?? []).map((item) => [item.adapterName, item.lastCrawl?.id]));

    try {
      await apiClient.triggerCrawler();
    } catch {
      setIsRunning(false);
      setNotice('수집을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const startedAt = Date.now();
    const poll = async () => {
      const data = await load();
      if (data && data.length > 0 && isFinishedSince(data, before)) {
        setIsRunning(false);
        onCompleted?.();
        return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setIsRunning(false);
        setNotice('수집이 오래 걸리고 있어요. 잠시 뒤 새로고침하면 결과가 보입니다.');
        return;
      }
      pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
    };
    pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
  };

  return (
    <div className="border-t border-gray-100 mt-4 pt-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">데이터 수집</h3>
        {STATIC_MODE ? (
          // 서버가 없으니 수집은 GitHub Actions에서 돌린다 (매일 자동, 필요하면 Run workflow)
          <a
            href={CRAWL_WORKFLOW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 whitespace-nowrap"
          >
            <FiExternalLink size={14} />
            지금 수집하기
          </a>
        ) : (
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <FiRefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
            {isRunning ? '수집 중...' : '지금 수집하기'}
          </button>
        )}
      </div>

      {STATIC_MODE && (
        <p className="text-xs text-gray-500 mb-2">
          매일 아침 6시에 자동으로 수집합니다. 바로 돌리려면 버튼을 눌러 열리는 GitHub 화면에서{' '}
          <b>Run workflow</b>를 누르세요. 몇 분 뒤 새로고침하면 반영됩니다.
        </p>
      )}

      {loadError && <p className="text-sm text-red-600">수집 상태를 불러오지 못했습니다.</p>}

      {latest && (
        <ul className="space-y-2">
          {latest.map(({ adapterName, lastCrawl }) => {
            const state = lastCrawl ? describe(lastCrawl) : null;
            const when = lastCrawl
              ? new Date(lastCrawl.crawlCompletedAt ?? lastCrawl.crawlStartedAt)
              : null;
            return (
              <li key={adapterName} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">
                    {ADAPTER_LABELS[adapterName] ?? adapterName}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {when ? `${formatMonthDay(when)} ${formatTime(when)}` : '아직 수집 전'}
                  </span>
                </div>
                {state && (
                  <p
                    className={`mt-0.5 flex items-start gap-1 ${
                      state.tone === 'error'
                        ? 'text-red-600'
                        : state.tone === 'running'
                          ? 'text-blue-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {state.tone === 'error' ? (
                      <FiAlertCircle size={14} className="mt-0.5 shrink-0" />
                    ) : state.tone === 'ok' ? (
                      <FiCheckCircle size={14} className="mt-0.5 shrink-0 text-green-600" />
                    ) : null}
                    <span className="break-words">{state.text}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {notice && <p className="text-sm text-amber-700 mt-3">{notice}</p>}
    </div>
  );
}

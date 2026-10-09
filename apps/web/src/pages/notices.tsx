import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FiExternalLink, FiAlertCircle, FiX, FiPlus } from 'react-icons/fi';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuthStore } from '@/store/authStore';
import { toLocalYmd } from '@/lib/bookingDates';
import {
  DEFAULT_KEYWORDS,
  LAST_VISIT_KEY,
  getKeywords,
  isNewSince,
  loadNotices,
  matchedKeywords,
  saveKeywords,
  splitByKeywords,
  type NoticesFile,
} from '@/lib/notices';

export default function NoticesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [file, setFile] = useState<NoticesFile | null>(null);
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [newKeyword, setNewKeyword] = useState('');
  const [onlyMatched, setOnlyMatched] = useState(false);
  const [source, setSource] = useState('');
  const [lastVisit, setLastVisit] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotices().then(setFile);
    setKeywords(getKeywords());
    // 이번 방문에는 지난 방문 날짜 기준으로 새 글을 표시하고, 방문 날짜는 오늘로 바꿔 둔다
    try {
      setLastVisit(localStorage.getItem(LAST_VISIT_KEY));
      localStorage.setItem(LAST_VISIT_KEY, toLocalYmd(new Date()));
    } catch {
      /* 무시 */
    }
  }, [isAuthenticated]);

  const updateKeywords = (next: string[]) => {
    setKeywords(next);
    saveKeywords(next);
  };

  const addKeyword = () => {
    const word = newKeyword.trim();
    if (word && !keywords.includes(word)) updateKeywords([...keywords, word]);
    setNewKeyword('');
  };

  const notices = useMemo(() => file?.notices ?? [], [file]);
  const rows = useMemo(
    () =>
      notices
        .map((n) => ({ notice: n, hits: matchedKeywords(n.title, keywords) }))
        .filter(
          ({ notice, hits }) =>
            (!source || notice.sourceId === source) && (!onlyMatched || hits.length > 0)
        ),
    [notices, keywords, source, onlyMatched]
  );
  const matchedCount = notices.filter((n) => matchedKeywords(n.title, keywords).length > 0).length;
  const failed = (file?.sources ?? []).filter((s) => !s.ok);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">기관 공지</h1>
          <p className="text-gray-600 mt-2">
            박물관·과학관 홈페이지 공지사항을 모았어요. 도슨트·교육 모집처럼 공공예약에 안 올라오는
            소식을 확인하세요.
          </p>
        </div>

        {/* 키워드 */}
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">관심 키워드</p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-yellow-100 text-yellow-900 text-sm"
              >
                {k}
                <button
                  onClick={() => updateKeywords(keywords.filter((w) => w !== k))}
                  aria-label={`${k} 빼기`}
                  className="p-0.5 rounded-full hover:bg-yellow-200"
                >
                  <FiX size={14} />
                </button>
              </span>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addKeyword();
              }}
              className="inline-flex items-center gap-1"
            >
              <input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="키워드 추가"
                className="w-28 px-3 py-1 border border-gray-300 rounded-full text-sm"
              />
              <button
                type="submit"
                aria-label="키워드 추가"
                className="p-1.5 rounded-full border border-gray-300 hover:bg-gray-50"
              >
                <FiPlus size={14} />
              </button>
            </form>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMatched}
              onChange={(e) => setOnlyMatched(e.target.checked)}
              className="w-4 h-4"
            />
            키워드가 들어간 글만 보기 ({matchedCount}건)
          </label>
        </div>

        {/* 기관 */}
        <div className="flex flex-wrap gap-2">
          {[{ id: '', name: '전체' }, ...(file?.sources ?? [])].map((s) => (
            <button
              key={s.id || 'all'}
              onClick={() => setSource(s.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${
                source === s.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {file === null ? (
          <p className="text-center py-12 text-gray-600">공지를 불러오는 중...</p>
        ) : rows.length === 0 ? (
          <p className="text-center py-12 text-gray-600">조건에 맞는 공지가 없어요.</p>
        ) : (
          <ul className="bg-white rounded-lg shadow divide-y divide-gray-100">
            {rows.map(({ notice, hits }) => (
              <li key={notice.id}>
                <a
                  href={notice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 ${hits.length ? 'bg-yellow-50/40' : ''}`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-blue-700">{notice.sourceName}</span>
                      {notice.category && (
                        <span className="text-gray-500">· {notice.category}</span>
                      )}
                      {notice.pinned && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          고정
                        </span>
                      )}
                      {isNewSince(notice, lastVisit) && (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                          새 글
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900">
                      {splitByKeywords(notice.title, keywords).map((part, i) =>
                        part.hit ? (
                          <mark key={i} className="bg-yellow-200 rounded px-0.5">
                            {part.text}
                          </mark>
                        ) : (
                          <span key={i}>{part.text}</span>
                        )
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1 text-sm text-gray-500">
                    {notice.date.replace(/-/g, '.')}
                    <FiExternalLink size={14} className="text-gray-400" />
                  </div>
                </a>
              </li>
            ))}
          </ul>
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

        {file?.generatedAt && (
          <p className="text-xs text-gray-500">
            마지막 확인: {new Date(file.generatedAt).toLocaleString('ko-KR')} · 매일 자동으로 다시
            확인해요.
          </p>
        )}
      </div>
    </MainLayout>
  );
}

import React from 'react';

export interface SourceLink {
  label: string;
  url: string;
}

/** 화면 맨 아래 "출처 · 기준" 한 줄. 데이터를 어디서 언제 가져왔는지 밝힌다 */
export function SourceNote({
  sources,
  updatedAt,
  note,
}: {
  sources: SourceLink[];
  /** ISO 시각. 없으면 기준 시각을 쓰지 않는다 */
  updatedAt?: string | null;
  note?: string;
}) {
  const when = updatedAt
    ? new Date(updatedAt).toLocaleString('ko-KR', {
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;
  return (
    <p className="mt-10 text-xs leading-5 text-gray-500">
      {sources.length > 0 && '출처 '}
      {sources.map((s, i) => (
        <React.Fragment key={s.url}>
          {i > 0 && ', '}
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
            {s.label}
          </a>
        </React.Fragment>
      ))}
      {when && <> · {when} 기준</>}
      {note && (
        <>
          {sources.length > 0 && ' · '}
          {note}
        </>
      )}
    </p>
  );
}

export const SOURCES = {
  seoulReservation: { label: '서울시 공공서비스예약', url: 'https://yeyak.seoul.go.kr' },
  seoulOpenData: { label: '서울 열린데이터광장', url: 'https://data.seoul.go.kr' },
  tourApi: { label: '한국관광공사', url: 'https://api.visitkorea.or.kr' },
  nolbal: { label: '놀이의발견', url: 'https://www.nolbal.com' },
} satisfies Record<string, SourceLink>;

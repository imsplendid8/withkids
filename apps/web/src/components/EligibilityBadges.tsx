import React from 'react';
import type { ProgramEligibility } from '@/lib/eligibility';

interface Props {
  targetInfo?: string | null;
  eligibility?: ProgramEligibility;
  /** 상세 화면에서는 판단 기준 설명까지 보여준다 */
  detailed?: boolean;
}

/** 이용 대상 원문과 아이별 참여 가능 여부 */
export function EligibilityBadges({ targetInfo, eligibility, detailed = false }: Props) {
  if (!targetInfo && !eligibility) return null;
  const children = eligibility?.children ?? [];

  return (
    <div className="space-y-1.5">
      {targetInfo && (
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-600">대상</span> {targetInfo}
        </p>
      )}
      {eligibility && !eligibility.known && (
        <p className="text-xs text-gray-500">
          대상 정보가 없어 참여 가능 여부를 판단하지 못했어요.
        </p>
      )}
      {eligibility?.known && children.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {children.map((child) => (
            <span
              key={child.childId}
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                child.eligible
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-500 line-through'
              }`}
            >
              {child.name} {child.eligible ? '가능' : '불가'}
            </span>
          ))}
          {eligibility.adultsJoin && children.some((c) => c.eligible) && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              보호자 함께
            </span>
          )}
        </div>
      )}
      {detailed && eligibility?.known && children.length > 0 && (
        <p className="text-xs text-gray-500">
          체험 날짜 기준 만 나이·학년으로 판단했어요. 기관 공지와 다를 수 있으니 신청 전에 꼭 확인해
          주세요.
        </p>
      )}
    </div>
  );
}

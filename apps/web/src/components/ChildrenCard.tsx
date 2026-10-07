import React, { useEffect, useState } from 'react';
import { FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { apiClient } from '@/lib/api';
import { defaultChildName, getChildren, saveChildren } from '@/lib/children';
import { childFacts, type Child } from '@/lib/eligibility';
import { useAuthStore } from '@/store/authStore';

function describe(birthDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return '';
  const facts = childFacts(birthDate, new Date());
  if (facts.age < 0) return '';
  const stage =
    facts.grade <= 0
      ? '취학 전'
      : facts.grade <= 6
        ? `초등 ${facts.grade}학년`
        : facts.grade <= 9
          ? `중학교 ${facts.grade - 6}학년`
          : `고등학교 ${facts.grade - 9}학년`;
  const age = facts.age < 3 ? `${facts.months}개월 (만 ${facts.age}세)` : `만 ${facts.age}세`;
  return `${age} · ${stage}`;
}

/** 아이 이름·생일 관리. 프로그램 목록의 "누가 갈 수 있나요" 필터가 이 정보로 판단한다 */
export function ChildrenCard() {
  const { user, setUser } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setChildren(getChildren());
  }, []);

  const update = (index: number, patch: Partial<Child>) => {
    setChildren((prev) => prev.map((child, i) => (i === index ? { ...child, ...patch } : child)));
    setMessage(null);
  };

  const handleAdd = () => {
    setChildren((prev) => [
      ...prev,
      { id: `child-${Date.now()}`, name: defaultChildName(prev.length), birthDate: '' },
    ]);
    setMessage(null);
  };

  const handleSave = async () => {
    const invalid = children.find((c) => !c.name.trim() || !describe(c.birthDate));
    if (invalid) {
      setMessage({ type: 'error', text: '모든 아이의 이름과 생일을 입력해주세요.' });
      return;
    }

    try {
      setIsSaving(true);
      const saved = saveChildren(children.map((c) => ({ ...c, name: c.name.trim() })));
      setChildren(saved);
      // 서버 모드 호환: 예전 방식(나이 목록)도 함께 갱신
      const childrenAges = saved.map((c) => childFacts(c.birthDate, new Date()).age);
      await apiClient.updateProfile(user?.profileName ?? '', childrenAges);
      if (user) setUser({ ...user, childrenAges });
      setMessage({
        type: 'success',
        text: '저장했습니다. 프로그램 목록에서 아이별로 걸러 볼 수 있어요.',
      });
    } catch (error) {
      console.error('자녀 정보 저장 실패:', error);
      setMessage({ type: 'error', text: '저장하지 못했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">우리 아이</h3>
        <p className="text-sm text-gray-600 mt-1">
          생일을 넣으면 체험 날짜 기준 만 나이·학년으로 참여 가능 여부를 알려드려요. 이 정보는 이
          브라우저에만 저장됩니다.
        </p>
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      {children.length === 0 && <p className="text-sm text-gray-500">등록된 아이가 없습니다.</p>}

      <div className="space-y-3">
        {children.map((child, index) => (
          <div key={child.id} className="p-4 border border-gray-200 rounded-lg space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={child.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="이름 (예: 첫째)"
                aria-label="아이 이름"
                className="sm:w-40 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="date"
                value={child.birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => update(index, { birthDate: e.target.value })}
                aria-label="생일"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setChildren((prev) => prev.filter((_, i) => i !== index))}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                <FiTrash2 size={16} />
                삭제
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {describe(child.birthDate) || '생일을 입력해주세요'}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
        >
          <FiPlus size={18} />
          아이 추가
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FiSave size={18} />
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}

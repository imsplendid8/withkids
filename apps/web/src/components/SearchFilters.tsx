import React, { useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

interface SearchParams {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high';
}

interface SearchFiltersProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
}

export function SearchFilters({ onSearch, isLoading = false }: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchParams>({
    keyword: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    sort: 'newest',
  });

  const handleChange = (field: keyof SearchParams, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearch = () => {
    const cleanParams = Object.entries(filters).reduce(
      (acc, [key, value]) => {
        if (value) {
          acc[key as keyof SearchParams] = value as never;
        }
        return acc;
      },
      {} as SearchParams,
    );
    onSearch(cleanParams);
  };

  const handleReset = () => {
    setFilters({
      keyword: '',
      dateFrom: '',
      dateTo: '',
      status: '',
      sort: 'newest',
    });
    onSearch({});
  };

  const hasFilters =
    filters.keyword ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.status ||
    filters.sort !== 'newest';

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FiSearch size={20} className="text-blue-600" />
          <span className="font-semibold text-gray-900">검색 & 필터</span>
          {hasFilters && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              활성화됨
            </span>
          )}
        </div>
        <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {/* Filters Panel */}
      {isExpanded && (
        <div className="border-t border-gray-200 px-6 py-4 space-y-4">
          {/* Keyword Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프로그램/기관명 검색
            </label>
            <input
              type="text"
              placeholder="프로그램명이나 기관명 입력..."
              value={filters.keyword || ''}
              onChange={(e) => handleChange('keyword', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작 날짜
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleChange('dateFrom', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료 날짜
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleChange('dateTo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              예약 상태
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">모든 상태</option>
              <option value="PENDING">대기 중</option>
              <option value="CONFIRMED">확인됨</option>
              <option value="COMPLETED">완료됨</option>
              <option value="CANCELLED">취소됨</option>
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              정렬
            </label>
            <select
              value={filters.sort || 'newest'}
              onChange={(e) =>
                handleChange(
                  'sort',
                  e.target.value as 'newest' | 'oldest' | 'price_low' | 'price_high',
                )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="price_low">가격 낮은순</option>
              <option value="price_high">가격 높은순</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <FiSearch size={18} />
              검색
            </button>
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <FiX size={18} />
              초기화
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

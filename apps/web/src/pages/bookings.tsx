import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { MainLayout } from '@/components/layouts/MainLayout';
import { BookingCalendar } from '@/components/BookingCalendar';
import { SearchFilters } from '@/components/SearchFilters';
import { FiCalendar, FiUsers, FiChevronRight, FiAlertCircle, FiList } from 'react-icons/fi';

interface Booking {
  id: string;
  confirmationNumber: string;
  experienceId: string;
  userId: string;
  experienceDate: string;
  selectedChildren: { id: string; name: string; age: number }[];
  specialRequests?: string;
  totalPrice?: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  experience?: {
    id: string;
    programName: string;
    institution: { institutionName: string };
    price?: number;
  };
}

export default function BookingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<Booking[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchBookings = async () => {
      try {
        setIsLoadingData(true);
        setError(null);
        const data = await apiClient.getBookings();
        setBookings(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error('예약 목록 로드 실패:', err);
        setError('예약 정보를 불러올 수 없습니다.');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchBookings();
  }, [isAuthenticated]);

  const handleBookingUpdate = async () => {
    const data = await apiClient.getBookings();
    setBookings(Array.isArray(data) ? data : data.data || []);
  };

  const handleSearch = async (params: {
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    sort?: 'newest' | 'oldest' | 'price_low' | 'price_high';
  }) => {
    try {
      setIsLoadingData(true);
      setError(null);

      if (Object.keys(params).length === 0) {
        // Reset search
        setIsSearchActive(false);
        setSearchResults([]);
      } else {
        const data = await apiClient.searchBookings(params);
        setSearchResults(Array.isArray(data) ? data : data.data || []);
        setIsSearchActive(true);
        setFilterStatus(null);
      }
    } catch (err) {
      console.error('검색 실패:', err);
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '예약 대기 중' },
      CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-800', label: '예약 확인됨' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: '완료됨' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: '취소됨' },
    };
    return statusMap[status] || statusMap.PENDING;
  };

  const displayBookings = isSearchActive ? searchResults : bookings;

  const filteredBookings = displayBookings.filter((booking) => {
    if (!filterStatus) return true;
    return booking.status === filterStatus;
  });

  const pendingCount = bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED').length;
  const completedCount = bookings.filter((b) => b.status === 'COMPLETED').length;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">예약 현황</h1>
            <p className="text-gray-600 mt-2">아이들의 예약된 경험을 관리하세요</p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiList size={18} />
              목록
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiCalendar size={18} />
              캘린더
            </button>
          </div>
        </div>

        {/* Stats - Show only in list view */}
        {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setFilterStatus(null)}
            className={`p-4 rounded-lg transition-all ${
              !filterStatus
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white border border-gray-200 hover:border-blue-300'
            }`}
          >
            <p className="text-sm font-medium opacity-75">전체</p>
            <p className="text-2xl font-bold mt-1">{bookings.length}</p>
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`p-4 rounded-lg transition-all ${
              filterStatus === 'PENDING'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white border border-gray-200 hover:border-blue-300'
            }`}
          >
            <p className="text-sm font-medium opacity-75">예정</p>
            <p className="text-2xl font-bold mt-1">{pendingCount}</p>
          </button>
          <button
            onClick={() => setFilterStatus('COMPLETED')}
            className={`p-4 rounded-lg transition-all ${
              filterStatus === 'COMPLETED'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white border border-gray-200 hover:border-blue-300'
            }`}
          >
            <p className="text-sm font-medium opacity-75">완료</p>
            <p className="text-2xl font-bold mt-1">{completedCount}</p>
          </button>
        </div>
        )}

        {/* Search Filters */}
        {viewMode === 'list' && <SearchFilters onSearch={handleSearch} isLoading={isLoadingData} />}

        {/* Calendar View */}
        {viewMode === 'calendar' && !isLoadingData && (
          <BookingCalendar bookings={bookings} onBookingUpdate={handleBookingUpdate} />
        )}

        {/* Search Status */}
        {viewMode === 'list' && isSearchActive && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              검색 결과: <strong>{filteredBookings.length}</strong>개 ({displayBookings.length}개 중)
            </p>
          </div>
        )}

        {/* Bookings List */}
        {viewMode === 'list' && (isLoadingData ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">예약 정보를 불러오는 중...</div>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const statusBadge = getStatusBadge(booking.status);
              return (
                <button
                  key={booking.id}
                  onClick={() => router.push(`/bookings/${booking.id}`)}
                  className="w-full bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden text-left"
                >
                  <div className="p-6 flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {booking.experience?.programName || '프로그램'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {booking.experience?.institution?.institutionName || '-'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <FiCalendar size={16} />
                          {new Date(booking.experienceDate).toLocaleDateString('ko-KR')}
                        </div>
                        <div className="flex items-center gap-2">
                          <FiUsers size={16} />
                          {booking.selectedChildren.length}명 참여
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-sm text-gray-600">예약번호: {booking.confirmationNumber}</span>
                        <span className="text-lg font-bold text-blue-600">
                          {booking.totalPrice?.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center text-gray-400">
                      <FiChevronRight size={24} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FiAlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 text-lg mb-4">예약된 프로그램이 없습니다</p>
            <button
              onClick={() => router.push('/experiences')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              프로그램 둘러보기
            </button>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}

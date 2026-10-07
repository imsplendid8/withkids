import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { MainLayout } from '@/components/layouts/MainLayout';
import { FiArrowLeft, FiAlertCircle } from 'react-icons/fi';

interface Experience {
  id: string;
  programName: string;
  institution: { institutionName: string };
  price?: number;
  description?: string;
}

export default function BookingCreatePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { experienceId } = router.query;

  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details');
  const [experience, setExperience] = useState<Experience | null>(null);
  const [formData, setFormData] = useState({
    experienceDate: '',
    selectedChildren: [] as { id: string; name: string; age: number }[],
    specialRequests: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [confirmationNumber, setConfirmationNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!experienceId) return;

    const fetchExperience = async () => {
      try {
        setIsSubmitting(true);
        const data = await apiClient.getExperienceById(experienceId as string);
        setExperience(data);
      } catch (err) {
        console.error('프로그램 정보 로드 실패:', err);
        setError('프로그램 정보를 불러올 수 없습니다.');
      } finally {
        setIsSubmitting(false);
      }
    };

    fetchExperience();
  }, [experienceId]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!experience && !error) {
    return (
      <MainLayout>
        <div className="text-center py-12">로딩 중...</div>
      </MainLayout>
    );
  }

  const handleChildrenChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newChildren = [...formData.selectedChildren];
    newChildren[index] = { ...newChildren[index], name: e.target.value };
    setFormData((prev) => ({ ...prev, selectedChildren: newChildren }));
  };

  const addChild = () => {
    setFormData((prev) => ({
      ...prev,
      selectedChildren: [...prev.selectedChildren, { id: Date.now().toString(), name: '', age: 6 }],
    }));
  };

  const removeChild = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedChildren: prev.selectedChildren.filter((_, i) => i !== index),
    }));
  };

  const handleCreateBooking = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!formData.experienceDate) {
        setError('체험 날짜를 선택해주세요.');
        return;
      }

      if (formData.selectedChildren.length === 0) {
        setError('최소 1명 이상의 자녀 정보를 입력해주세요.');
        return;
      }

      if (formData.selectedChildren.some((c) => !c.name)) {
        setError('모든 자녀의 이름을 입력해주세요.');
        return;
      }

      const booking = await apiClient.createBooking({
        experienceId: experienceId as string,
        experienceDate: formData.experienceDate,
        selectedChildren: formData.selectedChildren,
        specialRequests: formData.specialRequests,
        totalPrice: (experience?.price || 0) * formData.selectedChildren.length,
      });

      setBookingId(booking.id);
      setConfirmationNumber(booking.confirmationNumber || null);
      setStep('success');
    } catch (err) {
      console.error('예약 생성 실패:', err);
      setError('예약 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <FiArrowLeft size={20} />
          돌아가기
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-2">
              <FiAlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Success Screen */}
        {step === 'success' && (
          <div className="text-center space-y-6 py-12">
            <div className="text-6xl">✅</div>
            <h1 className="text-2xl font-bold text-gray-900">예약이 완료되었습니다!</h1>
            <p className="text-gray-600">예약 번호: {confirmationNumber || bookingId}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push(`/bookings/${bookingId}`)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                예약 상세보기
              </button>
              <button
                onClick={() => router.push('/bookings')}
                className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50"
              >
                예약 목록
              </button>
            </div>
          </div>
        )}

        {/* Booking Form */}
        {step !== 'success' && experience && (
          <div className="space-y-6">
            {/* Program Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">프로그램 정보</h2>
              <div className="space-y-2">
                <p className="font-bold text-gray-900">{experience.programName}</p>
                <p className="text-gray-600">{experience.institution.institutionName}</p>
                {!!experience.price && (
                  <p className="text-gray-600">가격: {experience.price.toLocaleString()}원</p>
                )}
              </div>
            </div>

            {/* Experience Date */}
            <div className="bg-white rounded-lg shadow p-6">
              <label
                htmlFor="experienceDate"
                className="block text-lg font-bold text-gray-900 mb-4"
              >
                체험 날짜
              </label>
              <input
                id="experienceDate"
                type="date"
                required
                value={formData.experienceDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, experienceDate: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Children Input */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">참여 자녀 정보</h2>
              <div className="space-y-4">
                {formData.selectedChildren.map((child, index) => (
                  <div key={child.id} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="이름"
                      value={child.name}
                      onChange={(e) => handleChildrenChange(e, index)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <select
                      value={child.age}
                      onChange={(e) => {
                        const newChildren = [...formData.selectedChildren];
                        newChildren[index] = {
                          ...newChildren[index],
                          age: parseInt(e.target.value),
                        };
                        setFormData((prev) => ({ ...prev, selectedChildren: newChildren }));
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {Array.from({ length: 15 }, (_, i) => i + 3).map((age) => (
                        <option key={age} value={age}>
                          {age}세
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeChild(index)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addChild}
                className="mt-4 w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50"
              >
                + 자녀 추가
              </button>
            </div>

            {/* Special Requests */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">특별 요청사항</h2>
              <textarea
                value={formData.specialRequests}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, specialRequests: e.target.value }))
                }
                placeholder="특별한 요청사항이 있으신가요? (선택사항)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg h-24"
              />
            </div>

            {/* Total Price */}
            {!!experience.price && (
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="text-lg font-bold text-gray-900">
                  예상 총액:{' '}
                  {(experience.price * formData.selectedChildren.length).toLocaleString()}원
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleCreateBooking}
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '처리 중...' : '예약 완료'}
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

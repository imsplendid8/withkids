import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { MainLayout } from '@/components/layouts/MainLayout';
import { DataBackupCard } from '@/components/DataBackupCard';
import { ChildrenCard } from '@/components/ChildrenCard';
import { STATIC_MODE } from '@/lib/staticMode';
import { FiEdit2, FiSave, FiX, FiLock } from 'react-icons/fi';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'children' | 'notifications' | 'password' | 'backup'
  >('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    profileName: '',
    email: '',
  });
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        profileName: user.profileName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setMessage(null);
      const childrenAges = user?.childrenAges ?? [];
      await apiClient.updateProfile(formData.profileName, childrenAges);
      setMessage({ type: 'success', text: '프로필이 저장되었습니다.' });
      setIsEditing(false);
      if (user) {
        setUser({ ...user, profileName: formData.profileName, childrenAges });
      }
    } catch (error) {
      console.error('프로필 저장 실패:', error);
      setMessage({ type: 'error', text: '프로필 저장에 실패했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        profileName: user.profileName || '',
        email: user.email || '',
      });
    }
    setIsEditing(false);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Messages */}
        {message && (
          <div
            className={`rounded-lg p-4 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </p>
          </div>
        )}

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">프로필 설정</h1>
          <p className="text-gray-600 mt-2">계정 정보를 관리하세요</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {/* 로그인이 없는 정적 배포에서는 비밀번호 대신 백업 탭 */}
          {(
            ['profile', 'children', 'notifications', STATIC_MODE ? 'backup' : 'password'] as const
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'profile' && '프로필'}
              {tab === 'children' && '자녀'}
              {tab === 'notifications' && '알림'}
              {tab === 'password' && '비밀번호'}
              {tab === 'backup' && '백업'}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {!isEditing ? (
              <>
                <div className="flex justify-between items-start">
                  <div className="space-y-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        프로필 이름
                      </label>
                      <p className="text-lg text-gray-900">{formData.profileName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                      <p className="text-lg text-gray-900">{formData.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">가입일</label>
                      <p className="text-lg text-gray-900">
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('ko-KR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiEdit2 size={18} />
                    수정
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      프로필 이름
                    </label>
                    <input
                      type="text"
                      value={formData.profileName}
                      onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiSave size={18} />
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiX size={18} />
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'children' && <ChildrenCard />}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">알림 설정</h3>
            <div className="space-y-4">
              {[
                { id: 'booking', label: '예약 관련 알림', description: '예약 확인, 취소 등' },
                {
                  id: 'new_program',
                  label: '신규 프로그램 알림',
                  description: '관심 분야 신규 프로그램',
                },
                { id: 'reminder', label: '일정 미리알림', description: '예정된 프로그램 상기' },
                { id: 'email', label: '이메일 알림', description: '이메일을 통한 알림' },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={item.id !== 'email'}
                      className="w-5 h-5 rounded"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={password.current}
                  onChange={(e) => setPassword({ ...password, current: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
                <input
                  type="password"
                  value={password.new}
                  onChange={(e) => setPassword({ ...password, new: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-6">
                <FiLock size={18} />
                비밀번호 변경
              </button>
            </div>
          </div>
        )}

        {activeTab === 'backup' && <DataBackupCard />}
      </div>
    </MainLayout>
  );
}

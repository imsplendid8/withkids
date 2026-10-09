import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore, type User } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { BASE_PATH, STATIC_MODE } from '@/lib/staticMode';
import { CLOUD_ENABLED, signInWithGoogle } from '@/lib/cloud';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: isAuthLoading, cloudError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 계정이 하나도 없으면 첫 계정 만들기 화면으로 보낸다.
  useEffect(() => {
    // 서버 없는 배포: 구글 로그인을 켰으면 로그인 후 대시보드로, 아니면 로그인 없이 바로
    if (STATIC_MODE) {
      if (!CLOUD_ENABLED || (!isAuthLoading && isAuthenticated)) router.replace('/dashboard');
      return;
    }
    apiClient
      .getSetupStatus()
      .then(({ needsSetup }) => {
        if (needsSetup) router.replace('/setup');
      })
      .catch(() => {
        // 확인에 실패해도 로그인은 시도할 수 있어야 한다.
      });
  }, [router, isAuthenticated, isAuthLoading]);

  const handleGoogle = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // 로그인되면 authStore가 계정 데이터를 가져온 뒤 위 useEffect가 대시보드로 보낸다
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setError(
        code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
          ? '로그인 창이 닫혔어요. 다시 눌러 주세요.'
          : code === 'auth/unauthorized-domain'
            ? '이 주소가 Firebase 승인된 도메인에 없어요. 설정을 확인해 주세요.'
            : '구글 로그인에 실패했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (STATIC_MODE && CLOUD_ENABLED) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-6">
          <div className="flex flex-col items-center">
            <img
              src={`${BASE_PATH}/favicon.svg`}
              alt=""
              width={56}
              height={56}
              className="rounded-2xl"
            />
            <h1 className="text-2xl font-bold text-gray-900 mt-4">WITHKIDS</h1>
            <p className="text-gray-600 mt-1">아이와 갈 체험·축제를 한곳에서</p>
          </div>
          {(error || cloudError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error || cloudError}
            </div>
          )}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading || isAuthLoading}
            className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
              />
            </svg>
            {isLoading || isAuthLoading ? '확인 중...' : '구글로 로그인'}
          </button>
          <p className="text-xs text-gray-500">
            아이 정보·예약·찜은 내 계정에만 저장되고, 휴대폰과 PC에서 함께 볼 수 있어요.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.login(email, password);
      // 로그인 응답에는 토큰만 있다. 이름 등은 _app에서 /users/me로 채운다.
      login({ email } as User, response.accessToken, response.refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600">WITHKIDS</h1>
            <p className="text-gray-600 mt-2">아이들의 경험을 예약하세요</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

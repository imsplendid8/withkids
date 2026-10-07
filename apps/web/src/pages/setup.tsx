import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore, type User } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { STATIC_MODE } from '@/lib/staticMode';

/**
 * 처음 한 번만 쓰는 계정 만들기 화면.
 * 계정이 이미 있으면 서버가 가입을 거부하므로, 이 화면도 로그인으로 돌려보낸다.
 */
export default function SetupPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [profileName, setProfileName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // 서버 없는 배포에는 로그인이 없다
    if (STATIC_MODE) {
      router.replace('/dashboard');
      return;
    }
    apiClient
      .getSetupStatus()
      .then(({ needsSetup }) => {
        if (needsSetup) setIsChecking(false);
        else router.replace('/login');
      })
      .catch(() => {
        setError('서버에 연결하지 못했습니다. 앱이 켜져 있는지 확인해주세요.');
        setIsChecking(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 서로 다릅니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.register(email, password, profileName || undefined);
      const tokens = await apiClient.login(email, password);
      login({ email } as User, tokens.accessToken, tokens.refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: string | string[] } } })
        .response;
      if (response?.status === 403) {
        router.replace('/login');
        return;
      }
      const message = response?.data?.message;
      setError(
        response?.status === 409
          ? '이미 등록된 이메일입니다.'
          : Array.isArray(message)
            ? message.join(', ')
            : message || '계정을 만들지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">확인 중...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600">WITHKIDS</h1>
            <p className="text-gray-900 font-semibold mt-4">처음 사용할 계정을 만들어주세요</p>
            <p className="text-gray-600 text-sm mt-1">
              한 번만 만들면 됩니다. 이후에는 이 계정으로만 로그인할 수 있어요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <Field label="이름 (선택)" htmlFor="profileName">
              <input
                id="profileName"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="대시보드 인사말에 쓰여요"
                className={inputClass}
              />
            </Field>

            <Field label="이메일" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="비밀번호 (8자 이상)" htmlFor="password">
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="비밀번호 확인" htmlFor="passwordConfirm">
              <input
                id="passwordConfirm"
                type="password"
                required
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className={inputClass}
              />
            </Field>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '만드는 중...' : '계정 만들고 시작하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

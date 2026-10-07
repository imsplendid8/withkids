import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { initSentry, setUser, clearUser } from '@/lib/sentry';
import { trackWebVitals } from '@/lib/performance';
import '../styles/globals.css';

// Initialize Sentry on mount
initSentry();

export default function App({ Component, pageProps }: AppProps) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuthUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 로그인 응답에는 이름·자녀 나이가 없다. 로그인 상태가 되면 서버에서 받아 둔다.
  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient
      .getMe()
      .then(setAuthUser)
      .catch(() => {
        // 실패해도 토큰은 유효하다. 이름만 비어 보인다.
      });
  }, [isAuthenticated, setAuthUser]);

  // Track user for error reporting
  useEffect(() => {
    if (user?.id) {
      setUser(user.id, user.email);
    } else {
      clearUser();
    }
  }, [user?.id, user?.email]);

  // Initialize Web Vitals tracking
  useEffect(() => {
    trackWebVitals();
  }, []);

  return (
    <>
      <Head>
        <title>WITHKIDS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

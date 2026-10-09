import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { initSentry, setUser, clearUser } from '@/lib/sentry';
import { trackWebVitals } from '@/lib/performance';
import { BASE_PATH } from '@/lib/staticMode';
import { useDisplayStore, viewportContent } from '@/store/displayStore';
import '../styles/globals.css';
import '../styles/theme.css';

// Initialize Sentry on mount
initSentry();

export default function App({ Component, pageProps }: AppProps) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const display = useDisplayStore((state) => state.settings);
  const hydrateDisplay = useDisplayStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 화면 설정(다크 모드 등). 시스템 테마를 따를 때는 기기 설정이 바뀌면 바로 반영한다
  useEffect(() => {
    hydrateDisplay();
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', hydrateDisplay);
    return () => media?.removeEventListener?.('change', hydrateDisplay);
  }, [hydrateDisplay]);

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
        <meta name="viewport" content={viewportContent(display)} />
        <link rel="icon" href={`${BASE_PATH}/favicon.svg`} type="image/svg+xml" />
        <link rel="icon" href={`${BASE_PATH}/favicon-48.png`} type="image/png" sizes="48x48" />
        <link rel="apple-touch-icon" href={`${BASE_PATH}/apple-touch-icon.png`} />
        <link rel="manifest" href={`${BASE_PATH}/manifest.webmanifest`} />
        <meta name="apple-mobile-web-app-title" content="WITHKIDS" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

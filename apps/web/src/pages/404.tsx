import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BASE_PATH, STATIC_MODE } from '@/lib/staticMode';

/**
 * GitHub Pages에는 /bookings/abc123 같은 주소마다 파일이 없어서, 그런 주소를 바로 열거나
 * 새로고침하면 이 404 페이지가 뜬다. 앱이 아는 주소 모양이면 그 페이지로 다시 보낸다.
 */
const CLIENT_ROUTES = [/^\/bookings\/[^/]+\/?$/, /^\/bookings\/[^/]+\/review\/?$/, /^\/experiences\/[^/]+\/?$/];

export default function NotFoundPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(STATIC_MODE);

  useEffect(() => {
    if (!STATIC_MODE) return;

    const { pathname, search, hash } = window.location;
    const path = pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname;
    // 같은 주소로 두 번 돌아오면(실제로 없는 페이지) 멈춘다
    const attemptKey = `withdkis.404:${path}`;

    if (CLIENT_ROUTES.some((route) => route.test(path)) && !sessionStorage.getItem(attemptKey)) {
      sessionStorage.setItem(attemptKey, '1');
      router.replace(`${path}${search}${hash}`).finally(() => sessionStorage.removeItem(attemptKey));
    } else {
      sessionStorage.removeItem(attemptKey);
      setIsRedirecting(false);
    }
  }, [router]);

  if (isRedirecting) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">불러오는 중...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-2xl font-bold text-gray-900">페이지를 찾을 수 없어요</p>
      <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        대시보드로 가기
      </Link>
    </div>
  );
}

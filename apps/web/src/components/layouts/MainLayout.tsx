import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { BASE_PATH, STATIC_MODE } from '@/lib/staticMode';
import { CLOUD_ENABLED, signOutCloud } from '@/lib/cloud';
import { FiBell, FiLogOut } from 'react-icons/fi';
import { NAV_LINKS, SETTINGS_ICON, TAB_LINKS, isActive } from './navigation';

interface MainLayoutProps {
  children: ReactNode;
}

/** 로그아웃: 계정에 마저 저장하고 이 브라우저에서 계정 데이터를 지운다. 저장이 실패하면 로그아웃하지 않는다 */
export async function logoutEverywhere(logout: () => void, goLogin: () => void) {
  if (CLOUD_ENABLED) {
    try {
      await signOutCloud();
    } catch (error) {
      window.alert((error as Error).message);
      return;
    }
  }
  logout();
  goLogin();
}

export const canLogout = !STATIC_MODE || CLOUD_ENABLED;

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { logout, isAuthenticated } = useAuthStore();
  const [unreadCount, setUnreadCount] = React.useState(0);

  // 페이지를 옮길 때마다 새로 센다. 알림 화면에서 읽음 처리한 뒤 돌아오면 줄어든다.
  React.useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    apiClient
      .getNotifications()
      .then((list) => {
        if (!cancelled) setUnreadCount(Array.isArray(list) ? list.length : 0);
      })
      .catch(() => {
        if (!cancelled) setUnreadCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, router.asPath]);

  const handleLogout = () => logoutEverywhere(logout, () => router.push('/login'));
  const SettingsIcon = SETTINGS_ICON;

  return (
    <div className="app-shell min-h-screen bg-slate-50">
      {/* 위쪽 바: 휴대폰에서는 로고와 알림만, PC에서는 메뉴까지 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 md:h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img
                src={`${BASE_PATH}/favicon.svg`}
                alt=""
                width={30}
                height={30}
                className="rounded-lg"
              />
              <span className="text-lg font-bold text-slate-900 tracking-tight">WITHKIDS</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 lg:px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(router.pathname, link.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push('/notifications')}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                title="알림"
                aria-label="알림"
              >
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <Link
                href="/settings"
                className="hidden md:inline-flex p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                title="설정"
                aria-label="설정"
              >
                <SettingsIcon size={20} />
              </Link>
              {canLogout && (
                <button
                  onClick={handleLogout}
                  className="hidden md:inline-flex p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                  title="로그아웃"
                  aria-label="로그아웃"
                >
                  <FiLogOut size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8">{children}</main>

      <footer className="hidden md:block bg-slate-900 border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-slate-400 text-sm">
            <p>&copy; 2026 WITHKIDS. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* 휴대폰: 앱처럼 아래 탭 */}
      <div className="app-bottom-space md:hidden" />
      <nav
        className="app-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200"
        aria-label="주요 메뉴"
      >
        <div className="grid grid-cols-5 h-16">
          {TAB_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              isActive(router.pathname, href) ||
              (href === '/settings' &&
                ['/paid', '/notices', '/notifications', '/profile'].some((p) =>
                  isActive(router.pathname, p)
                ));
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${
                  active ? 'text-blue-600' : 'text-gray-500'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

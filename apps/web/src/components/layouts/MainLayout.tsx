import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { STATIC_MODE } from '@/lib/staticMode';
import { CLOUD_ENABLED, signOutCloud } from '@/lib/cloud';
import { FiMenu, FiX, FiBell, FiLogOut } from 'react-icons/fi';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { logout, isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
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

  const handleLogout = async () => {
    if (CLOUD_ENABLED) {
      // 계정에 마저 저장하고, 이 브라우저에서 계정 데이터를 지운다. 저장이 실패하면 로그아웃하지 않는다.
      try {
        await signOutCloud();
      } catch (error) {
        window.alert((error as Error).message);
        return;
      }
    }
    logout();
    router.push('/login');
  };

  const navLinks = [
    { href: '/dashboard', label: '대시보드' },
    { href: '/experiences', label: '프로그램 둘러보기' },
    { href: '/festivals', label: '축제' },
    { href: '/notices', label: '기관 공지' },
    { href: '/bookings', label: '예약 관리' },
    { href: '/profile', label: '프로필' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">WITHKIDS</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    router.pathname === link.href
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  style={{ letterSpacing: '0.25px' }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/notifications')}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                title="알림"
              >
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
              >
                {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>

              {/* Logout button (로그인이 없는 정적 배포에서는 숨긴다) */}
              {(!STATIC_MODE || CLOUD_ENABLED) && (
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                  title="로그아웃"
                >
                  <FiLogOut size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 border-t border-slate-200 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    router.pathname === link.href
                      ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={{ letterSpacing: '0.25px' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-slate-400 text-sm" style={{ letterSpacing: '0.25px' }}>
            <p>&copy; 2026 WITHKIDS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

import type { IconType } from 'react-icons';
import {
  FiHome,
  FiSearch,
  FiCalendar,
  FiClipboard,
  FiGrid,
  FiTag,
  FiFileText,
  FiUser,
  FiBell,
  FiSettings,
} from 'react-icons/fi';

export interface NavLink {
  href: string;
  label: string;
  icon: IconType;
}

/** PC 위쪽 메뉴 */
export const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: '대시보드', icon: FiHome },
  { href: '/experiences', label: '프로그램 둘러보기', icon: FiSearch },
  { href: '/paid', label: '유료 체험', icon: FiTag },
  { href: '/festivals', label: '축제', icon: FiCalendar },
  { href: '/notices', label: '기관 공지', icon: FiFileText },
  { href: '/bookings', label: '예약 관리', icon: FiClipboard },
  { href: '/profile', label: '프로필', icon: FiUser },
];

/** 휴대폰 아래 탭 (나머지는 "더보기"=설정 화면에 모은다) */
export const TAB_LINKS: NavLink[] = [
  { href: '/dashboard', label: '홈', icon: FiHome },
  { href: '/experiences', label: '프로그램', icon: FiSearch },
  { href: '/festivals', label: '축제', icon: FiCalendar },
  { href: '/bookings', label: '예약', icon: FiClipboard },
  { href: '/settings', label: '더보기', icon: FiGrid },
];

/** 더보기 화면의 메뉴 */
export const MORE_LINKS: NavLink[] = [
  { href: '/paid', label: '유료 체험', icon: FiTag },
  { href: '/notices', label: '기관 공지', icon: FiFileText },
  { href: '/notifications', label: '알림', icon: FiBell },
  { href: '/profile', label: '프로필 · 아이 정보', icon: FiUser },
];

export const SETTINGS_ICON = FiSettings;

/** /experiences/123 처럼 아래 화면에 있어도 그 탭을 켠다 */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

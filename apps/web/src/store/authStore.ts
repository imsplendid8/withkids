import { create } from 'zustand';
import { STATIC_MODE } from '@/lib/staticMode';
import { getLocalProfile } from '@/lib/localApi';
import { CLOUD_ENABLED, watchCloudUser } from '@/lib/cloud';

// 구글 로그인 상태 감시는 한 번만 건다
let watchingCloud = false;

export interface User {
  id: string;
  email: string;
  profileName?: string;
  childrenAges?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  hydrate: () => {
    if (typeof window !== 'undefined' && STATIC_MODE && CLOUD_ENABLED) {
      // 서버 없는 배포 + 구글 로그인: 로그인하면 계정 데이터를 가져온 뒤 들어간다
      if (watchingCloud) return;
      watchingCloud = true;
      watchCloudUser((cloudUser) => {
        if (!cloudUser) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }
        const profile = getLocalProfile();
        set({
          user: {
            ...profile,
            id: cloudUser.uid,
            email: cloudUser.email,
            profileName: profile.profileName || cloudUser.displayName,
          },
          isAuthenticated: true,
          isLoading: false,
        });
      }).catch((error) => {
        console.error('로그인 기능을 불러오지 못했습니다:', error);
        set({ isLoading: false });
      });
      return;
    }
    if (typeof window !== 'undefined' && STATIC_MODE) {
      // 서버 없는 배포: 로그인 없이 이 브라우저의 프로필로 바로 쓴다.
      // 데이터가 이 브라우저에만 있어 다른 사람에게 보이지 않는다.
      set({ user: getLocalProfile(), isAuthenticated: true, isLoading: false });
      return;
    }
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const userStr = localStorage.getItem('user');

      if (accessToken && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({
            accessToken,
            refreshToken,
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    }
  },
}));

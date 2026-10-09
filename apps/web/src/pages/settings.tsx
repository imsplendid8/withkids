import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiChevronRight,
  FiMonitor,
  FiMoon,
  FiSun,
  FiSmartphone,
  FiMaximize,
  FiType,
  FiDownload,
  FiLogOut,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { MainLayout, canLogout, logoutEverywhere } from '@/components/layouts/MainLayout';
import { MORE_LINKS } from '@/components/layouts/navigation';
import { useAuthStore } from '@/store/authStore';
import { useDisplayStore } from '@/store/displayStore';
import type { DisplaySettings } from '@/lib/display';

interface Choice<T extends string> {
  value: T;
  label: string;
  icon: IconType;
}

function Segmented<T extends string>({
  value,
  choices,
  onChange,
  label,
}: {
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-flow-col auto-cols-fr gap-1 p-1 rounded-xl bg-gray-100"
    >
      {choices.map(({ value: v, label: text, icon: Icon }) => {
        const selected = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(v)}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              selected ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon size={16} />
            {text}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="px-1 mb-2 text-sm font-semibold text-gray-500">{title}</h2>
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {children}
      </div>
    </section>
  );
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4">
      <p className="font-medium text-gray-900 mb-0.5">{title}</p>
      {hint && <p className="text-xs text-gray-500 mb-3">{hint}</p>}
      {!hint && <div className="mb-2" />}
      {children}
    </div>
  );
}

/** 안드로이드 크롬이 주는 "앱 설치" 요청 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function useInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(
      window.matchMedia?.('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  };

  return { canPrompt: prompt !== null, installed, ios, install };
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const settings = useDisplayStore((state) => state.settings);
  const update = useDisplayStore((state) => state.update);
  const { canPrompt, installed, ios, install } = useInstall();

  const set =
    <K extends keyof DisplaySettings>(key: K) =>
    (value: DisplaySettings[K]) =>
      update({ [key]: value } as Partial<DisplaySettings>);

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-5">더보기 · 설정</h1>

        <Section title="메뉴">
          {MORE_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3.5 text-gray-900 hover:bg-gray-50 first:rounded-t-2xl last:rounded-b-2xl"
            >
              <Icon size={20} className="text-blue-600" />
              <span className="flex-1 font-medium">{label}</span>
              <FiChevronRight className="text-gray-400" />
            </Link>
          ))}
        </Section>

        <Section title="화면">
          <Row title="테마" hint="시스템 설정을 고르면 휴대폰·PC의 다크 모드를 따라가요.">
            <Segmented
              label="테마"
              value={settings.theme}
              onChange={set('theme')}
              choices={[
                { value: 'system', label: '시스템', icon: FiMonitor },
                { value: 'light', label: '라이트', icon: FiSun },
                { value: 'dark', label: '다크', icon: FiMoon },
              ]}
            />
          </Row>
          <Row
            title="화면 모드"
            hint="자동은 화면 크기에 맞춰요. 모바일은 PC에서도 휴대폰처럼, PC는 휴대폰에서도 넓은 화면으로 보여 줘요."
          >
            <Segmented
              label="화면 모드"
              value={settings.layout}
              onChange={set('layout')}
              choices={[
                { value: 'auto', label: '자동', icon: FiMaximize },
                { value: 'mobile', label: '모바일', icon: FiSmartphone },
                { value: 'pc', label: 'PC', icon: FiMonitor },
              ]}
            />
          </Row>
          <Row title="글자 크기">
            <Segmented
              label="글자 크기"
              value={settings.font}
              onChange={set('font')}
              choices={[
                { value: 'normal', label: '보통', icon: FiType },
                { value: 'large', label: '크게', icon: FiType },
              ]}
            />
          </Row>
        </Section>

        <Section title="앱으로 쓰기">
          <div className="p-4">
            {installed ? (
              <p className="text-gray-700">지금 앱으로 실행 중이에요.</p>
            ) : canPrompt ? (
              <button
                type="button"
                onClick={install}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                <FiDownload /> 홈 화면에 WITHKIDS 앱 추가
              </button>
            ) : (
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium text-gray-900">홈 화면에 추가하면 앱처럼 열려요</p>
                {ios ? (
                  <p>
                    사파리 아래 공유 버튼(□↑) → <b>홈 화면에 추가</b>
                  </p>
                ) : (
                  <p>
                    크롬 오른쪽 위 ⋮ → <b>홈 화면에 추가</b> (또는 앱 설치)
                  </p>
                )}
              </div>
            )}
          </div>
        </Section>

        {isAuthenticated && canLogout && (
          <Section title="계정">
            {user?.email && (
              <div className="px-4 py-3.5 text-sm text-gray-600">{user.email} 로 로그인됨</div>
            )}
            <button
              type="button"
              onClick={() => logoutEverywhere(logout, () => router.push('/login'))}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-red-600 font-medium hover:bg-red-50 last:rounded-b-2xl"
            >
              <FiLogOut size={20} /> 로그아웃
            </button>
          </Section>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          WITHKIDS · 아이와 함께할 체험·축제 모아보기
        </p>
      </div>
    </MainLayout>
  );
}

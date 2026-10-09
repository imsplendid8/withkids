/**
 * 화면 설정 (테마·화면 모드·글자 크기). 기기마다 다르게 쓰는 값이라 계정에는 올리지 않는다
 * (cloud.ts는 withdkis.* 키만 올린다).
 */
export type ThemeSetting = 'system' | 'light' | 'dark';
export type LayoutSetting = 'auto' | 'mobile' | 'pc';
export type FontSetting = 'normal' | 'large';

export interface DisplaySettings {
  theme: ThemeSetting;
  layout: LayoutSetting;
  font: FontSetting;
}

export const DISPLAY_KEY = 'withkids.display';
export const DEFAULT_DISPLAY: DisplaySettings = { theme: 'system', layout: 'auto', font: 'normal' };

/** PC 화면으로 볼 때 휴대폰이 이 폭으로 그린다 (휴대폰 브라우저의 "데스크톱 사이트"와 같은 방식) */
export const PC_VIEWPORT_WIDTH = 1200;

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export function parseDisplay(raw: string | null | undefined): DisplaySettings {
  try {
    const data = raw ? (JSON.parse(raw) as Partial<DisplaySettings>) : {};
    return {
      theme: pick(data.theme, ['system', 'light', 'dark'] as const, DEFAULT_DISPLAY.theme),
      layout: pick(data.layout, ['auto', 'mobile', 'pc'] as const, DEFAULT_DISPLAY.layout),
      font: pick(data.font, ['normal', 'large'] as const, DEFAULT_DISPLAY.font),
    };
  } catch {
    return { ...DEFAULT_DISPLAY };
  }
}

export function loadDisplay(): DisplaySettings {
  try {
    return parseDisplay(window.localStorage.getItem(DISPLAY_KEY));
  } catch {
    return { ...DEFAULT_DISPLAY };
  }
}

export function resolveDark(theme: ThemeSetting, systemDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && systemDark);
}

/** html 태그에 반영한다. _document의 첫 화면 스크립트도 같은 규칙을 쓴다 */
export function applyDisplay(settings: DisplaySettings): void {
  const root = document.documentElement;
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const dark = resolveDark(settings.theme, systemDark);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.layout = settings.layout;
  root.dataset.font = settings.font;
  const viewport = document.querySelector('meta[name="viewport"]');
  viewport?.setAttribute(
    'content',
    settings.layout === 'pc'
      ? `width=${PC_VIEWPORT_WIDTH}`
      : 'width=device-width, initial-scale=1, viewport-fit=cover'
  );
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#0f172a' : '#2E5090');
}

export function saveDisplay(settings: DisplaySettings): void {
  try {
    window.localStorage.setItem(DISPLAY_KEY, JSON.stringify(settings));
  } catch {
    /* 저장소를 못 쓰면 이번 방문에만 적용 */
  }
  applyDisplay(settings);
}

/** 첫 화면을 그리기 전에 실행할 스크립트 (테마가 깜빡이지 않게). applyDisplay와 같은 규칙 */
export const DISPLAY_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('${DISPLAY_KEY}')||'{}');var r=document.documentElement;var d=s.theme==='dark'||(s.theme!=='light'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);if(d){r.classList.add('dark');r.style.colorScheme='dark';}r.dataset.layout=s.layout==='mobile'||s.layout==='pc'?s.layout:'auto';r.dataset.font=s.font==='large'?'large':'normal';if(s.layout==='pc'){var v=document.querySelector('meta[name="viewport"]');if(v)v.setAttribute('content','width=${PC_VIEWPORT_WIDTH}');}}catch(e){}})();`;

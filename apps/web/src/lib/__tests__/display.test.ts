import {
  DEFAULT_DISPLAY,
  DISPLAY_BOOT_SCRIPT,
  DISPLAY_KEY,
  applyDisplay,
  parseDisplay,
  resolveDark,
} from '../display';

describe('화면 설정', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.head.innerHTML =
      '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#2E5090">';
    window.matchMedia = jest.fn().mockReturnValue({ matches: false }) as never;
  });

  it('저장값을 읽고 모르는 값은 기본값으로', () => {
    expect(parseDisplay(null)).toEqual(DEFAULT_DISPLAY);
    expect(parseDisplay('{"theme":"dark","layout":"pc","font":"large"}')).toEqual({
      theme: 'dark',
      layout: 'pc',
      font: 'large',
    });
    expect(parseDisplay('{"theme":"pink"}')).toEqual(DEFAULT_DISPLAY);
    expect(parseDisplay('깨진 값')).toEqual(DEFAULT_DISPLAY);
  });

  it('시스템 설정을 따르면 기기 테마대로', () => {
    expect(resolveDark('system', true)).toBe(true);
    expect(resolveDark('system', false)).toBe(false);
    expect(resolveDark('light', true)).toBe(false);
    expect(resolveDark('dark', false)).toBe(true);
  });

  it('html 태그와 화면 폭에 반영한다', () => {
    applyDisplay({ theme: 'dark', layout: 'pc', font: 'large' });
    const root = document.documentElement;
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.dataset.layout).toBe('pc');
    expect(root.dataset.font).toBe('large');
    expect(document.querySelector('meta[name="viewport"]')?.getAttribute('content')).toBe(
      'width=1200'
    );

    applyDisplay({ theme: 'light', layout: 'mobile', font: 'normal' });
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.dataset.layout).toBe('mobile');
    expect(document.querySelector('meta[name="viewport"]')?.getAttribute('content')).toContain(
      'device-width'
    );
  });

  it('첫 화면 스크립트도 같은 결과를 낸다', () => {
    localStorage.setItem(DISPLAY_KEY, '{"theme":"dark","layout":"mobile","font":"large"}');
    new Function(DISPLAY_BOOT_SCRIPT)();
    const root = document.documentElement;
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.dataset.layout).toBe('mobile');
    expect(root.dataset.font).toBe('large');
  });
});

const plugin = require('tailwindcss/plugin');

/**
 * 화면 폭 구분(sm·md·lg·xl): 설정에서 "모바일 화면"을 고르면 PC에서도 넓은 화면용 스타일을 끈다.
 * ("PC 화면"은 휴대폰이 1200px 폭으로 그리게 해서 그대로 넓은 화면 스타일이 적용된다)
 */
const SCREENS = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' };

/** 무채색 회색 하나로 통일 (파란 기가 아주 살짝). gray·slate 어느 쪽을 써도 같은 색 */
const GRAY = {
  50: '#f9fafb',
  100: '#f2f4f6',
  200: '#e5e8eb',
  300: '#d1d6db',
  400: '#b0b8c1',
  500: '#8b95a1',
  600: '#6b7684',
  700: '#4e5968',
  800: '#333d4b',
  900: '#191f28',
  950: '#101318',
};

/** 포인트 색은 파랑 하나. 보라·남색은 파랑으로 모아 무지개 느낌을 없앤다 */
const BLUE = {
  50: '#eef4ff',
  100: '#dbe7ff',
  200: '#bcd3ff',
  300: '#8fb5fd',
  400: '#5b91f8',
  500: '#3b73f0',
  600: '#2563eb',
  700: '#1d4fc4',
  800: '#1c429c',
  900: '#1c3a7a',
};

/** 한글은 큰 글자일수록 자간을 좁혀야 자연스럽다. 제목 크기도 앱에 맞게 한 단계씩 줄임 */
const FONT_SIZE = {
  xs: ['0.75rem', { lineHeight: '1.125rem' }],
  sm: ['0.875rem', { lineHeight: '1.375rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.0625rem', { lineHeight: '1.625rem', letterSpacing: '-0.015em' }],
  xl: ['1.1875rem', { lineHeight: '1.75rem', letterSpacing: '-0.02em' }],
  '2xl': ['1.375rem', { lineHeight: '1.875rem', letterSpacing: '-0.025em' }],
  '3xl': ['1.625rem', { lineHeight: '2.125rem', letterSpacing: '-0.03em' }],
  '4xl': ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    screens: {},
    fontSize: FONT_SIZE,
    extend: {
      colors: {
        gray: GRAY,
        slate: GRAY,
        neutral: GRAY,
        blue: BLUE,
        indigo: BLUE,
        purple: BLUE,
        primary: '#2563eb',
        secondary: '#E67E22',
        accent: '#27AE60',
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        // 테두리 + 그림자를 같이 쓰는 곳이 많아 그림자는 아주 옅게
        sm: '0 1px 2px rgb(16 19 24 / 0.04)',
        DEFAULT: '0 1px 3px rgb(16 19 24 / 0.05), 0 1px 2px rgb(16 19 24 / 0.03)',
        md: '0 4px 12px rgb(16 19 24 / 0.06)',
        lg: '0 8px 24px rgb(16 19 24 / 0.08)',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      for (const [name, width] of Object.entries(SCREENS)) {
        addVariant(name, `@media (min-width: ${width}) { html:not([data-layout="mobile"]) & }`);
      }
    }),
  ],
};

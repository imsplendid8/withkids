const plugin = require('tailwindcss/plugin');

/**
 * 화면 폭 구분(sm·md·lg·xl): 설정에서 "모바일 화면"을 고르면 PC에서도 넓은 화면용 스타일을 끈다.
 * ("PC 화면"은 휴대폰이 1200px 폭으로 그리게 해서 그대로 넓은 화면 스타일이 적용된다)
 */
const SCREENS = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' };

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
    extend: {
      colors: {
        primary: '#2E5090',
        secondary: '#E67E22',
        accent: '#27AE60',
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

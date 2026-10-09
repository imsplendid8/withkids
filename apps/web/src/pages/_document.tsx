import { Html, Head, Main, NextScript } from 'next/document';
import { DISPLAY_BOOT_SCRIPT } from '@/lib/display';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* 화면을 그리기 전에 다크 모드·화면 모드를 적용해 깜빡이지 않게 한다 */}
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_BOOT_SCRIPT }} />
        <meta name="theme-color" content="#2E5090" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

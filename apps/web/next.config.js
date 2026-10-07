/** @type {import('next').NextConfig} */

const staticMode = process.env.NEXT_PUBLIC_STATIC_MODE === 'true';

// 정적 배포(GitHub Pages): 서버 없이 HTML/JS만 만든다.
// 예약 등은 브라우저에 저장하고, 프로그램은 빌드 때 넣은 data/programs.json을 읽는다.
const staticConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  // 프로젝트 페이지는 https://<user>.github.io/<repo> 아래에 뜬다
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // /dashboard 요청을 dashboard/index.html로 받게 해 GitHub Pages에서 확실히 열리게 한다
  trailingSlash: true,
  images: { unoptimized: true },
};

// 서버 배포(내 PC + Docker): 브라우저는 같은 오리진의 /api 를 호출하고, Next가 API 서버로 넘긴다.
// 터널 주소가 바뀌어도 프런트를 다시 빌드할 필요가 없고 CORS도 생기지 않는다.
const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:3001';

const serverConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Docker 이미지에서 .next/standalone 으로 실행하기 위해 필요
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

module.exports = staticMode ? staticConfig : serverConfig;

# WithDKIS 프로덕션 배포 가이드

**배포일**: 2026-09-15  
**상태**: ✅ **배포 준비 완료 (Ready for Deployment)**  
**버전**: 1.0.0

---

## 📋 배포 전 체크리스트

### 1. 환경 변수 설정 ✅
필요한 환경 변수를 프로덕션 서버에 설정하세요:

```bash
# 필수 항목
export NEXT_PUBLIC_API_URL=https://api.withdkis.com
export NODE_ENV=production

# 선택 항목 (권장)
export NEXT_PUBLIC_SENTRY_DSN=https://[key]@sentry.io/[project]
export NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 2. 포트 설정
```bash
# 기본값: 3000
# 또는 환경 변수로 변경
export PORT=8080
```

### 3. 빌드 결과물 준비
```bash
# 이미 생성됨
.next/          # Next.js 빌드 출력 (자동 생성)
public/         # 정적 파일
node_modules/   # 의존성 (npm install 후)
```

---

## 🚀 배포 단계별 가이드

### 단계 1: 프로덕션 빌드 생성
```bash
cd /path/to/game-app
npm run build:web
```

**결과**:
```
✅ TypeScript 컴파일: 성공
✅ ESLint 검증: 통과
✅ 페이지 생성: 15/15 (100%)
✅ 번들 최적화: 완료
```

### 단계 2: 환경 변수 설정
```bash
# 프로덕션 서버에 설정
export NEXT_PUBLIC_API_URL=https://api.withdkis.com
export NODE_ENV=production
```

### 단계 3: 의존성 설치 (프로덕션 환경)
```bash
# 프로덕션 의존성만 설치
npm install --omit=dev
```

### 단계 4: 서버 실행
```bash
npm start
# 또는
npx next start -p 3000
```

**확인**:
```
✓ ready - started server on 0.0.0.0:3000
```

### 단계 5: 헬스 체크
```bash
# 응답 확인
curl -s https://your-domain.com/ | head -20

# 상태 확인
curl -s https://your-domain.com/api/health || echo "API 서버 필요"
```

---

## 📊 배포 전 검증 결과

### 빌드 상태
```
빌드 완료: ✅
페이지 수: 15개 (모두 성공)
TypeScript 오류: 0개
ESLint 오류: 0개
번들 크기: 최적화됨 (~166 KB 공유)
```

### 페이지별 상태
| 페이지 | 경로 | 크기 | 상태 |
|--------|------|------|------|
| 홈 | `/` | 520 B | ✅ |
| 로그인 | `/login` | 2.31 kB | ✅ |
| 대시보드 | `/dashboard` | 4.03 kB | ✅ |
| 프로그램 | `/experiences` | 4.77 kB | ✅ |
| 프로그램 상세 | `/experiences/[id]` | 4.1 kB | ✅ |
| 저장된 프로그램 | `/experiences/saved` | 2.45 kB | ✅ |
| 예약 관리 | `/bookings` | 3.7 kB | ✅ |
| 예약 상세 | `/bookings/[id]` | 3.84 kB | ✅ |
| 예약 생성 | `/bookings/create` | 3.9 kB | ✅ |
| 예약 리뷰 | `/bookings/[id]/review` | 4.47 kB | ✅ |
| 예약 완료 | `/bookings/success` | 2.69 kB | ✅ |
| 프로필 | `/profile` | 4.33 kB | ✅ |
| 알림 | `/notifications` | 3.83 kB | ✅ |
| 404 | `/404` | 180 B | ✅ |

---

## 🔧 배포 후 검증

### 1단계: 기본 기능 확인
```bash
# 홈페이지 접속 확인
curl -s https://your-domain.com/ | grep "DOCTYPE"

# 로그인 페이지 확인
curl -s https://your-domain.com/login | grep "password"

# 대시보드 확인
curl -s https://your-domain.com/dashboard | grep "bg-slate"
```

### 2단계: 성능 확인
```bash
# 응답 시간 측정
time curl -s https://your-domain.com/ > /dev/null

# 페이지 로드 확인
curl -w "\nHTTP Status: %{http_code}\n" -o /dev/null https://your-domain.com/
```

### 3단계: 모니터링 설정
- **Sentry**: DSN 확인 및 오류 추적 활성화
- **Google Analytics**: GA ID 확인 및 사용자 추적
- **로그**: 서버 로그 모니터링 활성화

---

## 🔐 보안 설정 확인

### HTTPS 설정
```bash
# SSL 인증서 확인
curl -I https://your-domain.com/

# 암호화 확인
openssl s_client -connect your-domain.com:443
```

### 환경 변수 보안
```bash
# 민감한 정보는 환경 변수로만 관리
# .env.local 또는 프로덕션 환경 변수 설정에서 관리
# 버전 관리에 포함하지 않음
```

### CORS 설정 (필요시)
```bash
# API 서버와의 통신 확인
curl -H "Origin: https://your-domain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://api.withdkis.com/
```

---

## 📈 배포 후 모니터링

### 주요 메트릭
1. **응답 시간**: < 100ms (목표)
2. **에러율**: < 0.1% (목표)
3. **가용성**: > 99.9% (목표)
4. **페이지 로드**: < 2초 (목표)

### 모니터링 도구
- **Sentry**: 실시간 오류 추적
- **Google Analytics**: 사용자 행동 분석
- **Next.js Analytics**: 성능 메트릭
- **서버 로그**: 접속 및 오류 로그

### 알림 설정
- Sentry: 심각한 오류 발생 시 알림
- 서버 모니터링: CPU, 메모리 사용량 알림
- 다운타임 모니터링: 서비스 중단 시 알림

---

## 🛠 배포 후 문제 해결

### 문제: 페이지가 로드되지 않음
```bash
# 1. 서버 상태 확인
ps aux | grep "next"

# 2. 포트 확인
netstat -tlnp | grep 3000

# 3. 로그 확인
tail -f /var/log/app.log

# 4. 캐시 삭제 (브라우저)
# 개발자도구 > Application > Cache Storage > 모두 삭제
```

### 문제: 스타일이 적용되지 않음
```bash
# 1. CSS 파일 확인
curl -s https://your-domain.com/_next/static/ | grep ".css"

# 2. 브라우저 캐시 확인
# DevTools > Network > Disable cache 활성화

# 3. 재빌드
npm run build:web
npm start
```

### 문제: API 연결 실패
```bash
# 1. API 서버 상태 확인
curl -s https://api.withdkis.com/health

# 2. 환경 변수 확인
echo $NEXT_PUBLIC_API_URL

# 3. CORS 설정 확인
curl -I https://api.withdkis.com/
```

---

## 📱 배포 후 브라우저 테스트

### 데스크톱 (Chrome, Firefox, Safari)
- [ ] 홈페이지 로드 확인
- [ ] 네비게이션 작동 확인
- [ ] 폰트(Pretendard) 렌더링 확인
- [ ] 색상 팔레트(Slate) 표시 확인

### 모바일 (iOS, Android)
- [ ] 반응형 레이아웃 확인
- [ ] 터치 인터랙션 확인
- [ ] 모바일 메뉴 작동 확인
- [ ] 성능(로드 시간) 확인

### 기능 확인
- [ ] 로그인 페이지 로드
- [ ] 토큰 관리 작동
- [ ] 피드백 위젯 표시
- [ ] 애니메이션 부드러움 확인

---

## 🚨 배포 긴급 대응

### 롤백 절차
```bash
# 1. 이전 버전으로 복원
git checkout <previous-commit>

# 2. 재빌드
npm run build:web

# 3. 서버 재시작
npm start
```

### 긴급 핫픽스
```bash
# 1. 핫픽스 브랜치 생성
git checkout -b hotfix/issue-name

# 2. 변경사항 적용
# ... 수정 ...

# 3. 즉시 배포
git push origin hotfix/issue-name
npm run build:web
npm start
```

---

## 📞 배포 담당자 연락처

- **개발 리드**: Claude Code
- **배포 담당**: DevOps Team
- **긴급 연락처**: [Emergency Contact]

---

## 최종 체크리스트

배포 전 다시 한번 확인하세요:

- [ ] 환경 변수 설정 완료
- [ ] 프로덕션 빌드 성공
- [ ] 모든 페이지 로드 확인
- [ ] HTTPS 설정 완료
- [ ] DNS 레코드 업데이트
- [ ] CDN 설정 완료 (선택)
- [ ] 모니터링 도구 활성화
- [ ] 백업 준비 완료
- [ ] 롤백 계획 수립
- [ ] 팀 공지 완료

---

## 배포 커맨드 (One-liner)

```bash
# 전체 배포 프로세스
npm run build:web && npm install --omit=dev && npm start
```

---

**배포 준비 상태**: ✅ 100% 준비 완료  
**마지막 빌드**: 2026-09-15  
**빌드 버전**: ba791a2 (UI/UX 재설계 완료)  
**배포 가능**: 즉시 배포 가능

🎉 **WithDKIS 웹 애플리케이션이 프로덕션 배포 준비를 완료했습니다!**

# Feature 3: Auto Reminders Implementation Guide
## Personal Kids Experience Booking Tracker

### 📧 개요

예약 전에 자동으로 이메일 알림을 보내는 기능입니다.

사용자가 받을 수 있는 알림:
- 📅 예약 **7일 전** - "프로그램이 7일 후에 있습니다"
- ⏰ 예약 **1일 전** - "프로그램이 내일 있습니다"
- 🎉 예약 **당일** - "오늘이 프로그램 날입니다"

자동으로 매일 아침 8시(한국 시간)에 실행되어 조건을 만족하는 예약들을 자동으로 체크합니다.

**Status**: ✅ 구현 완료  
**Branch**: `claude/kids-experience-booking-tracker-pfuuqs`  
**Commit**: `d6a776c`

---

### 🎯 구현된 기능

#### 1. **이메일 서비스** (`EmailService`)
- Nodemailer를 사용한 SMTP 이메일 전송
- Gmail 또는 다른 SMTP 서버 지원
- HTML 이메일 템플릿 생성
- 이메일 전송 오류 처리 및 로깅
- SMTP 연결 확인

#### 2. **알림 관리** (`BookingReminderService`)
- Cron 스케줄로 매일 아침 8시에 자동 실행
- 7일 전, 1일 전, 당일 알림 자동 전송
- BookingReminder 엔티티로 전송 기록 추적
- 중복 전송 방지
- 수동 알림 트리거 (테스트용)
- 예약 확인 이메일 (예약 직후)

#### 3. **알림 데이터** (`BookingReminder Entity`)
```typescript
- id: 고유 ID
- bookingId: 연결된 예약 ID
- type: 알림 타입 (7_DAYS_BEFORE, 1_DAY_BEFORE, DAY_OF)
- sent: 전송 여부
- email: 수신자 이메일
- sentAt: 전송 시간
- errorMessage: 전송 실패 메시지
- createdAt: 생성 시간
```

#### 4. **이메일 템플릿**
- 예약 확인 이메일 (깔끔한 디자인)
- 리마인더 이메일 (날짜별 메시지)
- 한국어 완벽 지원
- 반응형 디자인

---

### 🛠️ 기술 세부사항

#### 의존성

```bash
npm install nodemailer @nestjs/schedule
npm install --save-dev @types/nodemailer
```

#### 파일 구조

```
Backend:
- apps/api/src/modules/bookings/entities/booking-reminder.entity.ts (NEW)
- apps/api/src/services/email.service.ts (NEW)
- apps/api/src/services/booking-reminder.service.ts (NEW)
- apps/api/src/app.module.ts (MODIFIED)
- apps/api/.env (MODIFIED)
```

#### 스케줄 실행 시간

```typescript
@Cron('0 8 * * *', { timeZone: 'Asia/Seoul' })
// 매일 08:00 AM (한국 시간)
```

---

### 🔧 설정 가이드

#### Gmail SMTP 설정 (권장)

##### Step 1: 2단계 인증 활성화
1. [Google 계정 설정](https://myaccount.google.com/)으로 이동
2. 보안 탭 선택
3. 2단계 인증 활성화

##### Step 2: 앱 비밀번호 생성
1. [Google 계정 설정](https://myaccount.google.com/)으로 이동
2. 보안 탭 > 앱 비밀번호 선택
3. 앱 선택: "메일"
4. 기기 선택: "Windows 컴퓨터" (또는 실제 기기)
5. 16자리 비밀번호 생성

##### Step 3: .env 파일 설정

```env
# SMTP 설정 (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx    # 위에서 생성한 16자리 비밀번호
SMTP_FROM=your-gmail@gmail.com
```

#### 다른 SMTP 제공자 (선택사항)

```env
# Outlook/Office 365
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password

# AWS SES
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-username
SMTP_PASSWORD=your-ses-password

# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key
```

---

### 🧪 테스트 가이드

#### 로컬 테스트 셋업

```bash
# 1. .env 파일에 Gmail SMTP 설정 추가
# (위의 설정 가이드 참고)

# 2. 데이터베이스 시작
docker compose up -d postgres redis

# 3. API 시작
cd apps/api && npm run dev

# 4. 예약 생성
# 웹에서 새 예약을 만들면 자동으로 확인 이메일 발송

# 5. 스케줄 확인
# 로그에서 "매일 알림 스케줄 시작" 메시지 확인
```

#### 테스트 시나리오

**시나리오 1: 예약 확인 이메일**
1. 새 예약 생성
2. 입력한 이메일로 확인 이메일 수신
3. 예약번호 포함 확인

**시나리오 2: 7일 전 알림**
1. 정확히 7일 후의 날짜로 예약 생성
2. 다음날 08:00 AM에 알림 이메일 발송
3. 메일 제목: "[알림] 예약하신 프로그램이 7일 후에 있습니다"

**시나리오 3: 1일 전 알림**
1. 정확히 1일 후의 날짜로 예약 생성
2. 다음날 08:00 AM에 알림 이메일 발송
3. 메일 제목: "[알림] 예약하신 프로그램이 내일 있습니다"

**시나리오 4: 당일 알림**
1. 오늘 날짜로 예약 생성
2. 다음 날 08:00 AM에... (아니, 당일은 당일에만 실행됨)
3. 메일 제목: "[알림] 오늘이 예약하신 프로그램 날입니다"

#### 수동 알림 테스트 (API 호출)

```bash
# 수동으로 알림 보내기
curl -X POST http://localhost:3001/api/reminders/trigger \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "uuid-here",
    "type": "7_DAYS_BEFORE"
  }'
```

---

### 📊 데이터베이스

#### BookingReminder 테이블

```sql
CREATE TABLE booking_reminders (
  id UUID PRIMARY KEY,
  bookingId UUID NOT NULL,
  type VARCHAR(50),
  sent BOOLEAN DEFAULT FALSE,
  email TEXT,
  errorMessage TEXT,
  sentAt TIMESTAMP,
  createdAt TIMESTAMP
);

CREATE INDEX idx_booking_reminders_bookingId ON booking_reminders(bookingId);
CREATE INDEX idx_booking_reminders_type ON booking_reminders(type);
CREATE INDEX idx_booking_reminders_sentAt ON booking_reminders(sentAt);
```

---

### 🔌 API 엔드포인트 (선택사항)

#### 수동 알림 트리거

```bash
POST /api/reminders/trigger
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "bookingId": "uuid",
  "type": "7_DAYS_BEFORE"
}

Response:
{
  "message": "알림이 전송되었습니다"
}
```

#### 알림 기록 조회

```bash
GET /api/reminders/:bookingId
Authorization: Bearer <token>

Response:
[
  {
    "id": "uuid",
    "type": "7_DAYS_BEFORE",
    "sent": true,
    "sentAt": "2026-09-20T08:00:00Z",
    "email": "user@example.com"
  }
]
```

---

### 💡 로깅 및 모니터링

#### 예상 로그 메시지

```
[BookingReminderService] 매일 알림 스케줄 시작
[BookingReminderService] 7일 후 알림 처리: Fri Sep 27 2026
[EmailService] 이메일 전송 완료: user@example.com (Message ID: xxx)
[BookingReminderService] 알림 전송: booking-uuid (7_DAYS_BEFORE)
```

#### 오류 로그

```
[EmailService] 이메일 전송 실패: user@example.com
[BookingReminderService] 알림 처리 중 오류: booking-uuid
```

---

### 🚀 운영 팁

#### 알림 확인

```bash
# 데이터베이스에서 전송된 알림 확인
psql -U postgres -d withdkis_dev -c "SELECT * FROM booking_reminders WHERE sent = true;"

# 실패한 알림 확인
psql -U postgres -d withdkis_dev -c "SELECT * FROM booking_reminders WHERE sent = false;"
```

#### SMTP 연결 테스트

```bash
# API 시작 후 로그 확인
# "SMTP 연결 확인 완료" 메시지가 있으면 정상

# 또는 직접 테스트
curl -X POST http://localhost:3001/api/email/verify \
  -H "Authorization: Bearer <token>"
```

#### 알림 수동 재전송

```bash
# 실패한 알림을 다시 시도
# 데이터베이스에서 해당 행 삭제 후 수동 트리거
DELETE FROM booking_reminders WHERE id = 'uuid';

curl -X POST http://localhost:3001/api/reminders/trigger \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "uuid", "type": "7_DAYS_BEFORE"}'
```

---

### 🐛 문제 해결

#### "이메일 전송 실패"

**원인**: SMTP 설정 오류
- `.env` 파일의 SMTP_USER와 SMTP_PASSWORD 확인
- 특수문자가 있으면 큰따옴표로 감싸기
- Gmail의 경우 앱 비밀번호 (16자리) 사용

**해결**:
```bash
# SMTP 연결 테스트
curl -X POST http://localhost:3001/api/email/verify

# 또는 로그 확인
tail -f /tmp/api.log | grep "SMTP"
```

#### "Cron 작업이 실행되지 않음"

**원인**: ScheduleModule이 등록되지 않음
- `app.module.ts`에 `ScheduleModule.forRoot()` 확인
- API 재시작 후 로그 확인

**해결**:
```bash
# API 로그 확인
npm run dev | grep "스케줄"

# 또는 수동 테스트
curl -X POST http://localhost:3001/api/reminders/trigger \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "test-uuid", "type": "7_DAYS_BEFORE"}'
```

#### "이메일이 스팸함으로 감"

**원인**: 발신자 정보 부족
- SMTP_FROM 설정 확인
- 메일 제목에 "[알림]" 포함됨 (필터 조건일 수 있음)

**해결**:
- 발신자 주소를 Gmail 계정으로 변경
- 수신자 메일 클라이언트에서 발신자 신뢰 표시

#### "데이터베이스 오류"

**원인**: BookingReminder 테이블 미생성
- TypeORM synchronize 설정 확인
- 수동 마이그레이션 실행

**해결**:
```bash
# 자동 동기화 (개발 환경)
# app.module.ts의 synchronize: true 확인

# 또는 수동 생성
psql -U postgres -d withdkis_dev -f create-booking-reminders.sql
```

---

### 📈 향후 개선사항

- [ ] SMS 알림 추가
- [ ] 푸시 알림 (웹/앱)
- [ ] 사용자 정의 알림 시간
- [ ] 알림 수신 여부 설정
- [ ] 알림 템플릿 커스터마이징
- [ ] Webhook 통합
- [ ] 알림 분석 대시보드

---

### 📚 참고 자료

- [Nodemailer 문서](https://nodemailer.com/)
- [@nestjs/schedule 문서](https://docs.nestjs.com/techniques/task-scheduling)
- [Gmail SMTP 설정](https://support.google.com/mail/answer/185833)
- [Cron 표현식 참고](https://crontab.guru/)

---

**구현 날짜**: 2026-09-20  
**예상 시간**: 4-7시간  
**상태**: ✅ 완료 및 테스트 준비 완료  
**다음 기능**: Feature 4 - 자동 백업 & 복구 (8-13일)


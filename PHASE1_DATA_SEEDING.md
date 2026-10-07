# Phase 1: Data Seeding Guide
## Task 1 - 기관 & 프로그램 데이터 입력 (Institutional & Program Data Entry)

### Prerequisites

Before running the data seeding, ensure:
1. PostgreSQL 16 is running locally on port 5432
2. Redis 7 is running locally on port 6379
3. Docker Compose is available (`docker compose --version`)

### Quick Start (Local Environment)

```bash
# From project root
cd /home/user/game-app

# 1. Start database and cache services
docker compose up -d postgres redis

# 2. Wait for services to be ready
sleep 10

# 3. Start the API server
cd apps/api
npm install
npm run build
NODE_ENV=development node dist/main.js &

# 4. Wait for API to start
sleep 5

# 5. Run data seeding script
bash ../../seed-institutions-programs.sh
```

### API Endpoints for Data Entry

#### 1. Create Institutions
```bash
POST /api/institutions
Content-Type: application/json

{
  "name": "Institution Name",
  "description": "Description of the institution",
  "websiteUrl": "https://example.com",
  "phone": "02-123-4567",
  "address": "서울시 강남구",
  "latitude": 37.4979,
  "longitude": 127.0276,
  "institutionType": "MUSEUM"  // or SCIENCE_CENTER, FACTORY, BROADCASTING, PUBLIC, OTHER
}
```

**Institution Types:**
- `PUBLIC`: Public institution
- `MUSEUM`: Museum
- `SCIENCE_CENTER`: Science center
- `FACTORY`: Factory tour
- `BROADCASTING`: Broadcasting station
- `OTHER`: Other types

#### 2. Create Experiences
```bash
POST /api/experiences
Content-Type: application/json

{
  "institutionId": "uuid-from-step-1",
  "programName": "Program Name",
  "description": "Program description",
  "programUrl": "https://example.com/program",
  "bookingUrl": "https://example.com/booking",
  "isRecurring": true,
  "experienceCategory": "WORKSHOP",  // DOCENT, WORKSHOP, FACTORY_TOUR, EXHIBITION, PERFORMANCE, EDUCATIONAL, OUTDOOR, SPECIAL_EVENT, OTHER
  "targetAgeMin": 5,
  "targetAgeMax": 18,
  "targetGradeMin": 1,
  "targetGradeMax": 12,
  "requiredGuardian": false,
  "bookingMethod": "FIRST_COME"  // FIRST_COME, LOTTERY, ALWAYS_AVAILABLE
}
```

**Experience Categories:**
- `DOCENT`: Guided tour with docent
- `WORKSHOP`: Workshop/hands-on activity
- `FACTORY_TOUR`: Factory tour
- `EXHIBITION`: Museum/art exhibition
- `PERFORMANCE`: Performance/show
- `EDUCATIONAL`: Educational program
- `OUTDOOR`: Outdoor activity
- `SPECIAL_EVENT`: Special event
- `OTHER`: Other

**Booking Methods:**
- `FIRST_COME`: First come, first served
- `LOTTERY`: Lottery/random draw
- `ALWAYS_AVAILABLE`: Always available (no booking needed)

### Sample Data Set

#### Sample Institutions (기관 3개)

1. **DKIS Science Museum (과학관)**
   - Type: SCIENCE_CENTER
   - Address: Seoul, Gangnam-gu
   - Website: https://example-science.com

2. **DKIS Art Museum (박물관)**
   - Type: MUSEUM
   - Address: Seoul, Jongno-gu
   - Website: https://example-art.com

3. **DKIS Factory Tour (팩토리)**
   - Type: FACTORY
   - Address: Incheon, Songdo
   - Website: https://example-factory.com

#### Sample Programs (프로그램 3개)

1. **과학 워크숍 (Science Workshop)**
   - Institution: DKIS Science Museum
   - Age: 6-15
   - Category: WORKSHOP
   - Booking: FIRST_COME

2. **전시 관람 (Exhibition Tour)**
   - Institution: DKIS Art Museum
   - Age: 5-18
   - Category: EXHIBITION
   - Booking: LOTTERY

3. **팩토리 투어 (Factory Tour)**
   - Institution: DKIS Factory Tour
   - Age: 10-18
   - Category: FACTORY_TOUR
   - Booking: ALWAYS_AVAILABLE

### Running the Seeding Script

The included `seed-institutions-programs.sh` script will:
1. Create 3 sample institutions
2. Create 3 sample programs linked to those institutions
3. Display success/failure status for each entry
4. Show created IDs for reference

```bash
bash /home/user/game-app/seed-institutions-programs.sh
```

### Manual Testing

You can test individual API endpoints using curl:

```bash
# 1. Register a user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Get list of institutions
curl http://localhost:3001/api/institutions

# 3. Get list of experiences
curl http://localhost:3001/api/experiences

# 4. View API documentation
# Open browser: http://localhost:3001/api/docs
```

### Troubleshooting

**Problem: Database connection refused**
- Ensure PostgreSQL is running: `docker compose ps`
- Check DATABASE_URL in apps/api/.env
- Run: `docker compose up -d postgres`

**Problem: API not responding**
- Check if Node process is running: `ps aux | grep "node dist/main.js"`
- Review logs: `tail -f /tmp/api.log`
- Ensure port 3001 is available: `netstat -tulpn | grep 3001`

**Problem: Redis connection error**
- Redis is optional for basic operations
- Run: `docker compose up -d redis`

### Next Steps (Phase 2)

After completing Phase 1, Task 1:
1. **Phase 1, Task 2**: Email notification system (optional)
   - Configure email provider (SMTP) for booking alerts
   - Test email delivery to personal account

2. **Phase 2**: Monitoring & Performance
   - Enable error logging/tracking
   - Implement rate limiting for stability
   - Monitor database performance

3. **Phase 3**: Personal Admin Dashboard
   - Create admin UI for data management
   - Bulk upload/import features
   - Data backup & export functionality
   - Analytics dashboard for bookings

### Important Notes

- All data is stored in PostgreSQL database
- Ensure database backups are configured before production use
- Use proper JWT secrets in production (change `JWT_SECRET` in .env)
- Enable HTTPS/TLS for all production deployments

---

**Session**: claude/kids-experience-booking-tracker-pfuuqs  
**Last Updated**: 2026-09-17  
**Status**: Phase 1, Task 1 - Ready for Data Seeding

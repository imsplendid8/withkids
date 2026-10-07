import * as net from 'net';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * 실제 Postgres·Redis에 붙여 앱 전체를 띄우고 HTTP로 핵심 흐름을 확인한다.
 *
 *   docker compose up -d postgres redis
 *   npm run test:e2e --workspace=apps/api
 */

function canConnect(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

// 가입은 원래 첫 계정만 받는다. 이 테스트는 이미 계정이 있는 DB에서도 사용자 둘을 만든다.
process.env.ALLOW_REGISTRATION = 'true';

describe('App (e2e)', () => {
  const runId = Date.now();
  const ownerEmail = `e2e-owner-${runId}@example.com`;
  const otherEmail = `e2e-other-${runId}@example.com`;
  const password = 'E2eTest1234!';

  let app: INestApplication;
  let dataSource: DataSource;
  let baseUrl: string;
  let experienceId: string;
  let institutionId: string;

  const api = async (
    method: string,
    path: string,
    options: { token?: string; body?: unknown } = {},
  ): Promise<{ status: number; body: any }> => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  const register = async (email: string): Promise<string> => {
    const { status, body } = await api('POST', '/api/auth/register', {
      body: { email, password, profileName: 'E2E' },
    });
    expect(status).toBe(201);
    return body.accessToken;
  };

  beforeAll(async () => {
    // 인프라가 없으면 TypeORM·Bull이 재시도하며 멈춘다. 대신 바로 이유를 알려준다.
    const db = new URL(
      process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/withdkis_dev',
    );
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = Number(process.env.REDIS_PORT || 6379);
    const missing: string[] = [];
    if (!(await canConnect(db.hostname, Number(db.port || 5432)))) {
      missing.push(`Postgres(${db.hostname}:${db.port || 5432})`);
    }
    if (!(await canConnect(redisHost, redisPort))) {
      missing.push(`Redis(${redisHost}:${redisPort})`);
    }
    if (missing.length > 0) {
      throw new Error(
        `${missing.join(', ')}에 연결할 수 없습니다. ` +
          '`docker compose up -d postgres redis` 후 다시 실행하세요.',
      );
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as net.AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    dataSource = app.get(DataSource);
    const [institution] = await dataSource.query(
      `INSERT INTO institutions (name) VALUES ($1) RETURNING id`,
      [`E2E 기관 ${runId}`],
    );
    institutionId = institution.id;
    const [experience] = await dataSource.query(
      `INSERT INTO experiences ("institutionId", "programName") VALUES ($1, $2) RETURNING id`,
      [institutionId, `E2E 프로그램 ${runId}`],
    );
    experienceId = experience.id;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      const emails = [ownerEmail, otherEmail];
      await dataSource.query(
        `DELETE FROM bookings WHERE "userId" IN (SELECT id FROM users WHERE email = ANY($1))`,
        [emails],
      );
      await dataSource.query(
        `DELETE FROM user_preferences WHERE "userId" IN (SELECT id FROM users WHERE email = ANY($1))`,
        [emails],
      );
      await dataSource.query(`DELETE FROM users WHERE email = ANY($1)`, [emails]);
      if (experienceId) await dataSource.query(`DELETE FROM experiences WHERE id = $1`, [experienceId]);
      if (institutionId) await dataSource.query(`DELETE FROM institutions WHERE id = $1`, [institutionId]);
    }
    await app?.close();
  });

  it('GET /health 가 응답한다', async () => {
    const { status } = await api('GET', '/health');
    expect(status).toBe(200);
  });

  it('첫 설정 필요 여부를 로그인 없이 알려준다', async () => {
    const { status, body } = await api('GET', '/api/auth/setup-status');
    expect(status).toBe(200);
    expect(typeof body.needsSetup).toBe('boolean');
  });

  it('로그인 없이 예약 목록을 볼 수 없다', async () => {
    const { status } = await api('GET', '/api/bookings');
    expect(status).toBe(401);
  });

  it('예약 생성 → 조회 → 수정 제한 → 타인 접근 차단', async () => {
    const token = await register(ownerEmail);

    const withoutDate = await api('POST', '/api/bookings', {
      token,
      body: { experienceId, selectedChildren: [{ id: 'c1', name: '첫째', age: 7 }] },
    });
    expect(withoutDate.status).toBe(400);

    const created = await api('POST', '/api/bookings', {
      token,
      body: {
        experienceId,
        experienceDate: '2026-12-24',
        selectedChildren: [{ id: 'c1', name: '첫째', age: 7 }],
        totalPrice: 12000,
      },
    });
    expect(created.status).toBe(201);
    // date 컬럼이 시간대 변환으로 하루 밀리지 않아야 한다.
    expect(created.body.experienceDate).toBe('2026-12-24');
    const bookingId = created.body.id;

    const list = await api('GET', '/api/bookings', { token });
    expect(list.status).toBe(200);
    const mine = list.body.find((b: any) => b.id === bookingId);
    expect(mine.experienceDate).toBe('2026-12-24');
    expect(mine.experience.institution.institutionName).toBe(`E2E 기관 ${runId}`);

    const tamper = await api('PATCH', `/api/bookings/${bookingId}`, {
      token,
      body: { userId: '00000000-0000-4000-8000-000000000000', totalPrice: 1 },
    });
    expect(tamper.status).toBe(400);

    const reschedule = await api('PATCH', `/api/bookings/${bookingId}`, {
      token,
      body: { experienceDate: '2026-12-31' },
    });
    expect(reschedule.status).toBe(200);
    expect(reschedule.body.experienceDate).toBe('2026-12-31');
    expect(reschedule.body.totalPrice).toBe(12000);

    const otherToken = await register(otherEmail);
    const peek = await api('GET', `/api/bookings/${bookingId}`, { token: otherToken });
    expect(peek.status).toBe(404);
    const otherList = await api('GET', '/api/bookings', { token: otherToken });
    expect(otherList.body).toEqual([]);
  });

  it('내 정보 응답에 비밀번호 해시가 없다', async () => {
    const login = await api('POST', '/api/auth/login', {
      body: { email: ownerEmail, password },
    });
    expect(login.status).toBe(201);

    const me = await api('GET', '/api/users/me', { token: login.body.accessToken });
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(ownerEmail);
    expect(me.body).not.toHaveProperty('passwordHash');
  });
});

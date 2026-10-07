import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DataLoaderAdapter } from './data-loader.adapter';

/**
 * crawler/data/README.md에 적어 둔 형식 그대로 JSON 파일을 넣었을 때
 * 크롤 결과로 변환되는지 확인한다.
 */
describe('DataLoaderAdapter', () => {
  let dir: string;
  let adapter: DataLoaderAdapter;

  const writeJson = (name: string, content: unknown) =>
    fs.writeFileSync(path.join(dir, name), JSON.stringify(content), 'utf-8');

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-loader-'));
    adapter = new DataLoaderAdapter();
    (adapter as unknown as { dataDir: string }).dataDir = dir;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  const valid = {
    externalId: 'my-001',
    institutionName: '국립과천과학관',
    programName: '어린이 천체관측교실',
    bookingMethod: 'FIRST_COME',
    status: 'OPENING_SOON',
  };

  it('README 예시 형식을 그대로 읽는다', async () => {
    writeJson('mine.json', [
      {
        ...valid,
        description: '망원경으로 달과 토성을 관측',
        programUrl: 'https://example.org/p/1',
        experienceDate: '2026-10-18',
        bookingOpenAt: '2026-10-01T10:00:00+09:00',
        bookingCloseAt: '2026-10-10T18:00:00+09:00',
        price: 5000,
        ageGroup: '7-12',
      },
    ]);

    const [program] = await adapter.fetchPrograms();

    expect(program).toMatchObject({
      externalId: 'my-001',
      institutionName: '국립과천과학관',
      programName: '어린이 천체관측교실',
      description: '망원경으로 달과 토성을 관측',
      programUrl: 'https://example.org/p/1',
      price: 5000,
      ageGroup: '7-12',
      bookingMethod: 'FIRST_COME',
      status: 'OPENING_SOON',
      externalSource: 'data-loader',
    });
    // +09:00을 붙인 시각은 시간대와 무관하게 같은 순간이어야 한다.
    expect(program.bookingOpenAt?.toISOString()).toBe('2026-10-01T01:00:00.000Z');
  });

  it('배열이 아닌 단일 객체 파일도 읽는다', async () => {
    writeJson('single.json', valid);
    await expect(adapter.fetchPrograms()).resolves.toHaveLength(1);
  });

  it('여러 파일을 합친다', async () => {
    writeJson('a.json', [valid]);
    writeJson('b.json', [{ ...valid, externalId: 'my-002' }]);

    const ids = (await adapter.fetchPrograms()).map((p) => p.externalId).sort();
    expect(ids).toEqual(['my-001', 'my-002']);
  });

  it('가격이 없으면 무료(0)가 아니라 미상으로 둔다', async () => {
    writeJson('prices.json', [
      { ...valid, externalId: 'none' },
      { ...valid, externalId: 'zero', price: 0 },
      { ...valid, externalId: 'text', price: '12,000원' },
      { ...valid, externalId: 'free', price: '무료' },
    ]);

    const byId = Object.fromEntries((await adapter.fetchPrograms()).map((p) => [p.externalId, p.price]));
    expect(byId).toEqual({ none: undefined, zero: 0, text: 12000, free: 0 });
  });

  it('필수 필드가 없거나 허용되지 않은 값이면 건너뛴다', async () => {
    writeJson('mixed.json', [
      valid,
      { ...valid, externalId: undefined },
      { ...valid, externalId: 'typo-method', bookingMethod: 'FIRSTCOME' },
      { ...valid, externalId: 'typo-status', status: 'open' },
    ]);

    const ids = (await adapter.fetchPrograms()).map((p) => p.externalId);
    expect(ids).toEqual(['my-001']);
  });

  it('JSON이 깨진 파일은 건너뛰고 나머지는 읽는다', async () => {
    fs.writeFileSync(path.join(dir, 'broken.json'), '{ not json', 'utf-8');
    writeJson('ok.json', [valid]);

    await expect(adapter.fetchPrograms()).resolves.toHaveLength(1);
  });

  it('JSON이 아닌 파일(README 등)은 무시한다', async () => {
    fs.writeFileSync(path.join(dir, 'README.md'), '# 안내', 'utf-8');
    await expect(adapter.fetchPrograms()).resolves.toEqual([]);
  });
});

import * as fs from 'fs';
import * as path from 'path';
import {
  collectNolbal,
  collectPaid,
  mapTourPlace,
  parseNolbalDetail,
  parseSitemapIds,
  pickToRefresh,
  type PaidCacheEntry,
} from './paid';

// 실제 놀이의발견 상품 페이지의 Next.js 데이터를 줄여 저장한 것
const detailHtml = fs.readFileSync(
  path.join(__dirname, '__fixtures__', 'nolbal-detail.html'),
  'utf8'
);

const sitemap = (ids: string[]) =>
  `<?xml version="1.0"?><urlset>${ids
    .map((id) => `<url><loc>https://nolbal.com/content/detail/${id}</loc></url>`)
    .join('')}</urlset>`;

describe('놀이의발견', () => {
  it('사이트맵에서 상품 번호를 읽는다', () => {
    expect(parseSitemapIds(sitemap(['1', '22', '1']))).toEqual(['1', '22']);
  });

  it('상품 페이지에서 가격·나이·지역·당일 사용·평점을 읽는다', () => {
    expect(parseNolbalDetail(detailHtml, '46329')).toEqual({
      id: 'nolbal-46329',
      source: 'nolbal',
      title: '★최대 54%★ 웅진플레이도시 로우시즌 이용권 특가',
      sido: '경기',
      gugun: '부천',
      place: '[부천] 웅진플레이도시',
      address: '경기도 부천시 원미구 조마루로 2',
      imageUrl: expect.stringMatching(/^https:\/\/cdn\.nolbal\.com\//),
      url: 'https://nolbal.com/content/detail/46329',
      price: {
        original: 50000,
        sale: 22900,
        percent: 54,
        option: '[공통] 1인 반일권 (대/소 공통)',
      },
      minAge: 1,
      maxAge: 13,
      rating: 4.9,
      reviewCount: 215,
      sameDay: true,
      availableUntil: '~ 2026.10.31',
      categories: ['워터파크'],
    });
  });

  it('판매 중이 아니거나 배송 상품이면 빼고, 이상한 페이지는 null', () => {
    const off = detailHtml.replace(
      '"activate_state": "activated"',
      '"activate_state": "deactivated"'
    );
    expect(off).not.toBe(detailHtml);
    expect(parseNolbalDetail(off, '46329')).toBeNull();
    expect(
      parseNolbalDetail(
        detailHtml.replace('"for_shipping": false', '"for_shipping": true'),
        '46329'
      )
    ).toBeNull();
    expect(parseNolbalDetail('<html></html>', '1')).toBeNull();
  });

  it('처음 보는 상품 먼저, 그다음 오래된 것부터 정해진 수만', () => {
    const cache: Record<string, PaidCacheEntry> = {
      a: { fetchedAt: '2026-10-03T00:00:00Z', item: null },
      b: { fetchedAt: '2026-10-01T00:00:00Z', item: null },
    };
    expect(pickToRefresh(['a', 'b', 'new'], cache, 2)).toEqual(['new', 'b']);
  });

  it('사이트맵에서 빠진 상품은 캐시에서 지우고, 받은 것만 갱신한다', async () => {
    const get = jest.fn(async (url: string) =>
      url.endsWith('.xml') ? sitemap(['46329', '2']) : detailHtml
    );
    const previous = {
      gone: { fetchedAt: '2026-10-01T00:00:00Z', item: null },
      '2': { fetchedAt: '2026-10-05T00:00:00Z', item: null },
    };
    const result = await collectNolbal(previous, {
      budget: 1,
      delayMs: 0,
      get,
      now: new Date('2026-10-06T00:00:00Z'),
    });
    expect(Object.keys(result.cache).sort()).toEqual(['2', '46329']);
    expect(result.cache['46329'].item?.title).toContain('웅진플레이도시');
    expect(result.cache['2']).toBe(previous['2']);
    expect(result.fetched).toBe(1);
  });
});

describe('collectPaid', () => {
  it('수도권만 내보내고, 키가 없으면 구석구석은 안내만', async () => {
    const seoul = detailHtml.replace('"sido": "경기"', '"sido": "서울"');
    const busan = detailHtml.replace('"sido": "경기"', '"sido": "부산"');
    const get = jest.fn(async (url: string) => {
      if (url.endsWith('.xml')) return sitemap(['1', '2', '3']);
      if (url.endsWith('/1')) return detailHtml;
      if (url.endsWith('/2')) return seoul;
      return busan;
    });
    const { file, cache } = await collectPaid({ previousCache: null, budget: 10, delayMs: 0, get });
    expect(file.items.map((i) => i.sido).sort()).toEqual(['경기', '서울']);
    expect(Object.keys(cache.nolbal)).toHaveLength(3);
    expect(file.sources).toEqual([
      expect.objectContaining({ id: 'nolbal', ok: true, found: 2 }),
      expect.objectContaining({ id: 'visitkorea', ok: false }),
    ]);
  });

  it('놀이의발견이 실패해도 지난 결과는 보여준다', async () => {
    const item = parseNolbalDetail(detailHtml, '1');
    const get = jest.fn(async () => {
      throw new Error('down');
    });
    const { file } = await collectPaid({
      previousCache: { nolbal: { '1': { fetchedAt: '2026-10-01T00:00:00Z', item } } },
      get,
      delayMs: 0,
    });
    expect(file.items).toHaveLength(1);
    expect(file.sources[0]).toMatchObject({ ok: false, errorMessage: 'down' });
  });

  it('구석구석 장소', () => {
    expect(
      mapTourPlace(
        { contentid: '9', title: '국립과천과학관', addr1: '경기도 과천시 상하벌로 110' },
        '경기',
        '문화시설'
      )
    ).toMatchObject({ id: 'visitkorea-9', gugun: '과천시', categories: ['문화시설'], price: null });
  });
});

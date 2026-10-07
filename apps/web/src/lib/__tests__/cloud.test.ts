import {
  clearLocal,
  decodeKey,
  encodeKey,
  isSyncedKey,
  parseFirebaseConfig,
  restoreLocal,
  snapshotLocal,
} from '../cloud';

describe('parseFirebaseConfig', () => {
  const pasted = `
    // Your web app's Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyA-example",
      authDomain: "withkids-1234.firebaseapp.com",
      projectId: "withkids-1234",
      storageBucket: "withkids-1234.firebasestorage.app",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abcdef"
    };`;

  it('Firebase 콘솔에서 복사한 코드를 그대로 읽는다', () => {
    expect(parseFirebaseConfig(pasted)).toMatchObject({
      apiKey: 'AIzaSyA-example',
      authDomain: 'withkids-1234.firebaseapp.com',
      projectId: 'withkids-1234',
      appId: '1:1234567890:web:abcdef',
    });
  });

  it('JSON도 읽고, 필수 값이 없으면 null', () => {
    expect(
      parseFirebaseConfig('{"apiKey":"k","authDomain":"d","projectId":"p","appId":"a"}')
    ).toMatchObject({ apiKey: 'k', appId: 'a' });
    expect(parseFirebaseConfig('{"apiKey":"k"}')).toBeNull();
    expect(parseFirebaseConfig('')).toBeNull();
    expect(parseFirebaseConfig(undefined)).toBeNull();
  });
});

describe('계정에 올리는 브라우저 데이터', () => {
  beforeEach(() => localStorage.clear());

  it('예약·아이·찜 등만 고른다 (로그인 토큰 등은 제외)', () => {
    expect(isSyncedKey('withdkis.bookings')).toBe(true);
    expect(isSyncedKey('withdkis.children')).toBe(true);
    expect(isSyncedKey('bookmarks')).toBe(true);
    expect(isSyncedKey('accessToken')).toBe(false);
    expect(decodeKey(encodeKey('withdkis.bookings'))).toBe('withdkis.bookings');
    expect(encodeKey('withdkis.bookings')).not.toContain('.');
  });

  it('스냅샷 → 다른 브라우저에서 복원', () => {
    localStorage.setItem('withdkis.bookings', '[{"id":"1"}]');
    localStorage.setItem('bookmarks', '[]');
    localStorage.setItem('accessToken', 'secret');
    const snapshot = snapshotLocal(localStorage);
    expect(Object.keys(snapshot).sort()).toEqual(['bookmarks', 'withdkis__bookings']);

    localStorage.clear();
    localStorage.setItem('withdkis.children', '[{"id":"old"}]'); // 이전 데이터는 지워져야 한다
    restoreLocal(localStorage, snapshot);
    expect(localStorage.getItem('withdkis.bookings')).toBe('[{"id":"1"}]');
    expect(localStorage.getItem('withdkis.children')).toBeNull();
  });

  it('로그아웃하면 계정 데이터만 지운다', () => {
    localStorage.setItem('withdkis.bookings', '[]');
    localStorage.setItem('other', 'keep');
    clearLocal(localStorage);
    expect(localStorage.getItem('withdkis.bookings')).toBeNull();
    expect(localStorage.getItem('other')).toBe('keep');
  });
});

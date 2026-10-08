/**
 * 계정 동기화가 데이터를 잃지 않는지 (Firebase는 가짜로 대신한다).
 */
const authState: { callback: ((user: unknown) => Promise<void>) | null } = { callback: null };
const signOut = jest.fn().mockResolvedValue(undefined);
const getDoc = jest.fn();
const setDoc = jest.fn();
const remote: { listener: ((snapshot: unknown) => void) | null } = { listener: null };
const reload = jest.fn();

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((_auth, callback) => {
    authState.callback = callback;
  }),
  getRedirectResult: jest.fn().mockResolvedValue(null),
  signOut: (...args: unknown[]) => signOut(...args),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((_db, _col, id) => ({ id })),
  getDoc: (...args: unknown[]) => getDoc(...args),
  setDoc: (...args: unknown[]) => setDoc(...args),
  serverTimestamp: jest.fn(() => 'now'),
  onSnapshot: jest.fn((_ref, next) => {
    remote.listener = next;
    return () => undefined;
  }),
}));

import {
  PULL_FAILED_MESSAGE,
  UNSAVED_CHANGES_MESSAGE,
  setReloadHandlerForTest,
  signOutCloud,
  watchCloudUser,
} from '../cloud';

const user = { uid: 'u1', email: 'me@example.com', displayName: '나' };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('계정 동기화', () => {
  const onChange = jest.fn();
  const onError = jest.fn();

  beforeAll(async () => {
    setReloadHandlerForTest(reload);
    await watchCloudUser(onChange, onError);
  });

  beforeEach(async () => {
    await authState.callback?.(null);
    localStorage.clear();
    jest.clearAllMocks();
    setDoc.mockResolvedValue(undefined);
  });

  it('계정 데이터를 못 가져오면 로그인하지 않고, 이후 쓰기로 계정을 덮어쓰지 않는다', async () => {
    getDoc.mockRejectedValue(new Error('offline'));
    localStorage.setItem('withdkis.bookings', '[{"id":"stale"}]');

    await authState.callback?.(user);

    expect(onChange).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(PULL_FAILED_MESSAGE);
    expect(signOut).toHaveBeenCalled();

    localStorage.setItem('withdkis.bookings', '[{"id":"new"}]');
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('로그아웃 전 마지막 저장이 실패하면 지우지 않고 로그아웃도 하지 않는다', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ store: {} }) });
    await authState.callback?.(user);
    expect(onChange).toHaveBeenCalledWith(user);

    localStorage.setItem('withdkis.bookings', '[{"id":"unsaved"}]');
    setDoc.mockRejectedValue(new Error('offline'));

    await expect(signOutCloud()).rejects.toThrow(UNSAVED_CHANGES_MESSAGE);
    expect(signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem('withdkis.bookings')).toBe('[{"id":"unsaved"}]');

    // 연결이 돌아오면 다시 눌러 정상 로그아웃
    setDoc.mockResolvedValue(undefined);
    await signOutCloud();
    await flush();
    expect(signOut).toHaveBeenCalled();
    expect(localStorage.getItem('withdkis.bookings')).toBeNull();
  });

  const snapshot = (store: Record<string, string>, hasPendingWrites = false) => ({
    metadata: { hasPendingWrites },
    data: () => ({ store }),
  });

  it('열려 있던 페이지가 계정과 다른 데이터를 들고 있으면 계정 데이터로 바꾸고 새로 연다', async () => {
    localStorage.setItem('bookmarks', '[{"id":"old"}]');
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ store: { bookmarks: '[{"id":"a"},{"id":"b"}]' } }),
    });
    await authState.callback?.(user);
    expect(localStorage.getItem('bookmarks')).toBe('[{"id":"a"},{"id":"b"}]');
    expect(reload).toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('계정과 같으면 새로 열지 않고, 다른 기기에서 저장하면 반영한다', async () => {
    localStorage.setItem('bookmarks', '[{"id":"a"}]');
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ store: { bookmarks: '[{"id":"a"}]' } }),
    });
    await authState.callback?.(user);
    await flush();
    expect(reload).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(user);

    // 같은 내용(내가 올린 것)은 무시
    remote.listener?.(snapshot({ bookmarks: '[{"id":"a"}]' }));
    expect(reload).not.toHaveBeenCalled();

    // 다른 기기에서 찜 추가
    remote.listener?.(snapshot({ bookmarks: '[{"id":"a"},{"id":"phone"}]' }));
    expect(localStorage.getItem('bookmarks')).toBe('[{"id":"a"},{"id":"phone"}]');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('이 기기에 아직 안 올린 변경이 있으면 다른 기기 데이터로 덮지 않는다', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ store: {} }) });
    await authState.callback?.(user);
    await flush();

    localStorage.setItem('withdkis.children', '[{"id":"mine"}]');
    remote.listener?.(snapshot({ withdkis__children: '[]' }));
    expect(localStorage.getItem('withdkis.children')).toBe('[{"id":"mine"}]');
    expect(reload).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(setDoc).toHaveBeenCalledWith(
      { id: 'u1' },
      expect.objectContaining({ store: { withdkis__children: '[{"id":"mine"}]' } })
    );
  });

  it('저장이 실패하면 잠시 뒤 다시 올린다', async () => {
    jest.useFakeTimers();
    try {
      getDoc.mockResolvedValue({ exists: () => true, data: () => ({ store: {} }) });
      await authState.callback?.(user);
      setDoc.mockRejectedValueOnce(new Error('offline'));
      localStorage.setItem('withdkis.bookings', '[{"id":"x"}]');

      await jest.advanceTimersByTimeAsync(900);
      expect(setDoc).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(10000);
      expect(setDoc).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});

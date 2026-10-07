/**
 * 계정 동기화가 데이터를 잃지 않는지 (Firebase는 가짜로 대신한다).
 */
const authState: { callback: ((user: unknown) => Promise<void>) | null } = { callback: null };
const signOut = jest.fn().mockResolvedValue(undefined);
const getDoc = jest.fn();
const setDoc = jest.fn();

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
}));

import {
  PULL_FAILED_MESSAGE,
  UNSAVED_CHANGES_MESSAGE,
  signOutCloud,
  watchCloudUser,
} from '../cloud';

const user = { uid: 'u1', email: 'me@example.com', displayName: '나' };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('계정 동기화', () => {
  const onChange = jest.fn();
  const onError = jest.fn();

  beforeAll(async () => {
    await watchCloudUser(onChange, onError);
  });

  beforeEach(() => {
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
});

import { STATIC_MODE } from './staticMode';

/**
 * 구글 로그인(Firebase Authentication)과 계정별 저장(Cloud Firestore).
 *
 * 앱은 지금처럼 localStorage에 읽고 쓴다. 로그인하면
 *  1) 계정에 저장된 데이터를 localStorage로 가져오고 (처음 로그인이면 지금 브라우저 데이터를 계정으로 올리고)
 *  2) 이후 localStorage에 쓰는 것을 계정에도 자동으로 올린다.
 * 로그아웃하면 이 브라우저에서 계정 데이터를 지운다.
 *
 * 설정값(NEXT_PUBLIC_FIREBASE_CONFIG)이 없으면 아무것도 하지 않고 로그인 없이 동작한다.
 * Firebase SDK는 설정이 있을 때만 불러온다.
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  [key: string]: string;
}

/**
 * Firebase 콘솔이 보여주는 `const firebaseConfig = { apiKey: "...", ... };` 를 그대로 붙여넣어도,
 * JSON으로 넣어도 읽는다.
 */
export function parseFirebaseConfig(raw: string | undefined | null): FirebaseWebConfig | null {
  if (!raw || !raw.trim()) return null;
  const config: Record<string, string> = {};
  const pair = /["']?([A-Za-z]+)["']?\s*:\s*["']([^"']*)["']/g;
  let match: RegExpExecArray | null;
  while ((match = pair.exec(raw))) config[match[1]] = match[2];
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) return null;
  return config as FirebaseWebConfig;
}

export const FIREBASE_CONFIG = parseFirebaseConfig(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
export const CLOUD_ENABLED = STATIC_MODE && FIREBASE_CONFIG !== null;

/** 계정에 저장하는 localStorage 키: 예약·후기·프로필·아이·설정(withdkis.*)과 찜 */
export function isSyncedKey(key: string): boolean {
  return key === 'bookmarks' || key.startsWith('withdkis.');
}

/** Firestore 필드 이름에 점(.)을 쓰지 않도록 바꾼다 */
export const encodeKey = (key: string) => key.replace(/\./g, '__');
export const decodeKey = (key: string) => key.replace(/__/g, '.');

export function snapshotLocal(storage: Storage): Record<string, string> {
  const data: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isSyncedKey(key)) data[encodeKey(key)] = storage.getItem(key) ?? '';
  }
  return data;
}

export function clearLocal(storage: Storage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isSyncedKey(key)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

export function restoreLocal(storage: Storage, data: Record<string, string>): void {
  clearLocal(storage);
  for (const [key, value] of Object.entries(data)) storage.setItem(decodeKey(key), value);
}

// ── Firebase 연결 ─────────────────────────────────────────────

export interface CloudUser {
  uid: string;
  email: string;
  displayName: string;
}

type Auth = import('firebase/auth').Auth;
type Firestore = import('firebase/firestore').Firestore;

let started: Promise<{ auth: Auth; db: Firestore }> | null = null;
let currentUid: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let hookInstalled = false;
let suppressHook = false;
let pushesInFlight = 0;
let unsubscribeRemote: (() => void) | null = null;

/** 키 순서와 상관없이 같은 데이터면 같은 문자열 */
export function storeFingerprint(data: Record<string, string>): string {
  return JSON.stringify(
    Object.keys(data)
      .sort()
      .map((key) => [key, data[key]])
  );
}

/**
 * 계정 데이터로 바꾼 뒤 화면을 새로 연다. 찜·아이 목록 등은 페이지가 처음 열릴 때 읽어 메모리에 들고 있어서,
 * 그대로 두면 옛 목록에 하나를 더해 저장하면서 다른 기기에서 바꾼 내용을 덮어쓴다.
 */
let reloadPage = () => window.location.reload();
export function setReloadHandlerForTest(handler: () => void) {
  reloadPage = handler;
}

function applyRemote(remote: Record<string, string>): boolean {
  if (storeFingerprint(remote) === storeFingerprint(snapshotLocal(window.localStorage)))
    return false;
  suppressHook = true;
  try {
    restoreLocal(window.localStorage, remote);
  } finally {
    suppressHook = false;
  }
  return true;
}

async function connect() {
  if (!started) {
    started = (async () => {
      const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = initializeApp(FIREBASE_CONFIG as FirebaseWebConfig);
      return { auth: getAuth(app), db: getFirestore(app) };
    })();
  }
  return started;
}

async function pushNow(): Promise<void> {
  if (!currentUid) return;
  const uid = currentUid;
  pushesInFlight++;
  try {
    const { db } = await connect();
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    await setDoc(doc(db, 'users', uid), {
      store: snapshotLocal(window.localStorage),
      updatedAt: serverTimestamp(),
    });
  } finally {
    pushesInFlight--;
  }
}

/** 실패하면 연결이 돌아올 때까지 잠시 뒤 다시 올린다 */
function schedulePush(delay = 800) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushNow().catch((error) => {
      console.error('계정에 저장하지 못했습니다. 잠시 뒤 다시 시도합니다:', error);
      if (currentUid && !pushTimer) schedulePush(10000);
    });
  }, delay);
}

/** localStorage에 쓰면 계정에도 올린다 */
function installWriteHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  const proto = Storage.prototype;
  const originalSet = proto.setItem;
  const originalRemove = proto.removeItem;
  proto.setItem = function (key: string, value: string) {
    originalSet.call(this, key, value);
    if (!suppressHook && currentUid && this === window.localStorage && isSyncedKey(key))
      schedulePush();
  };
  proto.removeItem = function (key: string) {
    originalRemove.call(this, key);
    if (!suppressHook && currentUid && this === window.localStorage && isSyncedKey(key))
      schedulePush();
  };
}

/** 계정 데이터를 가져온다. 이 브라우저 데이터가 바뀌었으면 true */
async function pullOrSeed(uid: string): Promise<boolean> {
  const { db } = await connect();
  const { doc, getDoc } = await import('firebase/firestore');
  const snapshot = await getDoc(doc(db, 'users', uid));
  const remote = snapshot.exists()
    ? (snapshot.data().store as Record<string, string> | undefined)
    : undefined;
  if (remote) {
    const changed = applyRemote(remote);
    currentUid = uid;
    return changed;
  } else {
    // 처음 로그인: 지금 이 브라우저에 있던 데이터를 계정으로 옮긴다
    currentUid = uid;
    try {
      await pushNow();
    } catch (error) {
      currentUid = null;
      throw error;
    }
    return false;
  }
}

/** 다른 기기에서 저장하면 이 화면에도 반영한다 (이 기기에 아직 안 올린 변경이 있으면 기다린다) */
async function watchRemote(uid: string): Promise<void> {
  unsubscribeRemote?.();
  const { db } = await connect();
  const { doc, onSnapshot } = await import('firebase/firestore');
  unsubscribeRemote = onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (currentUid !== uid || snapshot.metadata.hasPendingWrites) return;
      if (pushTimer || pushesInFlight > 0) return;
      const remote = snapshot.data()?.store as Record<string, string> | undefined;
      if (remote && applyRemote(remote)) reloadPage();
    },
    (error) => console.error('다른 기기의 변경을 받지 못했습니다:', error)
  );
}

function stopWatchingRemote() {
  unsubscribeRemote?.();
  unsubscribeRemote = null;
}

export const PULL_FAILED_MESSAGE =
  '계정 데이터를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 로그인해 주세요.';

/**
 * 로그인 상태를 지켜본다. 로그인돼 있으면 계정 데이터를 가져온 뒤 onChange(user)를 부른다.
 * 계정 데이터를 못 가져오면 로그인 상태로 들어가지 않는다: 이 브라우저의 (오래됐거나 빈) 데이터로
 * 계정의 데이터를 덮어쓰지 않도록 계정 저장을 끈 채 로그아웃하고 onError로 알린다.
 */
export async function watchCloudUser(
  onChange: (user: CloudUser | null) => void,
  onError: (message: string) => void = () => undefined
): Promise<void> {
  const { auth } = await connect();
  const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth');
  installWriteHook();
  // 휴대폰에서 팝업 대신 이동 방식으로 로그인한 경우 결과를 마저 처리한다
  getRedirectResult(auth).catch((error) => console.error('로그인 결과 처리 실패:', error));
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      currentUid = null;
      stopWatchingRemote();
      onChange(null);
      return;
    }
    let changed = false;
    try {
      changed = await pullOrSeed(user.uid);
    } catch (error) {
      console.error('계정 데이터를 가져오지 못했습니다:', error);
      currentUid = null;
      onError(PULL_FAILED_MESSAGE);
      const { signOut } = await import('firebase/auth');
      await signOut(auth).catch(() => undefined);
      return;
    }
    // 이미 열린 페이지가 옛 데이터를 들고 있으면 새로 연다 (로그인 화면은 곧 다른 페이지로 넘어가므로 제외)
    if (
      changed &&
      !window.location.pathname.endsWith('/login') &&
      !window.location.pathname.endsWith('/login/')
    ) {
      reloadPage();
      return;
    }
    watchRemote(user.uid).catch((error) =>
      console.error('실시간 동기화를 시작하지 못했습니다:', error)
    );
    onChange({ uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? '' });
  });
  // 창을 닫기 직전 아직 안 올린 변경이 있으면 바로 올려 본다
  window.addEventListener('pagehide', () => {
    if (!pushTimer) return;
    clearTimeout(pushTimer);
    pushTimer = null;
    pushNow().catch(() => undefined);
  });
}

export async function signInWithGoogle(): Promise<void> {
  const { auth } = await connect();
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = (error as { code?: string }).code ?? '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

export const UNSAVED_CHANGES_MESSAGE =
  '아직 계정에 저장하지 못한 변경이 있어 로그아웃하지 않았어요. 인터넷 연결을 확인하고 다시 눌러 주세요.';

/**
 * 계정에 마저 저장한 뒤 로그아웃하고 이 브라우저에서 계정 데이터를 지운다.
 * 마지막 저장이 실패하면 아무것도 지우지 않고 오류를 던진다 (다시 시도할 수 있게).
 */
export async function signOutCloud(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
    try {
      await pushNow();
    } catch (error) {
      console.error('로그아웃 전 저장 실패:', error);
      schedulePush();
      throw new Error(UNSAVED_CHANGES_MESSAGE);
    }
  }
  const { auth } = await connect();
  const { signOut } = await import('firebase/auth');
  currentUid = null;
  stopWatchingRemote();
  await signOut(auth);
  suppressHook = true;
  try {
    clearLocal(window.localStorage);
  } finally {
    suppressHook = false;
  }
}

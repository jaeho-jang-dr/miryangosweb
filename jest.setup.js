import '@testing-library/jest-dom';

// Mock Firebase globally
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  })),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  signInWithRedirect: jest.fn(),
  getRedirectResult: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  // firebase-config.ts에서 사용하는 initializeFirestore, memoryLocalCache 모킹
  initializeFirestore: jest.fn(() => ({})),
  memoryLocalCache: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  Timestamp: {
    fromDate: jest.fn((date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => date,
    })),
    now: jest.fn(() => ({
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
      toDate: () => new Date(),
    })),
  },
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

// Only setup window mocks for jsdom environment
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock window.confirm and window.alert
  window.confirm = jest.fn(() => true);
  window.alert = jest.fn();

  // Mock IntersectionObserver
  window.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  };

  // Mock ResizeObserver (많은 UI 컴포넌트에서 사용)
  window.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };

  // Mock webkitSpeechRecognition (useVoiceDictation 테스트용)
  Object.defineProperty(window, 'webkitSpeechRecognition', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      continuous: false,
      interimResults: false,
      lang: '',
      onstart: null,
      onend: null,
      onerror: null,
      onresult: null,
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
    })),
  });
}

// Setup global mocks that work in both environments
global.confirm = jest.fn(() => true);
global.alert = jest.fn();

// Suppress console errors in tests (개발 노이즈 제거, 실제 오류는 테스트가 잡음)
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// 각 테스트 후 모든 타이머 정리 (타이머 기반 hook 테스트 안정성)
afterEach(() => {
  jest.clearAllTimers();
});

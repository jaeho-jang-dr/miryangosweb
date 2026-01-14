/**
 * Firebase Mock for E2E Tests
 * E2E 테스트용 Firebase mock 설정
 */

export const mockFirebaseConfig = {
  apiKey: 'mock-api-key',
  authDomain: 'mock-project.firebaseapp.com',
  projectId: 'mock-project',
  storageBucket: 'mock-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:mockmockmock',
};

export const mockFirebaseAuth = {
  currentUser: {
    uid: 'mock-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
  },
  signInWithEmailAndPassword: async () => ({
    user: mockFirebaseAuth.currentUser,
  }),
  signOut: async () => {},
  onAuthStateChanged: (callback: any) => {
    callback(mockFirebaseAuth.currentUser);
    return () => {};
  },
};

export const mockFirestore = {
  collection: () => ({
    doc: () => ({
      get: async () => ({
        exists: true,
        data: () => ({}),
      }),
      set: async () => {},
      update: async () => {},
      delete: async () => {},
    }),
    where: () => mockFirestore.collection(),
    orderBy: () => mockFirestore.collection(),
    limit: () => mockFirestore.collection(),
    get: async () => ({
      docs: [],
      empty: false,
    }),
    onSnapshot: (callback: any) => {
      callback({ docs: [] });
      return () => {};
    },
  }),
};

/**
 * Mock Firebase for browser environment (E2E tests)
 */
export function setupFirebaseMock() {
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.__FIREBASE_MOCKED__ = true;

    // Mock Firebase initialization
    // @ts-ignore
    window.firebase = {
      initializeApp: () => ({}),
      apps: [],
      auth: () => mockFirebaseAuth,
      firestore: () => mockFirestore,
    };
  }
}

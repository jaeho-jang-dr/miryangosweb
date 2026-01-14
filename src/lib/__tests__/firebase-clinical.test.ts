/**
 * @jest-environment jsdom
 */

describe('Firebase Clinical Configuration', () => {
  it('should have Firebase mocked globally', () => {
    // Firebase is mocked in jest.setup.js
    const { initializeApp } = require('firebase/app');
    expect(initializeApp).toBeDefined();
    expect(jest.isMockFunction(initializeApp)).toBe(true);
  });

  it('should initialize without errors', () => {
    expect(() => {
      require('../firebase-clinical');
    }).not.toThrow();
  });

  it('should export required services', () => {
    const firebaseClinical = require('../firebase-clinical');

    expect(firebaseClinical).toHaveProperty('app');
    expect(firebaseClinical).toHaveProperty('auth');
    expect(firebaseClinical).toHaveProperty('db');
    expect(firebaseClinical).toHaveProperty('storage');
  });

  it('should use mocked Firebase functions', () => {
    const { initializeApp } = require('firebase/app');
    const { getAuth } = require('firebase/auth');
    const { getFirestore } = require('firebase/firestore');

    expect(jest.isMockFunction(initializeApp)).toBe(true);
    expect(jest.isMockFunction(getAuth)).toBe(true);
    expect(jest.isMockFunction(getFirestore)).toBe(true);
  });

  it('should handle Firebase operations safely', () => {
    const firebaseClinical = require('../firebase-clinical');

    // These should all be mocked and not throw
    expect(() => {
      const app = firebaseClinical.app;
      const auth = firebaseClinical.auth;
      const db = firebaseClinical.db;
      const storage = firebaseClinical.storage;
    }).not.toThrow();
  });
});

import {
  bufferToBase64,
  splitBuffer,
  getMemoryUsage,
  getCacheStats,
  clearAllCaches,
  responseCache,
} from '../performance-utils';

describe('performance-utils', () => {
  afterEach(() => {
    clearAllCaches();
  });

  describe('bufferToBase64', () => {
    it('should convert buffer to base64 string', () => {
      const buffer = Buffer.from('hello world', 'utf-8');
      const result = bufferToBase64(buffer);
      expect(result).toBe(buffer.toString('base64'));
    });

    it('should return the same result for the same buffer with cache', () => {
      const buffer = Buffer.from('test data', 'utf-8');
      const first = bufferToBase64(buffer);
      const second = bufferToBase64(buffer);
      expect(first).toBe(second);
    });

    it('should convert without cache when useCache is false', () => {
      const buffer = Buffer.from('no cache', 'utf-8');
      const result = bufferToBase64(buffer, false);
      expect(result).toBe(buffer.toString('base64'));
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.alloc(0);
      const result = bufferToBase64(buffer);
      expect(result).toBe('');
    });

    it('should handle binary data', () => {
      const buffer = Buffer.from([0x00, 0xFF, 0x80, 0x7F]);
      const result = bufferToBase64(buffer);
      expect(result).toBe(buffer.toString('base64'));
    });
  });

  describe('splitBuffer', () => {
    it('should split buffer into chunks of specified size', () => {
      const buffer = Buffer.alloc(2500);
      const chunks = splitBuffer(buffer, 1000);
      expect(chunks).toHaveLength(3);
      expect(chunks[0].length).toBe(1000);
      expect(chunks[1].length).toBe(1000);
      expect(chunks[2].length).toBe(500);
    });

    it('should return single chunk for small buffer', () => {
      const buffer = Buffer.alloc(500);
      const chunks = splitBuffer(buffer, 1000);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].length).toBe(500);
    });

    it('should handle buffer exactly matching chunk size', () => {
      const buffer = Buffer.alloc(2000);
      const chunks = splitBuffer(buffer, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0].length).toBe(1000);
      expect(chunks[1].length).toBe(1000);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.alloc(0);
      const chunks = splitBuffer(buffer);
      expect(chunks).toHaveLength(0);
    });

    it('should use default chunk size of 1MB', () => {
      const buffer = Buffer.alloc(1024 * 1024 + 100);
      const chunks = splitBuffer(buffer);
      expect(chunks).toHaveLength(2);
      expect(chunks[0].length).toBe(1024 * 1024);
      expect(chunks[1].length).toBe(100);
    });

    it('should preserve buffer content when split', () => {
      const data = 'Hello World Test Data';
      const buffer = Buffer.from(data, 'utf-8');
      const chunks = splitBuffer(buffer, 5);
      const reassembled = Buffer.concat(chunks).toString('utf-8');
      expect(reassembled).toBe(data);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage information', () => {
      const usage = getMemoryUsage();
      expect(usage.heapUsed).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
      expect(typeof usage.rss).toBe('number');
      expect(typeof usage.external).toBe('number');
    });

    it('should return formatted MB strings', () => {
      const usage = getMemoryUsage();
      expect(usage.heapUsedMB).toMatch(/^\d+\.\d{2}$/);
      expect(usage.heapTotalMB).toMatch(/^\d+\.\d{2}$/);
    });

    it('should have heapUsed less than or equal to heapTotal', () => {
      const usage = getMemoryUsage();
      expect(usage.heapUsed).toBeLessThanOrEqual(usage.heapTotal);
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats initially', () => {
      const stats = getCacheStats();
      expect(stats.base64Cache.size).toBe(0);
      expect(stats.responseCache.size).toBe(0);
    });

    it('should reflect cache usage after operations', () => {
      const buffer = Buffer.from('cache test', 'utf-8');
      bufferToBase64(buffer);
      const stats = getCacheStats();
      expect(stats.base64Cache.size).toBe(1);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches', () => {
      const buffer = Buffer.from('clear test', 'utf-8');
      bufferToBase64(buffer);

      let stats = getCacheStats();
      expect(stats.base64Cache.size).toBe(1);

      clearAllCaches();

      stats = getCacheStats();
      expect(stats.base64Cache.size).toBe(0);
      expect(stats.responseCache.size).toBe(0);
    });
  });

  describe('responseCache', () => {
    it('should cache and retrieve file responses', () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const model = 'gpt-4';
      const data = { result: 'parsed content' };

      responseCache.set(mockFile, model, data);
      const cached = responseCache.get(mockFile, model);
      expect(cached).toEqual(data);
    });

    it('should return null for uncached file', () => {
      const mockFile = new File(['content'], 'unknown.pdf', { type: 'application/pdf' });
      const result = responseCache.get(mockFile, 'model');
      expect(result).toBeNull();
    });

    it('should differentiate by model', () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const data1 = { result: 'model1' };
      const data2 = { result: 'model2' };

      responseCache.set(mockFile, 'model1', data1);
      responseCache.set(mockFile, 'model2', data2);

      expect(responseCache.get(mockFile, 'model1')).toEqual(data1);
      expect(responseCache.get(mockFile, 'model2')).toEqual(data2);
    });

    it('should report correct size', () => {
      const file1 = new File(['a'], 'a.pdf', { type: 'application/pdf' });
      const file2 = new File(['b'], 'b.pdf', { type: 'application/pdf' });

      responseCache.set(file1, 'model', { r: 1 });
      responseCache.set(file2, 'model', { r: 2 });

      expect(responseCache.size()).toBe(2);
    });

    it('should clear all entries', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      responseCache.set(file, 'model', { r: 1 });
      expect(responseCache.size()).toBe(1);

      responseCache.clear();
      expect(responseCache.size()).toBe(0);
    });
  });
});

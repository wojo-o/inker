import { describe, it, expect } from 'bun:test';
import { ScriptExecutorService } from './script-executor.service';

describe('ScriptExecutorService', () => {
  const executor = new ScriptExecutorService();

  describe('value mode', () => {
    it('should return simple values', () => {
      const result = executor.execute('return 42;', {}, 'value');
      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should return string values', () => {
      const result = executor.execute('return "hello";', {}, 'value');
      expect(result.success).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('should access data via $ syntax', () => {
      const result = executor.execute('return $.price;', { price: 100 }, 'value');
      expect(result.success).toBe(true);
      expect(result.value).toBe(100);
    });

    it('should access nested data', () => {
      const data = { rates: [{ mid: 4.25 }] };
      const result = executor.execute('return $.rates[0].mid;', data, 'value');
      expect(result.success).toBe(true);
      expect(result.value).toBe(4.25);
    });

    it('should support arithmetic expressions', () => {
      const result = executor.execute('return $.price * 1000;', { price: 3.5 }, 'value');
      expect(result.success).toBe(true);
      expect(result.value).toBe(3500);
    });
  });

  describe('template mode', () => {
    it('should extract declared variables', () => {
      const code = 'var greeting = "hello"; var count = 5;';
      const result = executor.execute(code, {}, 'template');
      expect(result.success).toBe(true);
      expect(result.variables).toEqual({ greeting: 'hello', count: 5 });
    });

    it('should access $ data in variables', () => {
      const code = 'var total = $.price * $.quantity;';
      const result = executor.execute(code, { price: 10, quantity: 3 }, 'template');
      expect(result.success).toBe(true);
      expect(result.variables?.total).toBe(30);
    });
  });

  describe('error handling', () => {
    it('should return error for syntax errors', () => {
      const result = executor.execute('return {{{;', {}, 'value');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for runtime errors', () => {
      const result = executor.execute('return $.foo.bar.baz;', {}, 'value');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('sandbox security', () => {
    it('should not have access to process', () => {
      const result = executor.execute('return typeof process;', {}, 'value');
      expect(result.success).toBe(true);
      expect(result.value).toBe('undefined');
    });

    it('should not have access to require', () => {
      const result = executor.execute('return typeof require;', {}, 'value');
      expect(result.success).toBe(true);
      expect(result.value).toBe('undefined');
    });

    it('should timeout on infinite loops', () => {
      const result = executor.execute('while(true) {}', {}, 'value');
      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });
});

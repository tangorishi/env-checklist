import { describe, it, expect, vi, afterEach } from 'vitest';
import { preflight, PreflightError } from '../src/index';

function withEnv(vars: Record<string, string>) {
  const original: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    original[k] = process.env[k];
    process.env[k] = v;
  }
  return () => {
    for (const k of Object.keys(vars)) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  };
}

describe('preflight()', () => {
  let restoreEnv: (() => void) | undefined;

  afterEach(() => {
    restoreEnv?.();
    restoreEnv = undefined;
    vi.restoreAllMocks();
  });

  it('returns a Config object when all required keys are present', () => {
    restoreEnv = withEnv({ PORT: '3000', API_KEY: 'abc123' });
    const result = preflight(['PORT', 'API_KEY']);
    expect(result).toEqual({ PORT: '3000', API_KEY: 'abc123' });
  });

  it('returns an empty object when given an empty keys array', () => {
    const result = preflight([]);
    expect(result).toEqual({});
  });

  it('includes all provided keys in the returned config', () => {
    restoreEnv = withEnv({ DB_HOST: 'localhost', DB_PORT: '5432', DB_NAME: 'mydb' });
    const result = preflight(['DB_HOST', 'DB_PORT', 'DB_NAME']);
    expect(Object.keys(result)).toHaveLength(3);
    expect(result.DB_HOST).toBe('localhost');
    expect(result.DB_PORT).toBe('5432');
    expect(result.DB_NAME).toBe('mydb');
  });

  it('throws a PreflightError when a required key is missing', () => {
    delete process.env['MISSING_VAR'];
    expect(() => preflight(['MISSING_VAR'])).toThrow(PreflightError);
  });

  it('error message contains all missing key names', () => {
    delete process.env['KEY_ONE'];
    delete process.env['KEY_TWO'];
    expect(() => preflight(['KEY_ONE', 'KEY_TWO'])).toThrowError(
      expect.objectContaining({ message: expect.stringContaining('KEY_ONE') })
    );
  });

  it('exposes missing keys on the error.missing array', () => {
    delete process.env['ALPHA'];
    delete process.env['BETA'];
    try {
      preflight(['ALPHA', 'BETA']);
    } catch (e) {
      expect(e).toBeInstanceOf(PreflightError);
      expect((e as PreflightError).missing).toEqual(['ALPHA', 'BETA']);
    }
  });

  it('throws when one key is missing among several present ones', () => {
    restoreEnv = withEnv({ PRESENT_KEY: 'value' });
    delete process.env['ABSENT_KEY'];
    expect(() => preflight(['PRESENT_KEY', 'ABSENT_KEY'])).toThrow(PreflightError);
  });

  it('treats an empty string value as missing', () => {
    restoreEnv = withEnv({ EMPTY_VAR: '' });
    expect(() => preflight(['EMPTY_VAR'])).toThrow(PreflightError);
  });

  it('does not throw when all keys have non-empty values', () => {
    restoreEnv = withEnv({ DATABASE_URL: 'postgres://localhost/dev' });
    expect(() => preflight(['DATABASE_URL'])).not.toThrow();
  });

  it('handles keys with numeric-string values correctly', () => {
    restoreEnv = withEnv({ TIMEOUT: '5000' });
    const result = preflight(['TIMEOUT']);
    expect(result.TIMEOUT).toBe('5000');
  });

  it('is case-sensitive — treats MY_KEY and my_key as different variables', () => {
    restoreEnv = withEnv({ MY_KEY: 'value' });
    delete process.env['my_key'];
    expect(() => preflight(['my_key'])).toThrow(PreflightError);
  });
});
import { describe, it, expect, vi, afterEach } from 'vitest';
import { preflight, preflightSafe, PreflightError } from '../src/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── preflight() ─────────────────────────────────────────────────────────────

describe('preflight()', () => {
  let restoreEnv: (() => void) | undefined;

  afterEach(() => {
    restoreEnv?.();
    restoreEnv = undefined;
    vi.restoreAllMocks();
  });

  // Happy path
  it('returns a Config object when all required keys are present', () => {
    restoreEnv = withEnv({ PORT: '3000', API_KEY: 'abc123' });
    const result = preflight(['PORT', 'API_KEY']);
    expect(result).toEqual({ PORT: '3000', API_KEY: 'abc123' });
  });

  it('returns an empty object when given an empty keys array', () => {
    expect(preflight([])).toEqual({});
  });

  it('includes all provided keys in the returned config', () => {
    restoreEnv = withEnv({ DB_HOST: 'localhost', DB_PORT: '5432', DB_NAME: 'mydb' });
    const result = preflight(['DB_HOST', 'DB_PORT', 'DB_NAME']);
    expect(Object.keys(result)).toHaveLength(3);
  });

  // Options object input
  it('accepts an options object with required and optional keys', () => {
    restoreEnv = withEnv({ PORT: '3000', SENTRY_DSN: 'https://sentry.io/x' });
    delete process.env['OPTIONAL_KEY'];
    const result = preflight({ required: ['PORT'], optional: ['SENTRY_DSN', 'OPTIONAL_KEY'] });
    expect(result.PORT).toBe('3000');
    expect(result.SENTRY_DSN).toBe('https://sentry.io/x');
    expect(result.OPTIONAL_KEY).toBeUndefined();
  });

  it('does not throw when optional keys are missing', () => {
    restoreEnv = withEnv({ PORT: '3000' });
    delete process.env['OPTIONAL_KEY'];
    expect(() => preflight({ required: ['PORT'], optional: ['OPTIONAL_KEY'] })).not.toThrow();
  });

  // Missing variables
  it('throws a PreflightError when a required key is missing', () => {
    delete process.env['MISSING_VAR'];
    expect(() => preflight(['MISSING_VAR'])).toThrow(PreflightError);
  });

  it('exposes missing keys on error.missing', () => {
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

  // Edge cases
  it('treats an empty string value as missing', () => {
    restoreEnv = withEnv({ EMPTY_VAR: '' });
    expect(() => preflight(['EMPTY_VAR'])).toThrow(PreflightError);
  });

  it('handles numeric-string values correctly', () => {
    restoreEnv = withEnv({ TIMEOUT: '5000' });
    expect(preflight(['TIMEOUT'])).toEqual({ TIMEOUT: '5000' });
  });

  it('is case-sensitive', () => {
    restoreEnv = withEnv({ MY_KEY: 'value' });
    delete process.env['my_key'];
    expect(() => preflight(['my_key'])).toThrow(PreflightError);
  });
});

// ─── preflightSafe() ──────────────────────────────────────────────────────────

describe('preflightSafe()', () => {
  let restoreEnv: (() => void) | undefined;

  afterEach(() => {
    restoreEnv?.();
    restoreEnv = undefined;
  });

  it('returns ok:true when all required keys are present', () => {
    restoreEnv = withEnv({ PORT: '3000', API_KEY: 'secret' });
    const result = preflightSafe(['PORT', 'API_KEY']);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.present).toEqual(['PORT', 'API_KEY']);
    expect(result.config).toEqual({ PORT: '3000', API_KEY: 'secret' });
  });

  it('returns ok:false when required keys are missing', () => {
    delete process.env['MISSING_A'];
    delete process.env['MISSING_B'];
    const result = preflightSafe(['MISSING_A', 'MISSING_B']);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['MISSING_A', 'MISSING_B']);
    expect(result.present).toEqual([]);
  });

  it('never throws even when keys are missing', () => {
    delete process.env['NO_THROW_KEY'];
    expect(() => preflightSafe(['NO_THROW_KEY'])).not.toThrow();
  });

  it('correctly separates present and missing in a mixed case', () => {
    restoreEnv = withEnv({ GOOD_KEY: 'yes' });
    delete process.env['BAD_KEY'];
    const result = preflightSafe(['GOOD_KEY', 'BAD_KEY']);
    expect(result.ok).toBe(false);
    expect(result.present).toContain('GOOD_KEY');
    expect(result.missing).toContain('BAD_KEY');
  });

  it('tracks optional keys separately — present vs missing', () => {
    restoreEnv = withEnv({ PORT: '8080', SENTRY_DSN: 'https://x' });
    delete process.env['LOG_LEVEL'];
    const result = preflightSafe({
      required: ['PORT'],
      optional: ['SENTRY_DSN', 'LOG_LEVEL'],
    });
    expect(result.ok).toBe(true);
    expect(result.optionalPresent).toContain('SENTRY_DSN');
    expect(result.optionalMissing).toContain('LOG_LEVEL');
  });

  it('ok:true even when optional keys are missing', () => {
    restoreEnv = withEnv({ PORT: '3000' });
    delete process.env['SENTRY_DSN'];
    const result = preflightSafe({ required: ['PORT'], optional: ['SENTRY_DSN'] });
    expect(result.ok).toBe(true);
    expect(result.optionalMissing).toEqual(['SENTRY_DSN']);
  });

  it('includes optional present keys in config', () => {
    restoreEnv = withEnv({ PORT: '3000', LOG_LEVEL: 'debug' });
    const result = preflightSafe({ required: ['PORT'], optional: ['LOG_LEVEL'] });
    expect(result.config.LOG_LEVEL).toBe('debug');
  });

  it('returns empty arrays when given no keys', () => {
    const result = preflightSafe([]);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.present).toEqual([]);
    expect(result.config).toEqual({});
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { preflight } from '../src/index.js';

// Unique prefix to avoid colliding with real env vars on the machine
const P = 'ENV_CHECKLIST_TEST_';

describe('preflight()', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Prevent process.exit from actually terminating the test runner
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as (code?: number) => never);
    // Silence console.error noise in test output
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up any env vars set during the test
    Object.keys(process.env)
      .filter((k) => k.startsWith(P))
      .forEach((k) => delete process.env[k]);
  });

  // ─── Return Value ────────────────────────────────────────────────────────────

  describe('return value', () => {
    it('returns a Config object containing all requested env vars', () => {
      process.env[`${P}PORT`] = '3000';
      process.env[`${P}API_KEY`] = 'secret';

      const result = preflight([`${P}PORT`, `${P}API_KEY`]);

      expect(result).toEqual({ [`${P}PORT`]: '3000', [`${P}API_KEY`]: 'secret' });
    });

    it('returns an empty Config when the required-keys array is empty', () => {
      const result = preflight([]);

      expect(result).toEqual({});
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('does not include keys that were not requested', () => {
      process.env[`${P}EXTRA`] = 'extra';
      process.env[`${P}NEEDED`] = 'needed';

      const result = preflight([`${P}NEEDED`]);

      expect(result).toHaveProperty(`${P}NEEDED`);
      expect(result).not.toHaveProperty(`${P}EXTRA`);
    });

    it('preserves the exact string value of each env var', () => {
      process.env[`${P}VAL`] = 'postgres://user:pass@localhost:5432/db';

      const result = preflight([`${P}VAL`]);

      expect(result[`${P}VAL`]).toBe('postgres://user:pass@localhost:5432/db');
    });
  });

  // ─── Missing Variables ───────────────────────────────────────────────────────

  describe('missing variables', () => {
    it('calls process.exit(1) when a single key is missing', () => {
      delete process.env[`${P}MISSING`];

      preflight([`${P}MISSING`]);

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('calls process.exit(1) exactly once even when multiple keys are missing', () => {
      delete process.env[`${P}A`];
      delete process.env[`${P}B`];

      preflight([`${P}A`, `${P}B`]);

      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('logs all missing key names in the error message', () => {
      delete process.env[`${P}A`];
      delete process.env[`${P}B`];

      preflight([`${P}A`, `${P}B`]);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${P}A`)
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${P}B`)
      );
    });

    it('does NOT include present keys in the error message', () => {
      process.env[`${P}PRESENT`] = 'value';
      delete process.env[`${P}ABSENT`];

      preflight([`${P}PRESENT`, `${P}ABSENT`]);

      const call = errorSpy.mock.calls[0][0] as string;
      expect(call).not.toContain(`${P}PRESENT`);
    });

    it('does not call process.exit when all keys are present', () => {
      process.env[`${P}KEY`] = 'value';

      preflight([`${P}KEY`]);

      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('treats empty string values as missing (falsy check)', () => {
      process.env[`${P}EMPTY`] = '';

      preflight([`${P}EMPTY`]);

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('accepts whitespace-only strings as present (they are truthy)', () => {
      process.env[`${P}SPACE`] = '   ';

      const result = preflight([`${P}SPACE`]);

      expect(exitSpy).not.toHaveBeenCalled();
      expect(result[`${P}SPACE`]).toBe('   ');
    });

    it('handles a large number of keys without error', () => {
      const keys = Array.from({ length: 50 }, (_, i) => `${P}BIG_${i}`);
      keys.forEach((k) => { process.env[k] = 'value'; });

      const result = preflight(keys);

      expect(Object.keys(result)).toHaveLength(50);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('handles duplicate keys in the required list gracefully', () => {
      process.env[`${P}DUP`] = 'dup-value';

      const result = preflight([`${P}DUP`, `${P}DUP`]);

      // Both entries resolve, exit should not be called
      expect(exitSpy).not.toHaveBeenCalled();
      expect(result[`${P}DUP`]).toBe('dup-value');
    });
  });
});

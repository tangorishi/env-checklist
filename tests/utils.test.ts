import { describe, it, expect } from 'vitest';
import { parseEnvKeys } from '../src/utils.js';

describe('parseEnvKeys()', () => {

  // ─── Basic Parsing ───────────────────────────────────────────────────────────

  describe('basic parsing', () => {
    it('extracts a single key from a KEY=VALUE line', () => {
      expect(parseEnvKeys('PORT=3000')).toEqual(['PORT']);
    });

    it('extracts multiple keys from multiple lines', () => {
      expect(parseEnvKeys('PORT=3000\nAPI_KEY=secret\nDB_URL=postgres://')).toEqual([
        'PORT',
        'API_KEY',
        'DB_URL',
      ]);
    });

    it('extracts the key when there is no value (KEY=)', () => {
      expect(parseEnvKeys('PORT=')).toEqual(['PORT']);
    });

    it('extracts only the first segment when the value itself contains = signs', () => {
      expect(parseEnvKeys('DB_URL=postgres://user:pass@host/db?ssl=true')).toEqual(['DB_URL']);
    });

    it('returns an empty array for an empty string', () => {
      expect(parseEnvKeys('')).toEqual([]);
    });
  });

  // ─── Comment Filtering ───────────────────────────────────────────────────────

  describe('comment filtering', () => {
    it('ignores a line that starts with #', () => {
      expect(parseEnvKeys('# This is a comment\nPORT=3000')).toEqual(['PORT']);
    });

    it('ignores multiple comment lines scattered between valid lines', () => {
      const content = [
        '# App config',
        'PORT=3000',
        '# DB section',
        'DB_URL=postgres://localhost',
      ].join('\n');

      expect(parseEnvKeys(content)).toEqual(['PORT', 'DB_URL']);
    });

    it('returns an empty array when the file contains only comments', () => {
      expect(parseEnvKeys('# comment one\n# comment two\n# comment three')).toEqual([]);
    });

    it('does NOT treat an inline # as a comment (only leading # matters)', () => {
      // "PORT=3000 # note" — the value has a comment, but the key is still PORT
      expect(parseEnvKeys('PORT=3000 # inline comment')).toEqual(['PORT']);
    });
  });

  // ─── Empty / Whitespace Line Filtering ──────────────────────────────────────

  describe('empty and whitespace line filtering', () => {
    it('ignores empty lines between valid entries', () => {
      expect(parseEnvKeys('PORT=3000\n\nAPI_KEY=secret')).toEqual(['PORT', 'API_KEY']);
    });

    it('ignores a trailing newline', () => {
      expect(parseEnvKeys('PORT=3000\n')).toEqual(['PORT']);
    });

    it('ignores whitespace-only lines', () => {
      expect(parseEnvKeys('   \nPORT=3000\n   ')).toEqual(['PORT']);
    });

    it('returns an empty array when content has only empty lines', () => {
      expect(parseEnvKeys('\n\n\n')).toEqual([]);
    });
  });

  // ─── Whitespace Trimming ─────────────────────────────────────────────────────

  describe('whitespace trimming', () => {
    it('trims leading whitespace from a key', () => {
      expect(parseEnvKeys('  PORT=3000')).toEqual(['PORT']);
    });

    it('trims trailing whitespace from a key', () => {
      expect(parseEnvKeys('PORT  =3000')).toEqual(['PORT']);
    });

    it('handles Windows-style CRLF line endings', () => {
      expect(parseEnvKeys('PORT=3000\r\nAPI_KEY=secret\r\n')).toEqual(['PORT', 'API_KEY']);
    });
  });

  // ─── Real-World / Mixed Content ──────────────────────────────────────────────

  describe('real-world mixed content', () => {
    it('correctly parses a realistic .env.example file', () => {
      const content = [
        '# ── App ──',
        'PORT=8000',
        '',
        '# ── Auth ──',
        'API_KEY=rishi-secret-key',
        '',
        '# ── Database ──',
        'DATABASE_URL=postgres://user:password@localhost:5432/mydb',
      ].join('\n');

      expect(parseEnvKeys(content)).toEqual(['PORT', 'API_KEY', 'DATABASE_URL']);
    });

    it('handles a file that is only comments and blank lines (no vars)', () => {
      const content = '# No variables defined yet\n\n# Coming soon\n';
      expect(parseEnvKeys(content)).toEqual([]);
    });

    it('handles a single-variable file with no trailing newline', () => {
      expect(parseEnvKeys('SECRET=abc123')).toEqual(['SECRET']);
    });
  });
});

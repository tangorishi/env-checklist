import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Resolve the built CLI entry point (must `npm run build` before running)
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI_PATH = resolve(__dirname, '../dist/cli.js');

/**
 * Spawns the CLI inside a given directory and returns the result.
 * A minimal env is passed so parent-process vars don't interfere with assertions.
 */
function runCli(cwd: string) {
  return spawnSync('node', [CLI_PATH], {
    cwd,
    encoding: 'utf-8',
    // Pass only what Node needs to run; avoids inherited PORT/API_KEY etc.
    env: {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,           // Windows
      SystemRoot: process.env.SystemRoot,           // Windows (alternate casing)
      USERPROFILE: process.env.USERPROFILE,         // Windows home dir
      HOME: process.env.HOME,                       // Unix home dir
      NODE_PATH: process.env.NODE_PATH,
      APPDATA: process.env.APPDATA,                 // Windows: npm global
    },
  });
}

/** Creates an isolated temp directory for a single test. */
function makeTempDir() {
  return mkdtempSync(join(tmpdir(), 'env-checklist-test-'));
}

describe('CLI Integration', () => {
  const tempDirs: string[] = [];

  /** Registers a temp dir for cleanup after each test. */
  function tmpDir() {
    const dir = makeTempDir();
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    tempDirs.forEach((dir) => {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    });
    tempDirs.length = 0;
  });

  // ─── .env.example checks ────────────────────────────────────────────────────

  describe('when .env.example is missing', () => {
    it('exits with code 1', () => {
      const dir = tmpDir();

      const result = runCli(dir);

      expect(result.status).toBe(1);
    });

    it('prints an error message that mentions .env.example', () => {
      const dir = tmpDir();

      const result = runCli(dir);
      const output = result.stdout + result.stderr;

      expect(output).toMatch(/\.env\.example/);
    });

    it('does not print the success banner', () => {
      const dir = tmpDir();

      const result = runCli(dir);

      expect(result.stdout).not.toContain('All systems go');
    });
  });

  // ─── .env checks ────────────────────────────────────────────────────────────

  describe('when .env.example exists but .env is missing', () => {
    it('exits with code 1 when there are required vars', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), 'CHECKLIST_PORT=3000\n');

      const result = runCli(dir);

      expect(result.status).toBe(1);
    });

    it('prints a warning that mentions missing .env', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), 'CHECKLIST_PORT=3000\n');

      const result = runCli(dir);
      const output = result.stdout + result.stderr;

      expect(output).toMatch(/\.env/i);
    });

    it('still runs the preflight check despite no .env file', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), 'CHECKLIST_PORT=3000\n');

      const result = runCli(dir);
      const output = result.stdout + result.stderr;

      // The "Checking environment variables" banner should appear
      expect(output).toContain('Checking environment variables');
    });
  });

  // ─── Validation: success ────────────────────────────────────────────────────

  describe('when all required vars are present', () => {
    it('exits with code 0', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), 'CHECKLIST_PORT=3000\nCHECKLIST_KEY=secret\n');
      writeFileSync(join(dir, '.env'), 'CHECKLIST_PORT=4000\nCHECKLIST_KEY=real-secret\n');

      const result = runCli(dir);

      expect(result.status).toBe(0);
    });

    it('prints the "All systems go" success message', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), 'CHECKLIST_PORT=3000\n');
      writeFileSync(join(dir, '.env'), 'CHECKLIST_PORT=4000\n');

      const result = runCli(dir);

      expect(result.stdout).toContain('All systems go');
    });

    it('prints the checking banner before the result', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), 'CHECKLIST_PORT=3000\n');
      writeFileSync(join(dir, '.env'), 'CHECKLIST_PORT=4000\n');

      const result = runCli(dir);

      expect(result.stdout).toContain('Checking environment variables');
    });
  });

  // ─── Validation: failure ────────────────────────────────────────────────────

  describe('when required vars are missing from .env', () => {
    it('exits with code 1', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), 'CHECKLIST_PORT=3000\nCHECKLIST_KEY=secret\n');
      writeFileSync(join(dir, '.env'), 'CHECKLIST_PORT=4000\n'); // CHECKLIST_KEY is absent

      const result = runCli(dir);

      expect(result.status).toBe(1);
    });

    it('includes the name of the missing variable in the output', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), 'CHECKLIST_KEY=secret\n');
      writeFileSync(join(dir, '.env'), ''); // empty — key is missing

      const result = runCli(dir);
      const output = result.stdout + result.stderr;

      expect(output).toContain('CHECKLIST_KEY');
    });

    it('still prints the checking banner before failing', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), 'CHECKLIST_KEY=secret\n');
      writeFileSync(join(dir, '.env'), '');

      const result = runCli(dir);

      expect(result.stdout).toContain('Checking environment variables');
    });
  });

  // ─── Empty / comment-only .env.example ──────────────────────────────────────

  describe('when .env.example has no actionable variables', () => {
    it('exits with code 0 when .env.example is completely empty', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), '');

      const result = runCli(dir);

      expect(result.status).toBe(0);
    });

    it('exits with code 0 when .env.example contains only comments', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), '# Just a comment\n# Another comment\n');

      const result = runCli(dir);

      expect(result.status).toBe(0);
    });

    it('exits with code 0 when .env.example contains only blank lines', () => {
      const dir = tmpDir();
      writeFileSync(join(dir, '.env.example'), '\n\n\n');

      const result = runCli(dir);

      expect(result.status).toBe(0);
    });
  });
});

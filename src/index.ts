export interface Config {
  [key: string]: string | number | boolean;
}

export class PreflightError extends Error {
  public readonly missing: string[];

  constructor(missing: string[]) {
    super(missing.join(', '));
    this.name = 'PreflightError';
    this.missing = missing;
  }
}

export function preflight(requiredKeys: string[]): Config {
  const missing: string[] = [];
  const env: Config = {};

  for (const key of requiredKeys) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else {
      env[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new PreflightError(missing);
  }

  return env;
}
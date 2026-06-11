export interface Config {
  [key: string]: string;
}

export interface PreflightOptions {
  required: string[];
  optional?: string[];
}

export interface PreflightSafeResult {
  ok: boolean;
  config: Config;
  missing: string[];
  present: string[];
  optionalMissing: string[];
  optionalPresent: string[];
}

export class PreflightError extends Error {
  public readonly missing: string[];

  constructor(missing: string[]) {
    const message = `Missing required environment variables: ${missing.join(", ")}. Please ensure these are set in your environment or configuration.`;
    super(message);
    this.name = 'PreflightError';
    this.missing = missing;
  }
}

export function preflight(input: string[] | PreflightOptions): Config {
  const { required, optional = [] } = normalizeInput(input);
  const { missing, config } = check(required);

  // Also load optional keys that are present
  for (const key of optional) {
    const value = process.env[key];
    if (value) config[key] = value;
  }

  if (missing.length > 0) {
    throw new PreflightError(missing);
  }

  return config;
}

export function preflightSafe(input: string[] | PreflightOptions): PreflightSafeResult {
  const { required, optional = [] } = normalizeInput(input);

  const { missing, present, config } = check(required);

  const optionalMissing: string[] = [];
  const optionalPresent: string[] = [];

  for (const key of optional) {
    const value = process.env[key];
    if (value) {
      config[key] = value;
      optionalPresent.push(key);
    } else {
      optionalMissing.push(key);
    }
  }

  return {
    ok: missing.length === 0,
    config,
    missing,
    present,
    optionalMissing,
    optionalPresent,
  };
}

//  Internal helpers 

function normalizeInput(input: string[] | PreflightOptions): Required<PreflightOptions> {
  if (Array.isArray(input)) {
    return { required: input, optional: [] };
  }
  return { required: input.required, optional: input.optional ?? [] };
}

function check(keys: string[]): { missing: string[]; present: string[]; config: Config } {
  const missing: string[] = [];
  const present: string[] = [];
  const config: Config = {};

  for (const key of keys) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else {
      present.push(key);
      config[key] = value;
    }
  }

  return { missing, present, config };
}

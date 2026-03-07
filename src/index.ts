export interface Config {
  [key: string]: string | number | boolean;
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
    console.error(`\n✈️  [env-preflight] Missing variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  return env;
}
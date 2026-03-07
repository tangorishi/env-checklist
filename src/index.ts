export type EnvValue = string | number | boolean;

export interface Config {
  [key: string]: EnvValue;
}

export interface PreflightOptions {
  exitOnError?: boolean;  // Should we kill the process?
  castValues?: boolean;   // Should we convert "true" to true and "123" to 123?
}

export function preflight(
  requiredKeys: string[], 
  options: PreflightOptions = { exitOnError: true, castValues: true }
): Config {
  const missing: string[] = [];
  const env: Config = {};

  for (const key of requiredKeys) {
    let value: any = process.env[key];

    if (value === undefined || value === '') {
      missing.push(key);
      continue;
    }

    // Optional: Smart Casting
    if (options.castValues) {
      if (value.toLowerCase() === 'true') value = true;
      else if (value.toLowerCase() === 'false') value = false;
      else if (!isNaN(Number(value)) && value.trim() !== '') value = Number(value);
    }

    env[key] = value;
  }

  if (missing.length > 0) {
    const errorMsg = `\n❌ [env-checklist] Missing required variables: ${missing.join(', ')}`;
    
    if (options.exitOnError) {
      console.error(errorMsg);
      process.exit(1);
    } else {
      throw new Error(errorMsg);
    }
  }

  return env;
}

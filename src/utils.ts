/**
 * Parses the raw text content of a .env.example file and returns
 * an array of variable key names.
 *
 * - Splits on newlines (handles both LF and CRLF via trim())
 * - Ignores empty / whitespace-only lines
 * - Ignores comment lines that start with #
 * - Extracts only the key name before the first '='
 */
export function parseEnvKeys(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim());
}

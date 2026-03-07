# ✈️ env-checklist

A lightweight, color-coded CLI tool to ensure your local environment variables match your `.env.example` before you launch your app.

[![npm version](https://img.shields.io/npm/v/env-checklist.svg)](https://www.npmjs.com/package/env-checklist)
[![license](https://img.shields.io/npm/l/env-checklist.svg)](https://github.com/tangorishi/env-checklist)

## 🚀 Why use this?

How many times has your app crashed because you forgot to add a new API key to your `.env` file? `env-checklist` prevents that by comparing your active `.env` against your template.

- **🎨 Beautiful Terminal Output**: Uses Chalk for high-contrast success/error messages.
- **🛡️ Robust Parsing**: Automatically ignores comments and empty lines.
- **📦 Zero Config**: Works out of the box with any Node.js project.
- **🔑 Optional Keys**: Mark variables as optional directly in your `.env.example`.
- **🛠 Programmatic API**: Use `preflight()` or `preflightSafe()` directly in your code.

---

## 🛠 Usage

### Run once (Recommended)
You don't even need to install it. Just run this in your project root:

```bash
npx env-checklist@latest
```

### Install globally
```bash
npm install -g env-checklist
env-checklist
```

### Install as a dev dependency
```bash
npm install --save-dev env-checklist
```

Add it to your `package.json` scripts to run before starting your app:

```json
"scripts": {
  "prestart": "env-checklist",
  "start": "node dist/index.js"
}
```

---

## 🚩 CLI Flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--verbose` | | Show a status line for every key checked |
| `--fix` | | Auto-generate a `.env` file from `.env.example` with empty placeholders |
| `--path <file>` | | Use a custom `.env.example` path (useful in monorepos) |
| `--version` | `-v` | Show the current version |
| `--help` | `-h` | Show the help message |

### Examples

```bash
# Basic check
npx env-checklist

# See every key's status
npx env-checklist --verbose

# Auto-generate a .env scaffold
npx env-checklist --fix

# Use a custom .env.example path (monorepos)
npx env-checklist --path apps/api/.env.example

# Check version
npx env-checklist --version
```

### `--verbose` output example

```
✈️  Checking environment variables...

  KEY               TYPE        STATUS
  ────────────────────────────────────
  PORT              required    ✅ present
  API_KEY           required    ✅ present
  DATABASE_URL      required    ❌ missing
  SENTRY_DSN        optional    ➖ not set

❌ Preflight Failed!

  Missing required variables:
    ✖ DATABASE_URL

  2 passed · 1 failed · 4 total
```

### `--fix` output example

```bash
npx env-checklist --fix
# ✅ .env file created from .env.example.
#    3 variable(s) scaffolded. Fill in the values before launching.
```

---

## 🔑 Optional Keys

Mark any variable as optional in your `.env.example` by adding `# optional` to the end of the line. Optional keys are loaded into the config if present but never cause a failure.

```bash
# .env.example
PORT=
API_KEY=
DATABASE_URL=
SENTRY_DSN=   # optional
LOG_LEVEL=    # optional
```

---

## 📦 Programmatic API

### `preflight(keys)` — strict mode

Throws a `PreflightError` if any required key is missing. Accepts a plain array or an options object.

```ts
import { preflight } from 'env-checklist';

// Simple — required keys only
const config = preflight(['PORT', 'API_KEY', 'DATABASE_URL']);

// With optional keys
const config = preflight({
  required: ['PORT', 'API_KEY'],
  optional: ['SENTRY_DSN', 'LOG_LEVEL'],
});

console.log(config.PORT); // '3000'
```

### `preflightSafe(keys)` — safe mode

Never throws. Returns a result object — ideal when you want to handle errors yourself.

```ts
import { preflightSafe } from 'env-checklist';

const result = preflightSafe({
  required: ['PORT', 'API_KEY'],
  optional: ['SENTRY_DSN'],
});

if (!result.ok) {
  console.error('Missing:', result.missing);
  process.exit(1);
}

console.log(result.config);        // { PORT: '3000', API_KEY: '...' }
console.log(result.present);       // ['PORT', 'API_KEY']
console.log(result.optionalMissing); // ['SENTRY_DSN']
```

### `PreflightError`

```ts
import { preflight, PreflightError } from 'env-checklist';

try {
  preflight(['PORT', 'API_KEY']);
} catch (e) {
  if (e instanceof PreflightError) {
    console.error('Missing keys:', e.missing); // ['API_KEY']
  }
}
```

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/tangorishi/env-checklist).

1. Fork the repo
2. Create your branch: `git checkout -b usr/your-name`
3. Make your changes and add tests
4. Run `npm test` to verify
5. Open a PR against `main`

---

## 📄 License

MIT © [Rishi Joshi](https://github.com/tangorishi)
# ✈️ env-checklist

A lightweight, color-coded CLI tool to ensure your local environment variables match your `.env.example` before you launch your app.

[![npm version](https://img.shields.io/npm/v/env-checklist.svg)](https://www.npmjs.com/package/env-checklist)
[![license](https://img.shields.io/npm/l/env-checklist.svg)](https://github.com/YOUR_GITHUB_USERNAME/env-checklist)

## 🚀 Why use this?
How many times has your app crashed because you forgot to add a new API key to your `.env` file? `env-checklist` prevents that by comparing your active `.env` against your template.

- **🎨 Beautiful Terminal Output**: Uses Chalk for high-contrast success/error messages.
- **🛡️ Robust Parsing**: Automatically ignores comments and empty lines.
- **📦 Zero Config**: Works out of the box with any Node.js project.

---

## 🛠 Usage

### Run once (Recommended)
You don't even need to install it. Just run this in your project root:
```bash
npx env-checklist@latest
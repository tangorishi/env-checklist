#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { preflight } from './index.js';

const examplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(examplePath)) {
  console.error("No .env.example file found in this directory.");
  process.exit(1);
}

const content = fs.readFileSync(examplePath, 'utf-8');
// Extract keys using a Regex (matches start of line until '=')
const keys = content.match(/^[^#\s=]+/gm) || [];

console.log("✈️  Checking environment variables...");
preflight(keys);
console.log("All systems go. Environment is flight-ready.");
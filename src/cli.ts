#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { preflight } from './index.js';

const examplePath = path.join(process.cwd(), '.env.example');


const info = (msg: string) => console.log(`${chalk.cyan.bold('[env-checklist]')} ${msg}`);
//Check if .env.example exists
if (!fs.existsSync(examplePath)) {
  console.error(chalk.red.bold("\n❌ Error: No .env.example file found in this directory."));
  console.log(chalk.dim("Make sure you have a .env.example file to define your required variables.\n"));
  process.exit(1);
}

//Extract keys from .env.example
const content = fs.readFileSync(examplePath, 'utf-8');
const keys = content.match(/^[^#\s=]+/gm) || [];

if (keys.length === 0) {
  info(chalk.yellow("No variables found in .env.example to validate."));
  process.exit(0);
}

//Run Preflight check
console.log(chalk.blue.bold("\n✈️  Checking environment variables..."));

try {
  preflight(keys);
  
  // Success Message
  console.log(chalk.green.bold("✅ All systems go. Environment is flight-ready.\n"));
} catch (error) {
  // Handle 'unknown' error type safely
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Error Message
  console.error(chalk.red.bold("\n❌ Preflight Failed!"));
  console.error(chalk.yellow(`Missing variables: ${errorMessage}`));
  console.log(chalk.dim("Please update your .env file to match .env.example.\n"));
  
  process.exit(1);
}
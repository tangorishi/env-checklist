#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { preflight } from './index.js';
import { parseEnvKeys } from './utils.js';

// Branded logging helper
const info = (msg: string) => console.log(`${chalk.cyan.bold('[env-checklist]')} ${msg}`);

function main(): void {
  dotenv.config();

  const cwd = process.cwd();
  const examplePath = path.join(cwd, '.env.example');
  const envPath = path.join(cwd, '.env');

  // Check if .env.example exists (The Blueprint)
  if (!fs.existsSync(examplePath)) {
    console.error(chalk.red.bold("\n❌ Error: No .env.example file found."));
    console.log(chalk.dim("This tool requires a .env.example file to know what variables to check for.\n"));
    process.exit(1);
  }

  // Check if .env exists (The Actual Values)
  if (!fs.existsSync(envPath)) {
    console.warn(chalk.yellow.bold("\n⚠️  Warning: No .env file found."));
    console.log(chalk.dim("Create a .env file to satisfy the requirements in .env.example.\n"));
  }

  // Extract ONLY the keys (ignoring values, comments, and empty lines)
  const content = fs.readFileSync(examplePath, 'utf-8');
  const keys = parseEnvKeys(content);

  if (keys.length === 0) {
    info(chalk.yellow("No variables found in .env.example to validate."));
    process.exit(0);
  }

  // Run Preflight check
  console.log(chalk.blue.bold("\n✈️  Checking environment variables..."));

  try {
    preflight(keys);
    console.log(chalk.green.bold("✅ All systems go. Environment is flight-ready.\n"));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red.bold("\n❌ Preflight Failed!"));
    console.error(chalk.yellow(`Missing variables: ${errorMessage}`));
    console.log(chalk.dim("Please update your .env file to match .env.example.\n"));
    process.exit(1);
  }
}

main();
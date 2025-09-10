#!/usr/bin/env node

/**
 * Test runner script for the Uzbekistan Payments SDK
 *
 * This script provides a comprehensive test suite for all payment providers
 * and methods in the SDK, including unit tests, integration tests, and
 * end-to-end payment flow tests.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command: string, description: string) {
  log(`\n${colors.bright}${description}${colors.reset}`);
  log(`${colors.cyan}Running: ${command}${colors.reset}`);

  try {
    execSync(command, { stdio: "inherit" });
    log(
      `${colors.green}✓ ${description} completed successfully${colors.reset}`
    );
    return true;
  } catch (error) {
    log(`${colors.red}✗ ${description} failed${colors.reset}`);
    return false;
  }
}

function main() {
  log(
    `${colors.bright}${colors.magenta}Uzbekistan Payments SDK Test Suite${colors.reset}`
  );
  log(
    `${colors.blue}==========================================${colors.reset}`
  );

  // Check if Jest is installed
  if (!existsSync(join(process.cwd(), "node_modules", "jest"))) {
    log(
      `${colors.red}Error: Jest is not installed. Please run 'npm install' first.${colors.reset}`
    );
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const testTypes =
    args.length > 0 ? args : ["unit", "integration", "coverage"];

  let allPassed = true;

  // Run unit tests
  if (testTypes.includes("unit")) {
    allPassed =
      runCommand("npx jest tests/unit --verbose", "Unit Tests") && allPassed;
  }

  // Run integration tests
  if (testTypes.includes("integration")) {
    allPassed =
      runCommand("npx jest tests/integration --verbose", "Integration Tests") &&
      allPassed;
  }

  // Run all tests
  if (testTypes.includes("all")) {
    allPassed = runCommand("npx jest --verbose", "All Tests") && allPassed;
  }

  // Generate coverage report
  if (testTypes.includes("coverage")) {
    allPassed =
      runCommand(
        "npx jest --coverage --coverageReporters=text-lcov | npx coveralls",
        "Coverage Report"
      ) && allPassed;
  }

  // Run specific test suites
  if (testTypes.includes("click")) {
    allPassed =
      runCommand(
        "npx jest tests/unit/click tests/integration/ClickPaymentFlow --verbose",
        "Click Provider Tests"
      ) && allPassed;
  }

  if (testTypes.includes("payme")) {
    allPassed =
      runCommand(
        "npx jest tests/unit/payme tests/integration/PaymePaymentFlow --verbose",
        "Payme Provider Tests"
      ) && allPassed;
  }

  if (testTypes.includes("errors")) {
    allPassed =
      runCommand(
        "npx jest tests/unit/errors --verbose",
        "Error Handling Tests"
      ) && allPassed;
  }

  if (testTypes.includes("utils")) {
    allPassed =
      runCommand(
        "npx jest tests/unit/utils tests/unit/click/utils tests/unit/click/status tests/unit/payme/utils --verbose",
        "Utility Functions Tests"
      ) && allPassed;
  }

  // Summary
  log(
    `\n${colors.blue}==========================================${colors.reset}`
  );
  if (allPassed) {
    log(
      `${colors.green}${colors.bright}All tests passed successfully! 🎉${colors.reset}`
    );
  } else {
    log(
      `${colors.red}${colors.bright}Some tests failed. Please check the output above.${colors.reset}`
    );
    process.exit(1);
  }
}

// Help text
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  log(`${colors.bright}Uzbekistan Payments SDK Test Runner${colors.reset}`);
  log(`${colors.blue}=====================================${colors.reset}`);
  log("");
  log("Usage: npm run test:runner [options]");
  log("");
  log("Options:");
  log("  unit         Run unit tests only");
  log("  integration  Run integration tests only");
  log("  coverage     Generate coverage report");
  log("  click        Run Click provider tests only");
  log("  payme        Run Payme provider tests only");
  log("  errors       Run error handling tests only");
  log("  utils        Run utility functions tests only");
  log("  all          Run all tests");
  log("  --help, -h   Show this help message");
  log("");
  log("Examples:");
  log("  npm run test:runner unit");
  log("  npm run test:runner click payme");
  log("  npm run test:runner coverage");
  log("");
  process.exit(0);
}

main();

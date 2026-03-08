const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './testScripts/playwright',
  outputDir: './testScripts/test-results',
  timeout: 30_000,
  expect: { timeout: 5000 },
  use: { headless: true },
});

import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'tests/e2e', timeout:45000, expect:{timeout:10000}, workers:2,
  use:{baseURL:process.env.TEST_BASE_URL || 'http://127.0.0.1:4321',browserName:'firefox',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:process.env.TEST_BASE_URL ? undefined : {command:'npm run dev -- --port 4321',url:'http://127.0.0.1:4321/en/',reuseExistingServer:true,timeout:60000},
  reporter:[['list']],
});

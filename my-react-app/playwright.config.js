import { defineConfig, devices } from '@playwright/test'

// Pruebas de punta a punta contra los emuladores de Firebase (Auth + Firestore).
// RAWG se reemplaza en el navegador por un doble de prueba con juegos ficticios (e2e/rawg-fixture.js).
// Ejecutar con: npm run test:e2e
const PORT = 5199

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } }, grepInvert: /@mobile/ },
    // En celular se ejecutan las pruebas marcadas @mobile (y las capturas, si se piden).
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile|@capturas/ },
  ],
  // Las capturas para la bitácora solo se generan con EVIDENCIAS=<carpeta>.
  testIgnore: process.env.EVIDENCIAS ? [] : ['**/evidencias.spec.js'],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { VITE_USE_FIREBASE_EMULATORS: 'true', RAWG_API_KEY: '' },
  },
})

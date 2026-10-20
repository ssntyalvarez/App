import { defineConfig } from 'vitest/config'

// Configuración separada de vite.config.js para no cargar plugins de la app en las pruebas.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
    // Evita que @firebase/rules-unit-testing cargue una copia distinta de firebase (CJS vs ESM).
    server: { deps: { inline: ['@firebase/rules-unit-testing'] } },
  },
})

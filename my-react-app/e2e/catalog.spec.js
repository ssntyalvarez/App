import { expect, test } from '@playwright/test'
import { mockRawg } from './rawg-fixture.js'

test.describe('catálogo (RAWG simulado con juegos ficticios)', () => {
  test('búsqueda con demora: una sola consulta al terminar de escribir', async ({ page }) => {
    const searches = []
    await mockRawg(page, { onRequest: (p) => p.get('resource') === 'games' && searches.push(p.get('search')) })
    await page.goto('/juegos')
    await expect(page.locator('.game-card')).toHaveCount(20)
    await expect(page.getByText('26 juegos')).toBeVisible()
    searches.length = 0
    await page.getByLabel('Buscar por nombre').pressSequentially('Bravo', { delay: 60 })
    await expect(page).toHaveURL(/q=Bravo/)
    await expect(page.locator('.game-card')).toHaveCount(2)
    expect(searches.filter(Boolean)).toEqual(['Bravo'])
  })

  test('filtros por género, plataforma y año, orden y limpiar', async ({ page }) => {
    await mockRawg(page)
    await page.goto('/juegos')
    await page.getByLabel('Género').selectOption('puzzle')
    await expect(page).toHaveURL(/genero=puzzle/)
    await expect(page.getByText(/^\d+ juegos?$/)).toHaveText('8 juegos')
    await page.getByLabel('Plataforma').selectOption({ label: 'Nintendo' })
    await expect(page).toHaveURL(/plataforma=7/)
    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(page).toHaveURL(/\/juegos$/)
    await page.getByLabel('Año').selectOption('2016')
    await expect(page).toHaveURL(/anio=2016/)
    await expect(page.locator('.game-card')).toHaveCount(3)
    await page.getByLabel('Ordenar por').selectOption('-metacritic')
    await expect(page.getByText('solo juegos con nota de Metacritic')).toBeVisible()
    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(page).toHaveURL(/\/juegos$/)
    await expect(page.locator('.game-card')).toHaveCount(20)
  })

  test('cargar más y estados sin imagen / sin puntuación', async ({ page }) => {
    await mockRawg(page)
    await page.goto('/juegos')
    await page.getByRole('button', { name: 'Cargar más' }).click()
    await expect(page.locator('.game-card')).toHaveCount(26)
    await expect(page.getByRole('button', { name: 'Cargar más' })).toHaveCount(0)
    await expect(page.getByText('Sin imagen disponible').first()).toBeVisible()
    await expect(page.locator('.score--mc.is-empty').first()).toBeVisible()
  })

  test('sin resultados muestra estado vacío', async ({ page }) => {
    await mockRawg(page)
    await page.goto('/juegos?q=zzzz')
    await expect(page.getByText('No encontramos juegos con esos criterios')).toBeVisible()
  })

  test('navegación: tarjeta → ficha → género', async ({ page }) => {
    await mockRawg(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Juego de prueba')
    await page.getByRole('link', { name: 'Catálogo' }).first().click()
    await expect(page).toHaveURL(/\/juegos$/)
    await expect(page.getByRole('heading', { name: 'Explorá juegos' })).toBeVisible()
    await page.locator('.game-card').first().click()
    await expect(page).toHaveURL(/\/juego\/900001\/juego-de-prueba-1/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Juego de prueba Alfa 1')
    await expect(page.getByText('Escala 0–100')).toBeVisible()
    await expect(page.getByText('Todavía no hay opiniones')).toBeVisible()
    await page.locator('.gallery__thumb').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('sin clave de RAWG se muestra “pendiente de conexión”', async ({ page }) => {
    await page.goto('/juegos')
    await expect(page.getByText('Catálogo pendiente de conexión')).toBeVisible()
  })

  test('@mobile catálogo y menú en pantalla chica', async ({ page }) => {
    await mockRawg(page)
    await page.goto('/juegos')
    await expect(page.locator('.game-card').first()).toBeVisible()
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio' }).click()
    await expect(page).toHaveURL('/')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

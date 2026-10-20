import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { register } from './helpers.js'
import { mockRawg } from './rawg-fixture.js'

// Auditoría automática (WCAG 2 A/AA, incluye contraste) de las pantallas principales.
async function audit(page, label) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  const summary = violations.map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`)
  expect(summary, summary.join('\n')).toEqual([])
}

test('accesibilidad: inicio, catálogo, ficha, ingreso, registro y perfil', async ({ page }) => {
  test.setTimeout(120_000)
  await mockRawg(page)
  await page.goto('/')
  await expect(page.locator('.game-card').first()).toBeVisible()
  await expect(page.locator('.score--community .score__label').first()).not.toContainText('Cargando')
  await audit(page, 'inicio')

  await page.goto('/juegos')
  await expect(page.locator('.game-card').first()).toBeVisible()
  await audit(page, 'catálogo')

  await page.goto('/ingresar')
  await audit(page, 'ingreso')
  await page.goto('/registro')
  await audit(page, 'registro')

  const user = await register(page)
  await page.goto('/juego/900001/juego-de-prueba-1')
  await expect(page.locator('.review-form')).toBeVisible()
  await audit(page, 'ficha')

  await page.goto(`/u/${user.handle}`)
  await expect(page.getByText('La biblioteca está vacía')).toBeVisible()
  await audit(page, 'perfil')
})

// Capturas para la bitácora. Solo se ejecuta con EVIDENCIAS=<carpeta>.
// Usa juegos FICTICIOS (doble de prueba de RAWG) y cuentas creadas en el emulador.
import { expect, test } from '@playwright/test'
import { register } from './helpers.js'
import { mockRawg } from './rawg-fixture.js'

const dir = process.env.EVIDENCIAS
test.skip(!dir, 'Definí EVIDENCIAS=carpeta para generar capturas')

const shot = (page, name) => page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true })

test('@capturas pantallas principales', async ({ page }) => {
  await mockRawg(page)
  await page.goto('/')
  await expect(page.locator('.game-card').first()).toBeVisible()
  await page.waitForTimeout(600)
  await shot(page, '01-inicio')

  await page.goto('/juegos?genero=action')
  await expect(page.locator('.game-card').first()).toBeVisible()
  await page.waitForTimeout(600)
  await shot(page, '02-catalogo')

  await page.goto('/registro')
  await shot(page, '03-registro')

  const user = await register(page, { name: 'Valentina Ríos' })
  await page.goto('/juego/900006/juego-de-prueba-6')
  await page.locator('.score-picker__option', { hasText: /^8$/ }).click()
  await page.getByLabel('Comentario').fill('Gran ritmo y un mundo que invita a explorar. El tramo final se hace largo, pero vale la pena.')
  await page.getByRole('button', { name: 'Publicar opinión' }).click()
  await expect(page.locator('.review-own')).toBeVisible()
  await page.waitForTimeout(600)
  await shot(page, '04-ficha')

  await page.goto(`/u/${user.handle}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForTimeout(600)
  await shot(page, '05-perfil')
})

// Capturas para la bitácora. Solo se ejecuta con EVIDENCIAS=<carpeta>.
// Usa juegos FICTICIOS (doble de prueba de RAWG) y cuentas creadas en el emulador.
import { expect, test } from '@playwright/test'
import { register, writeReview } from './helpers.js'
import { mockRawg } from './rawg-fixture.js'

const dir = process.env.EVIDENCIAS
test.skip(!dir, 'Definí EVIDENCIAS=carpeta para generar capturas')

async function shot(page, name) {
  // Recorre la página para que carguen las imágenes diferidas (loading="lazy").
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true })
}
const settle = (page) => page.waitForTimeout(700)

async function review(page, n, score, text, hours = 20) {
  await page.goto(`/juego/${900000 + n}/juego-de-prueba-${n}`)
  await writeReview(page, { score, hours, text: text ?? 'Una experiencia que vale la pena jugar.' })
  await expect(page.locator('.review-own')).toBeVisible()
}

async function library(page, n, { feature } = {}) {
  await page.goto(`/juego/${900000 + n}/juego-de-prueba-${n}`)
  const panel = page.locator('.library-panel')
  await panel.getByRole('button', { name: 'Agregar a mi biblioteca' }).click()
  await expect(panel.getByText('Está en tu biblioteca')).toBeVisible()
  if (feature) {
    await panel.getByRole('button', { name: 'Destacar en perfil' }).click()
    await expect(panel.getByRole('button', { name: 'Destacar en perfil' })).toHaveAttribute('aria-pressed', 'true')
  }
}

test('@capturas pantallas principales', async ({ page }) => {
  test.setTimeout(180_000)
  await mockRawg(page)
  await page.goto('/')
  await expect(page.locator('.game-card').first()).toBeVisible()
  await settle(page)
  await shot(page, '01-inicio')

  await page.goto('/juegos?genero=action')
  await expect(page.locator('.game-card').first()).toBeVisible()
  await settle(page)
  await shot(page, '02-catalogo')

  await page.goto('/registro')
  await shot(page, '03-registro')

  const user = await register(page, { name: 'Valentina Ríos' })
  await review(page, 6, 8, 'Gran ritmo y un mundo que invita a explorar. El tramo final se hace largo, pero vale la pena.')
  await library(page, 6, { feature: true })
  await page.reload()
  await expect(page.locator('.review-own')).toBeVisible()
  await settle(page)
  await shot(page, '04-ficha')

  await review(page, 1, 10, 'Una obra maestra del género.')
  await library(page, 1, { feature: true })
  await library(page, 8, { feature: true })
  await library(page, 2)
  await library(page, 3)
  await review(page, 3, 0, 'No me enganchó para nada.', 2)

  await page.goto('/configuracion')
  await page.getByLabel('Biografía corta').fill('Exploradora de mundos abiertos. Completo todo al 100 % (casi).')
  await settle(page)
  await shot(page, '05-editar-perfil')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Perfil actualizado.')).toBeVisible()

  await page.goto(`/u/${user.handle}`)
  await expect(page.locator('.lib-card').first()).toBeVisible()
  await settle(page)
  await shot(page, '06-perfil')
})

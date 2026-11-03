import { expect, test } from '@playwright/test'
import { login, logout, register, writeReview } from './helpers.js'
import { mockRawg } from './rawg-fixture.js'

test.describe('social: seguir, amigos, chat, privacidad y niveles', () => {
  test('seguirse mutuamente = amigos, chat en tiempo real y “solo amigos”', async ({ page, browser }) => {
    await mockRawg(page)
    // Tres cuentas: ana, beto y caro.
    const ana = await register(page, { name: 'Ana Social' })
    await logout(page)
    const beto = await register(page, { name: 'Beto Social' })
    await logout(page)
    const caro = await register(page, { name: 'Caro Social' })

    // Caro solo acepta mensajes de amigos.
    await page.goto('/configuracion?seccion=privacidad')
    await expect(page.getByText('Todas las cuentas de Checkpoint son públicas')).toBeVisible()
    await page.getByLabel('Solo amigos').check()
    await page.getByRole('button', { name: 'Guardar privacidad' }).click()
    await expect(page.getByText('Privacidad actualizada.')).toBeVisible()
    // Caro sigue a Ana.
    await page.goto(`/u/${ana.handle}`)
    await page.getByRole('button', { name: 'Seguir', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Siguiendo' })).toBeVisible()
    await logout(page)

    // Beto sigue a Ana y le escribe.
    await login(page, beto)
    await page.goto(`/u/${ana.handle}`)
    await page.getByRole('button', { name: 'Seguir', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Siguiendo' })).toBeVisible()
    await page.getByRole('button', { name: 'Mensaje' }).click()
    await expect(page).toHaveURL(new RegExp(`/mensajes/${ana.handle}$`))
    await page.getByLabel('Mensaje').fill('¡Hola Ana! ¿Jugaste el último Zelda?')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.locator('.msg--mine')).toContainText('¡Hola Ana!')

    // Beto no puede escribirle a Caro (solo amigos).
    await page.goto(`/u/${caro.handle}`)
    await page.getByRole('button', { name: 'Mensaje' }).click()
    await expect(page.getByText('no recibe mensajes de personas que no son sus amigos')).toBeVisible()
    await logout(page)

    // Ana ve el mensaje en tiempo real y responde; al seguir a Beto pasan a ser amigos.
    await login(page, ana)
    await page.goto('/mensajes')
    await page.locator('.chat-item', { hasText: 'Beto Social' }).click()
    await expect(page.locator('.msg').first()).toContainText('¡Hola Ana!')
    const betoCtx = await browser.newContext({ baseURL: test.info().project.use.baseURL })
    const betoPage = await betoCtx.newPage()
    await mockRawg(betoPage)
    await login(betoPage, beto)
    await betoPage.goto(`/mensajes/${ana.handle}`)
    await page.getByLabel('Mensaje').fill('¡Sí! Me encantó.')
    await page.keyboard.press('Enter')
    await expect(betoPage.locator('.msg').last()).toContainText('¡Sí! Me encantó.')
    await betoCtx.close()

    await page.goto(`/u/${beto.handle}`)
    await page.getByRole('button', { name: 'Seguir también' }).click()
    await expect(page.getByRole('button', { name: 'Amigos' })).toBeVisible()
    await page.goto(`/u/${ana.handle}?tab=amigos`)
    await expect(page.locator('.people').first()).toContainText('Beto Social')
    await page.getByRole('button', { name: /^Seguidores/ }).click()
    await expect(page.locator('.people').first()).toContainText('Caro Social')
    // El engranaje lleva a configuración.
    await page.getByRole('link', { name: 'Configuración' }).first().click()
    await expect(page).toHaveURL(/\/configuracion$/)
  })

  test('nivel y XP según los juegos opinados', async ({ page }) => {
    await mockRawg(page)
    const user = await register(page, { name: 'Nivel Prueba' })
    await page.goto(`/u/${user.handle}`)
    await expect(page.locator('.level')).toContainText('Nivel 1')
    await expect(page.locator('.level')).toContainText('Novato')
    await expect(page.locator('.level')).toHaveClass(/level--novato/)
    for (const n of [1, 2, 3]) {
      await page.goto(`/juego/${900000 + n}/juego-de-prueba-${n}`)
      await writeReview(page, { score: 8 })
      await expect(page.locator('.review-own')).toBeVisible()
    }
    await page.goto(`/u/${user.handle}`)
    // 300 XP → nivel 3, Aprendiz.
    await expect(page.locator('.level')).toContainText('Nivel 3')
    await expect(page.locator('.level')).toContainText('Aprendiz')
    await expect(page.locator('.level')).toHaveClass(/level--aprendiz/)
    await expect(page.locator('.level')).toContainText('300 XP')
  })
})

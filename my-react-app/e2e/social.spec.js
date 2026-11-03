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
    await expect(page.getByRole('button', { name: 'Siguiendo', exact: true })).toBeVisible()
    await logout(page)

    // Beto sigue a Ana y le escribe.
    await login(page, beto)
    await page.goto(`/u/${ana.handle}`)
    await page.getByRole('button', { name: 'Seguir', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Siguiendo', exact: true })).toBeVisible()
    // “Mensaje” abre el chat como ventana flotante, sin salir del perfil.
    await page.getByRole('button', { name: 'Mensaje' }).click()
    const win = page.locator('.chat-window')
    await expect(win).toContainText('Ana Social')
    await expect(page).toHaveURL(new RegExp(`/u/${ana.handle}$`))
    await win.getByLabel('Mensaje').fill('¡Hola Ana! ¿Jugaste el último Zelda?')
    await win.getByRole('button', { name: 'Enviar' }).click()
    await expect(win.locator('.msg--mine')).toContainText('¡Hola Ana!')
    await win.getByRole('button', { name: /Cerrar chat/ }).click()
    await expect(win).toHaveCount(0)

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
    await expect(page.getByRole('button', { name: 'Amigos', exact: true })).toBeVisible()
    // Seguidores y seguidos debajo del nombre: cada uno abre su lista en una ventana.
    await page.goto(`/u/${ana.handle}`)
    const meta = page.locator('.profile-hero__meta')
    await expect(meta).toContainText('2 seguidores')
    await expect(meta).toContainText('1 seguido')
    await expect(page.getByRole('tab', { name: /Amigos/ })).toHaveCount(0)
    await meta.getByRole('button', { name: /seguidores/ }).click()
    const dlg = page.getByRole('dialog')
    await expect(dlg.locator('.people')).toContainText('Caro Social')
    await expect(dlg.locator('.people')).toContainText('Beto Social')
    await dlg.getByRole('button', { name: /^Seguidos/ }).click()
    await expect(dlg.locator('.people')).toContainText('Beto Social')
    await expect(dlg.locator('.people')).not.toContainText('Caro Social')
    await page.keyboard.press('Escape')
    await expect(dlg).toBeHidden()

    // Panel Social: amigos con acceso al chat y al perfil, y búsqueda en toda la comunidad.
    await page.getByRole('button', { name: 'Social' }).click()
    const drawer = page.locator('#social-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.locator('.drawer-friend')).toHaveCount(1)
    await expect(drawer).toContainText('Beto Social')
    await drawer.getByRole('button', { name: 'Chatear con Beto Social' }).click()
    await expect(drawer).toBeHidden()
    await expect(page.locator('.chat-window')).toContainText('¡Sí! Me encantó.')
    await page.locator('.chat-window').getByRole('button', { name: /Cerrar chat/ }).click()
    await page.getByRole('button', { name: 'Social' }).click()
    await drawer.getByLabel('Buscar personas').fill('Caro')
    await expect(drawer.locator('.drawer-friend')).toHaveCount(0)
    await drawer.getByRole('button', { name: 'Buscar' }).click()
    await expect(page).toHaveURL(/\/personas\?q=Caro$/)
    await expect(page.locator('.people')).toContainText('Caro Social')
    await page.getByLabel('Buscar personas').fill(caro.handle.slice(0, 6))
    await page.getByRole('button', { name: 'Buscar' }).click()
    await expect(page.locator('.people')).toContainText('Caro Social')

    // El engranaje lleva a configuración.
    await page.goto(`/u/${ana.handle}`)
    await page.getByRole('link', { name: 'Editar perfil' }).click()
    await expect(page).toHaveURL(/\/configuracion$/)
    await page.goto(`/u/${ana.handle}`)
    await page.getByRole('link', { name: 'Configuración de la cuenta' }).click()
    await expect(page).toHaveURL(/\/configuracion\?seccion=cuenta$/)
  })

  test('nivel y XP según los juegos opinados', async ({ page }) => {
    await mockRawg(page)
    const user = await register(page, { name: 'Nivel Prueba' })
    await page.goto(`/u/${user.handle}`)
    const mark = page.locator('.level-mark')
    await expect(mark.locator('.level-mark__num')).toHaveText('1')
    await expect(mark).toHaveClass(/band--gris/)
    // El detalle aparece solo al pasar el mouse.
    await expect(mark.getByRole('tooltip')).toHaveCSS('opacity', '0')
    await mark.hover()
    await expect(mark.getByRole('tooltip')).toHaveCSS('opacity', '1')
    await expect(mark.getByRole('tooltip')).toContainText('Nivel 1 · Novato')
    for (const n of [1, 2, 3]) {
      await page.goto(`/juego/${900000 + n}/juego-de-prueba-${n}`)
      await writeReview(page, { score: 8 })
      await expect(page.locator('.review-own')).toBeVisible()
    }
    await page.goto(`/u/${user.handle}`)
    // 300 XP → nivel 3, Aprendiz.
    await expect(mark.locator('.level-mark__num')).toHaveText('3')
    await expect(mark).toHaveClass(/band--rojo/)
    await expect(mark.getByRole('tooltip')).toContainText('Aprendiz')
    await expect(mark.getByRole('tooltip')).toContainText('300 / 600 XP')
    // También se ve en el menú de la cuenta.
    await page.locator('.account__trigger').click()
    await expect(page.locator('.level-summary')).toContainText('Nivel 3')
  })
})

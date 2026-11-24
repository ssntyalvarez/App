import { expect, test } from '@playwright/test'
import { login, logout, register, writeReview } from './helpers.js'
import { mockRawg } from './rawg-fixture.js'

// Un juego que no usa ninguna otra prueba: las reseñas del emulador se comparten entre archivos.
const GAME = '/juego/900019/juego-de-prueba-19'

// Mejoras posteriores a la entrega: “Me sirvió”, actividad de quienes seguís y mensajes sin leer.
test.describe('mejoras para el final', () => {
  test('“Me sirvió” en las reseñas y actividad de quienes seguís', async ({ page }) => {
    test.setTimeout(120_000)
    await mockRawg(page)
    const caro = await register(page, { name: 'Caro Útil' })
    await page.goto(GAME)
    await writeReview(page, { score: 9, text: 'Reseña de Caro: la mejor historia que jugué.' })
    await expect(page.locator('.review-own')).toBeVisible()
    await logout(page)
    const ana = await register(page, { name: 'Ana Útil' })
    await page.goto(GAME)
    await writeReview(page, { score: 6, text: 'Reseña de Ana: entretenido pero corto.' })
    await expect(page.locator('.review-own')).toBeVisible()
    await logout(page)

    // Sin sesión, el botón lleva a ingresar.
    await page.goto(GAME)
    await expect(page.locator('.review').first().getByRole('link', { name: 'Me sirvió' })).toHaveAttribute('href', '/ingresar')

    await register(page, { name: 'Beto Útil' })
    // Sin seguir a nadie, el inicio no muestra la sección de actividad.
    await page.goto('/')
    await expect(page.locator('.game-card').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Actividad de quienes seguís' })).toHaveCount(0)

    // Sin votos, primero la más reciente (Ana). Beto marca la de Caro y pasa al primer lugar.
    await page.goto(GAME)
    const reviews = page.locator('.reviews__list .review')
    await expect(reviews).toHaveCount(2)
    await expect(reviews.first()).toContainText('Reseña de Ana')
    const caroReview = reviews.filter({ hasText: 'Reseña de Caro' })
    await caroReview.getByRole('button', { name: 'Me sirvió' }).click()
    await expect(caroReview.getByRole('button', { name: 'Me sirvió' })).toHaveAttribute('aria-pressed', 'true')
    await expect(caroReview).toContainText('A 1 persona le sirvió')
    await expect(reviews.first()).toContainText('Reseña de Caro')
    await page.getByRole('button', { name: 'Más recientes' }).click()
    await expect(reviews.first()).toContainText('Reseña de Ana')

    // El voto queda guardado: sigue al recargar. Se puede quitar y volver a poner.
    await page.reload()
    await expect(caroReview.getByRole('button', { name: 'Me sirvió' })).toHaveAttribute('aria-pressed', 'true')
    await expect(reviews.first()).toContainText('Reseña de Caro')
    await caroReview.getByRole('button', { name: 'Me sirvió' }).click()
    await expect(caroReview.getByRole('button', { name: 'Me sirvió' })).toHaveAttribute('aria-pressed', 'false')
    await expect(caroReview).not.toContainText('le sirvió')
    await caroReview.getByRole('button', { name: 'Me sirvió' }).click()
    await expect(caroReview).toContainText('A 1 persona le sirvió')

    // Beto sigue a Ana: su reseña aparece en el inicio, y la de Caro (a quien no sigue) no.
    await page.goto(`/u/${ana.handle}`)
    await page.getByRole('button', { name: 'Seguir', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Siguiendo', exact: true })).toBeVisible()
    await page.goto('/')
    const activity = page.locator('section', { has: page.getByRole('heading', { name: 'Actividad de quienes seguís' }) })
    await expect(activity).toContainText('Reseña de Ana')
    await expect(activity).not.toContainText('Reseña de Caro')
    await logout(page)

    // Caro ve en su propia reseña a cuántas personas les sirvió, sin botón para votarse.
    await login(page, caro)
    await page.goto(GAME)
    await expect(page.locator('.review-own')).toContainText('A 1 persona le sirvió')
    await expect(page.locator('.review-own').getByRole('button', { name: 'Me sirvió' })).toHaveCount(0)
  })

  test('mensajes sin leer: aviso en Social, en Mensajes y lectura guardada', async ({ page, browser }) => {
    await mockRawg(page)
    const ana = await register(page, { name: 'Ana Leída' })
    await logout(page)
    await register(page, { name: 'Beto Leído' })
    // Beto le escribe a Ana mientras ella no está conectada.
    await page.goto(`/u/${ana.handle}`)
    await page.getByRole('button', { name: 'Mensaje' }).click()
    const win = page.locator('.chat-window')
    await win.getByLabel('Mensaje').fill('¿Jugamos hoy?')
    await win.getByLabel('Mensaje').press('Enter')
    await expect(win.locator('.msg--mine')).toContainText('¿Jugamos hoy?')
    // A quien envía no le figura nada sin leer.
    await expect(page.locator('.social-toggle .unread-badge')).toHaveCount(0)

    const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL })
    const anaPage = await ctx.newPage()
    await mockRawg(anaPage)
    await login(anaPage, ana)
    // Ana entra: el botón Social avisa que hay una conversación sin leer.
    const badge = anaPage.locator('.social-toggle .unread-badge')
    await expect(badge).toContainText('1')
    await anaPage.getByRole('button', { name: /Social/ }).click()
    const drawer = anaPage.locator('#social-drawer')
    await expect(drawer.locator('.drawer__messages')).toContainText('1 sin leer')
    await drawer.locator('.drawer__messages').click()
    await expect(anaPage).toHaveURL(/\/mensajes$/)
    const item = anaPage.locator('.chat-item', { hasText: 'Beto Leído' })
    await expect(item).toHaveClass(/is-unread/)
    // Al abrir la conversación queda leída, y sigue leída al recargar.
    await item.click()
    await expect(anaPage.locator('.msg').last()).toContainText('¿Jugamos hoy?')
    await expect(badge).toHaveCount(0)
    await expect(item).not.toHaveClass(/is-unread/)
    await anaPage.reload()
    await expect(anaPage.locator('.msg').last()).toContainText('¿Jugamos hoy?')
    await expect(badge).toHaveCount(0)

    // Con la conversación abierta, un mensaje nuevo no queda como no leído.
    await win.getByLabel('Mensaje').fill('Dale, a las 9.')
    await win.getByLabel('Mensaje').press('Enter')
    await expect(anaPage.locator('.msg').last()).toContainText('Dale, a las 9.')
    await expect(badge).toHaveCount(0)
    await ctx.close()
  })
})

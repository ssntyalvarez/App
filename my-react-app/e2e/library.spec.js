import { expect, test } from '@playwright/test'
import { logout, register } from './helpers.js'
import { mockRawg } from './rawg-fixture.js'

const game = (n) => `/juego/${900000 + n}/juego-de-prueba-${n}`

async function addToLibrary(page, n, status = 'Quiero jugar') {
  await page.goto(game(n))
  const panel = page.locator('.library-panel')
  await panel.getByLabel('Agregar como').selectOption({ label: status })
  await panel.getByRole('button', { name: 'Agregar a mi biblioteca' }).click()
  await expect(page.getByText(`Agregado a tu biblioteca como “${status}”.`)).toBeVisible()
  return panel
}

test.describe('biblioteca personal y perfil', () => {
  test('estados, fecha, favoritos, destacados y nota personal sincronizada', async ({ page }) => {
    await mockRawg(page)
    const user = await register(page, { name: 'Lucía Biblioteca' })

    // Completado con fecha: no crea puntuación.
    const panel = await addToLibrary(page, 1, 'Jugando')
    await panel.getByRole('radio', { name: 'Completado' }).click()
    await expect(panel.getByRole('radio', { name: 'Completado' })).toBeChecked()
    await expect(page.getByText('Biblioteca actualizada.').first()).toBeVisible()
    await panel.getByLabel('Fecha de finalización').fill('2026-03-14')
    await expect(page.getByText('Biblioteca actualizada.').first()).toBeVisible()
    await panel.getByRole('button', { name: 'Favorito' }).click()
    await expect(page.getByText('Marcado como favorito.')).toBeVisible()
    await panel.getByRole('button', { name: 'Destacar en perfil' }).click()
    await expect(page.getByText('Destacado en tu perfil.')).toBeVisible()
    await expect(page.locator('.score-panel').getByText('Sin puntuar')).toBeVisible()

    await addToLibrary(page, 2, 'Quiero jugar')
    await addToLibrary(page, 3, 'Abandonado')

    await page.goto(`/u/${user.handle}`)
    const stats = page.locator('.stats')
    await expect(stats.locator('div', { hasText: 'Completados' }).locator('dd')).toHaveText('1')
    await expect(stats.locator('div', { hasText: 'Reseñas' }).locator('dd')).toHaveText('0')
    await expect(stats.locator('div', { hasText: 'En biblioteca' }).locator('dd')).toHaveText('3')
    await expect(page.locator('.poster')).toHaveCount(1)
    await expect(page.locator('.poster')).toContainText('Sin puntuar')
    await expect(page.locator('.lib-card')).toHaveCount(3)
    await expect(page.locator('.lib-card').first()).toBeVisible()
    await expect(page.getByText('Completado el 14 de mar de 2026')).toBeVisible()
    await expect(page.locator('.lib-card .score--personal.is-empty')).toHaveCount(3)

    // Filtros por estado.
    await page.getByRole('button', { name: /^Abandonado/ }).click()
    await expect(page.locator('.lib-card')).toHaveCount(1)
    await page.getByRole('button', { name: /^Favoritos/ }).click()
    await expect(page.locator('.lib-card')).toHaveCount(1)
    await page.getByRole('button', { name: /^Todos/ }).click()

    // Puntuar en la ficha → aparece igual en el perfil (fuente única: la reseña).
    await page.goto(game(1))
    await page.locator('.score-picker__option', { hasText: /^7$/ }).click()
    await page.getByRole('button', { name: 'Publicar opinión' }).click()
    await expect(page.getByText('¡Opinión publicada!')).toBeVisible()
    await page.goto(`/u/${user.handle}`)
    await expect(page.locator('.poster')).toContainText('7/10')
    await expect(stats.locator('div', { hasText: 'Promedio' }).locator('dd')).toContainText('7,0')
    await expect(page.locator('.lib-card', { hasText: 'Alfa 1' }).locator('.score--personal')).toContainText('7')
    await page.locator('.lib-card', { hasText: 'Alfa 1' }).getByRole('link', { name: 'Tu reseña' }).click()
    await expect(page).toHaveURL(/#resena-/)

    // Editar la nota desde la ficha actualiza el perfil.
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.locator('.score-picker__option', { hasText: /^4$/ }).click()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Tu opinión se actualizó.')).toBeVisible()
    await page.goto(`/u/${user.handle}?tab=resenas`)
    await expect(page.locator('.profile-review')).toContainText('4')

    // Quitar de la biblioteca lo saca de destacados; la reseña sigue existiendo.
    await page.goto(`/u/${user.handle}`)
    const card = page.locator('.lib-card', { hasText: 'Alfa 1' })
    await card.getByRole('button', { name: 'Gestionar' }).click()
    await card.getByRole('button', { name: 'Quitar de la biblioteca' }).click()
    await card.getByRole('button', { name: 'Sí, quitar' }).click()
    await expect(page.getByText('Se quitó de tu biblioteca.')).toBeVisible()
    await expect(page.locator('.lib-card')).toHaveCount(2)
    await expect(page.locator('.poster')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.lib-card')).toHaveCount(2)
    await expect(stats.locator('div', { hasText: 'Reseñas' }).locator('dd')).toHaveText('1')
  })

  test('máximo de 4 destacados', async ({ page }) => {
    await mockRawg(page)
    await register(page)
    for (const n of [1, 2, 3, 4, 6]) {
      const panel = await addToLibrary(page, n)
      await panel.getByRole('button', { name: 'Favorito' }).click()
      await expect(page.getByText('Marcado como favorito.')).toBeVisible()
      await panel.getByRole('button', { name: 'Destacar en perfil' }).click()
      if (n === 6) {
        await expect(page.getByText('Podés destacar hasta 4 juegos.')).toBeVisible()
      } else {
        await expect(page.getByText('Destacado en tu perfil.').first()).toBeVisible()
      }
    }
  })

  test('perfil personalizable, URL pública y visitante sin controles', async ({ page, context }) => {
    await mockRawg(page)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const owner = await register(page, { name: 'Martina Perfil' })
    await addToLibrary(page, 8, 'Jugando')

    await page.goto('/ajustes/perfil')
    await expect(page.getByText(/Tu correo \(.*\) es privado/)).toBeVisible()
    await page.getByLabel('Nombre visible').fill('Martina R.')
    await page.getByLabel('Biografía corta').fill('Jugadora de RPG y plataformas.')
    // Avatar: imagen PNG generada en la prueba.
    const png = Buffer.from(
      await page.evaluate(() => {
        const c = document.createElement('canvas')
        c.width = 300
        c.height = 200
        const ctx = c.getContext('2d')
        ctx.fillStyle = '#c8f04a'
        ctx.fillRect(0, 0, 300, 200)
        ctx.fillStyle = '#121314'
        ctx.fillRect(100, 50, 100, 100)
        return c.toDataURL('image/png').split(',')[1]
      }),
      'base64',
    )
    await page.locator('#pe-avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png })
    await expect(page.locator('.avatar-edit img.avatar')).toBeVisible()
    await page.locator('.cover-option').first().click()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Perfil actualizado.')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/u/${owner.handle}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Martina R.')
    await expect(page.getByText('Jugadora de RPG y plataformas.')).toBeVisible()
    await expect(page.locator('.profile-hero__cover')).not.toHaveClass(/is-default/)
    await page.getByRole('button', { name: 'Compartir perfil' }).click()
    await expect(page.getByText('Enlace del perfil copiado.')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/u/${owner.handle}`)
    // El correo no aparece en el perfil público.
    await expect(page.locator('main')).not.toContainText(owner.email)

    await logout(page)
    await register(page, { name: 'Visitante' })
    await page.goto(`/u/${owner.handle}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Martina R.')
    await expect(page.locator('.lib-card')).toHaveCount(1)
    await expect(page.locator('.lib-card')).toContainText('Su nota')
    await expect(page.getByRole('button', { name: 'Gestionar' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Editar perfil' })).toHaveCount(0)
  })

  test('@mobile perfil en celular sin desbordes', async ({ page }) => {
    await mockRawg(page)
    const user = await register(page, { name: 'Nombre Bastante Largo Para Probar' })
    await addToLibrary(page, 2, 'Jugando')
    await page.goto(`/u/${user.handle}`)
    await expect(page.locator('.lib-card')).toHaveCount(1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

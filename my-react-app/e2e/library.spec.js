import { expect, test } from '@playwright/test'
import { logout, register, writeReview } from './helpers.js'
import { mockRawg } from './rawg-fixture.js'

const game = (n) => `/juego/${900000 + n}/juego-de-prueba-${n}`

async function addToLibrary(page, n) {
  await page.goto(game(n))
  const panel = page.locator('.library-panel')
  await panel.getByRole('button', { name: 'Agregar a mi biblioteca' }).click()
  await expect(panel.getByText('Está en tu biblioteca')).toBeVisible()
  return panel
}

test.describe('biblioteca (juegos favoritos) y perfil', () => {
  test('agregar, destacar, nota y horas sincronizadas con la reseña, quitar', async ({ page }) => {
    await mockRawg(page)
    const user = await register(page, { name: 'Lucía Biblioteca' })

    const panel = await addToLibrary(page, 1)
    await panel.getByRole('button', { name: 'Destacar en perfil' }).click()
    await expect(page.getByText('Destacado en tu perfil.')).toBeVisible()
    // Agregar a la biblioteca no crea una puntuación.
    await expect(page.locator('.score-panel').getByText('Sin puntuar')).toBeVisible()
    await addToLibrary(page, 2)
    await addToLibrary(page, 3)

    await page.goto(`/u/${user.handle}`)
    const stats = page.locator('.stats')
    await expect(stats.locator('div', { hasText: 'En biblioteca' }).locator('dd')).toHaveText('3')
    await expect(stats.locator('div', { hasText: 'Reseñas' }).locator('dd')).toHaveText('0')
    await expect(stats.locator('div', { hasText: 'Horas jugadas' }).locator('dd')).toHaveText('0')
    await expect(page.locator('.poster')).toHaveCount(1)
    await expect(page.locator('.poster')).toContainText('Sin puntuar')
    await expect(page.locator('.lib-card')).toHaveCount(3)
    await expect(page.locator('.lib-card .score--personal.is-empty')).toHaveCount(3)

    // Opinar en la ficha → la nota y las horas aparecen en el perfil (fuente única: la reseña).
    await page.goto(game(1))
    await writeReview(page, { score: 7, hours: 35, text: 'Muy buen juego, lo recomiendo.' })
    await expect(page.getByText('¡Opinión publicada!')).toBeVisible()
    await page.goto(`/u/${user.handle}`)
    await expect(page.locator('.poster')).toContainText('7/10')
    await expect(stats.locator('div', { hasText: 'Promedio' }).locator('dd')).toContainText('7,0')
    await expect(stats.locator('div', { hasText: 'Horas jugadas' }).locator('dd')).toHaveText('35')
    const card = page.locator('.lib-card', { hasText: 'Alfa 1' })
    await expect(card.locator('.score--personal')).toContainText('7')
    await expect(card).toContainText('35 h jugadas')

    // Quitar de la biblioteca lo saca de destacados; la reseña sigue existiendo.
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
      await panel.getByRole('button', { name: 'Destacar en perfil' }).click()
      if (n === 6) {
        await expect(page.getByText('Podés destacar hasta 4 juegos. Quitá uno primero.')).toBeVisible()
      } else {
        await expect(page.getByText('Destacado en tu perfil.').first()).toBeVisible()
      }
    }
  })

  test('editar perfil: foto con hover, favoritos desde el buscador, alias con espera de una semana', async ({ page, context }) => {
    await mockRawg(page)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const owner = await register(page, { name: 'Martina Perfil' })

    // El correo solo aparece en Configuración → Cuenta, marcado como privado.
    await page.goto('/configuracion?seccion=cuenta')
    await expect(page.getByText(owner.email)).toBeVisible()
    await expect(page.getByText('Es privado: solo lo ves vos')).toBeVisible()
    await page.goto('/configuracion')
    await expect(page.getByText('Todo lo de esta sección es público.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Imagen de portada' })).toHaveCount(0)
    await page.getByLabel('Nombre visible').fill('Martina R.')
    await page.getByLabel('Biografía corta').fill('Jugadora de RPG y plataformas.')
    // Foto: se cambia desde el avatar de la vista previa.
    const png = Buffer.from(
      await page.evaluate(() => {
        const c = document.createElement('canvas')
        c.width = 300
        c.height = 200
        const ctx = c.getContext('2d')
        ctx.fillStyle = '#c8f04a'
        ctx.fillRect(0, 0, 300, 200)
        return c.toDataURL('image/png').split(',')[1]
      }),
      'base64',
    )
    await page.locator('.profile-edit__preview .avatar-editable').hover()
    await expect(page.locator('.profile-edit__preview').getByRole('button', { name: 'Cambiar foto' })).toBeVisible()
    await page.getByLabel('Elegir foto de perfil').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png })
    await expect(page.locator('.profile-edit__preview img.avatar')).toBeVisible()

    // Favoritos: buscar y agregar desde Editar perfil.
    await page.getByLabel('Agregar un juego').fill('Bravo')
    const result = page.locator('.fav-results li', { hasText: 'Bravo 2' })
    await result.getByRole('button', { name: 'Agregar' }).click()
    await expect(result).toContainText('En tu biblioteca')
    await expect(page.locator('.fav-item')).toHaveCount(1)
    await page.getByRole('button', { name: /Destacar Juego de prueba Bravo 2/ }).click()
    await expect(page.getByText('Destacado en tu perfil.')).toBeVisible()

    // Cambio de alias: después hay que esperar una semana.
    const newHandle = `${owner.handle}.v2`
    await page.getByLabel('Alias').fill(newHandle)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Perfil actualizado.')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/u/${newHandle.replace('.', '\\.')}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Martina R.')
    await expect(page.getByText('Jugadora de RPG y plataformas.')).toBeVisible()
    await expect(page.locator('.poster')).toContainText('Bravo 2')
    await page.goto('/configuracion')
    await expect(page.getByLabel('Alias')).toBeDisabled()
    await expect(page.getByText(/Vas a poder cambiarlo de nuevo el/)).toBeVisible()

    await page.goto(`/u/${newHandle}`)
    await page.getByRole('button', { name: 'Compartir perfil' }).click()
    await expect(page.getByText('Enlace del perfil copiado.')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/u/${newHandle}`)
    await expect(page.locator('main')).not.toContainText(owner.email)

    await logout(page)
    await register(page, { name: 'Visitante' })
    await page.goto(`/u/${newHandle}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Martina R.')
    await expect(page.locator('.lib-card')).toHaveCount(1)
    await expect(page.locator('.lib-card')).toContainText('Su nota')
    await expect(page.getByRole('button', { name: 'Gestionar' })).toHaveCount(0)
    await expect(page.locator('main').getByRole('link', { name: 'Configuración' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cambiar foto' })).toHaveCount(0)
  })

  test('@mobile perfil en celular sin desbordes', async ({ page }) => {
    await mockRawg(page)
    const user = await register(page, { name: 'Nombre Bastante Largo Para Probar' })
    await addToLibrary(page, 2)
    await page.goto(`/u/${user.handle}`)
    await expect(page.locator('.lib-card')).toHaveCount(1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test('perfil propio: cambiar la foto desde el avatar y nombre sin forzar mayúsculas', async ({ page }) => {
  await mockRawg(page)
  const user = await register(page, { name: 'santy minúsculas' })
  await expect(page).toHaveURL(new RegExp(`/u/${user.handle}$`))
  // El nombre se ve tal cual se escribió (sin text-transform).
  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toHaveText('santy minúsculas')
  expect(await h1.evaluate((el) => getComputedStyle(el).textTransform)).toBe('none')
  const png = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement('canvas')
      c.width = 200
      c.height = 200
      c.getContext('2d').fillRect(0, 0, 200, 200)
      return c.toDataURL('image/png').split(',')[1]
    }),
    'base64',
  )
  await page.locator('.avatar-editable').hover()
  await expect(page.getByRole('button', { name: 'Cambiar foto' })).toBeVisible()
  await page.getByLabel('Elegir foto de perfil').setInputFiles({ name: 'yo.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByText('Foto de perfil actualizada.')).toBeVisible()
  await expect(page.locator('.avatar-editable img.avatar')).toBeVisible()
  await page.reload()
  await expect(page.locator('.avatar-editable img.avatar')).toBeVisible()
})

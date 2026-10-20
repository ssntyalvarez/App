import { expect, test } from '@playwright/test'
import { login, logout, register } from './helpers.js'
import { mockRawg } from './rawg-fixture.js'

const GAME = '/juego/900003/juego-de-prueba-3'

test.describe('opiniones con Firebase (emuladores)', () => {
  test('crear (con 0), persistir, editar y eliminar una opinión', async ({ page }) => {
    await mockRawg(page)
    const user = await register(page)

    await page.goto(GAME)
    const panel = page.locator('.score-panel')
    await expect(panel.getByText('Todavía nadie lo puntuó')).toBeVisible()
    await expect(page.getByText('Todavía no hay opiniones')).toBeVisible()

    // Sin elegir puntuación no se publica.
    await page.getByRole('button', { name: 'Publicar opinión' }).click()
    await expect(page.getByText('Elegí una puntuación de 0 a 10.')).toBeVisible()

    await page.locator('.score-picker__option', { hasText: /^0$/ }).click()
    await page.getByLabel('Comentario').fill('No me convenció.')
    await page.getByRole('button', { name: 'Publicar opinión' }).click()
    await expect(page.getByText('¡Opinión publicada!')).toBeVisible()
    await expect(panel.getByText('1 voto de usuarios de Checkpoint')).toBeVisible()
    await expect(page.locator('.review-list')).toContainText('No me convenció.')
    await expect(page.locator('.review-list')).toContainText(user.name)

    // Persistencia al recargar.
    await page.reload()
    await expect(page.locator('.review-own')).toContainText('No me convenció.')
    await expect(page.locator('.score--community .score__value')).toContainText('0,0')

    // Editar.
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.locator('.score-picker__option', { hasText: /^9$/ }).click()
    await page.getByLabel('Comentario').fill('Lo rejugué y cambié de opinión.')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Tu opinión se actualizó.')).toBeVisible()
    await expect(page.locator('.score--community .score__value')).toContainText('9,0')
    await page.reload()
    await expect(page.locator('.review-list')).toContainText('cambié de opinión')
    await expect(page.locator('.review-list')).toContainText('editada')

    // Aparece en el perfil.
    await page.goto(`/u/${user.handle}?tab=resenas`)
    await expect(page.locator('.profile-review')).toContainText('Juego de prueba Charlie 3')

    // Eliminar.
    await page.goto(GAME)
    await page.locator('.review-own').getByRole('button', { name: 'Eliminar' }).click()
    await page.getByRole('button', { name: 'Sí, eliminar' }).click()
    await expect(page.getByText('Eliminaste tu opinión.')).toBeVisible()
    await expect(page.getByText('Todavía no hay opiniones')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Todavía no hay opiniones')).toBeVisible()
  })

  test('dos usuarios: promedio real y sin controles sobre la opinión ajena', async ({ page }) => {
    await mockRawg(page)
    const ana = await register(page, { name: 'Ana Dos' })
    await page.goto(GAME.replace('900003', '900004').replace('-3', '-4'))
    await page.locator('.score-picker__option', { hasText: /^6$/ }).click()
    await page.getByRole('button', { name: 'Publicar opinión' }).click()
    await expect(page.getByText('¡Opinión publicada!')).toBeVisible()
    await logout(page)

    await register(page, { name: 'Beto Tres' })
    await page.goto('/juego/900004/juego-de-prueba-4')
    // La opinión de Ana se ve, pero Beto solo tiene su propio formulario.
    await expect(page.locator('.review-list')).toContainText('Ana Dos')
    await expect(page.locator('.review-own')).toHaveCount(0)
    await page.locator('.score-picker__option', { hasText: /^9$/ }).click()
    await page.getByRole('button', { name: 'Publicar opinión' }).click()
    await expect(page.locator('.score--community .score__value')).toContainText('7,5')
    await expect(page.getByText('2 votos de usuarios de Checkpoint')).toBeVisible()
    // El autor enlaza a su perfil público.
    await page.locator('.review-list').getByRole('link', { name: /Ana Dos/ }).click()
    await expect(page).toHaveURL(new RegExp(`/u/${ana.handle}$`))
    await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(0)
  })

  test('validaciones de registro e ingreso', async ({ page }) => {
    await page.goto('/registro')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Ingresá un nombre visible.')).toBeVisible()
    await expect(page.getByText('Ingresá un correo válido.')).toBeVisible()
    await page.goto('/ingresar')
    await page.getByLabel('Correo electrónico').fill('nadie@example.com')
    await page.getByLabel('Contraseña').fill('incorrecta')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible()
  })

  test('el alias es único', async ({ page }) => {
    const a = await register(page)
    await logout(page)
    await page.goto('/registro')
    await page.getByLabel('Nombre visible').fill('Otra')
    await page.getByLabel('Alias').fill(a.handle)
    await page.getByLabel('Correo electrónico').fill(`otra_${a.handle}@example.com`)
    await page.getByLabel('Contraseña', { exact: true }).fill('secreta123')
    await page.getByLabel('Repetir contraseña').fill('secreta123')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Ese alias ya está en uso.')).toBeVisible()
    // Iniciar sesión de nuevo con la primera cuenta funciona.
    await login(page, a)
  })
})

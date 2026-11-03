import { expect, test } from '@playwright/test'
import { login, logout, register, writeReview } from './helpers.js'
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

    // Sin horas, puntuación ni reseña no se publica (como en Steam).
    await page.getByRole('button', { name: 'Publicar opinión' }).click()
    await expect(page.getByText('Indicá cuántas horas lo jugaste.')).toBeVisible()
    await expect(page.getByText('Elegí una puntuación de 0 a 10.')).toBeVisible()
    await expect(page.getByText('Escribí tu reseña (al menos 10 caracteres).')).toBeVisible()

    await writeReview(page, { score: 0, hours: 3, text: 'No me convenció.' })
    await expect(page.getByText('¡Opinión publicada!')).toBeVisible()
    await expect(panel.getByText('1 voto de usuarios de Checkpoint')).toBeVisible()
    await expect(page.locator('.review-own')).toContainText('No me convenció.')
    await expect(page.locator('.review-own')).toContainText('3 h jugadas')
    // La opinión propia no se repite en la lista de la comunidad.
    await expect(page.getByText('Por ahora, la única opinión es la tuya')).toBeVisible()

    // Persistencia al recargar.
    await page.reload()
    await expect(page.locator('.review-own')).toContainText('No me convenció.')
    await expect(page.locator('.score--community .score__value')).toContainText('0,0')

    // Editar.
    await page.getByRole('button', { name: 'Editar' }).click()
    await writeReview(page, { score: 9, hours: 40, text: 'Lo rejugué y cambié de opinión.' })
    await expect(page.getByText('Tu opinión se actualizó.')).toBeVisible()
    await expect(page.locator('.score--community .score__value')).toContainText('9,0')
    await page.reload()
    await expect(page.locator('.review-own')).toContainText('cambié de opinión')

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
    await writeReview(page, { score: 6 })
    await expect(page.getByText('¡Opinión publicada!')).toBeVisible()
    await logout(page)

    await register(page, { name: 'Beto Tres' })
    await page.goto('/juego/900004/juego-de-prueba-4')
    // La opinión de Ana se ve, pero Beto solo tiene su propio formulario.
    await expect(page.locator('.review-list')).toContainText('Ana Dos')
    await expect(page.locator('.review-own')).toHaveCount(0)
    await writeReview(page, { score: 9 })
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
    // El “ojito” muestra y vuelve a ocultar la contraseña.
    await expect(page.getByLabel('Contraseña')).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click()
    await expect(page.getByLabel('Contraseña')).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click()
    await expect(page.getByLabel('Contraseña')).toHaveAttribute('type', 'password')
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

test('con sesión: “Mi cuenta” arriba a la derecha y opciones de cuenta en el footer', async ({ page }) => {
  const user = await register(page, { name: 'Cuenta Footer' })
  await page.locator('.account__trigger').click()
  const menu = page.locator('.account__menu')
  await expect(page.locator('.account__trigger')).toContainText('Mi cuenta')
  await expect(menu).toContainText('Cuenta Footer')
  for (const name of ['Mi perfil', 'Mensajes', 'Configuración']) {
    await expect(menu.getByRole('link', { name })).toBeVisible()
  }
  await page.keyboard.press('Escape')
  const footer = page.locator('.site-footer')
  await footer.getByRole('link', { name: 'Mi perfil' }).click()
  await expect(page).toHaveURL(new RegExp(`/u/${user.handle}$`))
  await footer.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByText('Cerraste sesión.')).toBeVisible()
  await expect(page.locator('.header-account').getByRole('link', { name: 'Ingresar' })).toBeVisible()
})

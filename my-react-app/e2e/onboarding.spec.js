import { expect, test } from '@playwright/test'
import { register } from './helpers.js'
import { mockRawg } from './rawg-fixture.js'

test.describe('tutorial de primeros pasos', () => {
  test('sin sesión, el inicio propone crear cuenta o ingresar', async ({ page }) => {
    await mockRawg(page)
    await page.goto('/')
    const list = page.locator('.checklist')
    await expect(list).toContainText('Primeros pasos')
    await expect(list).toContainText('0 de 4 tareas completadas')
    await list.getByRole('link', { name: 'Crear cuenta' }).click()
    await expect(page).toHaveURL(/\/registro$/)
  })

  test('pantalla tras pantalla, ir a hacerlo con resaltado, omitir y lista de tareas', async ({ page }) => {
    await mockRawg(page)
    const user = await register(page, { name: 'Tutorial', keepTutorial: true })

    // Primera pantalla: personalizar el perfil.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Personalizá tu perfil')
    await dialog.getByRole('button', { name: 'Ir a hacerlo' }).click()
    await expect(page).toHaveURL(/\/configuracion$/)
    // Se marca dónde tocar.
    await expect(page.locator('.spotlight')).toBeVisible()
    await expect(page.locator('.spotlight-tip')).toContainText('Tocá acá')
    await page.getByLabel('Biografía corta').fill('Fan de los juegos de rol.')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('¡Tarea completada!')).toBeVisible()

    // Siguiente pantalla: favoritos. Se omite este paso y el siguiente.
    await expect(dialog).toContainText('Agregá tus juegos favoritos')
    await dialog.getByRole('button', { name: 'Omitir', exact: true }).click()
    await expect(dialog).toContainText('Opiná sobre un juego')
    await dialog.getByRole('button', { name: 'Omitir', exact: true }).click()
    await expect(dialog).toBeHidden()

    // Las tareas pendientes quedan en el perfil y en el inicio.
    await page.goto(`/u/${user.handle}`)
    const list = page.locator('.checklist')
    await expect(list).toContainText('2 de 4 tareas completadas')
    await page.goto('/')
    await expect(list).toContainText('2 de 4 tareas completadas')
    await expect(page.getByRole('dialog')).toBeHidden()

    // Desde la lista, “Hacerlo” lleva al lugar y lo resalta.
    await expect(list).toContainText('Siguiente: Agregá tus juegos favoritos')
    await list.getByRole('button', { name: 'Hacerlo' }).click()
    await expect(page).toHaveURL(/\/configuracion#favoritos$/)
    await expect(page.locator('.spotlight')).toBeVisible()
    await page.getByLabel('Agregar un juego').fill('Alfa')
    await page.locator('.fav-results li').first().getByRole('button', { name: 'Agregar' }).click()
    await expect(page.getByText('¡Tarea completada!')).toBeVisible()
    await expect(page.locator('.spotlight')).toHaveCount(0)
    await page.goto('/')
    await expect(page.locator('.checklist')).toContainText('3 de 4 tareas completadas')
  })
})

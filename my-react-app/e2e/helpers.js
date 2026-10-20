import { expect } from '@playwright/test'

export const uniq = () => Math.random().toString(36).slice(2, 8)

export async function register(page, { name = 'Ana Prueba', handle, email, password = 'secreta123' } = {}) {
  const id = uniq()
  handle ??= `ana_${id}`
  email ??= `ana_${id}@example.com`
  await page.goto('/registro')
  await page.getByLabel('Nombre visible').fill(name)
  await page.getByLabel('Alias').fill(handle)
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByLabel('Repetir contraseña').fill(password)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL(new RegExp(`/u/${handle}$`))
  return { name, handle, email, password }
}

export async function login(page, { email, password }) {
  await page.goto('/ingresar')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL('/')
}

export async function logout(page) {
  await page.locator('.account__trigger').click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.locator('.site-header').getByRole('link', { name: 'Ingresar' })).toBeVisible()
}

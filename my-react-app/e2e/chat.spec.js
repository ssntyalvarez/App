import { expect, test } from '@playwright/test'
import { login, logout, register } from './helpers.js'
import { mockRawg } from './rawg-fixture.js'

// Casos que fallaban en la versión publicada: mensajes escritos rápido que se perdían,
// error al empezar el chat los dos a la vez y receptor que no se enteraba del mensaje.
test('chat: dos personas a la vez, mensajes seguidos y aviso al receptor', async ({ page, browser }) => {
  await mockRawg(page)
  const ana = await register(page, { name: 'Ana Chat' })
  await logout(page)
  const beto = await register(page, { name: 'Beto Chat' })

  const anaCtx = await browser.newContext({ baseURL: test.info().project.use.baseURL })
  const anaPage = await anaCtx.newPage()
  await mockRawg(anaPage)
  await login(anaPage, ana)

  // Los dos abren la ventana antes de que exista la conversación y escriben a la vez.
  await page.goto(`/u/${ana.handle}`)
  await page.getByRole('button', { name: 'Mensaje' }).click()
  await anaPage.goto(`/u/${beto.handle}`)
  await anaPage.getByRole('button', { name: 'Mensaje' }).click()
  const betoWin = page.locator('.chat-window')
  const anaWin = anaPage.locator('.chat-window')
  await betoWin.getByLabel('Mensaje').fill('hola, soy Beto')
  await anaWin.getByLabel('Mensaje').fill('hola, soy Ana')
  await Promise.all([betoWin.getByLabel('Mensaje').press('Enter'), anaWin.getByLabel('Mensaje').press('Enter')])
  for (const win of [betoWin, anaWin]) {
    await expect(win.locator('.msg')).toHaveCount(2)
  }
  await expect(page.locator('.toast')).toHaveCount(0)
  await expect(anaPage.locator('.toast')).toHaveCount(0)

  // Varios mensajes seguidos sin esperar: llegan todos y en orden; el cuadro se vacía al enviar.
  const input = betoWin.getByLabel('Mensaje')
  for (const t of ['uno', 'dos', 'tres']) {
    await input.fill(t)
    await input.press('Enter')
    await expect(input).toHaveValue('')
  }
  await expect(anaWin.locator('.msg')).toHaveCount(5)
  await expect(anaWin.locator('.msg__bubble').nth(4)).toContainText('tres')
  await expect(anaWin.locator('.msg__bubble').nth(3)).toContainText('dos')

  // Ana cierra el chat y sigue navegando: el próximo mensaje le abre la ventana sola.
  await anaWin.getByRole('button', { name: /Cerrar chat/ }).click()
  await anaPage.goto('/')
  await expect(anaWin).toHaveCount(0)
  await input.fill('¿seguís ahí?')
  await input.press('Enter')
  await expect(anaWin).toContainText('Beto Chat')
  await expect(anaWin.locator('.msg').last()).toContainText('¿seguís ahí?')
  await anaCtx.close()
})

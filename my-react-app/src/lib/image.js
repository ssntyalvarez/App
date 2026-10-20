// Comprime una imagen elegida por el usuario a un cuadrado pequeño (data URL JPEG).
// Se guarda dentro del perfil en Firestore: no requiere Firebase Storage ni facturación.
export const AVATAR_SIZE = 192
export const MAX_AVATAR_CHARS = 80000

export async function fileToAvatar(file) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.')
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen supera los 8 MB.')
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('No se pudo leer la imagen.')
  })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  )
  bitmap.close?.()
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', quality)
    if (url.length <= MAX_AVATAR_CHARS) return url
  }
  throw new Error('No se pudo comprimir la imagen lo suficiente.')
}

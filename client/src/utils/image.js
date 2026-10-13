const UPLOADABLE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_UPLOAD = 5 * 1024 * 1024

// Shrinks a photo before upload: phone photos are often 3-8 MB, but ~1600px is plenty
// for reading a receipt and keeps the request fast (and the AI call cheaper).
// If the browser can't decode the image but it's already an uploadable type and size,
// the original file is sent instead.
export async function downscaleImage(file, maxSide = 1600, quality = 0.85) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    if (UPLOADABLE.includes(file.type) && file.size <= MAX_UPLOAD) return file
    throw new Error('Unsupported image. Please use a JPEG or PNG photo.')
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not process this image')
  return blob
}

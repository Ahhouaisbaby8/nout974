export const compressImage = (file, maxWidth = 1200, quality = 0.82) =>
  new Promise((resolve) => {
    let settled = false
    const done = (result) => { if (!settled) { settled = true; resolve(result) } }

    // Fallback après 10s si canvas.toBlob ne répond jamais (bug iOS/Android sous pression mémoire)
    const fallbackTimer = setTimeout(() => done(file), 10_000)

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale  = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          clearTimeout(fallbackTimer)
          if (!blob) { done(file); return }  // fallback original si compression échoue
          const baseName = (file.name ?? 'image').replace(/\.[^.]+$/, '')
          done(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      clearTimeout(fallbackTimer)
      URL.revokeObjectURL(url)
      done(file)  // fallback original si l'image ne peut pas être lue
    }

    img.src = url
  })

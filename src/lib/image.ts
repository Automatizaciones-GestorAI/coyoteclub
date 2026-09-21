import sharp from 'sharp';

// Las imágenes que sube el club (carteles, galería) se reducen antes de guardarlas: una foto de móvil de 4 MB pasaría a pesar
// unos 200 KB. Si no, la web tardaría segundos de más en cargar en el móvil de cada cliente.
export const MAX_SIDE = 1600; // píxeles del lado más largo (de sobra para un cartel o una foto a pantalla completa)

export async function optimizeUpload(input: Buffer): Promise<Buffer> {
  return sharp(input, { animated: true, limitInputPixels: 60_000_000 }) // limitInputPixels: evita "bombas" de imagen enormes
    .rotate() // respeta la orientación del móvil (EXIF) y la deja ya aplicada
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toBuffer();
}

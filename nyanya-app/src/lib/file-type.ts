/**
 * Определение типа файла по сигнатуре.
 *
 * `File.type` приходит от браузера и подделывается тривиально, а документы
 * потом отдаются с этим же mime из базы. Поэтому тип проверяется по первым
 * байтам: расхождение с заявленным — отказ.
 */

const PDF = [0x25, 0x50, 0x44, 0x46]; // %PDF
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46]; // RIFF....WEBP
const WEBP = [0x57, 0x45, 0x42, 0x50];
const FTYP = [0x66, 0x74, 0x79, 0x70]; // ....ftyp<brand>

/** HEIC/HEIF помечаются брендом в box `ftyp`. */
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim"];

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buffer[offset + i] === b);
}

/**
 * Возвращает mime, определённый по содержимому, либо `null`, если формат
 * не распознан. Распознаются только те типы, которые мы принимаем.
 */
export function detectMime(buffer: Buffer): string | null {
  if (startsWith(buffer, PDF)) return "application/pdf";
  if (startsWith(buffer, PNG)) return "image/png";
  if (startsWith(buffer, JPEG)) return "image/jpeg";

  if (startsWith(buffer, RIFF) && startsWith(buffer, WEBP, 8)) {
    return "image/webp";
  }

  if (startsWith(buffer, FTYP, 4)) {
    const brand = buffer.subarray(8, 12).toString("latin1");
    if (HEIC_BRANDS.includes(brand)) return "image/heic";
  }

  return null;
}

/**
 * Содержимое соответствует заявленному типу?
 *
 * JPEG в браузерах приходит и как `image/jpg`, поэтому сравниваем
 * нормализованно. HEIC часто заявляется как пустая строка — в этом случае
 * доверяем сигнатуре.
 */
export function matchesDeclaredMime(
  detected: string | null,
  declared: string
): boolean {
  if (!detected) return false;
  const normalize = (m: string) => (m === "image/jpg" ? "image/jpeg" : m);
  return normalize(detected) === normalize(declared);
}

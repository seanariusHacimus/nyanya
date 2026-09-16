/**
 * Оптимизация сгенерированного аватара-заглушки (2026-09-12).
 *
 * Ресайз до 960×1200 (4:5, верх кадра сохраняется — голова должна остаться
 * в кадре при обрезке до 3:4 и квадрата) и WebP с высоким качеством.
 * Заглушка одна на весь сайт и кэшируется браузером, поэтому байты здесь
 * не экономим ценой замыленных краёв: q88 + лёгкая резкость после ресайза.
 *
 *   node scripts/optimize-avatar.mjs источник.png public/images/avatar-female.webp [q] [w] [h]
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const [src, out, q = "88", w = "960", h = "1200"] = process.argv.slice(2);
if (!src || !out) {
  console.error("usage: node scripts/optimize-avatar.mjs in.png out.webp [quality] [w] [h]");
  process.exit(1);
}
const meta = await sharp(src).metadata();
const buf = await sharp(src)
  .rotate()
  .resize(Number(w), Number(h), { fit: "cover", position: "top", kernel: "lanczos3" })
  .sharpen({ sigma: 0.6, m1: 0.6, m2: 0.4 })
  .webp({ quality: Number(q), effort: 6, smartSubsample: true })
  .toBuffer();
// буфер пишем как есть: прогон через sharp ещё раз пережал бы WebP с
// качеством по умолчанию, и «оптимизация» превратилась бы в двойное сжатие
writeFileSync(out, buf);
console.log(`${meta.width}×${meta.height} ${meta.format} → ${w}×${h} webp q${q}: ${(buf.length / 1024).toFixed(0)} KB → ${out}`);

/**
 * Удаление осиротевших файлов из объектного хранилища.
 *
 * Нужен, когда база уже очищена, а файлы удалить было нечем (нет AWS_*):
 * purge-demo-accounts.mjs в этом случае складывает ключи в текстовый файл.
 * Перед удалением каждый ключ сверяется с базой — если на него ещё
 * ссылается документ или фотография анкеты, файл не трогаем.
 *
 *   railway run -s nyanya -- node scripts/purge-orphan-files.mjs \
 *     purge-orphan-keys.txt [--apply]
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const listPath = args.find((a) => !a.startsWith("--"));

if (!listPath) {
  console.error("Укажите файл со списком ключей");
  process.exit(1);
}

const keys = [
  ...new Set(
    readFileSync(listPath, "utf8")
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean)
  ),
];

// *.railway.internal доступен только изнутри Railway: локально через
// `railway run` берём публичный адрес, если он задан
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const sql = postgres(url, { ssl: "require", max: 1 });

const used = new Set([
  ...(await sql`select file_key as k from documents`).map((r) => r.k),
  ...(await sql`select photo_key as k from specialist_profiles where photo_key is not null`).map(
    (r) => r.k
  ),
]);
await sql.end();

const stillUsed = keys.filter((k) => used.has(k));
const orphans = keys.filter((k) => !used.has(k));

console.log(`ключей в списке: ${keys.length}`);
if (stillUsed.length)
  console.log(`пропускаем (ещё используются): ${stillUsed.length}`);
console.log(`к удалению: ${orphans.length}`);

if (!apply || orphans.length === 0) {
  if (!apply) console.log("\n(пробный прогон — повторите с --apply)");
  process.exit(0);
}

const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION ?? "auto",
  endpoint: process.env.AWS_ENDPOINT_URL,
  forcePathStyle: true,
});

let deleted = 0;
// DeleteObjects принимает не больше 1000 ключей за раз
for (let i = 0; i < orphans.length; i += 1000) {
  const chunk = orphans.slice(i, i + 1000);
  const out = await s3.send(
    new DeleteObjectsCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
    })
  );
  if (out.Errors?.length)
    console.error("не удалось удалить:", out.Errors.map((e) => e.Key).join(", "));
  deleted += chunk.length - (out.Errors?.length ?? 0);
}
console.log(`удалено файлов: ${deleted}`);

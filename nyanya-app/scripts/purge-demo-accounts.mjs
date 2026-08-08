/**
 * Удаление демонстрационных аккаунтов и всего, что за ними тянется.
 *
 * Каталог наполнялся выдуманными анкетами, пока бэкенда не было. Скрипт
 * оставляет только перечисленные настоящие аккаунты, а остальных удаляет
 * вместе с анкетами, документами (включая файлы в объектном хранилище),
 * отзывами, избранным, открытыми контактами и уведомлениями.
 *
 * По умолчанию — пробный прогон: показывает, что будет удалено, и пишет
 * дамп затронутых строк в JSON. Удаляет только с флагом --apply.
 *
 *   railway run -s Postgres -- node scripts/purge-demo-accounts.mjs \
 *     --keep a@b.com,c@d.com [--apply]
 *
 * Адрес базы берётся из DATABASE_PUBLIC_URL или DATABASE_URL. Файлы в S3
 * удаляются, только если заданы AWS_*: без них скрипт сообщает, какие ключи
 * остались, и работу базы не блокирует.
 */
import { writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const keepArg = args[args.indexOf("--keep") + 1];
const KEEP = new Set(
  (args.includes("--keep") ? keepArg : "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

if (KEEP.size === 0) {
  console.error(
    "Укажите настоящие аккаунты: --keep admin@example.com,user@example.com\n" +
      "Пустой список означал бы удаление всех пользователей — это отвергается."
  );
  process.exit(1);
}

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL не задан");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });

const users = await sql`select id, email, role from "user"`;
const kept = users.filter((u) => KEEP.has(u.email.toLowerCase()));
const doomed = users.filter((u) => !KEEP.has(u.email.toLowerCase()));

// не найденный адрес почти наверняка опечатка — удалили бы настоящий аккаунт
const missing = [...KEEP].filter(
  (e) => !kept.some((k) => k.email.toLowerCase() === e)
);
if (missing.length) {
  console.error("Эти аккаунты не найдены в базе:", missing.join(", "));
  process.exit(1);
}
if (doomed.length === 0) {
  console.log("Удалять нечего.");
  await sql.end();
  process.exit(0);
}

const ids = doomed.map((u) => u.id);
const profiles = await sql`select * from specialist_profiles where user_id in ${sql(ids)}`;
const profileIds = profiles.map((p) => p.id);
const inProfiles = (col) =>
  profileIds.length ? sql`or ${sql(col)} in ${sql(profileIds)}` : sql``;

const docs = profileIds.length
  ? await sql`select * from documents where specialist_id in ${sql(profileIds)}`
  : [];
const reviews = await sql`select * from reviews
  where author_parent_id in ${sql(ids)} ${inProfiles("specialist_id")}`;
const unlocks = await sql`select * from contact_unlocks
  where parent_id in ${sql(ids)} ${inProfiles("specialist_id")}`;
const favorites = await sql`select * from favorites
  where parent_id in ${sql(ids)} ${inProfiles("specialist_id")}`;
const notifications = await sql`select * from notifications where user_id in ${sql(ids)}`;

console.log(`оставляем (${kept.length}): ${kept.map((u) => u.email).join(", ")}`);
console.log(`удаляем пользователей: ${doomed.length}`);
console.log(`  анкет: ${profiles.length}, документов: ${docs.length}`);
console.log(`  отзывов: ${reviews.length}, открытых контактов: ${unlocks.length}`);
console.log(`  избранного: ${favorites.length}, уведомлений: ${notifications.length}`);

const dump = `purge-backup-${profiles.length}p-${doomed.length}u.json`;
writeFileSync(
  dump,
  JSON.stringify(
    { kept, doomed, profiles, docs, reviews, unlocks, favorites, notifications },
    (_k, v) => (typeof v === "bigint" ? String(v) : v),
    2
  )
);
console.log("дамп удаляемых строк:", dump);

if (!apply) {
  console.log("\n(пробный прогон — ничего не удалено; повторите с --apply)");
  await sql.end();
  process.exit(0);
}

await sql.begin(async (tx) => {
  if (reviews.length)
    await tx`delete from reviews where id in ${tx(reviews.map((r) => r.id))}`;
  if (unlocks.length)
    await tx`delete from contact_unlocks where id in ${tx(unlocks.map((r) => r.id))}`;
  // у favorites составной ключ, отдельного id нет
  await tx`delete from favorites where parent_id in ${tx(ids)}`;
  if (profileIds.length)
    await tx`delete from favorites where specialist_id in ${tx(profileIds)}`;
  if (notifications.length)
    await tx`delete from notifications where id in ${tx(notifications.map((r) => r.id))}`;
  // платежи: функция отменена 2026-08-08, строки остались только от демо
  await tx`delete from payments`;
  if (docs.length)
    await tx`delete from documents where id in ${tx(docs.map((r) => r.id))}`;
  if (profileIds.length)
    await tx`delete from specialist_profiles where id in ${tx(profileIds)}`;
  await tx`delete from "session" where user_id in ${tx(ids)}`;
  await tx`delete from "account" where user_id in ${tx(ids)}`;
  await tx`delete from "user" where id in ${tx(ids)}`;
});
console.log("база очищена.");

// файлы документов — отдельным шагом: база важнее, и падение S3 не должно
// оставлять записи, ссылающиеся в пустоту
const keys = [
  ...docs.map((d) => d.file_key),
  ...profiles.map((p) => p.photo_key),
].filter(Boolean);

if (keys.length && process.env.AWS_ACCESS_KEY_ID) {
  const { S3Client, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: process.env.AWS_DEFAULT_REGION ?? "auto",
    endpoint: process.env.AWS_ENDPOINT_URL,
    forcePathStyle: true,
  });
  // DeleteObjects принимает не больше 1000 ключей за раз
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const out = await s3.send(
      new DeleteObjectsCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      })
    );
    if (out.Errors?.length)
      console.error("не удалось удалить:", out.Errors.map((e) => e.Key).join(", "));
  }
  console.log(`файлов удалено из хранилища: ${keys.length}`);
} else if (keys.length) {
  writeFileSync("purge-orphan-keys.txt", keys.join("\n"));
  console.log(
    `AWS_* не заданы — ${keys.length} файлов осталось в хранилище, ключи в purge-orphan-keys.txt`
  );
}

console.table(await sql`select email, role from "user" order by created_at`);
console.table(await sql`select full_name, status from specialist_profiles`);
await sql.end();

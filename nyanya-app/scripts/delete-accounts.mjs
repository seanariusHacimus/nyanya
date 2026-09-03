/**
 * Полное удаление перечисленных аккаунтов и всего, что за ними тянется.
 *
 * В отличие от purge-demo-accounts (который оставляет перечисленных и удаляет
 * ВСЕХ остальных), этот скрипт удаляет только перечисленных — ошибка в списке
 * стоит одного аккаунта, а не базы.
 *
 * Удаляет: анкету, документы (и файлы в хранилище), отзывы (написанные и
 * полученные), открытые контакты (в обе стороны), избранное, уведомления,
 * жалобы, коды подтверждения, сессии, пароль и самого пользователя. Ссылки
 * «кто проверил документ» и «кто разобрал жалобу», если указывают на
 * удаляемого, обнуляются — это следы админа, а не его данные.
 *
 * По умолчанию — пробный прогон с дампом затронутых строк в JSON.
 * Удаляет только с --apply.
 *
 *   DATABASE_PUBLIC_URL=... BACKUP_DIR=... node scripts/delete-accounts.mjs \
 *     --emails a@b.com,c@d.com [--apply]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const emails = (args[args.indexOf("--emails") + 1] ?? "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
if (!args.includes("--emails") || emails.length === 0) {
  console.error("Укажите адреса: --emails a@b.com,c@d.com");
  process.exit(1);
}
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL не задан"); process.exit(1); }
const sql = postgres(url, { ssl: { rejectUnauthorized: false }, max: 1 });

const users = await sql`select id, email, name, role from "user" where lower(email) in ${sql(emails)}`;
const missing = emails.filter((e) => !users.some((u) => u.email.toLowerCase() === e));
if (missing.length) console.warn("НЕ НАЙДЕНЫ (пропускаю):", missing.join(", "));
if (users.length === 0) { console.log("удалять нечего"); await sql.end(); process.exit(0); }
if (users.some((u) => u.role === "admin")) {
  console.error("В списке администратор — отказ. Уберите его из списка."); await sql.end(); process.exit(1);
}

const ids = users.map((u) => u.id);
const profiles = await sql`select * from specialist_profiles where user_id in ${sql(ids)}`;
const profileIds = profiles.map((p) => p.id);
const orProfiles = (col) => profileIds.length ? sql`or ${sql(col)} in ${sql(profileIds)}` : sql``;

const docs = profileIds.length ? await sql`select * from documents where specialist_id in ${sql(profileIds)}` : [];
const reviews = await sql`select * from reviews where author_parent_id in ${sql(ids)} ${orProfiles("specialist_id")}`;
const unlocks = await sql`select * from contact_unlocks where parent_id in ${sql(ids)} ${orProfiles("specialist_id")}`;
const favorites = await sql`select * from favorites where parent_id in ${sql(ids)} ${orProfiles("specialist_id")}`;
const notifications = await sql`select * from notifications where user_id in ${sql(ids)}`;
const complaints = await sql`select * from complaints where reporter_id in ${sql(ids)} ${orProfiles("target_specialist_id")}`;
const verifications = await sql`select * from verification where lower(identifier) like any(${emails.map((e) => `%${e}`)})`;
const accounts = await sql`select id, user_id, provider_id from account where user_id in ${sql(ids)}`;
const sessions = await sql`select id, user_id from session where user_id in ${sql(ids)}`;
// чужие отзывы/контакты, которые исчезнут вместе с анкетой — отдельной строкой
const reviewsByOthers = reviews.filter((r) => !ids.includes(r.author_parent_id));
const unlocksByOthers = unlocks.filter((u) => !ids.includes(u.parent_id));

for (const u of users) {
  const p = profiles.find((x) => x.user_id === u.id);
  console.log(`— ${u.email} · ${u.role} · «${u.name}»` + (p ? ` · анкета ${p.status} «${p.full_name}»${p.slug ? " /" + p.slug : ""}` : " · анкеты нет"));
}
console.log(`\nанкет: ${profiles.length} · документов: ${docs.length} · отзывов: ${reviews.length} (чужих о них: ${reviewsByOthers.length})`);
console.log(`открытых контактов: ${unlocks.length} (чужими семьями: ${unlocksByOthers.length}) · избранного: ${favorites.length}`);
console.log(`уведомлений: ${notifications.length} · жалоб: ${complaints.length} · кодов: ${verifications.length} · сессий: ${sessions.length} · записей входа: ${accounts.length}`);

const dumpDir = process.env.BACKUP_DIR || ".";
const dump = path.join(dumpDir, `delete-backup-${Date.now()}.json`);
writeFileSync(dump, JSON.stringify({ users, profiles, docs, reviews, unlocks, favorites, notifications, complaints, verifications, accounts, sessions },
  (_k, v) => (typeof v === "bigint" ? String(v) : v), 2));
console.log("дамп:", dump);

if (!apply) { console.log("\n(пробный прогон — ничего не удалено; повторите с --apply)"); await sql.end(); process.exit(0); }

await sql.begin(async (tx) => {
  // следы админской работы, если указывают на удаляемого — обнулить, не терять чужие строки
  await tx`update documents set reviewed_by = null where reviewed_by in ${tx(ids)}`;
  await tx`update complaints set handled_by = null where handled_by in ${tx(ids)}`;
  if (complaints.length) await tx`delete from complaints where id in ${tx(complaints.map((r) => r.id))}`;
  if (reviews.length) await tx`delete from reviews where id in ${tx(reviews.map((r) => r.id))}`;
  if (unlocks.length) await tx`delete from contact_unlocks where id in ${tx(unlocks.map((r) => r.id))}`;
  await tx`delete from favorites where parent_id in ${tx(ids)}`;
  if (profileIds.length) await tx`delete from favorites where specialist_id in ${tx(profileIds)}`;
  if (notifications.length) await tx`delete from notifications where id in ${tx(notifications.map((r) => r.id))}`;
  if (docs.length) await tx`delete from documents where id in ${tx(docs.map((r) => r.id))}`;
  if (profileIds.length) await tx`delete from specialist_profiles where id in ${tx(profileIds)}`;
  if (verifications.length) await tx`delete from verification where id in ${tx(verifications.map((r) => r.id))}`;
  await tx`delete from "session" where user_id in ${tx(ids)}`;
  await tx`delete from "account" where user_id in ${tx(ids)}`;
  await tx`delete from "user" where id in ${tx(ids)}`;
});
console.log("база: удалено.");

// пересчёт рейтингов не нужен: отзывы удалённых семей были о чужих анкетах? — да, пересчитать
const touched = [...new Set(reviews.map((r) => r.specialist_id).filter((id) => !profileIds.includes(id)))];
for (const sid of touched) {
  await sql`update specialist_profiles p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from reviews r where r.specialist_id = p.id and r.status = 'visible'), 0),
    review_count = (select count(*) from reviews r where r.specialist_id = p.id and r.status = 'visible')
    where p.id = ${sid}`;
}
if (touched.length) console.log(`рейтинг пересчитан у анкет: ${touched.length}`);

const keys = [...docs.map((d) => d.file_key), ...profiles.map((p) => p.photo_key)].filter(Boolean);
if (keys.length && process.env.AWS_ACCESS_KEY_ID) {
  const { S3Client, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({ region: process.env.AWS_DEFAULT_REGION ?? "auto", endpoint: process.env.AWS_ENDPOINT_URL, forcePathStyle: true });
  const out = await s3.send(new DeleteObjectsCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }));
  if (out.Errors?.length) console.error("не удалось удалить из хранилища:", out.Errors.map((e) => e.Key).join(", "));
  console.log(`файлов удалено из хранилища: ${keys.length}`);
} else if (keys.length) {
  console.log(`AWS_* не заданы — ${keys.length} файлов осталось в хранилище: ${keys.join(", ")}`);
}
await sql.end();

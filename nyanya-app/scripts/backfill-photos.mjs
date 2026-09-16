/**
 * Разовый перевод уже загруженных фотографий анкет в тот же вид, в котором их
 * теперь сохраняет приложение: поворот по EXIF запечён, длинная сторона не
 * больше 1600 px, WebP q85, метаданные отброшены (в том числе координаты
 * съёмки — снимки с телефона их содержат, а фотография анкеты публична).
 *
 * Скрипт нужен ровно один раз: всё, что загружено после выката, приходит уже
 * в этом виде (`src/lib/images/profile-photo.ts`). Параметры продублированы
 * здесь, потому что .mjs не импортирует TypeScript; при изменении — менять в
 * обоих местах.
 *
 *   node scripts/backfill-photos.mjs                 # сухой прогон, ничего не меняет
 *   node scripts/backfill-photos.mjs --apply         # перекодировать и переписать строки
 *   node scripts/backfill-photos.mjs --all           # не только принятые фотографии
 *   node scripts/backfill-photos.mjs --restore <файл бэкапа>   # вернуть как было
 *
 * На проде запускает владелец:
 *   railway run --service nyanya --environment production -- node scripts/backfill-photos.mjs
 * и, посмотрев список, тот же вызов с --apply.
 *
 * Что скрипт НЕ делает:
 *  • не трогает документы верификации (паспорт, справки) — они хранятся
 *    побайтово такими, какими их прислали;
 *  • не удаляет оригиналы. Старые ключи дописываются в
 *    `backfill-photos-originals.txt`; когда владелец убедится, что всё в
 *    порядке, их убирает `purge-orphan-files.mjs` (он сам сверяется с базой);
 *  • не трогает строки, которые уже `image/webp` — повторный запуск говорит
 *    «нечего делать».
 *
 * По умолчанию берутся только **принятые** фотографии: именно их видят семьи.
 * `--all` захватывает и те, что ждут решения или отклонены (специалист видит
 * их в кабинете).
 *
 * Хранилище выбирается так же, как в приложении: `STORAGE_PROVIDER` либо
 * наличие AWS_*. TLS к базе — `ssl: "require"`, то есть шифрование без
 * проверки сертификата, как во всех остальных скриптах (см. шапку
 * delete-accounts.mjs); на localhost TLS выключается.
 */
import { randomUUID } from "node:crypto";
import { appendFileSync, writeFileSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import sharp from "sharp";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/** Те же значения, что в src/lib/images/profile-photo.ts. */
const PHOTO_MAX_SIDE = 1600;
const PHOTO_WEBP_QUALITY = 85;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const includeAll = args.includes("--all");
const restoreFrom = args.includes("--restore")
  ? args[args.indexOf("--restore") + 1]
  : null;

if (args.includes("--restore") && !restoreFrom) {
  console.error("Укажите файл бэкапа: --restore backfill-photos-backup-….json");
  process.exit(1);
}

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL не задан");
  process.exit(1);
}
const isLocal = /(^|@|\/\/)(localhost|127\.0\.0\.1)/.test(url);
const sql = postgres(url, { ssl: isLocal ? false : "require", max: 1 });

/* ------------------------------ хранилище ------------------------------ */

function makeStore() {
  const endpoint = process.env.S3_ENDPOINT ?? process.env.AWS_ENDPOINT_URL;
  const bucket = process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET_NAME;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const s3Ready = Boolean(endpoint && bucket && accessKeyId && secretAccessKey);
  const provider = process.env.STORAGE_PROVIDER ?? (s3Ready ? "s3" : "local");

  if (provider !== "s3") {
    const root = process.env.STORAGE_DIR ?? ".storage/documents";
    return {
      kind: "local",
      async get(key) {
        return readFile(path.resolve(root, key));
      },
      async put(key, buffer) {
        const target = path.resolve(root, key);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, buffer);
      },
    };
  }

  if (!s3Ready) {
    console.error(
      "STORAGE_PROVIDER=s3, но не заданы AWS_ENDPOINT_URL / AWS_S3_BUCKET_NAME / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY"
    );
    process.exit(1);
  }

  const client = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? process.env.AWS_DEFAULT_REGION ?? "auto",
    // как в src/lib/storage/s3.ts: бакеты Railway адресуются virtual-host
    forcePathStyle: process.env.S3_URL_STYLE === "path",
    credentials: { accessKeyId, secretAccessKey },
  });

  return {
    kind: "s3",
    async get(key) {
      const out = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      return Buffer.from(await out.Body.transformToByteArray());
    },
    async put(key, buffer) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentLength: buffer.byteLength,
          ContentType: "image/webp",
          // как в s3.ts: бакет приватный, отдаём только через /api/documents
          CacheControl: "private, no-store",
        })
      );
    },
  };
}

/* -------------------------------- откат -------------------------------- */

if (restoreFrom) {
  const rows = JSON.parse(readFileSync(restoreFrom, "utf8"));
  console.log(`строк в бэкапе: ${rows.length}`);
  if (!apply) {
    for (const r of rows) console.log(`  ${r.id}: → ${r.file_key} (${r.mime_type})`);
    console.log("\n(сухой прогон — повторите с --apply)");
    await sql.end();
    process.exit(0);
  }
  let restored = 0;
  for (const r of rows) {
    await sql.begin(async (tx) => {
      await tx`
        update documents
           set file_key = ${r.file_key},
               mime_type = ${r.mime_type},
               file_size = ${r.file_size},
               file_name = ${r.file_name}
         where id = ${r.id}`;
      if (r.photo_key) {
        await tx`
          update specialist_profiles
             set photo_key = ${r.photo_key}, updated_at = now()
           where id = ${r.specialist_id}`;
      }
    });
    restored += 1;
  }
  console.log(`возвращено строк: ${restored}`);
  console.log("Файлы-оригиналы не удалялись, поэтому ссылки снова рабочие.");
  await sql.end();
  process.exit(0);
}

/* ------------------------------ основной ход ---------------------------- */

const statusFilter = includeAll
  ? sql``
  : sql`and d.status = 'approved'`;

const rows = await sql`
  select d.id,
         d.specialist_id,
         d.file_key,
         d.file_name,
         d.mime_type,
         d.file_size,
         d.status,
         p.photo_key
    from documents d
    join specialist_profiles p on p.id = d.specialist_id
   where d.type = 'profile_photo'
     and (d.mime_type is distinct from 'image/webp')
     ${statusFilter}
   order by d.created_at`;

console.log(
  `фотографий к перекодированию: ${rows.length}${includeAll ? " (все статусы)" : " (только принятые)"}`
);
if (rows.length === 0) {
  console.log("нечего делать");
  await sql.end();
  process.exit(0);
}

const store = makeStore();
console.log(`хранилище: ${store.kind}`);

const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
const backupPath = path.resolve(`backfill-photos-backup-${stamp}.json`);
const originalsPath = path.resolve("backfill-photos-originals.txt");

const backup = [];
let done = 0;
let skipped = 0;
let bytesBefore = 0;
let bytesAfter = 0;

for (const row of rows) {
  let source;
  try {
    source = await store.get(row.file_key);
  } catch (error) {
    // файла может не быть (следы старых опытов) — это не повод падать
    console.warn(`  ПРОПУСК ${row.file_key}: файл не читается (${error.name ?? error})`);
    skipped += 1;
    continue;
  }

  let encoded;
  try {
    const { data, info } = await sharp(source, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({
        width: PHOTO_MAX_SIDE,
        height: PHOTO_MAX_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: PHOTO_WEBP_QUALITY, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    encoded = { buffer: data, width: info.width, height: info.height };
  } catch (error) {
    // HEIC собранный sharp не декодирует — такие снимки остаются как есть
    console.warn(
      `  ПРОПУСК ${row.file_key} (${row.mime_type}): не прочитать как изображение (${error.message ?? error})`
    );
    skipped += 1;
    continue;
  }

  bytesBefore += source.byteLength;
  bytesAfter += encoded.buffer.byteLength;

  const newKey = `${row.specialist_id}/${randomUUID()}.webp`;
  const newName = `${path.parse(row.file_name ?? "photo").name || "photo"}.webp`;

  console.log(
    `  ${row.file_key} [${row.status}] ${source.byteLength} → ${encoded.buffer.byteLength} байт, ${encoded.width}×${encoded.height} → ${newKey}`
  );

  if (!apply) continue;

  backup.push({
    id: row.id,
    specialist_id: row.specialist_id,
    file_key: row.file_key,
    file_name: row.file_name,
    mime_type: row.mime_type,
    file_size: row.file_size,
    photo_key: row.photo_key,
  });
  // бэкап пишется до первой записи: оборванный прогон тоже должен быть обратим
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));

  // сначала новый объект, потом строки: файл без строки — сирота, которую
  // подберёт purge-orphan-files; строка без файла — сломанная картинка
  await store.put(newKey, encoded.buffer);

  await sql.begin(async (tx) => {
    await tx`
      update documents
         set file_key = ${newKey},
             mime_type = 'image/webp',
             file_size = ${encoded.buffer.byteLength},
             file_name = ${newName}
       where id = ${row.id}
         and file_key = ${row.file_key}`;
    // фотография анкеты переписывается только если указывала на этот файл:
    // у непринятой фотографии photo_key пуст, и затронется 0 строк — норма
    await tx`
      update specialist_profiles
         set photo_key = ${"/api/documents/" + newKey}, updated_at = now()
       where id = ${row.specialist_id}
         and photo_key = ${"/api/documents/" + row.file_key}`;
  });

  appendFileSync(originalsPath, `${row.file_key}\n`);
  done += 1;
}

const kb = (n) => `${Math.round(n / 1024)} КБ`;
console.log(
  `\nитого: было ${kb(bytesBefore)}, станет ${kb(bytesAfter)}; пропущено: ${skipped}`
);

if (!apply) {
  console.log("\n(сухой прогон — повторите с --apply)");
} else {
  console.log(`перекодировано: ${done}`);
  console.log(`бэкап строк: ${backupPath}`);
  console.log(`старые ключи (НЕ удалены): ${originalsPath}`);
  console.log(
    "Каталог закэширован на минуту и обновится сам; страницы анкет динамические."
  );
}

await sql.end();

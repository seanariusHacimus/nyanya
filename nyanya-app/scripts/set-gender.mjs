/**
 * Дозаполнение пола в анкетах, созданных до появления поля (2026-09-12).
 *
 * Пол — не то, что стоит угадывать программой: карту «анкета → пол» составляет
 * человек, глядя на фотографию и имя, и кладёт в JSON-файл вида
 *   [{ "id": "<uuid анкеты>", "full_name": "…", "gender": "female" | "male" }, …]
 * Скрипт сверяет id и имя с базой (чтобы карта не отстала от реальности),
 * трогает только строки, где пол ещё не указан, и по умолчанию ничего не
 * пишет — только показывает план. Запись включается флагом --apply.
 *
 * Запуск (прод, снаружи, через публичный адрес базы):
 *   DATABASE_PUBLIC_URL="$DBPUB" node scripts/set-gender.mjs --map карта.json
 *   DATABASE_PUBLIC_URL="$DBPUB" node scripts/set-gender.mjs --map карта.json --apply
 * Локально достаточно DATABASE_URL.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const mapPath = args[args.indexOf("--map") + 1];
const apply = args.includes("--apply");
if (args.indexOf("--map") === -1 || !mapPath) {
  console.error("usage: node scripts/set-gender.mjs --map file.json [--apply]");
  process.exit(1);
}
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("set DATABASE_PUBLIC_URL or DATABASE_URL");
  process.exit(1);
}

const map = JSON.parse(readFileSync(mapPath, "utf8"));
const seen = new Set();
for (const row of map) {
  // имя обязательно: сверка с базой — единственная защита от перепутанного id
  if (!row.id || !row.full_name?.trim() || !["female", "male"].includes(row.gender)) {
    console.error("bad map row (нужны id, full_name, gender):", JSON.stringify(row));
    process.exit(1);
  }
  if (seen.has(row.id)) {
    console.error("duplicate id in map:", row.id);
    process.exit(1);
  }
  seen.add(row.id);
}

const sql = postgres(url, {
  max: 1,
  connect_timeout: 20,
  ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
  onnotice: () => {},
});

try {
  const ids = map.map((r) => r.id);
  const rows = await sql`
    select id, full_name, gender, status
    from specialist_profiles
    where id in ${sql(ids)}`;
  const byId = new Map(rows.map((r) => [r.id, r]));

  const plan = [];
  for (const entry of map) {
    const row = byId.get(entry.id);
    if (!row) {
      console.log(`  пропуск  ${entry.full_name ?? entry.id}: анкеты с таким id нет`);
      continue;
    }
    if (row.full_name.trim() !== entry.full_name.trim()) {
      console.log(`  пропуск  ${entry.id}: имя в базе «${row.full_name}», в карте «${entry.full_name}»`);
      continue;
    }
    if (row.gender) {
      console.log(`  есть     ${row.full_name}: уже ${row.gender}, не трогаем`);
      continue;
    }
    plan.push({ id: row.id, name: row.full_name, status: row.status, gender: entry.gender });
  }

  console.log(`\nК записи: ${plan.length} из ${map.length} в карте`);
  for (const p of plan) console.log(`  ${p.gender === "female" ? "Ж" : "М"}  ${p.name}  (${p.status})`);

  if (!apply) {
    console.log("\nПробный прогон — ничего не записано. Добавьте --apply, чтобы применить.");
  } else if (plan.length) {
    let written = 0;
    await sql.begin(async (tx) => {
      for (const p of plan) {
        const res = await tx`
          update specialist_profiles
          set gender = ${p.gender}, updated_at = now()
          where id = ${p.id} and gender is null`;
        written += res.count;
      }
    });
    console.log(`\nЗаписано: ${written}`);
  }

  const [{ total, filled }] = await sql`
    select count(*)::int as total, count(gender)::int as filled from specialist_profiles`;
  console.log(`Итого анкет: ${total}, с полом: ${filled}`);
} finally {
  await sql.end();
}

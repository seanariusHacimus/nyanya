/**
 * Установка пароля существующему аккаунту.
 *
 * Нужен, потому что восстановления пароля в приложении пока нет, а прочитать
 * забытый нельзя: в базе хранится только отпечаток (scrypt с индивидуальной
 * солью), и это правильно — из него исходный пароль не выводится.
 *
 * Пароль берётся из переменной окружения, а не из аргумента командной строки:
 * аргументы видны в списке процессов и оседают в истории командной оболочки.
 *
 *   NEW_PASSWORD='ваш-новый-пароль' \
 *   DATABASE_PUBLIC_URL='...' node scripts/set-password.mjs shokhedu@gmail.com
 *
 * Хеш считает та же функция Better Auth, что проверяет пароль при входе, —
 * иначе формат не совпал бы и вход не прошёл.
 *
 * После смены все активные сессии этого аккаунта гасятся: если пароль меняют из-за
 * подозрения на утечку, оставлять чужую открытую сессию бессмысленно.
 */
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";

const email = process.argv.find((a) => !a.startsWith("-") && a.includes("@"));
const password = process.env.NEW_PASSWORD;
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!email || !password || !url) {
  console.error(
    "Использование:\n" +
      "  NEW_PASSWORD='пароль' DATABASE_PUBLIC_URL='...' \\\n" +
      "    node scripts/set-password.mjs user@example.com\n\n" +
      "Пароль передаётся переменной окружения, а не аргументом: аргументы\n" +
      "видны в списке процессов и остаются в истории командной оболочки."
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("Пароль короче 8 знаков — приложение такой не примет.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });

const [account] = await sql`
  select u.id as user_id, u.email, u.role, a.id as account_id
  from "user" u
  left join "account" a on a.user_id = u.id and a.provider_id = 'credential'
  where lower(u.email) = lower(${email})`;

if (!account) {
  console.error(`Аккаунт ${email} не найден.`);
  process.exit(1);
}

const hash = await hashPassword(password);

if (account.account_id) {
  await sql`update "account" set password = ${hash}, updated_at = now()
            where id = ${account.account_id}`;
  console.log(`Пароль заменён: ${account.email} (${account.role})`);
} else {
  // у аккаунта не было пароля вовсе — так бывает после регистрации по коду
  await sql`insert into "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
            values (gen_random_uuid()::text, ${account.user_id}, 'credential',
                    ${account.user_id}, ${hash}, now(), now())`;
  console.log(`Пароль задан впервые: ${account.email} (${account.role})`);
}

const killed = await sql`delete from "session" where user_id = ${account.user_id} returning id`;
console.log(`Погашено сессий: ${killed.length}. Войдите заново.`);

await sql.end();

import "dotenv/config";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { auth } from "@/lib/auth";
import { computeTrustScore } from "@/lib/trust-score";
import type { Category, VerificationLevel, PriceUnit } from "@/lib/constants";

const REVIEW_TEXTS = [
  "Очень довольны! Ребёнок в надёжных руках.",
  "Пунктуальная и ответственная. Рекомендую.",
  "Прекрасный специалист, быстро нашли общий язык.",
  "Профессионал своего дела, всё чётко и по делу.",
  "Добрая и внимательная, ребёнок её обожает.",
  "Спасибо за заботу и терпение.",
  "Всё отлично, будем обращаться ещё.",
  "Отзывчивый человек, помог в трудной ситуации.",
];

type SpecSeed = {
  key: string;
  category: Category;
  fullName: string;
  photo: string | null;
  age: number;
  city: number; // index into CITY_DATA
  district: number; // index into that city's districts
  experienceYears: number;
  education: string;
  languages: string[];
  price: number;
  priceUnit: PriceUnit;
  description: string;
  hasCar?: boolean;
  liveIn?: boolean;
  nightAvailable?: boolean;
  newbornExp?: boolean;
  english: "none" | "basic" | "fluent";
  verification: VerificationLevel;
  unlockCount: number;
  monthsAgo: number;
  ratings: number[];
  login?: { email: string; password: string };
};

const CITY_DATA = [
  {
    nameRu: "Ташкент",
    nameUz: "Toshkent",
    nameEn: "Tashkent",
    districts: [
      ["Юнусабадский", "Yunusobod", "Yunusabad"],
      ["Мирзо-Улугбекский", "Mirzo Ulug'bek", "Mirzo Ulugbek"],
      ["Чиланзарский", "Chilonzor", "Chilanzar"],
      ["Яккасарайский", "Yakkasaroy", "Yakkasaray"],
      ["Мирабадский", "Mirobod", "Mirabad"],
      ["Шайхантахурский", "Shayxontohur", "Shaykhantakhur"],
    ],
  },
  {
    nameRu: "Самарканд",
    nameUz: "Samarqand",
    nameEn: "Samarkand",
    districts: [
      ["Центр", "Markaz", "Center"],
      ["Сиабский", "Siyob", "Siab"],
    ],
  },
  {
    nameRu: "Бухара",
    nameUz: "Buxoro",
    nameEn: "Bukhara",
    districts: [["Центр", "Markaz", "Center"]],
  },
];

const SPECIALISTS: SpecSeed[] = [
  {
    key: "dilnoza", category: "nanny", fullName: "Дилноза Рахимова", photo: "/media/specialists/p1.png",
    age: 29, city: 0, district: 0, experienceYears: 8, education: "Высшее педагогическое",
    languages: ["Русский", "Узбекский", "Английский"], price: 35000, priceUnit: "hour",
    description: "Опытная няня с педагогическим образованием. Люблю детей, развивающие занятия и творчество. Работаю с детьми от рождения.",
    nightAvailable: true, newbornExp: true, english: "fluent", verification: "premium_verified",
    unlockCount: 31, monthsAgo: 14, ratings: [5, 5, 4, 5, 5], login: { email: "dilnoza@nanya.uz", password: "spec12345" },
  },
  {
    key: "madina", category: "nanny", fullName: "Мадина Каримова", photo: "/media/specialists/p2.png",
    age: 26, city: 0, district: 2, experienceYears: 5, education: "Среднее специальное, медучилище",
    languages: ["Русский", "Узбекский"], price: 30000, priceUnit: "hour",
    description: "Заботливая няня с проживанием. Готовлю детское меню, гуляю, помогаю с уроками.",
    liveIn: true, nightAvailable: true, newbornExp: true, english: "basic", verification: "verified",
    unlockCount: 18, monthsAgo: 9, ratings: [5, 4, 5],
  },
  {
    key: "sevara", category: "nanny", fullName: "Севара Тошпулатова", photo: "/media/specialists/p3.png",
    age: 31, city: 0, district: 1, experienceYears: 11, education: "Высшее, дошкольное образование",
    languages: ["Русский", "Узбекский", "Английский"], price: 45000, priceUnit: "hour",
    description: "Профессиональная няня-воспитатель. Раннее развитие, английский для малышей, собственный автомобиль.",
    hasCar: true, newbornExp: true, english: "fluent", verification: "premium_verified",
    unlockCount: 40, monthsAgo: 20, ratings: [5, 5, 5, 4, 5],
  },
  {
    key: "kamola", category: "nanny", fullName: "Камола Саидова", photo: null,
    age: 38, city: 0, district: 4, experienceYears: 15, education: "Среднее специальное",
    languages: ["Русский", "Узбекский"], price: 28000, priceUnit: "hour",
    description: "Няня с большим опытом, ночная няня. Спокойная, ответственная, опыт с двойней.",
    liveIn: true, nightAvailable: true, newbornExp: true, english: "none", verification: "verified",
    unlockCount: 12, monthsAgo: 16, ratings: [4, 5, 4],
  },
  {
    key: "nigora", category: "nanny", fullName: "Нигора Алимова", photo: null,
    age: 24, city: 1, district: 0, experienceYears: 3, education: "Студентка педагогического вуза",
    languages: ["Узбекский", "Русский"], price: 22000, priceUnit: "hour",
    description: "Энергичная няня для активных детей. Игры, прогулки, помощь с домашними заданиями.",
    english: "basic", verification: "verified", unlockCount: 6, monthsAgo: 4, ratings: [5, 4],
  },
  {
    key: "gulnora", category: "caregiver", fullName: "Гулнора Бекова", photo: null,
    age: 45, city: 0, district: 5, experienceYears: 12, education: "Медсестра",
    languages: ["Русский", "Узбекский"], price: 350000, priceUnit: "day",
    description: "Сиделка для пожилых людей. Медицинский уход, контроль приёма лекарств, доброжелательность.",
    english: "none", verification: "verified", unlockCount: 9, monthsAgo: 11, ratings: [5, 5, 4],
  },
  {
    key: "zulfiya", category: "caregiver", fullName: "Зульфия Рустамова", photo: null,
    age: 50, city: 0, district: 2, experienceYears: 20, education: "Медицинское образование",
    languages: ["Русский", "Узбекский"], price: 400000, priceUnit: "day",
    description: "Опытная сиделка. Уход за лежачими больными, реабилитация, ответственность и терпение.",
    english: "none", verification: "premium_verified", unlockCount: 15, monthsAgo: 22, ratings: [5, 5, 5, 4],
  },
  {
    key: "aziza", category: "tutor", fullName: "Азиза Мирзаева", photo: "/media/specialists/p4.png",
    age: 27, city: 0, district: 3, experienceYears: 6, education: "Высшее, английская филология",
    languages: ["Русский", "Узбекский", "Английский"], price: 60000, priceUnit: "hour",
    description: "Репетитор английского для детей и подростков. Подготовка к школе и международным экзаменам.",
    english: "fluent", verification: "verified", unlockCount: 22, monthsAgo: 7, ratings: [5, 5, 4],
  },
  {
    key: "bobur", category: "tutor", fullName: "Бобур Назаров", photo: null,
    age: 34, city: 0, district: 1, experienceYears: 10, education: "Высшее, математика",
    languages: ["Узбекский", "Русский", "Английский"], price: 70000, priceUnit: "hour",
    description: "Репетитор по математике и физике. Подготовка к поступлению, понятные объяснения.",
    english: "basic", verification: "verified", unlockCount: 14, monthsAgo: 8, ratings: [5, 4, 5],
  },
  {
    key: "laylo", category: "tutor", fullName: "Лайло Хамидова", photo: null,
    age: 29, city: 2, district: 0, experienceYears: 5, education: "Высшее, начальные классы",
    languages: ["Узбекский", "Русский"], price: 50000, priceUnit: "hour",
    description: "Репетитор начальных классов. Чтение, письмо, счёт, мягкий и терпеливый подход.",
    english: "basic", verification: "verified", unlockCount: 8, monthsAgo: 5, ratings: [5, 5],
  },
  {
    key: "jasur", category: "driver", fullName: "Жасур Қодиров", photo: null,
    age: 36, city: 0, district: 0, experienceYears: 14, education: "Категории B, C",
    languages: ["Узбекский", "Русский"], price: 25000, priceUnit: "hour",
    description: "Семейный водитель. Развоз детей в школу и на секции, аккуратное вождение, свой автомобиль.",
    hasCar: true, english: "none", verification: "verified", unlockCount: 11, monthsAgo: 10, ratings: [5, 4, 5],
  },
  {
    key: "rustam", category: "driver", fullName: "Рустам Давронов", photo: null,
    age: 41, city: 0, district: 4, experienceYears: 18, education: "Профессиональный водитель",
    languages: ["Узбекский", "Русский"], price: 30000, priceUnit: "hour",
    description: "Персональный водитель с большим стажем. Пунктуальность, безопасность, премиальный сервис.",
    hasCar: true, english: "basic", verification: "premium_verified", unlockCount: 19, monthsAgo: 18, ratings: [5, 5, 4, 5],
  },
];

async function main() {
  const ctx = await auth.$context;

  // Guard: never wipe an already-populated DB (e.g. on Railway redeploys).
  // Set FORCE_SEED=true to reset and reseed.
  const existing = await db
    .select({ id: s.specialistProfiles.id })
    .from(s.specialistProfiles)
    .limit(1);
  if (existing.length && process.env.FORCE_SEED !== "true") {
    console.log(
      "Seed skipped — data already present (set FORCE_SEED=true to reset).",
    );
    process.exit(0);
  }

  console.log("Clearing existing data…");
  // CASCADE clears all referencing tables.
  await db.execute(
    sql`TRUNCATE TABLE "user", cities RESTART IDENTITY CASCADE`,
  );

  // ---- demo login accounts (credential provider) ----
  async function createLoginUser(
    email: string,
    password: string,
    name: string,
    role: string,
  ) {
    const id = randomUUID();
    await db.insert(s.user).values({
      id,
      name,
      email,
      emailVerified: true,
      role,
      phone: "+998 90 000 00 00",
      phoneVerified: true,
    });
    await db.insert(s.account).values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await ctx.password.hash(password),
    });
    return id;
  }

  console.log("Creating demo accounts…");
  await createLoginUser("admin@nanya.uz", "admin12345", "Администратор", "admin");
  await createLoginUser("parent@nanya.uz", "parent12345", "Азиз Усмонов", "parent");

  // ---- cities & districts ----
  console.log("Seeding cities & districts…");
  const cityIds: number[] = [];
  const districtIds: number[][] = [];
  for (const c of CITY_DATA) {
    const [city] = await db
      .insert(s.cities)
      .values({ nameRu: c.nameRu, nameUz: c.nameUz, nameEn: c.nameEn })
      .returning();
    cityIds.push(city.id);
    const dIds: number[] = [];
    for (const d of c.districts) {
      const [district] = await db
        .insert(s.districts)
        .values({ cityId: city.id, nameRu: d[0], nameUz: d[1], nameEn: d[2] })
        .returning();
      dIds.push(district.id);
    }
    districtIds.push(dIds);
  }

  // ---- review author pool ----
  const reviewerIds: string[] = [];
  for (let i = 0; i < 4; i++) {
    const id = randomUUID();
    await db.insert(s.user).values({
      id,
      name: `Родитель ${i + 1}`,
      email: `reviewer${i + 1}@demo.nanya.uz`,
      emailVerified: true,
      role: "parent",
      phoneVerified: true,
    });
    reviewerIds.push(id);
  }

  // ---- specialists ----
  console.log("Seeding specialists…");
  let r = 0;
  for (const sp of SPECIALISTS) {
    let userId: string;
    if (sp.login) {
      userId = await createLoginUser(sp.login.email, sp.login.password, sp.fullName, "specialist");
    } else {
      userId = randomUUID();
      await db.insert(s.user).values({
        id: userId,
        name: sp.fullName,
        email: `${sp.key}@demo.nanya.uz`,
        emailVerified: true,
        role: "specialist",
        phone: "+998 90 000 00 00",
        phoneVerified: true,
      });
    }

    const reviewCount = sp.ratings.length;
    const ratingAvg =
      sp.ratings.reduce((a, b) => a + b, 0) / Math.max(reviewCount, 1);
    const trustScore = computeTrustScore({
      verificationLevel: sp.verification,
      unlockCount: sp.unlockCount,
      monthsSincePublished: sp.monthsAgo,
      reviewCount,
      ratingAvg,
    });
    const publishedAt = new Date(Date.now() - sp.monthsAgo * 30 * 86400000);
    const birthYear = 2026 - sp.age;

    const [profile] = await db
      .insert(s.specialistProfiles)
      .values({
        userId,
        category: sp.category,
        fullName: sp.fullName,
        photoKey: sp.photo,
        birthDate: `${birthYear}-03-15`,
        cityId: cityIds[sp.city],
        districtId: districtIds[sp.city][sp.district],
        experienceYears: sp.experienceYears,
        education: sp.education,
        languages: sp.languages,
        priceAmount: sp.price,
        priceUnit: sp.priceUnit,
        description: sp.description,
        hasCar: sp.hasCar ?? false,
        liveIn: sp.liveIn ?? false,
        nightAvailable: sp.nightAvailable ?? false,
        newbornExp: sp.newbornExp ?? false,
        englishLevel: sp.english,
        status: "active",
        verificationLevel: sp.verification,
        trustScore,
        ratingAvg: ratingAvg.toFixed(2),
        reviewCount,
        unlockCount: sp.unlockCount,
        publishedAt,
      })
      .returning();

    for (const rating of sp.ratings) {
      await db.insert(s.reviews).values({
        specialistId: profile.id,
        authorParentId: reviewerIds[r % reviewerIds.length],
        rating,
        text: REVIEW_TEXTS[r % REVIEW_TEXTS.length],
      });
      r++;
    }
  }

  console.log(
    `✓ Seeded ${SPECIALISTS.length} specialists, ${CITY_DATA.length} cities.`,
  );
  console.log("  Logins — admin@nanya.uz / admin12345 · parent@nanya.uz / parent12345 · dilnoza@nanya.uz / spec12345");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

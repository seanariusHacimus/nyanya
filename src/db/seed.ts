import "dotenv/config";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { auth } from "@/lib/auth";
import { computeTrustScore } from "@/lib/trust-score";
import type { Category, VerificationLevel, PriceUnit } from "@/lib/constants";

type Tri = { ru: string; uz: string; en: string };

// Varied-length, natural testimonials (short / medium / long).
const REVIEW_TEXTS: Tri[] = [
  {
    ru: "Спасибо большое, всё на высшем уровне!",
    uz: "Katta rahmat, hammasi yuqori darajada!",
    en: "Thank you so much — top-notch service!",
  },
  {
    ru: "Ребёнок сразу проникся доверием. Приходит вовремя, всегда на связи.",
    uz: "Bola darrov ishonch bildirdi. O'z vaqtida keladi, doim aloqada.",
    en: "Our child trusted her right away. Always on time and reachable.",
  },
  {
    ru: "Искали специалиста несколько недель и наконец нашли. Очень внимательная, занимается развитием, готовит полезную еду. Ребёнок ждёт её прихода каждый день.",
    uz: "Bir necha hafta qidirdik va nihoyat topdik. Juda e'tiborli, rivojlantirish bilan shug'ullanadi, foydali ovqat tayyorlaydi. Bola uni har kuni kutadi.",
    en: "We searched for weeks and finally found the right person. Very attentive, focuses on development, cooks healthy meals. Our child looks forward to seeing her every day.",
  },
  {
    ru: "Рекомендую от всей души.",
    uz: "Chin dildan tavsiya qilaman.",
    en: "Wholeheartedly recommend.",
  },
  {
    ru: "Профессионал с большой буквы. Чувствуется опыт и любовь к детям.",
    uz: "Katta harf bilan professional. Tajriba va bolalarga mehr sezilib turadi.",
    en: "A real professional — you can feel the experience and the love for kids.",
  },
  {
    ru: "Обращались на время отпуска, оставляли ребёнка на целый день. Никаких нареканий: чисто, спокойно, малыш накормлен и доволен. Будем сотрудничать на постоянной основе.",
    uz: "Ta'til vaqtida murojaat qildik, bolani kun bo'yi qoldirdik. Hech qanday e'tiroz yo'q: toza, tinch, bola to'q va mamnun. Doimiy hamkorlik qilamiz.",
    en: "We hired her during our vacation and left our child all day. No complaints at all — calm, clean, the little one was fed and happy. We'll work together regularly.",
  },
  {
    ru: "Всё понравилось, ребёнок счастлив.",
    uz: "Hammasi yoqdi, bola baxtli.",
    en: "Loved everything — our child is happy.",
  },
  {
    ru: "Пунктуальная, ответственная, с хорошим английским. Помогает с уроками.",
    uz: "Aniq, mas'uliyatli, ingliz tili yaxshi. Darslarga yordam beradi.",
    en: "Punctual, responsible, good English. Helps with homework.",
  },
  {
    ru: "Особенно ценим терпение и спокойствие. У нас непростой ребёнок, но они быстро нашли общий язык. Видно, что человек на своём месте.",
    uz: "Ayniqsa sabr va vazminlikni qadrlaymiz. Bizning bola oson emas, lekin tez til topishdi. Inson o'z o'rnida ekani ko'rinib turibdi.",
    en: "We especially value the patience and calm. Our child isn't easy, but they bonded quickly. You can tell this person is in the right place.",
  },
  {
    ru: "Будем обращаться снова!",
    uz: "Yana murojaat qilamiz!",
    en: "We'll book again!",
  },
  {
    ru: "Помогли в сложный период, когда не с кем было оставить ребёнка. Очень выручили.",
    uz: "Bolani qoldiradigan odam yo'q paytda yordam berishdi. Juda qutqarishdi.",
    en: "Helped during a hard time when we had no one to watch our child. A real lifesaver.",
  },
  {
    ru: "Аккуратная, честная, ребёнок к ней тянется. Цена полностью оправдана.",
    uz: "Ozoda, halol, bola unga intiladi. Narx to'liq oqlanadi.",
    en: "Tidy, honest, our child is drawn to her. Worth every som.",
  },
  {
    ru: "Долго не могли довериться чужому человеку, но здесь всё прозрачно: документы, отзывы, видео. После первой встречи все сомнения пропали.",
    uz: "Uzoq vaqt begona odamga ishona olmadik, lekin bu yerda hammasi shaffof: hujjatlar, sharhlar, video. Birinchi uchrashuvdan keyin barcha shubhalar yo'qoldi.",
    en: "It took us a while to trust a stranger, but here everything is transparent — documents, reviews, video. After the first meeting all our doubts were gone.",
  },
  {
    ru: "Отличный специалист!",
    uz: "Ajoyib mutaxassis!",
    en: "Excellent specialist!",
  },
  {
    ru: "Вежливая, опрятная, всегда улыбается. Ребёнок в надёжных руках.",
    uz: "Muloyim, ozoda, doim tabassum qiladi. Bola ishonchli qo'llarda.",
    en: "Polite, neat, always smiling. Our child is in safe hands.",
  },
];

type SpecSeed = {
  key: string;
  category: Category;
  fullName: string;
  photo: string | null;
  age: number;
  city: number;
  district: number;
  experienceYears: number;
  education: Tri;
  languages: string[];
  price: number;
  priceUnit: PriceUnit;
  description: Tri;
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
    key: "dilnoza", category: "nanny", fullName: "Дилноза Рахимова", photo: "/media/specialists/face-01.png",
    age: 29, city: 0, district: 0, experienceYears: 8,
    education: { ru: "Высшее педагогическое", uz: "Oliy pedagogik", en: "Higher pedagogical degree" },
    languages: ["Русский", "Узбекский", "Английский"], price: 35000, priceUnit: "hour",
    description: {
      ru: "Опытная няня с педагогическим образованием. Люблю детей, развивающие занятия и творчество. Работаю с детьми от рождения.",
      uz: "Pedagogik ma'lumotli tajribali enaga. Bolalarni, rivojlantiruvchi mashg'ulotlar va ijodni yaxshi ko'raman. Yangi tug'ilgan bolalar bilan ishlayman.",
      en: "Experienced nanny with a teaching degree. I love children, developmental activities and creativity. I work with newborns.",
    },
    nightAvailable: true, newbornExp: true, english: "fluent", verification: "premium_verified",
    unlockCount: 31, monthsAgo: 14, ratings: [5, 5, 4, 5, 5], login: { email: "dilnoza@nanya.uz", password: "spec12345" },
  },
  {
    key: "madina", category: "nanny", fullName: "Мадина Каримова", photo: "/media/specialists/face-02.png",
    age: 26, city: 0, district: 2, experienceYears: 5,
    education: { ru: "Среднее специальное, медучилище", uz: "O'rta maxsus, tibbiyot kolleji", en: "Vocational, medical college" },
    languages: ["Русский", "Узбекский"], price: 30000, priceUnit: "hour",
    description: {
      ru: "Заботливая няня с проживанием. Готовлю детское меню, гуляю, помогаю с уроками.",
      uz: "Yashash bilan g'amxo'r enaga. Bolalar taomlarini tayyorlayman, sayr qilaman, darslarga yordam beraman.",
      en: "Caring live-in nanny. I prepare kids' meals, take walks and help with homework.",
    },
    liveIn: true, nightAvailable: true, newbornExp: true, english: "basic", verification: "verified",
    unlockCount: 18, monthsAgo: 9, ratings: [5, 4, 5],
  },
  {
    key: "sevara", category: "nanny", fullName: "Севара Тошпулатова", photo: "/media/hero.png",
    age: 31, city: 0, district: 1, experienceYears: 11,
    education: { ru: "Высшее, дошкольное образование", uz: "Oliy, maktabgacha ta'lim", en: "Higher, preschool education" },
    languages: ["Русский", "Узбекский", "Английский"], price: 45000, priceUnit: "hour",
    description: {
      ru: "Профессиональная няня-воспитатель. Раннее развитие, английский для малышей, собственный автомобиль.",
      uz: "Professional enaga-tarbiyachi. Erta rivojlantirish, kichkintoylar uchun ingliz tili, shaxsiy avtomobil.",
      en: "Professional nanny-educator. Early development, English for toddlers, own car.",
    },
    hasCar: true, newbornExp: true, english: "fluent", verification: "premium_verified",
    unlockCount: 40, monthsAgo: 20, ratings: [5, 5, 5, 4, 5],
  },
  {
    key: "kamola", category: "nanny", fullName: "Камола Саидова", photo: "/media/specialists/face-04.png",
    age: 38, city: 0, district: 4, experienceYears: 15,
    education: { ru: "Среднее специальное", uz: "O'rta maxsus", en: "Vocational" },
    languages: ["Русский", "Узбекский"], price: 28000, priceUnit: "hour",
    description: {
      ru: "Няня с большим опытом, ночная няня. Спокойная, ответственная, опыт с двойней.",
      uz: "Katta tajribali enaga, tungi enaga. Vazmin, mas'uliyatli, egizaklar bilan tajriba.",
      en: "Highly experienced nanny and night nanny. Calm, responsible, experience with twins.",
    },
    liveIn: true, nightAvailable: true, newbornExp: true, english: "none", verification: "verified",
    unlockCount: 12, monthsAgo: 16, ratings: [4, 5, 4],
  },
  {
    key: "nigora", category: "nanny", fullName: "Нигора Алимова", photo: "/media/specialists/face-03.png",
    age: 24, city: 1, district: 0, experienceYears: 3,
    education: { ru: "Студентка педагогического вуза", uz: "Pedagogika oliygohi talabasi", en: "Pedagogy university student" },
    languages: ["Узбекский", "Русский"], price: 22000, priceUnit: "hour",
    description: {
      ru: "Энергичная няня для активных детей. Игры, прогулки, помощь с домашними заданиями.",
      uz: "Faol bolalar uchun g'ayratli enaga. O'yinlar, sayrlar, uy vazifalariga yordam.",
      en: "Energetic nanny for active kids. Games, walks, homework help.",
    },
    english: "basic", verification: "verified", unlockCount: 6, monthsAgo: 4, ratings: [5, 4],
  },
  {
    key: "gulnora", category: "caregiver", fullName: "Гулнора Бекова", photo: null,
    age: 45, city: 0, district: 5, experienceYears: 12,
    education: { ru: "Медсестра", uz: "Hamshira", en: "Nurse" },
    languages: ["Русский", "Узбекский"], price: 350000, priceUnit: "day",
    description: {
      ru: "Сиделка для пожилых людей. Медицинский уход, контроль приёма лекарств, доброжелательность.",
      uz: "Keksalar uchun parvarishchi. Tibbiy parvarish, dori qabulini nazorat qilish, xushmuomalalik.",
      en: "Caregiver for the elderly. Medical care, medication control, kindness.",
    },
    english: "none", verification: "verified", unlockCount: 9, monthsAgo: 11, ratings: [5, 5, 4],
  },
  {
    key: "zulfiya", category: "caregiver", fullName: "Ольга Соколова", photo: null,
    age: 50, city: 0, district: 2, experienceYears: 20,
    education: { ru: "Медицинское образование", uz: "Tibbiy ma'lumot", en: "Medical education" },
    languages: ["Русский", "Узбекский"], price: 400000, priceUnit: "day",
    description: {
      ru: "Опытная сиделка. Уход за лежачими больными, реабилитация, ответственность и терпение.",
      uz: "Tajribali parvarishchi. Yotoqdagi bemorlarni parvarishlash, reabilitatsiya, mas'uliyat va sabr.",
      en: "Experienced caregiver. Care for bedridden patients, rehabilitation, responsibility and patience.",
    },
    english: "none", verification: "premium_verified", unlockCount: 15, monthsAgo: 22, ratings: [5, 5, 5, 4],
  },
  {
    key: "aziza", category: "tutor", fullName: "Азиза Мирзаева", photo: "/media/specialists/face-05.png",
    age: 27, city: 0, district: 3, experienceYears: 6,
    education: { ru: "Высшее, английская филология", uz: "Oliy, ingliz filologiyasi", en: "Higher, English philology" },
    languages: ["Русский", "Узбекский", "Английский"], price: 60000, priceUnit: "hour",
    description: {
      ru: "Репетитор английского для детей и подростков. Подготовка к школе и международным экзаменам.",
      uz: "Bolalar va o'smirlar uchun ingliz tili repetitori. Maktabga va xalqaro imtihonlarga tayyorlash.",
      en: "English tutor for children and teens. School and international-exam preparation.",
    },
    english: "fluent", verification: "verified", unlockCount: 22, monthsAgo: 7, ratings: [5, 5, 4],
  },
  {
    key: "bobur", category: "tutor", fullName: "Дмитрий Волков", photo: null,
    age: 34, city: 0, district: 1, experienceYears: 10,
    education: { ru: "Высшее, математика", uz: "Oliy, matematika", en: "Higher, mathematics" },
    languages: ["Узбекский", "Русский", "Английский"], price: 70000, priceUnit: "hour",
    description: {
      ru: "Репетитор по математике и физике. Подготовка к поступлению, понятные объяснения.",
      uz: "Matematika va fizika repetitori. Kirishga tayyorlash, tushunarli tushuntirishlar.",
      en: "Maths and physics tutor. Admission prep, clear explanations.",
    },
    english: "basic", verification: "verified", unlockCount: 14, monthsAgo: 8, ratings: [5, 4, 5],
  },
  {
    key: "laylo", category: "tutor", fullName: "Лайло Хамидова", photo: "/media/specialists/face-06.png",
    age: 29, city: 2, district: 0, experienceYears: 5,
    education: { ru: "Высшее, начальные классы", uz: "Oliy, boshlang'ich sinflar", en: "Higher, primary education" },
    languages: ["Узбекский", "Русский"], price: 50000, priceUnit: "hour",
    description: {
      ru: "Репетитор начальных классов. Чтение, письмо, счёт, мягкий и терпеливый подход.",
      uz: "Boshlang'ich sinflar repetitori. O'qish, yozish, sanoq, yumshoq va sabrli yondashuv.",
      en: "Primary-school tutor. Reading, writing, counting — a gentle, patient approach.",
    },
    english: "basic", verification: "verified", unlockCount: 8, monthsAgo: 5, ratings: [5, 5],
  },
  {
    key: "jasur", category: "driver", fullName: "Жасур Қодиров", photo: null,
    age: 36, city: 0, district: 0, experienceYears: 14,
    education: { ru: "Категории B, C", uz: "B, C toifalari", en: "Licence categories B, C" },
    languages: ["Узбекский", "Русский"], price: 25000, priceUnit: "hour",
    description: {
      ru: "Семейный водитель. Развоз детей в школу и на секции, аккуратное вождение, свой автомобиль.",
      uz: "Oilaviy haydovchi. Bolalarni maktab va to'garaklarga olib borish, ehtiyotkor haydash, shaxsiy avtomobil.",
      en: "Family driver. School and activity runs, careful driving, own car.",
    },
    hasCar: true, english: "none", verification: "verified", unlockCount: 11, monthsAgo: 10, ratings: [5, 4, 5],
  },
  {
    key: "rustam", category: "driver", fullName: "Рустам Давронов", photo: null,
    age: 41, city: 0, district: 4, experienceYears: 18,
    education: { ru: "Профессиональный водитель", uz: "Professional haydovchi", en: "Professional driver" },
    languages: ["Узбекский", "Русский"], price: 30000, priceUnit: "hour",
    description: {
      ru: "Персональный водитель с большим стажем. Пунктуальность, безопасность, премиальный сервис.",
      uz: "Katta tajribali shaxsiy haydovchi. Aniqlik, xavfsizlik, premium xizmat.",
      en: "Personal driver with long experience. Punctuality, safety, premium service.",
    },
    hasCar: true, english: "basic", verification: "premium_verified", unlockCount: 19, monthsAgo: 18, ratings: [5, 5, 4, 5],
  },
];

// Latin spellings for the Uzbek/English (Latin-script) locales.
const LATIN_NAMES: Record<string, string> = {
  "Дилноза Рахимова": "Dilnoza Rakhimova",
  "Мадина Каримова": "Madina Karimova",
  "Севара Тошпулатова": "Sevara Toshpulatova",
  "Камола Саидова": "Kamola Saidova",
  "Нигора Алимова": "Nigora Alimova",
  "Гулнора Бекова": "Gulnora Bekova",
  "Ольга Соколова": "Olga Sokolova",
  "Азиза Мирзаева": "Aziza Mirzaeva",
  "Дмитрий Волков": "Dmitri Volkov",
  "Лайло Хамидова": "Laylo Khamidova",
  "Жасур Қодиров": "Jasur Qodirov",
  "Рустам Давронов": "Rustam Davronov",
};
const REVIEWER_NAMES = [
  "Aziz U.",
  "Dilbar M.",
  "Sherzod K.",
  "Nilufar A.",
  "Elena V.",
  "Jamshid T.",
  "Malika R.",
  "Bekzod S.",
  "Olga P.",
  "Gulnoza H.",
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
  await db.execute(sql`TRUNCATE TABLE "user", cities RESTART IDENTITY CASCADE`);

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
  await createLoginUser("admin@nanya.uz", "admin12345", "Admin", "admin");
  await createLoginUser("parent@nanya.uz", "parent12345", "Aziz Usmonov", "parent");

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

  const reviewerIds: string[] = [];
  for (let i = 0; i < REVIEWER_NAMES.length; i++) {
    const id = randomUUID();
    await db.insert(s.user).values({
      id,
      name: REVIEWER_NAMES[i],
      email: `reviewer${i + 1}@demo.nanya.uz`,
      emailVerified: true,
      role: "parent",
      phoneVerified: true,
    });
    reviewerIds.push(id);
  }

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
        fullNameLatin: LATIN_NAMES[sp.fullName] ?? null,
        photoKey: sp.photo,
        birthDate: `${birthYear}-03-15`,
        cityId: cityIds[sp.city],
        districtId: districtIds[sp.city][sp.district],
        experienceYears: sp.experienceYears,
        education: sp.education.ru,
        educationUz: sp.education.uz,
        educationEn: sp.education.en,
        languages: sp.languages,
        priceAmount: sp.price,
        priceUnit: sp.priceUnit,
        description: sp.description.ru,
        descriptionUz: sp.description.uz,
        descriptionEn: sp.description.en,
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
      const t = REVIEW_TEXTS[r % REVIEW_TEXTS.length];
      await db.insert(s.reviews).values({
        specialistId: profile.id,
        authorParentId: reviewerIds[r % reviewerIds.length],
        rating,
        text: t.ru,
        textUz: t.uz,
        textEn: t.en,
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

/**
 * Одноразовый (но идемпотентный) апгрейд демо-сида: 12 активных анкет
 * приводятся к витринному набору nyanya-app — slug, портреты, полные
 * описания и согласованные отзывы. Запуск:
 *   railway run -s Postgres -- node scripts/db-seed-upgrade.mjs
 */
import postgres from "postgres";

const onRailwayDeploy = Boolean(process.env.RAILWAY_DEPLOYMENT_ID);
const url = onRailwayDeploy
  ? process.env.DATABASE_URL
  : process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

const sql = postgres(url, { max: 1, connect_timeout: 20, onnotice: () => {} });

const englishMap = { Нет: "none", Базовый: "basic", Свободный: "fluent" };

// возраст витринных анкет (в порядке массива S) → birth_date = 15 июня нужного года
const AGES = [31, 42, 38, 27, 48, 52, 29, 35, 33, 41, 38, 45];

const S = [
  {
    slug: "sevara-toshpulatova", name: "Севара Тошпулатова", category: "nanny",
    district: "Юнусабадский", exp: 11, rating: "4.80", price: 45000, unit: "hour",
    trust: 84, level: "premium_verified", langs: ["Русский", "Узбекский"], english: "Базовый",
    education: "Педагогический колледж",
    attrs: { car: true, liveIn: true, night: false, newborn: true },
    about: "Работаю няней одиннадцать лет — от новорождённых до младших школьников. Для меня важно, чтобы ребёнку было спокойно и интересно: режим, прогулки, развивающие игры и много чтения вслух.\n\nПоследние четыре года сопровождала двух детей в одной семье от рождения до сада. Могу помочь с адаптацией к саду и мягким укладыванием.",
    reviews: [
      [5, "Севара работала с нашей дочкой два года. Внимательная, пунктуальная, дочка её обожала. Рекомендуем всей семьёй.", "Sherzod K."],
      [5, "Очень спокойный и надёжный человек. Всегда подробно рассказывала, как прошёл день.", "Наталья В."],
      [4, "Профессиональная няня, ребёнок быстро привык. Единственное — хотелось бы больше гибкости по графику.", "Диёра А."],
      [5, "Помогла наладить режим сна младенца за две недели. Золотой человек.", "Тимур М."],
      [5, "Доверяем ей самое дорогое уже второй год. Ни разу не пожалели.", "Камола И."],
    ],
  },
  {
    slug: "nilufar-karimova", name: "Нилюфар Каримова", category: "nanny",
    district: "Мирзо-Улугбекский", exp: 17, rating: "4.90", price: 50000, unit: "hour",
    trust: 91, level: "premium_verified", langs: ["Узбекский", "Русский"], english: "Нет",
    education: "ТашГПУ им. Низами, дошкольная педагогика",
    attrs: { car: false, liveIn: true, night: true, newborn: true },
    about: "Семнадцать лет опыта, из них девять — с двойняшками и погодками. Умею выстраивать день так, чтобы мама могла спокойно работать или отдыхать.\n\nГотовлю детское меню, знаю основы первой помощи, регулярно прохожу медосмотры.",
    reviews: [
      [5, "Нилюфар-опа — няня от Бога. С двумя нашими малышами справляется лучше, чем мы вдвоём.", "Азиза Р."],
      [5, "Работает у нас с проживанием почти год. Дом в порядке, дети счастливы.", "Bobur S."],
      [5, "Опыт чувствуется во всём. Спасибо за терпение и доброту!", "Мадина Х."],
    ],
  },
  {
    slug: "ekaterina-sokolova", name: "Екатерина Соколова", category: "nanny",
    district: "Яккасарайский", exp: 12, rating: "4.70", price: 55000, unit: "hour",
    trust: 79, level: "verified", langs: ["Русский"], english: "Свободный",
    education: "РГПУ им. Герцена, дошкольное образование",
    attrs: { car: false, liveIn: false, night: true, newborn: true },
    about: "Дипломированный педагог раннего развития. Занимаюсь с детьми по методикам Монтессори и мягкой сенсорной интеграции.\n\nСвободный английский — играем и читаем на двух языках. Подготовлю ребёнка к международному саду или школе.",
    reviews: [
      [5, "Сын за полгода заговорил по-английски в быту. Катя — потрясающий педагог.", "Лола Т."],
      [4, "Очень грамотный подход к развитию. Стоимость выше средней, но оправдана.", "Jasur A."],
      [5, "Надёжная и образованная няня, всегда на связи.", "Ирина П."],
    ],
  },
  {
    slug: "dilnoza-yusupova", name: "Дилноза Юсупова", category: "nanny",
    district: "Чиланзарский", exp: 5, rating: "4.60", price: 35000, unit: "hour",
    trust: 72, level: "verified", langs: ["Узбекский", "Русский"], english: "Базовый",
    education: "Ташкентский педагогический колледж",
    attrs: { car: false, liveIn: false, night: true, newborn: false },
    about: "Энергичная няня для активных малышей: прогулки, игры, творчество. Легко нахожу общий язык с детьми от года до семи.\n\nМогу выходить в ночные смены и подменять в выходные.",
    reviews: [
      [5, "Дилноза — солнечный человек, дети к ней тянутся. Очень выручает с ночными сменами.", "Нигора С."],
      [4, "Ответственная и добрая. Опыта пока меньше, чем у старших коллег, но старания на десять из десяти.", "Олег Д."],
    ],
  },
  {
    slug: "gulnora-azimova", name: "Гульнора Азимова", category: "caregiver",
    district: "Мирабадский", exp: 15, rating: "4.90", price: 380000, unit: "day",
    trust: 88, level: "premium_verified", langs: ["Узбекский", "Русский"], english: "Нет",
    education: "Ташкентский медицинский колледж, сестринское дело",
    attrs: { car: false, liveIn: true, night: true, newborn: false },
    about: "Медицинская сестра по образованию, пятнадцать лет ухаживаю за пожилыми людьми: гигиена, приём лекарств по расписанию, измерение давления и сахара, сопровождение к врачам.\n\nРаботала с лежачими пациентами и людьми с деменцией. Отношусь к подопечным как к родным.",
    reviews: [
      [5, "Гульнора-опа ухаживала за моей мамой полтора года. Профессионализм и человечность — редкое сочетание.", "Дилшод Н."],
      [5, "Медицинское образование чувствуется: всё по расписанию, все назначения врача соблюдаются идеально.", "Светлана К."],
      [5, "Бабушка называет её дочкой. Это говорит всё.", "Умид Р."],
    ],
  },
  {
    slug: "tatyana-morozova", name: "Татьяна Морозова", category: "caregiver",
    district: "Юнусабадский", exp: 20, rating: "4.80", price: 350000, unit: "day",
    trust: 86, level: "premium_verified", langs: ["Русский"], english: "Базовый",
    education: "Медицинское училище, сестринское дело",
    attrs: { car: false, liveIn: false, night: true, newborn: false },
    about: "Двадцать лет в уходе за пожилыми и людьми после операций. Умею обращаться с ходунками, противопролежневыми системами, знаю особенности восстановительного периода.\n\nСпокойная, аккуратная, без вредных привычек. Могу дежурить ночами.",
    reviews: [
      [5, "Татьяна Ивановна помогала папе восстановиться после инсульта. Терпение и профессионализм на высоте.", "Марина Л."],
      [5, "Очень организованная и внимательная. Всегда чистота и порядок.", "Рустам Г."],
      [4, "Опытная сиделка, рекомендую. Единственный минус — плотный график, сложно менять дни.", "Анвар Т."],
    ],
  },
  {
    slug: "kamila-rakhimova", name: "Камила Рахимова", category: "tutor",
    district: "Мирзо-Улугбекский", exp: 7, rating: "4.90", price: 70000, unit: "hour",
    trust: 87, level: "premium_verified", langs: ["Русский", "Узбекский", "Английский"], english: "Свободный",
    education: "УзГУМЯ, преподавание английского языка",
    attrs: { car: false, liveIn: false, night: false, newborn: false },
    about: "Преподаю английский детям и подросткам: от первых слов до IELTS. Средний результат моих учеников — IELTS 7.0.\n\nУрок строю на разговорной практике и играх, домашние задания — без зубрёжки. Занимаюсь у вас дома или онлайн.",
    reviews: [
      [5, "Дочь сдала IELTS на 7.5 после года занятий с Камилой. Лучший репетитор, что у нас был.", "Фарход Ю."],
      [5, "Сын полюбил английский — раньше это казалось невозможным.", "Екатерина Б."],
      [5, "Пунктуальная, современная, результат виден с первого месяца.", "Малика З."],
    ],
  },
  {
    slug: "aziz-tursunov", name: "Азиз Турсунов", category: "tutor",
    district: "Шайхантахурский", exp: 10, rating: "4.80", price: 60000, unit: "hour",
    trust: 82, level: "verified", langs: ["Узбекский", "Русский"], english: "Базовый",
    education: "НУУз, механико-математический факультет",
    attrs: { car: false, liveIn: false, night: false, newborn: false },
    about: "Готовлю школьников к экзаменам по математике и физике: национальные тесты, олимпиады, поступление в вузы.\n\nОбъясняю сложное простыми словами — ученики перестают бояться предмета и начинают решать сами.",
    reviews: [
      [5, "Сын поступил на бюджет в ТУИТ. Азиз-ака объясняет так, что понимает даже гуманитарий.", "Гульчехра М."],
      [5, "Строгий, но справедливый. Оценки по математике выросли с 3 до 5.", "Виктор С."],
      [4, "Отличный предметник. Иногда занятия сдвигаются из-за загруженности.", "Зарина К."],
    ],
  },
  {
    slug: "madina-ismailova", name: "Мадина Исмаилова", category: "tutor",
    district: "Яккасарайский", exp: 9, rating: "4.70", price: 55000, unit: "hour",
    trust: 78, level: "verified", langs: ["Русский", "Узбекский"], english: "Базовый",
    education: "ТашГПУ им. Низами, начальное образование",
    attrs: { car: false, liveIn: false, night: false, newborn: false },
    about: "Учитель начальных классов: чтение, письмо, математика, подготовка к школе. Помогаю первоклассникам мягко войти в учёбу.\n\nРаботаю с детьми с разным темпом — подбираю подход, а не подгоняю под шаблон.",
    reviews: [
      [5, "Дочка научилась читать за три месяца и полюбила книги. Спасибо, Мадина!", "Севиль А."],
      [4, "Хороший педагог для малышей, очень терпеливая.", "Денис Ф."],
    ],
  },
  {
    slug: "bakhtiyor-nasyrov", name: "Бахтиёр Насыров", category: "driver",
    district: "Юнусабадский", exp: 18, rating: "4.90", price: 35000, unit: "hour",
    trust: 89, level: "premium_verified", langs: ["Узбекский", "Русский"], english: "Базовый",
    education: "Категории B, C · безаварийный стаж 18 лет",
    attrs: { car: true, liveIn: false, night: false, newborn: false },
    about: "Восемнадцать лет за рулём без единой аварии. Вожу детей в школу и на секции, сопровождаю семьи в поездках по городу и области.\n\nСобственный минивэн с детскими креслами, всегда чистый салон. Не курю.",
    reviews: [
      [5, "Бахтиёр возит наших детей в школу второй год. Пунктуален до минуты, дети его обожают.", "Алишер Х."],
      [5, "Аккуратный стиль вождения, всегда поможет с сумками. Настоящий семейный водитель.", "Юлия Н."],
      [5, "Надёжен как швейцарские часы.", "Санжар Б."],
    ],
  },
  {
    slug: "shukhrat-alimov", name: "Шухрат Алимов", category: "driver",
    district: "Чиланзарский", exp: 14, rating: "4.70", price: 30000, unit: "hour",
    trust: 80, level: "verified", langs: ["Узбекский", "Русский"], english: "Нет",
    education: "Категории B · стаж 14 лет",
    attrs: { car: true, liveIn: false, night: false, newborn: false },
    about: "Семейный водитель: школа, секции, поликлиника, аэропорт. Знаю город без навигатора, всегда есть запасной маршрут.\n\nСедан бизнес-класса, детское кресло по запросу.",
    reviews: [
      [5, "Возит жену и сына уже полгода. Спокойный, вежливый, машина всегда чистая.", "Отабек И."],
      [4, "Хороший водитель, изредка бывают накладки по времени в час пик.", "Мария В."],
    ],
  },
  {
    slug: "dmitriy-kovalev", name: "Дмитрий Ковалёв", category: "driver",
    district: "Мирабадский", exp: 22, rating: "4.80", price: 40000, unit: "hour",
    trust: 85, level: "premium_verified", langs: ["Русский"], english: "Базовый",
    education: "Категории B, D · курсы контраварийного вождения",
    attrs: { car: true, liveIn: false, night: false, newborn: false },
    about: "Профессиональный водитель с двадцатидвухлетним стажем, включая работу в дипломатических миссиях. Прошёл курсы контраварийной подготовки.\n\nКонфиденциальность, пунктуальность, деловой стиль. Комфортный кроссовер бизнес-класса.",
    reviews: [
      [5, "Дмитрий — водитель экстра-класса. Доверяем ему перевозку детей без сопровождения.", "Георгий А."],
      [5, "Безупречная пунктуальность и такт. Рекомендую для деловых семей.", "Нодира Ш."],
      [4, "Очень профессионален, стоимость соответствует уровню.", "Павел Е."],
    ],
  },
];

try {
  await sql.begin(async (tx) => {
    const districts = await tx`select id, name_ru from districts`;
    const districtId = (name) =>
      districts.find((d) => d.name_ru === name)?.id ?? null;

    // стабильное сопоставление: сначала по уже присвоенному slug,
    // свободные строки (slug is null) раздаются только новым записям
    const all = await tx`
      select id, slug from specialist_profiles where status = 'active'
      order by trust_score desc, full_name asc`;
    const free = all.filter((p) => !p.slug).map((p) => p.id);
    const targetId = (slug) => {
      const existing = all.find((p) => p.slug === slug);
      if (existing) return existing.id;
      const next = free.shift();
      if (!next) throw new Error(`нет свободной анкеты для slug ${slug}`);
      return next;
    };

    // авторы отзывов: демо-родители (upsert по email)
    const authorIds = new Map();
    for (const s of S) {
      for (const [, , author] of s.reviews) {
        if (authorIds.has(author)) continue;
        const email = `demo-author-${authorIds.size + 1}@nyanya.uz`;
        const [existing] = await tx`select id from "user" where email = ${email}`;
        if (existing) {
          await tx`update "user" set name = ${author} where id = ${existing.id}`;
          authorIds.set(author, existing.id);
        } else {
          const id = crypto.randomUUID();
          await tx`insert into "user" (id, name, email, email_verified, role, locale)
                   values (${id}, ${author}, ${email}, true, 'parent', 'ru')`;
          authorIds.set(author, id);
        }
      }
    }

    for (let i = 0; i < S.length; i++) {
      const s = S[i];
      const profileId = targetId(s.slug);
      const birthYear = new Date().getFullYear() - AGES[i];
      await tx`
        update specialist_profiles set
          birth_date = ${`${birthYear}-06-15`},
          slug = ${s.slug},
          category = ${s.category},
          full_name = ${s.name},
          photo_key = ${"/images/specialists/" + s.slug + ".jpg"},
          district_id = ${districtId(s.district)},
          experience_years = ${s.exp},
          education = ${s.education},
          languages = ${s.langs},
          price_amount = ${s.price},
          price_unit = ${s.unit},
          description = ${s.about},
          has_car = ${s.attrs.car},
          live_in = ${s.attrs.liveIn},
          night_available = ${s.attrs.night},
          newborn_exp = ${s.attrs.newborn},
          english_level = ${englishMap[s.english]},
          verification_level = ${s.level},
          trust_score = ${s.trust},
          rating_avg = ${s.rating},
          review_count = ${s.reviews.length},
          status = 'active',
          updated_at = now()
        where id = ${profileId}`;

      await tx`delete from reviews where specialist_id = ${profileId}`;
      for (const [rating, text, author] of s.reviews) {
        await tx`insert into reviews (specialist_id, author_parent_id, rating, text)
                 values (${profileId}, ${authorIds.get(author)}, ${rating}, ${text})`;
      }
    }
  });

  const [{ count }] = await sql`
    select count(*)::int as count from specialist_profiles where slug is not null`;
  console.log(`seed-upgrade: готово, анкет со slug: ${count}`);
} finally {
  await sql.end();
}

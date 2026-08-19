-- Все районы Ташкента (2026-08-13).
--
-- В справочнике было только шесть из двенадцати, и выпадающий список
-- предлагал вперемешку районы трёх городов без указания города — из-за чего
-- «Центр» встречался дважды (Самарканд и Бухара), а половину настоящих
-- районов Ташкента выбрать было нельзя.
--
-- Районы других городов НЕ удаляются: на них уже ссылаются анкеты, и
-- удаление увело бы их в никуда. Из выбора они убраны на уровне запроса.
--
-- ON CONFLICT здесь не поможет: уникального ключа по названию нет, поэтому
-- вставляем только то, чего ещё нет.
INSERT INTO districts (city_id, name_ru, name_uz, name_en)
SELECT v.city_id, v.name_ru, v.name_uz, v.name_en
FROM (VALUES
  (1, 'Алмазарский',   'Olmazor',   'Olmazor'),
  (1, 'Бектемирский',  'Bektemir',  'Bektemir'),
  (1, 'Сергелийский',  'Sergeli',   'Sergeli'),
  (1, 'Учтепинский',   'Uchtepa',   'Uchtepa'),
  (1, 'Яшнабадский',   'Yashnobod', 'Yashnobod'),
  (1, 'Янгихаётский',  'Yangihayot','Yangihayot')
) AS v(city_id, name_ru, name_uz, name_en)
WHERE NOT EXISTS (
  SELECT 1 FROM districts d
  WHERE d.city_id = v.city_id AND d.name_ru = v.name_ru
);

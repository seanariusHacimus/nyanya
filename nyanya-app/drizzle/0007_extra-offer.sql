-- «Что ещё вы можете предложить» — свободный текст сверх фиксированных меток.
-- Только добавление колонки; существующие строки не переписываются.
ALTER TABLE "specialist_profiles" ADD COLUMN IF NOT EXISTS "extra_offer" text;
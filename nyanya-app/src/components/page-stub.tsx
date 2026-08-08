import { ButtonLink } from "@/components/ui/button-link";

/**
 * Временная страница-заглушка для разделов, которые ещё в разработке.
 * Каждый маршрут получит полноценную страницу по nyanya_project.md.
 */
export function PageStub({ title }: { title: string }) {
  return (
    <main className="flex flex-1 items-center">
      <div className="mx-auto max-w-[1400px] px-5 py-28 text-center sm:px-8">
        <p className="label-caps text-bronze-text">Раздел в разработке</p>
        <h1 className="mt-6 font-display text-4xl leading-[1.12] font-medium text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
          Эта страница скоро появится. Пока вы можете вернуться на главную.
        </p>
        <div className="mt-10 flex justify-center">
          <ButtonLink href="/">На главную</ButtonLink>
        </div>
      </div>
    </main>
  );
}

import { Plus } from "@phosphor-icons/react/dist/ssr";

export type AccordionItem = { q: string; a: string };

/** Аккордеон на нативных details/summary — доступен с клавиатуры без JS. */
export function Accordion({ items }: { items: readonly AccordionItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {item.q}
            <Plus
              size={18}
              aria-hidden="true"
              className="shrink-0 text-bronze transition-transform duration-300 group-open:rotate-45"
            />
          </summary>
          <p className="max-w-2xl pb-6 text-sm leading-relaxed text-ink-soft">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}

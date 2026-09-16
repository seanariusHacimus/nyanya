"use client";

import { useState } from "react";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";

export type FaqGroup = { title: string; items: readonly AccordionItem[] };

export function FaqTabs({ groups }: { groups: readonly FaqGroup[] }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Разделы вопросов"
        className="flex flex-wrap gap-2"
      >
        {groups.map((group, i) => (
          <button
            key={group.title}
            role="tab"
            id={`faq-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`faq-panel-${i}`}
            onClick={() => setActive(i)}
            className={`label-caps min-h-11 border px-5 transition-colors duration-300 ${
              i === active
                ? "border-ink bg-ink text-cream"
                : "border-line bg-transparent text-ink-soft hover:border-ink-faint hover:text-ink"
            }`}
          >
            {group.title}
          </button>
        ))}
      </div>

      {groups.map((group, i) => (
        <div
          key={group.title}
          role="tabpanel"
          id={`faq-panel-${i}`}
          aria-labelledby={`faq-tab-${i}`}
          hidden={i !== active}
          className="mt-10"
        >
          <Accordion items={group.items} />
        </div>
      ))}
    </div>
  );
}

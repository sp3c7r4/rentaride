"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button-link";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export type FaqGroup = {
  id: string;
  title: string;
  items: { q: string; a: string }[];
};

/** Searchable FAQ, grouped by topic. Each group is an anchor target. */
export function Faq({ groups }: { groups: FaqGroup[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          items: q
            ? g.items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(q))
            : g.items,
        }))
        .filter((g) => g.items.length > 0),
    [groups, q],
  );

  return (
    <div className="flex flex-col gap-10">
      <InputGroup className="h-12 max-w-xl bg-white">
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label="Search help articles"
          placeholder="Search, for example: deposit, payout, licence"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </InputGroup>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-zinc-600">
            Nothing matches &ldquo;{query}&rdquo;. Try another word, or ask us
            directly.
          </p>
          <ButtonLink variant="outline" href="/contact">
            Contact support
          </ButtonLink>
        </div>
      ) : (
        filtered.map((g) => (
          <section
            key={g.id}
            id={g.id}
            className="grid scroll-mt-24 gap-4 lg:grid-cols-[14rem_1fr] lg:gap-12"
          >
            <h2 className="text-lg font-semibold text-zinc-950">{g.title}</h2>
            <Accordion
              // Expand everything that matches while searching.
              key={q ? `search-${q}` : "browse"}
              multiple
              defaultValue={q ? g.items.map((i) => i.q) : []}
              className="rounded-xl border bg-white px-4"
            >
              {g.items.map((i) => (
                <AccordionItem key={i.q} value={i.q}>
                  <AccordionTrigger className="text-base">
                    {i.q}
                  </AccordionTrigger>
                  <AccordionContent className="leading-relaxed text-zinc-600">
                    {i.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))
      )}
    </div>
  );
}

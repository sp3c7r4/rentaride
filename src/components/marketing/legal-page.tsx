import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";

export type LegalSection = {
  id: string;
  title: string;
  /** Paragraphs. Strings starting with "- " render as list items. */
  body: string[];
};

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of service" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/cookies", label: "Cookie policy" },
];

function Body({ lines }: { lines: string[] }) {
  // Group consecutive "- " lines into one list.
  const blocks: (string | string[])[] = [];
  for (const line of lines) {
    if (line.startsWith("- ")) {
      const last = blocks.at(-1);
      if (Array.isArray(last)) last.push(line.slice(2));
      else blocks.push([line.slice(2)]);
    } else {
      blocks.push(line);
    }
  }
  return (
    <>
      {blocks.map((b) =>
        Array.isArray(b) ? (
          <ul key={b[0]} className="flex list-disc flex-col gap-1.5 pl-5">
            {b.map((li) => (
              <li key={li}>{li}</li>
            ))}
          </ul>
        ) : (
          <p key={b}>{b}</p>
        ),
      )}
    </>
  );
}

/** Long-form legal document with a sticky table of contents. */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
  current,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  current: string;
}) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} description={intro}>
        <p className="text-sm text-zinc-500">Last updated {updated}</p>
      </PageHero>
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:px-8">
        <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="On this page" className="hidden lg:block">
            <p className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              On this page
            </p>
            <ol className="flex flex-col gap-2 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-zinc-600 hover:text-zinc-950"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <nav aria-label="Legal documents">
            <p className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Legal
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm lg:flex-col">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={l.href === current ? "page" : undefined}
                    className="text-zinc-600 hover:text-zinc-950 aria-[current=page]:font-medium aria-[current=page]:text-zinc-950"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <article className="flex max-w-3xl flex-col gap-10">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Draft for legal review. This text is a starting point and is not yet
            the binding version of this document.
          </p>
          {sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="flex scroll-mt-24 flex-col gap-3 leading-relaxed text-zinc-700"
            >
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                {i + 1}. {s.title}
              </h2>
              <Body lines={s.body} />
            </section>
          ))}
        </article>
      </div>
    </>
  );
}

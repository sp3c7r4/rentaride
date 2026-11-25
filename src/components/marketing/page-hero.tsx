import { cn } from "@/lib/utils";

/** Heading band at the top of a public content page. */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b bg-zinc-50", className)}>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        {eyebrow && (
          <p className="text-sm font-medium text-amber-600">{eyebrow}</p>
        )}
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-lg leading-relaxed text-pretty text-zinc-600">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

/** Centered content column for body sections. */
export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20", className)}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}

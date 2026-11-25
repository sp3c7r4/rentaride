import { ScrollReveal } from "./scroll-reveal";

const makes = ["Toyota", "Honda", "Hyundai", "Ford", "Kia", "Lexus", "Peugeot", "Nissan"];

export function TrustBar() {
  return (
    <section className="bg-white py-14">
      <ScrollReveal><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-xs font-semibold uppercase tracking-widest text-zinc-400 text-center">
          Popular makes on the platform
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {makes.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold tracking-tight text-zinc-300 select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </ScrollReveal>
    </section>
  );
}

import Image from "next/image";
import { ScrollReveal } from "./scroll-reveal";

const testimonials = [
  {
    name: "Emeka O.",
    role: "Driver, Lagos",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face&auto=format&q=80",
    quote:
      "The weekly schedule works perfectly with how I earn. I knew exactly what I owed and when. Got verified once and I've been driving ever since.",
  },
  {
    name: "Adaeze N.",
    role: "Car Owner, Abuja",
    photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop&crop=face&auto=format&q=80",
    quote:
      "I have two cars that were sitting idle. The platform handles driver vetting, repayments, and disputes. I just check my payout statement.",
  },
  {
    name: "Chukwudi M.",
    role: "Driver, Port Harcourt",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face&auto=format&q=80",
    quote:
      "The condition photos at handover protected me when there was a pre-existing scratch. The process was transparent throughout.",
  },
  {
    name: "Fatimah A.",
    role: "Car Owner, Kano",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face&auto=format&q=80",
    quote:
      "The reviewer approved my documents within 48 hours. My car went from zero income to a steady monthly reimbursement quickly.",
  },
];

export function Testimonials() {
  return (
    <section className="bg-white py-24">
      <ScrollReveal><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            From drivers and owners
          </h2>
          <p className="mt-3 text-base text-zinc-500">
            Across Lagos, Abuja, Port Harcourt, and Kano.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map(({ name, role, photo, quote }) => (
            <div key={name} className="flex flex-col gap-5 bg-white rounded-2xl p-6 border-none shadow-none outline-none">
              <blockquote className="flex-1 text-sm leading-relaxed text-zinc-600">
                &ldquo;{quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={photo}
                    alt={name}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{name}</p>
                  <p className="text-xs text-zinc-400">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
    </section>
  );
}

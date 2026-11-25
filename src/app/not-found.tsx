import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950 text-white">
      <header className="flex h-16 items-center px-6 sm:px-10">
        <Link href="/" className="text-sm font-bold tracking-tight">
          RentARide
        </Link>
      </header>

      <div className="flex flex-1 flex-col items-start justify-center gap-6 px-6 pb-24 sm:px-10 lg:px-20">
        <p className="text-sm font-medium text-amber-400">Error 404</p>
        <div className="flex max-w-lg flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            This page isn&apos;t available yet.
          </h1>
          <p className="text-base leading-relaxed text-zinc-400">
            The page you&apos;re looking for doesn&apos;t exist, or we
            haven&apos;t built it yet. Head back home and keep going.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink
            size="lg"
            className="h-11 bg-white px-5 text-zinc-950 hover:bg-zinc-200"
            href="/"
          >
            Back to home
          </ButtonLink>
          <ButtonLink
            variant="ghost"
            size="lg"
            className="h-11 px-5 text-zinc-300 hover:bg-white/10 hover:text-white"
            href="/login"
          >
            Sign in
          </ButtonLink>
        </div>
      </div>

      <p
        aria-hidden
        className="-mb-[0.12em] select-none whitespace-nowrap px-4 font-bold leading-none tracking-tight text-zinc-900 sm:px-6"
        style={{ fontSize: "clamp(4rem, 14vw, 13rem)" }}
      >
        RentARide
      </p>
    </main>
  );
}

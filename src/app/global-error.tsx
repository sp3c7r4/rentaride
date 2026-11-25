"use client";

import "./globals.css";

/** Last-resort boundary for errors in the root layout. Renders its own document. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 font-sans text-white antialiased">
        <main className="flex max-w-md flex-col gap-4">
          <p className="text-sm font-medium text-amber-400">RentARide</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-zinc-400">
            The app couldn&apos;t load. Try again, and if it keeps happening,
            contact support@rentaride.ng.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-zinc-500">
              Reference {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            className="w-fit rounded-full bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

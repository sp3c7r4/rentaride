import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RentARide",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      {/* Minimal top bar */}
      <header className="h-16 flex items-center px-6 shrink-0">
        <a href="/" className="text-sm font-bold tracking-tight text-zinc-900">
          RentARide
        </a>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}

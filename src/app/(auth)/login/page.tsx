import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      {/* Heading */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Welcome back
        </h1>
        <p className="text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-900 underline underline-offset-4 hover:text-amber-600 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>

      {/* Form */}
      <form action="/dashboard" method="GET" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="emeka@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          className={cn(
            buttonVariants({ size: "lg" }),
            "w-full bg-zinc-900 text-white hover:bg-zinc-800 mt-1"
          )}
        >
          Sign in
        </button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-zinc-400">or</span>
        <Separator className="flex-1" />
      </div>

      <p className="text-xs text-zinc-400 text-center leading-relaxed">
        New to RentARide?{" "}
        <Link
          href="/signup"
          className="font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 transition-colors"
        >
          Create an account
        </Link>{" "}
        — it only takes a minute.
      </p>
    </div>
  );
}

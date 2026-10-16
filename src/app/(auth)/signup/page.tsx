import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      {/* Heading */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Create your account
        </h1>
        <p className="text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline underline-offset-4 hover:text-amber-600 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Form — navigates to role selection on submit */}
      <form action="/signup/role" method="GET" className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              name="firstName"
              type="text"
              placeholder="Emeka"
              autoComplete="given-name"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              name="lastName"
              type="text"
              placeholder="Okafor"
              autoComplete="family-name"
              required
            />
          </div>
        </div>

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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            minLength={8}
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
          Continue
        </button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-zinc-400">or</span>
        <Separator className="flex-1" />
      </div>

      <p className="text-xs text-zinc-400 text-center leading-relaxed">
        By continuing, you agree to RentARide's{" "}
        <Link
          href="/terms"
          className="underline underline-offset-4 hover:text-zinc-700 transition-colors"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-4 hover:text-zinc-700 transition-colors"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

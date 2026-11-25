import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { OnboardingData } from "@/lib/kyc";

export type StepProps = {
  data: OnboardingData;
  onBack: () => void;
  onNext: (patch: Partial<OnboardingData>) => void;
};

/** Shared heading block + content slot for each onboarding step. */
export function StepFrame({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-md flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

/** Back (secondary) + primary action row, shared by every step. */
export function StepActions({
  onBack,
  backDisabled,
  submitLabel,
  loadingLabel,
  loading,
  disabled,
  onSubmit,
}: {
  onBack: () => void;
  backDisabled?: boolean;
  submitLabel: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  /** When set, the primary button is a plain button instead of a form submit. */
  onSubmit?: () => void;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 px-5"
        onClick={onBack}
        disabled={backDisabled || loading}
      >
        Back
      </Button>
      <Button
        type={onSubmit ? "button" : "submit"}
        size="lg"
        className="h-11 flex-1"
        disabled={disabled || loading}
        onClick={onSubmit}
      >
        {loading && <Spinner data-icon="inline-start" />}
        {loading ? (loadingLabel ?? "Saving…") : submitLabel}
      </Button>
    </div>
  );
}

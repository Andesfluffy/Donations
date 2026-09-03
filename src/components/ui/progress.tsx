import { cn } from "@/lib/utils";

export interface ProgressProps {
  /** 0–100. Callers should pass the clamped value from `progressPercent`. */
  value: number;
  label: string;
  className?: string;
  tone?: "primary" | "accent" | "success";
}

const TONES = {
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
} as const;

export function Progress({ value, label, className, tone = "primary" }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-surface-sunken ring-1 ring-inset ring-line",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", TONES[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

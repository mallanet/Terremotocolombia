/**
 * Design-system tokens for @/src/ui atoms.
 *
 * Minimal semantic class constants — only what the existing atoms consume.
 * No speculative tokens (YAGNI).
 */

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

/** Classes shared by every Button variant. */
export const buttonBase =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50";

/** Per-variant colour classes for Button. */
export const buttonVariants = {
  primary:
    "bg-brand-blue text-white hover:bg-brand-blue-dark focus-visible:ring-brand-blue",
  ghost:
    "bg-transparent text-brand-blue hover:bg-brand-blue-light focus-visible:ring-brand-blue",
} as const;

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

export const metricCardShell =
  "rounded-2xl border border-border-soft bg-white p-4 shadow-sm";
export const metricCardLabel = "text-sm text-ink-muted";
export const metricCardValue = "mt-1 text-3xl font-bold text-ink";
export const metricCardSub = "mt-1 text-xs text-ink-muted";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export const inputBase =
  "block w-full rounded-lg border border-border-soft bg-white px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-muted " +
  "focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 focus:border-brand-blue " +
  "disabled:pointer-events-none disabled:opacity-50";
export const inputLabel = "mb-1 block text-sm font-medium text-ink";

"use client";

// ============================================================================
// Odone — Settings section primitive
// ----------------------------------------------------------------------------
// Lightweight wrapper used by all 13 subpages so headings + descriptions stay
// consistent. Renders as a rounded-2xl card with a 5-unit padding to match
// order-overview-tab. Optional `actions` slot lives top-right of the heading.
//
// SettingsRow is now backed by the shadcn `Field` primitive — same dense
// 2-column layout, but the label / description / control all carry the
// data-slot attributes downstream tooling expects (a11y, theme inspectors,
// future error states from FieldError).
// ============================================================================

import * as React from "react";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function SettingsSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card",
        className,
      )}
    >
      {(title || description || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-1 min-w-0">
            {title && (
              <h2 className="text-fluid-sm font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-fluid-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/** Sticky bottom action bar — used by Profile / Workspace pages with a "Save" CTA. */
export function SettingsStickyFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center justify-end gap-2">{children}</div>
    </div>
  );
}

/** Form row with a left label/help column and right control column. Uses the
 *  shadcn Field primitives under the hood so labels + descriptions all carry
 *  the data-slot semantics shared with the rest of the codebase. */
export function SettingsRow({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Field
      className={cn(
        "grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[200px_1fr] sm:items-start sm:gap-6",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5 sm:pt-1.5">
        <FieldLabel
          htmlFor={htmlFor}
          className="text-fluid-sm font-medium text-foreground"
        >
          {label}
        </FieldLabel>
        {hint && (
          <FieldDescription className="text-fluid-xs">{hint}</FieldDescription>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </Field>
  );
}

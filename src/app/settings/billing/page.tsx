"use client";

// ============================================================================
// Odone — /settings/billing
// ----------------------------------------------------------------------------
// Current plan card (Pro · $49/seat/mo · 8 seats), seats usage bar, payment
// method (Visa •••• 4242), invoices table for the last 6 periods, billing
// email + tax/VAT inputs. Admin-only. All actions toast-mocked.
// ============================================================================

import * as React from "react";
import {
  ArrowRightIcon,
  CreditCardIcon,
  DownloadIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Invoice = {
  id: string;
  date: string;
  period: string;
  amount: string;
  status: "Paid" | "Open" | "Refunded";
};

const INVOICES: Invoice[] = [
  { id: "INV-2026-05", date: "05/01/2026", period: "May 2026", amount: "$392.00", status: "Paid" },
  { id: "INV-2026-04", date: "04/01/2026", period: "Apr 2026", amount: "$392.00", status: "Paid" },
  { id: "INV-2026-03", date: "03/01/2026", period: "Mar 2026", amount: "$343.00", status: "Paid" },
  { id: "INV-2026-02", date: "02/01/2026", period: "Feb 2026", amount: "$343.00", status: "Paid" },
  { id: "INV-2026-01", date: "01/01/2026", period: "Jan 2026", amount: "$343.00", status: "Paid" },
  { id: "INV-2025-12", date: "12/01/2025", period: "Dec 2025", amount: "$294.00", status: "Refunded" },
];

export default function BillingSettingsPage() {
  const [billingEmail, setBillingEmail] = React.useState(
    "billing@starep.media",
  );
  const [taxId, setTaxId] = React.useState("");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <SettingsSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              >
                <SparklesIcon className="size-3" /> Pro
              </Badge>
              <span className="text-fluid-xs text-muted-foreground">
                Current plan
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-fluid-lg font-semibold text-foreground">
                $49
              </span>
              <span className="text-fluid-sm text-muted-foreground">
                / seat / month
              </span>
            </div>
            <p className="text-fluid-xs text-muted-foreground">
              8 seats included. Renews on{" "}
              <span className="text-foreground">06/01/2026</span> · billed in
              USD.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <Button onClick={() => toast.info("Showing plan comparison")}>
              Upgrade plan
              <ArrowRightIcon className="size-3.5" />
            </Button>
            <button
              type="button"
              onClick={() => toast.info("Cancellation flow opened")}
              className="text-fluid-xs text-muted-foreground hover:text-foreground"
            >
              Cancel subscription
            </button>
          </div>
        </div>
        <Separator className="my-5" />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-fluid-xs">
            <span className="font-medium uppercase tracking-wide text-muted-foreground">
              Seats
            </span>
            <span className="text-foreground">
              <span className="font-medium">8</span>
              <span className="text-muted-foreground"> / 10 included</span>
            </span>
          </div>
          <div
            className="relative h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={80}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span className="absolute inset-y-0 left-0 w-[80%] rounded-full bg-emerald-500" />
          </div>
          <p className="text-fluid-xs text-muted-foreground">
            Each additional seat is billed at the next renewal. You're using
            80% of your included seats.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Payment method"
        description="Charged automatically on each renewal date."
      >
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-foreground text-background">
              <CreditCardIcon className="size-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-fluid-sm font-medium text-foreground">
                Visa ending in 4242
              </span>
              <span className="text-fluid-xs text-muted-foreground">
                Expires 09/2028 · Oliver Tuan
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Opening Stripe card form")}
            >
              Update card
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info("Add a backup method (mock)")}
            >
              Add backup
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Invoices"
        description="Last 6 billing periods. Older invoices are available on request."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Downloading all invoices…")}
          >
            <DownloadIcon className="size-3.5" />
            Download all
          </Button>
        }
      >
        <div className="overflow-hidden rounded-xl border border-border">
          <Table className="[&_tbody_tr]:border-b-0">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="w-[120px] text-right">Amount</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {INVOICES.map((inv) => (
                <TableRow key={inv.id} className="border-t border-border">
                  <TableCell className="font-mono text-fluid-xs text-muted-foreground">
                    {inv.date}
                  </TableCell>
                  <TableCell className="text-fluid-sm">{inv.period}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {inv.amount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        inv.status === "Paid"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : inv.status === "Refunded"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Download ${inv.id}`}
                      onClick={() => toast.info(`Downloading ${inv.id}`)}
                    >
                      <DownloadIcon className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Billing details"
        description="Where receipts go and what shows up on every invoice."
      >
        <div className="divide-y divide-border">
          <SettingsRow
            label="Billing email"
            hint="Receipts and dunning emails are sent here."
            htmlFor="bill-email"
          >
            <Input
              id="bill-email"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              className="sm:max-w-sm"
            />
          </SettingsRow>
          <SettingsRow
            label="Tax / VAT ID"
            hint="Added to invoices when present."
            htmlFor="bill-tax"
          >
            <Input
              id="bill-tax"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="e.g. US-EIN 12-3456789"
              className="sm:max-w-sm"
            />
          </SettingsRow>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => toast.success("Billing details saved")}>
            Save billing
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}

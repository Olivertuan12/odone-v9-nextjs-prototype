"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// 390×844 = iPhone 14 logical pixels.
// On real mobile (<=480px), the frame is invisible — children go full bleed.
// On desktop, children are clipped to a phone-shaped frame with notch + bezel.
export function PhoneFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="grid min-h-svh w-full place-items-center bg-neutral-950 p-0 md:p-6">
      <div
        className={cn(
          // mobile: full screen
          "relative h-svh w-full overflow-hidden bg-background",
          // desktop: phone shape
          "md:h-[844px] md:w-[390px] md:rounded-[44px] md:border-[10px] md:border-neutral-900 md:shadow-2xl md:ring-1 md:ring-white/5",
          className,
        )}
      >
        {/* Notch — desktop only */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-[26px] w-[110px] -translate-x-1/2 rounded-b-[18px] bg-neutral-900 md:block" />

        {/* Status bar — desktop only (mobile uses real one) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 hidden h-[42px] items-center justify-between px-7 text-[12px] font-semibold text-white md:flex">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <SignalIcon />
            <WifiIcon />
            <BatteryIcon />
          </span>
        </div>

        {/* Inner viewport — padded down past notch on desktop only */}
        <div className="relative flex h-full w-full flex-col md:pt-[42px]">
          {children}
        </div>
      </div>
    </div>
  );
}

function SignalIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
      <rect x="0" y="8" width="2.5" height="3" rx="0.5" />
      <rect x="4" y="6" width="2.5" height="5" rx="0.5" />
      <rect x="8" y="3" width="2.5" height="8" rx="0.5" />
      <rect x="12" y="0" width="2.5" height="11" rx="0.5" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
      <path d="M7 9.5a1 1 0 100-2 1 1 0 000 2zM2.5 4.6a6.5 6.5 0 019 0l-1 1a5 5 0 00-7 0l-1-1zM.6 2.7a9.2 9.2 0 0112.8 0l-1 1a7.7 7.7 0 00-10.8 0l-1-1z" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
      <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.5" />
      <rect x="2" y="2" width="13" height="8" rx="1.5" fill="currentColor" />
      <rect x="24" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

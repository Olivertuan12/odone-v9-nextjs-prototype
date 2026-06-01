import * as React from "react";
import { PhoneFrame } from "@/components/mobile/phone-frame";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <PhoneFrame>{children}</PhoneFrame>;
}

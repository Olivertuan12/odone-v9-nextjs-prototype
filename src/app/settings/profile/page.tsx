"use client";

// ============================================================================
// Odone — /settings/profile
// ----------------------------------------------------------------------------
// Profile editor for the current admin (Oliver Tuan). Avatar zone is a mock
// "upload" target (no real handler — toast feedback only), the rest is plain
// controlled inputs / textarea / Select. Sticky footer hosts Save / Cancel.
// ============================================================================

import * as React from "react";
import { CameraIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import {
  SettingsRow,
  SettingsSection,
  SettingsStickyFooter,
} from "@/components/settings/settings-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TIME_ZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles" },
  { value: "America/Denver", label: "Mountain Time — Denver" },
  { value: "America/Chicago", label: "Central Time — Chicago" },
  { value: "America/New_York", label: "Eastern Time — New York" },
  { value: "Asia/Ho_Chi_Minh", label: "Indochina Time — Ho Chi Minh City" },
  { value: "Asia/Manila", label: "Philippine Time — Manila" },
];

const LANGUAGES = [
  { value: "en", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "tl", label: "Filipino" },
  { value: "es", label: "Español" },
];

export default function ProfileSettingsPage() {
  const [name, setName] = React.useState("Oliver Tuan");
  const [displayName, setDisplayName] = React.useState("Oliver");
  const [email, setEmail] = React.useState("olivertuan198@gmail.com");
  const [phone, setPhone] = React.useState("+1 (415) 555-0119");
  const [timeZone, setTimeZone] = React.useState("America/Los_Angeles");
  const [language, setLanguage] = React.useState("en");
  const [bio, setBio] = React.useState(
    "Admin of STAREP MEDIA. Production lead for shoots, editor handoff, and client delivery across the West Coast.",
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsSection
        title="Photo"
        description="Visible to your team and on share links you send."
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative">
            <Avatar className="size-20">
              <AvatarImage
                src="https://i.pravatar.cc/200?u=oliver"
                alt="Oliver Tuan"
              />
              <AvatarFallback className="bg-emerald-500/20 text-emerald-200 text-base">
                OT
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-card bg-foreground text-background">
              <CameraIcon className="size-3.5" />
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => toast.info("Choose a new photo (mock)")}
              >
                <UploadIcon className="size-3.5" />
                Upload new
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Photo removed (mock)")}
              >
                Remove
              </Button>
            </div>
            <p className="text-fluid-xs text-muted-foreground">
              PNG, JPG or GIF up to 2MB. Square images work best.
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Identity"
        description="Your name as it appears across the workspace."
      >
        <div className="divide-y divide-border">
          <SettingsRow
            label="Full name"
            hint="Used on invoices and admin actions."
            htmlFor="profile-name"
          >
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </SettingsRow>
          <SettingsRow
            label="Display name"
            hint="Short name used in chat and assignment chips."
            htmlFor="profile-display"
          >
            <Input
              id="profile-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </SettingsRow>
          <SettingsRow
            label="Email"
            hint="Login + system notifications go here."
            htmlFor="profile-email"
          >
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </SettingsRow>
          <SettingsRow
            label="Phone"
            hint="For shoot-day SMS coordination only."
            htmlFor="profile-phone"
          >
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Locale"
        description="Drives date / time formatting and translated copy."
      >
        <div className="divide-y divide-border">
          <SettingsRow label="Time zone" htmlFor="profile-tz">
            <Select
              value={timeZone}
              onValueChange={(v) => setTimeZone(v as string)}
              items={TIME_ZONES}
            >
              <SelectTrigger id="profile-tz" className="w-full sm:max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_ZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow label="Language" htmlFor="profile-lang">
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as string)}
              items={LANGUAGES}
            >
              <SelectTrigger id="profile-lang" className="w-full sm:max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="About"
        description="A short bio your editors and vendors will see in your profile card."
      >
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="resize-y"
          placeholder="What you focus on, where you ship, anything you'd like collaborators to know."
        />
        <div className="mt-2 flex justify-end text-fluid-xs text-muted-foreground">
          {bio.length}/280
        </div>
      </SettingsSection>

      <SettingsStickyFooter>
        <Button
          variant="ghost"
          onClick={() => toast.info("Changes discarded")}
        >
          Cancel
        </Button>
        <Button onClick={() => toast.success("Profile updated")}>
          Save changes
        </Button>
      </SettingsStickyFooter>
    </div>
  );
}

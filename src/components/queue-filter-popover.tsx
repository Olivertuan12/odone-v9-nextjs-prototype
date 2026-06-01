"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { users } from "@/components/editor-data";

const STAGES = [
  { id: "pending", label: "Pending" },
  { id: "working", label: "Working On" },
  { id: "revision", label: "Revision" },
  { id: "deliver", label: "Deliver" },
];

const TYPES = [
  { id: "walkthrough", label: "Walkthrough" },
  { id: "drone", label: "Drone" },
  { id: "photo", label: "Photo" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function CheckRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/50"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(c) => onChange(c === true)}
      />
      <span className="flex-1 text-foreground">{label}</span>
    </label>
  );
}

export function QueueFilterPopover({ trigger }: { trigger: React.ReactNode }) {
  const [stages, setStages] = React.useState<Set<string>>(
    new Set(["working", "revision"]),
  );
  const [people, setPeople] = React.useState<Set<string>>(new Set());
  const [types, setTypes] = React.useState<Set<string>>(new Set());
  const [overdueOnly, setOverdueOnly] = React.useState(false);

  const toggle = (
    set: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
    checked: boolean,
  ) => {
    const next = new Set(set);
    if (checked) next.add(id);
    else next.delete(id);
    setter(next);
  };

  const clearAll = () => {
    setStages(new Set());
    setPeople(new Set());
    setTypes(new Set());
    setOverdueOnly(false);
  };

  return (
    <Popover>
      <PopoverTrigger render={trigger as React.ReactElement} />
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[320px] gap-0 p-0"
      >
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        </div>
        <Separator />

        <ScrollArea className="max-h-[420px]">
          <div className="flex flex-col gap-4 p-3">
            <Section title="Stage">
              <div className="flex flex-col gap-0.5">
                {STAGES.map((s) => (
                  <CheckRow
                    key={s.id}
                    id={`stage-${s.id}`}
                    label={s.label}
                    checked={stages.has(s.id)}
                    onChange={(v) => toggle(stages, setStages, s.id, v)}
                  />
                ))}
              </div>
            </Section>

            <Section title="Assigned to">
              <div className="flex flex-col gap-0.5">
                {Object.values(users).map((u) => (
                  <CheckRow
                    key={u.id}
                    id={`who-${u.id}`}
                    label={
                      <span className="flex items-center gap-2">
                        <span
                          className={`grid size-5 place-items-center rounded-full text-[10px] font-medium ${u.tone}`}
                        >
                          {u.initials}
                        </span>
                        {u.name.split(" ")[0]}
                      </span>
                    }
                    checked={people.has(u.id)}
                    onChange={(v) => toggle(people, setPeople, u.id, v)}
                  />
                ))}
              </div>
            </Section>

            <Section title="Type">
              <div className="flex flex-col gap-0.5">
                {TYPES.map((t) => (
                  <CheckRow
                    key={t.id}
                    id={`type-${t.id}`}
                    label={t.label}
                    checked={types.has(t.id)}
                    onChange={(v) => toggle(types, setTypes, t.id, v)}
                  />
                ))}
              </div>
            </Section>

            <Section title="Date range">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="qf-from"
                    className="text-[11px] text-muted-foreground"
                  >
                    From
                  </Label>
                  <Input id="qf-from" type="date" className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="qf-to"
                    className="text-[11px] text-muted-foreground"
                  >
                    To
                  </Label>
                  <Input id="qf-to" type="date" className="h-8 text-xs" />
                </div>
              </div>
            </Section>

            <Section title="Status">
              <CheckRow
                id="overdue-only"
                label="Show overdue only"
                checked={overdueOnly}
                onChange={setOverdueOnly}
              />
            </Section>
          </div>
        </ScrollArea>

        <Separator />
        <div className="flex items-center justify-between gap-2 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={clearAll}
          >
            Clear filters
          </Button>
          <Button size="sm" className="h-8 text-xs">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

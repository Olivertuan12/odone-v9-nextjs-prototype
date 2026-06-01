"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-8 text-center",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex flex-col items-center gap-2", className)}
      {...props}
    />
  )
}

type EmptyMediaVariant = "default" | "icon"

type EmptyMediaProps = React.ComponentProps<"div"> & {
  variant?: EmptyMediaVariant
}

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: EmptyMediaProps) {
  return (
    <div
      data-slot="empty-media"
      data-variant={variant}
      className={cn(
        variant === "icon"
          ? "grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"
          : "flex items-center justify-center",
        className
      )}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        "text-sm text-muted-foreground max-w-sm",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex flex-col items-center gap-2 mt-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
}

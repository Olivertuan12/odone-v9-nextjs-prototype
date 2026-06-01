"use client"

import * as React from "react"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

type SpinnerSize = "sm" | "default" | "lg"

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: "size-4",
  default: "size-5",
  lg: "size-6",
}

type SpinnerProps = React.ComponentProps<"span"> & {
  size?: SpinnerSize
}

function Spinner({ className, size = "default", ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center justify-center text-muted-foreground", className)}
      {...props}
    >
      <Loader2Icon className={cn("animate-spin", SIZE_CLASS[size])} />
    </span>
  )
}

export { Spinner }

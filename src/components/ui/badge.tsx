import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center h-5 px-2 rounded-sm text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        chain: "",
        tag: "border bg-popover",
        brand: "gap-1 text-sm",
      },
    },
    defaultVariants: {
      tone: "tag",
    },
  }
)

function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  )
}

export { Badge }

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-700",
        success: "bg-green-50 text-green-700",
        warning: "bg-yellow-50 text-yellow-700",
        danger: "bg-red-50 text-red-700",
        info: "bg-blue-50 text-blue-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

// Badge colour for the common status values used across the app
function statusVariant(status: string): VariantProps<typeof badgeVariants>["variant"] {
  switch (status) {
    case "active":
    case "completed":
      return "success"
    case "inactive":
    case "scheduled":
    case "pending":
      return "warning"
    case "blocked":
    case "suspended":
    case "voided":
    case "expired":
    case "failed":
      return "danger"
    default:
      return "default"
  }
}

export { Badge, badgeVariants, statusVariant }

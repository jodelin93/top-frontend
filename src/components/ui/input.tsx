import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, ...props }, ref) => {
    return (
      <input
        type={type}
        // Number fields open the phone's number pad (with a decimal point when the step allows one)
        inputMode={inputMode ?? (type === 'number' ? numberInputMode(props.step) : undefined)}
        className={cn(
          "flex h-9 w-full max-md:min-h-10 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

function numberInputMode(step: React.ComponentProps<"input">["step"]): "numeric" | "decimal" {
  if (step === undefined) return "numeric"
  const value = Number(step)
  return Number.isInteger(value) ? "numeric" : "decimal"
}

export { Input }

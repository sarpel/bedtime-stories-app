import * as React from "react"
import { cn } from "@/lib/utils"

function ScrollArea({ className, children, ...props }) {
  return (
    <div
      className={cn("overflow-auto", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { ScrollArea }

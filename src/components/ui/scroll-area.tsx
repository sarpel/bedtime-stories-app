import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

function ScrollArea({ className, children, ...props }: ScrollAreaProps) {
  return (
    <div className={cn("overflow-auto scrollbar-thin", className)} {...props}>
      {children}
    </div>
  );
}

export { ScrollArea };

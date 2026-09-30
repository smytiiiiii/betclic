"use client";

import { Progress as ProgressPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

function Progress({ className, value, indicatorClassName, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)} {...props}>
      <ProgressPrimitive.Indicator
        className={cn("h-full rounded-full bg-primary transition-transform duration-500 ease-out", indicatorClassName)}
        style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value ?? 0))}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

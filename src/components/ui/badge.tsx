import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4 [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-2 text-muted-foreground",
        primary: "border-primary/25 bg-primary-soft text-primary",
        positive: "border-positive/25 bg-positive/10 text-positive",
        negative: "border-negative/25 bg-negative/10 text-negative",
        warning: "border-warning/30 bg-warning/10 text-warning",
        info: "border-info/25 bg-info/10 text-info",
        live: "border-live/30 bg-live/10 text-live",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

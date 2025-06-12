import React from "react";
import { cn } from "../../lib/utils"; // Relative path from src/components/ui/ to src/lib/

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer bg-muted rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };

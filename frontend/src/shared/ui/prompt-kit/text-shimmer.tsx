import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export type TextShimmerProps = {
  as?: ElementType;
  duration?: number;
  spread?: number;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function TextShimmer({
  as = "span",
  className,
  duration = 4,
  spread = 20,
  children,
  ...props
}: TextShimmerProps) {
  const dynamicSpread = Math.min(Math.max(spread, 5), 45);
  const Component = as;

  return (
    <Component
      className={cn(
        "animate-[shimmer_4s_infinite_linear] bg-size-[200%_auto] bg-clip-text font-medium text-transparent",
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(to right, var(--muted-foreground) ${50 - dynamicSpread}%, var(--foreground) 50%, var(--muted-foreground) ${50 + dynamicSpread}%)`,
        animationDuration: `${duration}s`,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

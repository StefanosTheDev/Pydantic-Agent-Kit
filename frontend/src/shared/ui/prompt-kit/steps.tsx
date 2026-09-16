import { ChevronDown } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";

export function Steps({
  defaultOpen = true,
  className,
  ...props
}: ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible
      className={cn(className)}
      defaultOpen={defaultOpen}
      {...props}
    />
  );
}

export function StepsTrigger({
  children,
  className,
  leftIcon,
  ...props
}: ComponentProps<typeof CollapsibleTrigger> & { leftIcon?: ReactNode }) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full cursor-pointer items-center justify-start gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    >
      {leftIcon}
      <span>{children}</span>
      <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
}

export function StepsContent({
  children,
  className,
  ...props
}: ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      className={cn("overflow-hidden pt-2", className)}
      {...props}
    >
      <div className="flex gap-3">
        <div className="w-[2px] shrink-0 rounded-full bg-muted" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">{children}</div>
      </div>
    </CollapsibleContent>
  );
}

export function StepsItem({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </div>
  );
}

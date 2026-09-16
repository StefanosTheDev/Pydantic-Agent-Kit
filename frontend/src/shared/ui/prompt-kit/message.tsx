import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { Markdown } from "@/shared/ui/markdown";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

export type MessageProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function Message({ children, className, ...props }: MessageProps) {
  return (
    <div className={cn("flex gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export type MessageContentProps = {
  children: ReactNode;
  markdown?: boolean;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function MessageContent({
  children,
  markdown = false,
  className,
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-secondary p-2 text-foreground break-words whitespace-normal",
        className,
      )}
      {...props}
    >
      {markdown && typeof children === "string" ? (
        <Markdown content={children} />
      ) : (
        children
      )}
    </div>
  );
}

export type MessageActionsProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function MessageActions({
  children,
  className,
  ...props
}: MessageActionsProps) {
  return (
    <div
      className={cn("flex items-center gap-2 text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type MessageActionProps = {
  className?: string;
  tooltip: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
} & HTMLAttributes<HTMLButtonElement>;

export function MessageAction({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}: MessageActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md hover:bg-accent hover:text-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

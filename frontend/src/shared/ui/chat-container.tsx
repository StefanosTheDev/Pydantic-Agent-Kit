import {
  StickToBottom,
  useStickToBottomContext,
} from "use-stick-to-bottom";
import * as React from "react";

import { cn } from "@/shared/lib/utils";

export function ChatContainerRoot({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <StickToBottom
      className={cn("relative flex h-full min-h-0 flex-col overflow-hidden", className)}
      resize="smooth"
      initial="smooth"
      {...props}
    >
      {children}
    </StickToBottom>
  );
}

export function ChatContainerContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <StickToBottom.Content
      className={cn("flex flex-col gap-6 px-4 py-6 md:px-8", className)}
      {...props}
    >
      {children}
    </StickToBottom.Content>
  );
}

export function ChatContainerScrollAnchor({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-px w-full", className)} {...props} />;
}

export function ScrollButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => scrollToBottom()}
      className={cn(
        "rounded-full border border-border bg-background px-3 py-1.5 text-xs shadow-sm hover:bg-accent",
        className,
      )}
      {...props}
    >
      Scroll to bottom
    </button>
  );
}

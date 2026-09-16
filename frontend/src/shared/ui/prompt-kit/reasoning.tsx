import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";

export type ReasoningProps = {
  children: ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isStreaming?: boolean;
};

export function Reasoning({
  children,
  className,
  open,
  onOpenChange,
  isStreaming,
}: ReasoningProps) {
  const [internalOpen, setInternalOpen] = useState(true);
  const [wasAutoOpened, setWasAutoOpened] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (isStreaming && !wasAutoOpened) {
      if (!isControlled) setInternalOpen(true);
      setWasAutoOpened(true);
    }
  }, [isStreaming, wasAutoOpened, isControlled]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(className)}
    >
      {children}
    </Collapsible>
  );
}

export function ReasoningTrigger({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLButtonElement>) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex cursor-pointer items-center gap-2 text-sm",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
}

export function ReasoningContent({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <CollapsibleContent
      className={cn(
        "overflow-hidden pt-2 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  );
}

import { ChevronRight } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { TextShimmer } from "@/shared/ui/prompt-kit/text-shimmer";

export type ThinkingBarProps = {
  className?: string;
  text?: string;
  onStop?: () => void;
  stopLabel?: string;
  onClick?: () => void;
};

export function ThinkingBar({
  className,
  text = "Thinking",
  onStop,
  stopLabel = "Answer now",
  onClick,
}: ThinkingBarProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-1 text-sm transition-opacity hover:opacity-80"
        >
          <TextShimmer>{text}</TextShimmer>
          <ChevronRight className="size-4" />
        </button>
      ) : (
        <TextShimmer className="text-sm">{text}</TextShimmer>
      )}
      {onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="border-b border-dotted border-muted-foreground/50 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        >
          {stopLabel}
        </button>
      ) : null}
    </div>
  );
}

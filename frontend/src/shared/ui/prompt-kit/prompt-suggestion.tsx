import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";
import { Button, buttonVariants } from "@/shared/ui/button";

export type PromptSuggestionProps = {
  children: ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
  highlight?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function PromptSuggestion({
  children,
  variant,
  size,
  className,
  highlight,
  ...props
}: PromptSuggestionProps) {
  const isHighlightMode = highlight !== undefined;
  const content = typeof children === "string" ? children : "";

  if (!isHighlightMode) {
    return (
      <Button
        variant={variant || "outline"}
        size={size || "lg"}
        className={cn("rounded-full", className)}
        {...props}
      >
        {children}
      </Button>
    );
  }

  if (!content) {
    return (
      <Button
        variant={variant || "ghost"}
        size={size || "sm"}
        className={cn(
          "w-full cursor-pointer justify-start rounded-xl py-2 hover:bg-accent",
          className,
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }

  const trimmedHighlight = highlight.trim();
  const contentLower = content.toLowerCase();
  const highlightLower = trimmedHighlight.toLowerCase();
  const index = trimmedHighlight
    ? contentLower.indexOf(highlightLower)
    : -1;

  return (
    <Button
      variant={variant || "ghost"}
      size={size || "sm"}
      className={cn(
        "w-full cursor-pointer justify-start gap-0 rounded-xl py-2 hover:bg-accent",
        className,
      )}
      {...props}
    >
      {index === -1 ? (
        <span className={trimmedHighlight ? "text-muted-foreground" : undefined}>
          {content}
        </span>
      ) : (
        <>
          {index > 0 ? (
            <span className="text-muted-foreground">
              {content.slice(0, index)}
            </span>
          ) : null}
          <span>{content.slice(index, index + trimmedHighlight.length)}</span>
          {index + trimmedHighlight.length < content.length ? (
            <span className="text-muted-foreground">
              {content.slice(index + trimmedHighlight.length)}
            </span>
          ) : null}
        </>
      )}
    </Button>
  );
}

import { createContext, useContext, type ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

const SourceContext = createContext<{
  href: string;
  domain: string;
} | null>(null);

function useSourceContext() {
  const ctx = useContext(SourceContext);
  if (!ctx) {
    throw new Error("Source parts must be used inside Source");
  }
  return ctx;
}

function domainFromHref(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export function Source({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <SourceContext.Provider value={{ href, domain: domainFromHref(href) }}>
      {children}
    </SourceContext.Provider>
  );
}

export function SourceTrigger({
  label,
  showFavicon = false,
  className,
  onClick,
}: {
  label?: string | number;
  showFavicon?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const { href, domain } = useSourceContext();
  const labelToShow = label ?? domain;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-5 max-w-40 items-center gap-1 overflow-hidden rounded-full bg-muted px-2 text-xs text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground",
        showFavicon ? "pl-1" : "px-2",
        className,
      )}
    >
      {showFavicon ? (
        <img
          src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(href)}`}
          alt=""
          width={14}
          height={14}
          className="size-3.5 rounded-full"
        />
      ) : null}
      <span className="truncate">{labelToShow}</span>
    </button>
  );
}

export function SourceContent({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  const { href, domain } = useSourceContext();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("flex flex-col gap-1 text-left no-underline", className)}
    >
      <p className="text-[11px] text-primary-foreground/70">{domain}</p>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-primary-foreground/80">{description}</p>
    </a>
  );
}

export function CitedSource({
  href,
  title,
  description,
  className,
  onSelect,
}: {
  href: string;
  title: string;
  description: string;
  className?: string;
  onSelect?: () => void;
}) {
  return (
    <Source href={href}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SourceTrigger
            showFavicon
            className={className}
            onClick={onSelect}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <SourceContent title={title} description={description} />
        </TooltipContent>
      </Tooltip>
    </Source>
  );
}

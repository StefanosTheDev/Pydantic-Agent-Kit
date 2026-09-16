import {
  Calculator,
  ChevronDown,
  FileSearch,
  Globe,
  Loader2,
  Search,
  Sigma,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import type { ChatToolPart } from "@/shared/lib/conversation";
import { cn } from "@/shared/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";

export type ToolPart = ChatToolPart;

export type ToolProps = {
  toolPart: ToolPart;
  defaultOpen?: boolean;
  className?: string;
};

const TOOL_COPY: Record<
  string,
  { running: string; done: string; icon: LucideIcon }
> = {
  search_web: {
    running: "Searching the web",
    done: "Searched the web",
    icon: Globe,
  },
  search_knowledge: {
    running: "Searching knowledge",
    done: "Searched knowledge",
    icon: Search,
  },
  analyze_project_report: {
    running: "Calculating project estimate",
    done: "Calculated project estimate",
    icon: Calculator,
  },
  delegate_document_review: {
    running: "Delegating to document reviewer",
    done: "Document reviewer finished",
    icon: FileSearch,
  },
  count_words: {
    running: "Counting words",
    done: "Counted words",
    icon: Sigma,
  },
};

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function copyFor(type: string, done: boolean) {
  const preset = TOOL_COPY[type];
  if (preset) {
    return { label: done ? preset.done : preset.running, Icon: preset.icon };
  }
  return {
    label: type.replaceAll("_", " "),
    Icon: Search,
  };
}

export function Tool({
  toolPart,
  defaultOpen = false,
  className,
}: ToolProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { state, input, output, errorText } = toolPart;
  const done = state === "output-available";
  const failed = state === "output-error";
  const { label, Icon } = copyFor(toolPart.type, done);
  const query =
    input && typeof input.query === "string" ? input.query : undefined;
  const knowledgeTitles =
    output && Array.isArray(output.titles)
      ? output.titles.filter((item): item is string => typeof item === "string")
      : [];

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("min-w-0", className)}
    >
      <CollapsibleTrigger className="group flex max-w-full items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        {state === "input-streaming" || state === "input-available" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Icon className="size-3.5" />
        )}
        <span>{label}</span>
        <ChevronDown className="size-3.5 opacity-0 transition-transform group-hover:opacity-100 group-data-[state=open]:rotate-180 group-data-[state=open]:opacity-100" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pl-5 text-sm text-muted-foreground">
        {query ? <p>Searched for “{query}”</p> : null}
        {knowledgeTitles.length > 0 ? (
          <p>Used {knowledgeTitles.join(", ")}</p>
        ) : null}
        {failed && errorText ? (
          <p className="text-destructive">{errorText}</p>
        ) : null}
        {done && output && !query && knowledgeTitles.length === 0 ? (
          <pre className="mt-1 overflow-x-auto text-xs">
            {formatValue(output)}
          </pre>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

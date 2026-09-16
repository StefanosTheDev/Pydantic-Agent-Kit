import * as React from "react";

import { cn } from "@/shared/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

const LINE_HEIGHT = 24;
const COMPACT_CHROME = 88;
const DEFAULT_MAX_HEIGHT = 192;

type PromptInputContextValue = {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  onSubmit?: () => void;
  isMultiline: boolean;
  maxHeight: number;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

const PromptInputContext = React.createContext<PromptInputContextValue | null>(
  null,
);

export function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) {
    throw new Error("PromptInput components must be used within PromptInput");
  }
  return context;
}

type PromptInputProps = {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: () => void;
  maxHeight?: number;
  children: React.ReactNode;
  className?: string;
};

export function PromptInput({
  isLoading = false,
  value: controlledValue,
  onValueChange,
  onSubmit,
  maxHeight = DEFAULT_MAX_HEIGHT,
  children,
  className,
}: PromptInputProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState("");
  const [isMultiline, setIsMultiline] = React.useState(false);
  const [compactWidth, setCompactWidth] = React.useState(480);
  const shellRef = React.useRef<HTMLDivElement>(null);
  const mirrorRef = React.useRef<HTMLTextAreaElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const value = controlledValue ?? uncontrolledValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (controlledValue === undefined) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    },
    [controlledValue, onValueChange],
  );

  React.useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const updateWidth = () => {
      setCompactWidth(Math.max(80, shell.clientWidth - COMPACT_CHROME));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  React.useLayoutEffect(() => {
    const mirror = mirrorRef.current;
    if (!mirror) {
      return;
    }

    mirror.style.width = `${compactWidth}px`;
    mirror.value = value;
    mirror.style.height = "auto";

    const shouldExpand =
      value.includes("\n") || mirror.scrollHeight > LINE_HEIGHT + 2;
    setIsMultiline(shouldExpand);
  }, [value, compactWidth]);

  return (
    <PromptInputContext.Provider
      value={{
        isLoading,
        value,
        setValue,
        onSubmit,
        isMultiline,
        maxHeight,
        textareaRef,
      }}
    >
      <div className="relative">
        <textarea
          ref={mirrorRef}
          aria-hidden
          tabIndex={-1}
          readOnly
          rows={1}
          className="pointer-events-none absolute top-0 left-0 -z-10 resize-none overflow-hidden text-base leading-6"
          style={{ height: 0, width: compactWidth }}
        />
        <div
          ref={shellRef}
          data-expanded={isMultiline}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("button")) {
              return;
            }
            textareaRef.current?.focus();
          }}
          className={cn(
            "grid cursor-text grid-cols-[auto_minmax(0,1fr)_auto] border border-input bg-background shadow-xs transition-[border-radius] duration-150",
            isMultiline
              ? "rounded-3xl p-2"
              : "items-center rounded-full p-1.5",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </PromptInputContext.Provider>
  );
}

export const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, onKeyDown, disabled, ...props }, ref) => {
  const {
    isLoading,
    value,
    setValue,
    onSubmit,
    isMultiline,
    maxHeight,
    textareaRef,
  } = usePromptInput();

  React.useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

  React.useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "auto";
    if (!isMultiline) {
      element.style.height = `${LINE_HEIGHT}px`;
      return;
    }

    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
  }, [value, isMultiline, maxHeight, textareaRef]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      disabled={disabled || isLoading}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onSubmit?.();
        }
      }}
      rows={1}
      className={cn(
        "w-full resize-none bg-transparent text-base leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        isMultiline
          ? "col-span-3 row-start-1 max-h-48 overflow-y-auto px-3 pt-1 pb-2"
          : "col-start-2 overflow-hidden px-1 py-0",
        className,
      )}
      {...props}
    />
  );
});
PromptInputTextarea.displayName = "PromptInputTextarea";

export function PromptInputActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 px-1 pb-1", className)}
      {...props}
    />
  );
}

export function PromptInputAction({
  tooltip,
  children,
  className,
  side = "top",
  disabled,
}: {
  tooltip?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild disabled={disabled}>
        <div
          className={cn(disabled && "pointer-events-none opacity-50", className)}
          data-side={side}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </TooltipTrigger>
      {tooltip ? <TooltipContent side={side}>{tooltip}</TooltipContent> : null}
    </Tooltip>
  );
}

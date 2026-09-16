import { Copy, RotateCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

import type { ChatMessage, ChatToolPart } from "@/shared/lib/conversation";
import { cn } from "@/shared/lib/utils";
import {
  Message as PromptMessage,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/shared/ui/prompt-kit/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/shared/ui/prompt-kit/reasoning";
import { SkillCard } from "@/shared/ui/prompt-kit/skill-card";
import { CitedSource } from "@/shared/ui/prompt-kit/source";
import {
  Steps,
  StepsContent,
  StepsItem,
  StepsTrigger,
} from "@/shared/ui/prompt-kit/steps";
import { ThinkingBar } from "@/shared/ui/prompt-kit/thinking-bar";
import { Tool } from "@/shared/ui/prompt-kit/tool";

type ChatMessageProps = {
  message: ChatMessage;
  isLoading?: boolean;
  onStop?: () => void;
  onRegenerate?: () => void;
  className?: string;
};

function ActivityTrail({
  steps,
  tools,
  className,
}: {
  steps?: string[];
  tools?: ChatToolPart[];
  className?: string;
}) {
  if (steps && steps.length > 0) {
    return (
      <Steps defaultOpen className={className}>
        <StepsTrigger>Working</StepsTrigger>
        <StepsContent>
          {steps.map((step) => (
            <StepsItem key={step}>{step}</StepsItem>
          ))}
          {tools?.map((tool) => (
            <Tool
              key={tool.toolCallId ?? tool.type}
              toolPart={tool}
              defaultOpen={false}
            />
          ))}
        </StepsContent>
      </Steps>
    );
  }

  return (
    <>
      {tools?.map((tool) => (
        <Tool
          key={tool.toolCallId ?? tool.type}
          toolPart={tool}
          defaultOpen={false}
          className={className}
        />
      ))}
    </>
  );
}

export function Message({
  message,
  isLoading = false,
  onStop,
  onRegenerate,
  className,
}: ChatMessageProps) {
  const { content, role, isError, skill, reasoning, steps, tools, sources } =
    message;
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const copy = async () => {
    if (!content) {
      return;
    }
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const showThinking = isLoading && !skill && (tools?.length ?? 0) === 0;

  return (
    <PromptMessage
      className={cn(
        "group mx-auto w-full max-w-3xl flex-col gap-2 px-2 md:px-0",
        isUser ? "items-end" : "items-start",
        className,
      )}
    >
      {isUser ? (
        <MessageContent className="max-w-[80%] rounded-[24px] bg-foreground px-5 py-3 text-[15px] leading-7 text-background">
          <p className="whitespace-pre-wrap">{content}</p>
        </MessageContent>
      ) : (
        <div className="flex w-full flex-col gap-3" aria-live="polite">
          {skill ? (
            <SkillCard name={skill.name} status={skill.status} />
          ) : null}

          {showThinking ? (
            <ThinkingBar text="Thinking" onStop={onStop} stopLabel="Stop" />
          ) : null}

          {reasoning && !isError ? (
            <Reasoning isStreaming={isLoading && !content}>
              <ReasoningTrigger>Reasoning</ReasoningTrigger>
              <ReasoningContent>
                {reasoning}
                <ActivityTrail steps={steps} tools={tools} className="mt-3" />
              </ReasoningContent>
            </Reasoning>
          ) : (
            <ActivityTrail steps={steps} tools={tools} />
          )}

          {content && skill?.status === "used" && !isError ? (
            <section
              aria-label={`${skill.name} output`}
              className="rounded-2xl border border-border bg-muted/20 p-4"
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {skill.name} output
              </p>
              <MessageContent
                markdown
                className="w-full min-w-0 flex-1 rounded-lg bg-transparent p-0 text-[15px] leading-7"
              >
                {content}
              </MessageContent>
            </section>
          ) : content ? (
            <MessageContent
              markdown
              className={cn(
                "w-full min-w-0 flex-1 rounded-lg bg-transparent p-0 text-[15px] leading-7",
                isError && "text-destructive",
              )}
            >
              {content}
            </MessageContent>
          ) : null}

          {sources && sources.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {sources.map((source) => (
                <CitedSource
                  key={source.href}
                  href={source.href}
                  title={source.title}
                  description={source.description}
                  onSelect={() => {
                    window.open(source.href, "_blank", "noopener,noreferrer");
                  }}
                />
              ))}
            </div>
          ) : null}

          {content ? (
            <MessageActions
              className={cn(
                "gap-0 transition-opacity duration-150",
                isError
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100",
              )}
            >
              <MessageAction
                tooltip={copied ? "Copied" : "Copy"}
                aria-label="Copy"
                onClick={() => {
                  void copy();
                }}
              >
                <Copy className="size-4" />
              </MessageAction>
              <MessageAction
                tooltip="Good response"
                aria-label="Good response"
                aria-pressed={feedback === "up"}
                onClick={() =>
                  setFeedback((current) => (current === "up" ? null : "up"))
                }
              >
                <ThumbsUp
                  className={cn("size-4", feedback === "up" && "fill-current")}
                />
              </MessageAction>
              <MessageAction
                tooltip="Bad response"
                aria-label="Bad response"
                aria-pressed={feedback === "down"}
                onClick={() =>
                  setFeedback((current) => (current === "down" ? null : "down"))
                }
              >
                <ThumbsDown
                  className={cn("size-4", feedback === "down" && "fill-current")}
                />
              </MessageAction>
              {onRegenerate ? (
                <MessageAction
                  tooltip={isError ? "Retry" : "Regenerate"}
                  aria-label={isError ? "Retry" : "Regenerate"}
                  onClick={onRegenerate}
                >
                  <RotateCw className="size-4" />
                </MessageAction>
              ) : null}
            </MessageActions>
          ) : null}
        </div>
      )}
    </PromptMessage>
  );
}

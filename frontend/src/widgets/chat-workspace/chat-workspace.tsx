import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useComposer } from "@/app/composer-context";
import { useConversations } from "@/app/conversation-context";
import { useSubmitPrompt } from "@/features/send-message/use-submit-prompt";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
  ScrollButton,
} from "@/shared/ui/chat-container";
import { Message } from "@/shared/ui/message";
import { PromptSuggestion } from "@/shared/ui/prompt-kit/prompt-suggestion";
import { ChatComposer } from "@/widgets/chat-composer/chat-composer";

const suggestions = [
  "What happened in AI today?",
  "Research a company for me",
  "Help me improve this copy",
];

const DISCLAIMER = "Kairos can make mistakes. Check important information.";

export function ChatWorkspace() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { requestFocus, setSelectedSkillId, setWebsite } = useComposer();
  const { submit, stop, regenerate, isPending } = useSubmitPrompt();
  const {
    activeConversation,
    activeConversationId,
    selectConversation,
    startNewConversation,
  } = useConversations();

  useEffect(() => {
    if (conversationId) {
      selectConversation(conversationId);
      return;
    }

    if (!activeConversationId) {
      const conversation = startNewConversation();
      navigate(`/chat/${conversation.id}`, { replace: true });
    }
  }, [
    conversationId,
    activeConversationId,
    selectConversation,
    startNewConversation,
    navigate,
  ]);

  useEffect(() => {
    if (!activeConversation) {
      return;
    }
    setSelectedSkillId(activeConversation.skillId ?? null);
    setWebsite(activeConversation.website ?? "");
  }, [activeConversation, setSelectedSkillId, setWebsite]);

  const messages = activeConversation?.messages ?? [];
  const isEmpty = messages.length === 0;
  const lastAssistantId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;

  if (isEmpty) {
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
          <h1 className="mb-10 text-center text-3xl font-semibold tracking-tight">
            Talk to Kairos
          </h1>
          <div className="w-full max-w-3xl">
            <ChatComposer
              showDisclaimer={false}
              onSubmit={submit}
              onStop={stop}
              isPending={isPending}
              palettePlacement="below"
            />
          </div>
          <div className="mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <PromptSuggestion
                key={suggestion}
                onClick={() => {
                  requestFocus();
                  void submit(suggestion);
                }}
              >
                {suggestion}
              </PromptSuggestion>
            ))}
          </div>
        </div>
        <p className="shrink-0 px-4 pb-3 text-center text-[11px] text-muted-foreground">
          {DISCLAIMER}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ChatContainerRoot className="h-full">
        <ChatContainerContent className="mx-auto w-full max-w-3xl gap-6 px-4 pb-44 pt-6 md:px-6">
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              isLoading={
                isPending &&
                message.role === "assistant" &&
                message.id === lastAssistantId &&
                !message.isError
              }
              onStop={
                isPending && message.id === lastAssistantId ? stop : undefined
              }
              onRegenerate={
                !isPending && message.id === lastAssistantId
                  ? () => {
                      void regenerate();
                    }
                  : undefined
              }
            />
          ))}
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
        <div className="absolute right-8 bottom-36">
          <ScrollButton />
        </div>
      </ChatContainerRoot>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-visible bg-gradient-to-t from-background via-background to-transparent pb-3 pt-16">
        <div className="pointer-events-auto">
          <ChatComposer
            showDisclaimer={false}
            onSubmit={submit}
            onStop={stop}
            isPending={isPending}
            palettePlacement="above"
          />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  );
}

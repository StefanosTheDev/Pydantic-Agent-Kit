import { useRef, useState } from "react";

import { useComposer } from "@/app/composer-context";
import { useConversations } from "@/app/conversation-context";
import { streamChat, type ChatStreamEvent } from "@/shared/api/chat";
import {
  isSupportedSkillId,
  supportedSkillName,
} from "@/shared/config/skills";
import type {
  ChatMessage,
  ChatSource,
  ChatToolPart,
} from "@/shared/lib/conversation";

function lastUserPrompt(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")
    ?.content;
}

function upsertTool(tools: ChatToolPart[], event: Extract<ChatStreamEvent, { type: "tool" }>) {
  const next: ChatToolPart = {
    type: event.tool.type,
    state: event.tool.state,
    toolCallId: event.tool.tool_call_id,
    input: event.tool.input,
    output: event.tool.output,
  };
  const index = tools.findIndex((tool) => tool.toolCallId === next.toolCallId);
  if (index < 0) return [...tools, next];
  return tools.map((tool, itemIndex) => (itemIndex === index ? next : tool));
}

function addSource(sources: ChatSource[], source: ChatSource) {
  return sources.some((item) => item.href === source.href)
    ? sources
    : [...sources, source];
}

export function useSubmitPrompt() {
  const [isPending, setIsPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const {
    setDraft,
    selectedSkillId,
    setSelectedSkillId,
    website,
    setWebsite,
  } = useComposer();
  const {
    activeConversation,
    activeConversationId,
    startNewConversation,
    appendMessage,
    replaceLastAssistantMessage,
    patchConversation,
  } = useConversations();

  const runTurn = async (
    conversationId: string,
    messageId: string,
    prompt: string,
    skillId: string | undefined,
    skillWebsite: string | undefined,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsPending(true);
    let current: ChatMessage = {
      id: messageId,
      role: "assistant",
      content: "",
      steps: ["Thinking"],
      tools: [],
      sources: [],
      skill: isSupportedSkillId(skillId)
        ? { id: skillId, name: supportedSkillName(skillId), status: "running" }
        : undefined,
    };

    const update = (event: ChatStreamEvent) => {
      switch (event.type) {
        case "delta":
          current = {
            ...current,
            content: current.content + event.text,
            steps: current.tools?.length ? ["Researched", "Writing response"] : ["Writing response"],
          };
          break;
        case "skill":
          current = {
            ...current,
            skill: { id: event.id, name: event.name, status: event.status },
            steps: [
              event.status === "used"
                ? `Loaded ${event.name} skill`
                : `Loading ${event.name} skill`,
            ],
          };
          break;
        case "tool":
          current = {
            ...current,
            tools: upsertTool(current.tools ?? [], event),
            steps: [toolStep(event.tool.type, event.tool.state)],
          };
          break;
        case "source":
          current = {
            ...current,
            sources: addSource(current.sources ?? [], event),
          };
          break;
        case "started":
        case "completed":
          break;
      }
      replaceLastAssistantMessage(conversationId, { ...current });
    };

    try {
      await streamChat(
        {
          message: prompt,
          conversation_id: conversationId,
          skill: isSupportedSkillId(skillId) ? skillId : undefined,
          website: skillId === "copyright" ? skillWebsite : undefined,
        },
        { signal: controller.signal, onEvent: update },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      replaceLastAssistantMessage(conversationId, {
        ...current,
        content:
          error instanceof Error
            ? error.message
            : "Something went wrong while sending your message.",
        isError: true,
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsPending(false);
      }
    }
  };

  const submit = async (rawInput: string) => {
    const input = rawInput.trim();
    if (!input || isPending) return;

    let conversationId = activeConversationId;
    if (!conversationId) {
      conversationId = startNewConversation({
        skillId: selectedSkillId ?? undefined,
        website: website || undefined,
      }).id;
    }

    patchConversation(conversationId, {
      skillId: selectedSkillId ?? undefined,
      website: website || undefined,
    });
    const assistantPlaceholderId = crypto.randomUUID();
    appendMessage(conversationId, {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    });
    appendMessage(conversationId, {
      id: assistantPlaceholderId,
      role: "assistant",
      content: "",
    });
    setDraft("");
    await runTurn(
      conversationId,
      assistantPlaceholderId,
      input,
      selectedSkillId ?? undefined,
      website || undefined,
    );
  };

  const stop = () => abortRef.current?.abort();

  const regenerate = async () => {
    if (isPending || !activeConversation || !activeConversationId) return;
    const prompt = lastUserPrompt(activeConversation.messages);
    const lastAssistant = [...activeConversation.messages]
      .reverse()
      .find((message) => message.role === "assistant");
    if (!prompt || !lastAssistant) return;

    replaceLastAssistantMessage(activeConversationId, {
      id: lastAssistant.id,
      role: "assistant",
      content: "",
    });
    await runTurn(
      activeConversationId,
      lastAssistant.id,
      prompt,
      activeConversation.skillId,
      activeConversation.website,
    );
  };

  return {
    submit,
    stop,
    regenerate,
    isPending,
    setSelectedSkillId,
    setWebsite,
  };
}

function toolStep(type: string, state: "input-available" | "output-available" | "output-error") {
  const done = state !== "input-available";
  switch (type) {
    case "search_web":
      return done ? "Web search complete" : "Searching the web";
    case "analyze_project_report":
      return done ? "Project estimate calculated" : "Calculating project estimate";
    case "delegate_document_review":
      return done ? "Specialist review complete" : "Specialist reviewing document";
    case "count_words":
      return done ? "Word count complete" : "Counting words";
    case "search_knowledge":
      return done ? "Knowledge search complete" : "Searching indexed reports";
    default:
      return done ? "Tool complete" : "Using a tool";
  }
}

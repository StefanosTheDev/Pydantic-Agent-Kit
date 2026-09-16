import * as React from "react";

import {
  type Conversation,
  createConversation,
  deriveTitle,
  type ChatMessage,
} from "@/shared/lib/conversation";
import { readJson, writeJson } from "@/shared/lib/local-store";

export const CONVERSATIONS_STORAGE_KEY = "openapply-conversations";

type StoredConversations = {
  conversations: Conversation[];
  activeConversationId: string | null;
};

type ConversationContextValue = {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  startNewConversation: (options?: {
    title?: string;
    skillId?: string;
    website?: string;
  }) => Conversation;
  selectConversation: (id: string) => void;
  patchConversation: (
    conversationId: string,
    patch: Partial<
      Pick<Conversation, "skillId" | "website" | "title" | "pinned" | "favorited">
    >,
  ) => void;
  togglePinned: (conversationId: string) => void;
  toggleFavorited: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  appendMessage: (conversationId: string, message: ChatMessage) => void;
  replaceLastAssistantMessage: (
    conversationId: string,
    message: ChatMessage,
  ) => void;
};

const ConversationContext =
  React.createContext<ConversationContextValue | null>(null);

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") {
    return false;
  }
  const conversation = value as Conversation;
  return (
    typeof conversation.id === "string" &&
    typeof conversation.title === "string" &&
    Array.isArray(conversation.messages) &&
    typeof conversation.createdAt === "number"
  );
}

function readStoredConversations(): StoredConversations {
  const stored = readJson<StoredConversations>(CONVERSATIONS_STORAGE_KEY);
  if (
    stored &&
    Array.isArray(stored.conversations) &&
    stored.conversations.every(isConversation)
  ) {
    return {
      conversations: stored.conversations,
      activeConversationId:
        typeof stored.activeConversationId === "string"
          ? stored.activeConversationId
          : null,
    };
  }
  return { conversations: [], activeConversationId: null };
}

export function ConversationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initial = React.useMemo(() => readStoredConversations(), []);
  const [conversations, setConversations] = React.useState<Conversation[]>(
    initial.conversations,
  );
  const [activeConversationId, setActiveConversationId] = React.useState<
    string | null
  >(initial.activeConversationId);

  React.useEffect(() => {
    writeJson(CONVERSATIONS_STORAGE_KEY, {
      conversations,
      activeConversationId,
    });
  }, [conversations, activeConversationId]);

  const activeConversation = React.useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const startNewConversation = React.useCallback(
    (options?: { title?: string; skillId?: string; website?: string }) => {
      const conversation = createConversation(options);
      setConversations((current) => [conversation, ...current]);
      setActiveConversationId(conversation.id);
      return conversation;
    },
    [],
  );

  const selectConversation = React.useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const patchConversation = React.useCallback(
    (
      conversationId: string,
      patch: Partial<
        Pick<Conversation, "skillId" | "website" | "title" | "pinned" | "favorited">
      >,
    ) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, ...patch }
            : conversation,
        ),
      );
    },
    [],
  );

  const togglePinned = React.useCallback((conversationId: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, pinned: !conversation.pinned }
          : conversation,
      ),
    );
  }, []);

  const toggleFavorited = React.useCallback((conversationId: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, favorited: !conversation.favorited }
          : conversation,
      ),
    );
  }, []);

  const deleteConversation = React.useCallback((conversationId: string) => {
    setConversations((current) =>
      current.filter((conversation) => conversation.id !== conversationId),
    );
    setActiveConversationId((current) =>
      current === conversationId ? null : current,
    );
  }, []);

  const appendMessage = React.useCallback(
    (conversationId: string, message: ChatMessage) => {
      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          const nextMessages = [...conversation.messages, message];
          const title =
            conversation.messages.length === 0 && message.role === "user"
              ? deriveTitle(message.content)
              : conversation.title;

          return {
            ...conversation,
            title,
            messages: nextMessages,
          };
        }),
      );
    },
    [],
  );

  const replaceLastAssistantMessage = React.useCallback(
    (conversationId: string, message: ChatMessage) => {
      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          const nextMessages = [...conversation.messages];
          const lastIndex = nextMessages.length - 1;
          if (lastIndex >= 0 && nextMessages[lastIndex]?.role === "assistant") {
            nextMessages[lastIndex] = message;
          } else {
            nextMessages.push(message);
          }

          return {
            ...conversation,
            messages: nextMessages,
          };
        }),
      );
    },
    [],
  );

  const value = React.useMemo(
    () => ({
      conversations,
      activeConversationId,
      activeConversation,
      startNewConversation,
      selectConversation,
      patchConversation,
      togglePinned,
      toggleFavorited,
      deleteConversation,
      appendMessage,
      replaceLastAssistantMessage,
    }),
    [
      conversations,
      activeConversationId,
      activeConversation,
      startNewConversation,
      selectConversation,
      patchConversation,
      togglePinned,
      toggleFavorited,
      deleteConversation,
      appendMessage,
      replaceLastAssistantMessage,
    ],
  );

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = React.useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversations must be used within ConversationProvider",
    );
  }
  return context;
}

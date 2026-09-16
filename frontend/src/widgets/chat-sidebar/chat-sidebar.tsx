import { MessageSquarePlus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useComposer } from "@/app/composer-context";
import { useConversations } from "@/app/conversation-context";
import type { Conversation } from "@/shared/lib/conversation";
import { cn } from "@/shared/lib/utils";

function useChatNavigation() {
  const navigate = useNavigate();
  const {
    conversations,
    activeConversationId,
    startNewConversation,
    selectConversation,
    deleteConversation,
  } = useConversations();
  const { setDraft, setSelectedSkillId, setWebsite, requestFocus } = useComposer();

  const openChat = (conversation: Conversation) => {
    selectConversation(conversation.id);
    navigate(`/chat/${conversation.id}`);
  };

  const newChat = () => {
    setDraft("");
    setSelectedSkillId(null);
    setWebsite("");
    const conversation = startNewConversation();
    navigate(`/chat/${conversation.id}`);
    requestFocus();
  };

  const removeChat = (conversation: Conversation) => {
    const next = conversations.find((item) => item.id !== conversation.id);
    deleteConversation(conversation.id);
    if (activeConversationId !== conversation.id) return;
    if (next) {
      openChat(next);
      return;
    }
    newChat();
  };

  return { conversations, activeConversationId, openChat, newChat, removeChat };
}

export function ChatSidebar() {
  const { conversations, activeConversationId, openChat, newChat, removeChat } =
    useChatNavigation();

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border/70 bg-muted/20 md:flex">
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-base font-semibold tracking-tight">Kairos</span>
        <button
          type="button"
          aria-label="New chat"
          onClick={newChat}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <MessageSquarePlus className="size-4" />
        </button>
      </div>

      <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">Chats</div>
      <nav aria-label="Chats" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={cn(
              "group flex items-center rounded-lg",
              conversation.id === activeConversationId
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <button
              type="button"
              aria-current={conversation.id === activeConversationId ? "page" : undefined}
              onClick={() => openChat(conversation)}
              className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm"
            >
              {conversation.title}
            </button>
            <button
              type="button"
              aria-label={`Delete ${conversation.title}`}
              onClick={() => removeChat(conversation)}
              className="mr-1 rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-background hover:text-foreground focus:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </nav>

      <p className="border-t border-border/70 px-4 py-3 text-[11px] text-muted-foreground">
        Agent runs and tools are traced with Logfire.
      </p>
    </aside>
  );
}

export function MobileChatHeader() {
  const { conversations, activeConversationId, openChat, newChat } =
    useChatNavigation();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/70 px-3 md:hidden">
      <span className="font-semibold">Kairos</span>
      <label className="min-w-0 flex-1">
        <span className="sr-only">Current chat</span>
        <select
          value={activeConversationId ?? ""}
          onChange={(event) => {
            const conversation = conversations.find(
              (item) => item.id === event.target.value,
            );
            if (conversation) openChat(conversation);
          }}
          className="h-9 w-full truncate rounded-lg border border-input bg-background px-2 text-sm"
        >
          {conversations.map((conversation) => (
            <option key={conversation.id} value={conversation.id}>
              {conversation.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-label="New chat"
        onClick={newChat}
        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <MessageSquarePlus className="size-4" />
      </button>
    </header>
  );
}

export type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

export type ChatToolPart = {
  type: string;
  state: ToolState;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  toolCallId?: string;
  errorText?: string;
};

export type ChatSource = {
  href: string;
  title: string;
  description: string;
};

export type ChatSkillState = {
  id: string;
  name: string;
  status: "running" | "used";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  skill?: ChatSkillState;
  reasoning?: string;
  steps?: string[];
  tools?: ChatToolPart[];
  sources?: ChatSource[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  skillId?: string;
  website?: string;
  pinned?: boolean;
  favorited?: boolean;
};

export function createConversation(options?: {
  title?: string;
  skillId?: string;
  website?: string;
}): Conversation {
  return {
    id: crypto.randomUUID(),
    title: options?.title ?? "New chat",
    messages: [],
    createdAt: Date.now(),
    skillId: options?.skillId,
    website: options?.website,
  };
}

export function deriveTitle(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "New chat";
  }
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

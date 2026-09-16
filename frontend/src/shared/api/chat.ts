import type { SupportedSkillId } from "@/shared/config/skills";

export type ChatStreamRequest = {
  message: string;
  conversation_id: string;
  skill?: SupportedSkillId;
  website?: string;
  context?: string;
};

export type ChatStreamEvent =
  | { type: "started"; conversation_id: string }
  | { type: "delta"; text: string }
  | { type: "skill"; id: string; name: string; status: "running" | "used" }
  | {
      type: "tool";
      tool: {
        type: string;
        state: "input-available" | "output-available" | "output-error";
        tool_call_id: string;
        input?: Record<string, unknown>;
        output?: Record<string, unknown>;
      };
    }
  | { type: "source"; href: string; title: string; description: string }
  | { type: "completed"; conversation_id: string };

export async function streamChat(
  request: ChatStreamRequest,
  options: {
    signal?: AbortSignal;
    onEvent: (event: ChatStreamEvent) => void;
  },
) {
  const response = await fetch("/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: options.signal,
  });

  if (!response.ok) {
    let message = "Kairos could not answer.";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Keep the stable fallback for non-JSON proxy failures.
    }
    throw new Error(message);
  }
  if (!response.body) {
    throw new Error("Kairos returned an empty stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    buffer = buffer.replaceAll("\r\n", "\n");
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const event = parseEvent(frame);
      if (event.type === "error") {
        throw new Error(event.message);
      }
      options.onEvent(event);
    }
    if (done) break;
  }
}

function parseEvent(frame: string): ChatStreamEvent | { type: "error"; message: string } {
  let eventName = "message";
  const data: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trim());
  }
  const payload = JSON.parse(data.join("\n")) as Record<string, unknown>;

  switch (eventName) {
    case "started":
    case "completed":
      return {
        type: eventName,
        conversation_id: String(payload.conversation_id),
      };
    case "delta":
      return { type: "delta", text: String(payload.text ?? "") };
    case "skill":
      return {
        type: "skill",
        id: String(payload.id),
        name: String(payload.name),
        status: payload.status === "used" ? "used" : "running",
      };
    case "tool":
      return {
        type: "tool",
        tool: {
          type: String(payload.type),
          state:
            payload.state === "output-available" || payload.state === "output-error"
              ? payload.state
              : "input-available",
          tool_call_id: String(payload.tool_call_id),
          ...(isRecord(payload.input) ? { input: payload.input } : {}),
          ...(isRecord(payload.output) ? { output: payload.output } : {}),
        },
      };
    case "source":
      return {
        type: "source",
        href: String(payload.href),
        title: String(payload.title),
        description: String(payload.description),
      };
    case "error":
      return { type: "error", message: String(payload.message) };
    default:
      throw new Error(`Unknown Kairos stream event: ${eventName}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TestProviders } from "@/test/app-providers";
import { ChatWorkspace } from "@/widgets/chat-workspace/chat-workspace";

function streamResponse(frames: Array<[string, Record<string, unknown>]>) {
  const body = frames
    .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join("");
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

function renderWorkspace() {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={["/chat"]}>
        <Routes>
          <Route path="chat" element={<ChatWorkspace />} />
          <Route path="chat/:conversationId" element={<ChatWorkspace />} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ChatWorkspace", () => {
  it("shows only the essential Kairos chat controls", async () => {
    renderWorkspace();
    expect(
      await screen.findByRole("heading", { name: "Talk to Kairos" }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask anything")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse skills" })).toBeInTheDocument();
    expect(screen.queryByText("Plugins")).not.toBeInTheDocument();
    expect(screen.queryByText("Campaigns")).not.toBeInTheDocument();
  });

  it("streams a basic answer from Kairos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse([
        ["started", { conversation_id: "conversation-1" }],
        ["delta", { text: "Hello " }],
        ["delta", { text: "from Kairos." }],
        ["completed", { conversation_id: "conversation-1" }],
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByRole("heading", { name: "Talk to Kairos" });
    await user.type(screen.getByPlaceholderText("Ask anything"), "Hello{Enter}");
    expect(await screen.findByText("Hello from Kairos.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/chat/stream",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends Copyright and visualizes web activity and sources", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse([
        ["started", { conversation_id: "conversation-2" }],
        ["skill", { name: "Copyright", status: "used" }],
        ["tool", { type: "search_web", state: "input-available", tool_call_id: "search-1", input: { query: "site:nextiva.com" } }],
        ["tool", { type: "search_web", state: "output-available", tool_call_id: "search-1", output: {} }],
        ["source", { href: "https://www.nextiva.com/", title: "Nextiva", description: "Web search source" }],
        ["delta", { text: "Drafted homepage copy." }],
        ["completed", { conversation_id: "conversation-2" }],
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByRole("heading", { name: "Talk to Kairos" });
    await user.click(screen.getByRole("button", { name: "Browse skills" }));
    await user.click(screen.getByRole("option", { name: /Copyright/ }));
    await user.type(screen.getByPlaceholderText("https://example.com"), "https://nextiva.com");
    await user.type(
      screen.getByPlaceholderText("Ask anything"),
      "Write homepage copy{Enter}",
    );

    expect(await screen.findByText("Drafted homepage copy.")).toBeInTheDocument();
    expect(screen.getByText("Used Copyright")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Copyright output" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Searched the web" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "nextiva.com" })).toBeInTheDocument();

    const request = JSON.parse(
      String((fetchMock.mock.calls[0]![1] as RequestInit).body),
    ) as Record<string, unknown>;
    expect(request).toMatchObject({
      message: "Write homepage copy",
      skill: "copyright",
      website: "https://nextiva.com",
    });
  });

  it("sends an explicitly selected Latin skill", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse([
        ["started", { conversation_id: "conversation-3" }],
        ["skill", { id: "latin", name: "Latin", status: "used" }],
        ["delta", { text: "Salve, amice." }],
        ["completed", { conversation_id: "conversation-3" }],
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByRole("heading", { name: "Talk to Kairos" });
    await user.type(screen.getByPlaceholderText("Ask anything"), "/latin");
    await user.click(screen.getByRole("option", { name: /Latin/ }));
    await user.type(
      screen.getByPlaceholderText("Ask anything"),
      "Translate hello, friend{Enter}",
    );

    expect(await screen.findByText("Salve, amice.")).toBeInTheDocument();
    expect(screen.getByText("Used Latin")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Latin output" })).toBeInTheDocument();
    const request = JSON.parse(
      String((fetchMock.mock.calls[0]![1] as RequestInit).body),
    ) as Record<string, unknown>;
    expect(request).toMatchObject({
      message: "Translate hello, friend",
      skill: "latin",
    });
    expect(request).not.toHaveProperty("website");
  });

  it("visualizes a delegated document review", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse([
        ["started", { conversation_id: "conversation-4" }],
        ["skill", { id: "document-review", name: "Document Review", status: "used" }],
        ["tool", { type: "delegate_document_review", state: "input-available", tool_call_id: "review-1", input: {} }],
        ["tool", { type: "delegate_document_review", state: "output-available", tool_call_id: "review-1", output: { issues: ["Missing launch date"] } }],
        ["delta", { text: "The specialist found one missing detail." }],
        ["completed", { conversation_id: "conversation-4" }],
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByRole("heading", { name: "Talk to Kairos" });
    await user.type(screen.getByPlaceholderText("Ask anything"), "/document");
    await user.click(screen.getByRole("option", { name: /Document Review/ }));
    await user.type(
      screen.getByPlaceholderText("Ask anything"),
      "Review this Markdown report{Enter}",
    );

    expect(await screen.findByText("The specialist found one missing detail.")).toBeInTheDocument();
    expect(screen.getByText("Used Document Review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Document reviewer finished" })).toBeInTheDocument();
    const request = JSON.parse(
      String((fetchMock.mock.calls[0]![1] as RequestInit).body),
    ) as Record<string, unknown>;
    expect(request).toMatchObject({
      message: "Review this Markdown report",
      skill: "document-review",
    });
  });

  it("visualizes knowledge retrieval from indexed reports", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse([
        ["started", { conversation_id: "conversation-5" }],
        ["skill", { id: "knowledge-search", name: "Knowledge Search", status: "used" }],
        ["tool", { type: "search_knowledge", state: "input-available", tool_call_id: "knowledge-1", input: { query: "billing delays" } }],
        ["tool", { type: "search_knowledge", state: "output-available", tool_call_id: "knowledge-1", output: { titles: ["Billing Launch"] } }],
        ["delta", { text: "Webhook edge cases added two days." }],
        ["completed", { conversation_id: "conversation-5" }],
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByRole("heading", { name: "Talk to Kairos" });
    await user.type(screen.getByPlaceholderText("Ask anything"), "/knowledge");
    await user.click(screen.getByRole("option", { name: /Knowledge Search/ }));
    await user.type(
      screen.getByPlaceholderText("Ask anything"),
      "What delayed billing work?{Enter}",
    );

    expect(await screen.findByText("Webhook edge cases added two days.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Searched knowledge" }));
    expect(screen.getByText("Used Billing Launch")).toBeInTheDocument();
  });
});

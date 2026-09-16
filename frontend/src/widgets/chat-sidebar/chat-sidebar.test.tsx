import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { CONVERSATIONS_STORAGE_KEY } from "@/app/conversation-context";
import { TestProviders } from "@/test/app-providers";
import { ChatSidebar } from "@/widgets/chat-sidebar/chat-sidebar";

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderSidebar() {
  localStorage.setItem(
    CONVERSATIONS_STORAGE_KEY,
    JSON.stringify({
      conversations: [
        { id: "chat-one", title: "First chat", messages: [], createdAt: 2 },
        { id: "chat-two", title: "Second chat", messages: [], createdAt: 1 },
      ],
      activeConversationId: "chat-one",
    }),
  );

  return render(
    <TestProviders>
      <MemoryRouter initialEntries={["/chat/chat-one"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <ChatSidebar />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

describe("ChatSidebar", () => {
  it("switches between browser-local conversations", async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.getByRole("navigation", { name: "Chats" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Second chat" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/chat/chat-two");
  });

  it("creates and deletes chats without extra application sections", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.getByTestId("location").textContent).toMatch(/^\/chat\//);
    expect(
      within(screen.getByRole("navigation", { name: "Chats" })).getByRole(
        "button",
        { name: "New chat" },
      ),
    ).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.click(screen.getByRole("button", { name: "Delete First chat" }));
    expect(screen.queryByRole("button", { name: "First chat" })).not.toBeInTheDocument();
    expect(screen.queryByText("Campaigns")).not.toBeInTheDocument();
    expect(screen.queryByText("Plugins")).not.toBeInTheDocument();
  });
});

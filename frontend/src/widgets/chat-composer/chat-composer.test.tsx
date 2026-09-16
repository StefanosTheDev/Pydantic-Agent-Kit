import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { TestProviders } from "@/test/app-providers";
import { ChatComposer } from "@/widgets/chat-composer/chat-composer";

function renderComposer(props?: Partial<Parameters<typeof ChatComposer>[0]>) {
  const onSubmit = props?.onSubmit ?? vi.fn();
  const onStop = props?.onStop ?? vi.fn();
  const isPending = props?.isPending ?? false;
  return {
    onSubmit,
    onStop,
    ...render(
      <TestProviders>
        <MemoryRouter>
          <ChatComposer onSubmit={onSubmit} onStop={onStop} isPending={isPending} />
        </MemoryRouter>
      </TestProviders>,
    ),
  };
}

describe("ChatComposer", () => {
  it("opens the Copyright skill picker when slash is typed", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(screen.getByPlaceholderText("Ask anything"), "/");

    expect(screen.getByRole("listbox", { name: "Skills" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Copyright/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Latin/ })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Project Estimate/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Document Review/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Knowledge Search/ }),
    ).toBeInTheDocument();
  });

  it("filters and attaches the Latin skill without asking for a website", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(screen.getByPlaceholderText("Ask anything"), "/latin");
    await user.click(screen.getByRole("option", { name: /Latin/ }));

    expect(screen.getByText("@Latin")).toBeInTheDocument();
    expect(screen.getByText("Latin skill")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("https://example.com")).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Ask anything"), "Translate hello");
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("attaches Project Estimate and accepts pasted Markdown", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(screen.getByPlaceholderText("Ask anything"), "/project");
    await user.click(screen.getByRole("option", { name: /Project Estimate/ }));
    await user.type(
      screen.getByPlaceholderText("Ask anything"),
      "Estimate this report: # Checkout - Build payments",
    );

    expect(screen.getByText("@Project Estimate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("opens the Copyright skill picker for @ and the wand", async () => {
    const user = userEvent.setup();
    renderComposer();
    const prompt = screen.getByPlaceholderText("Ask anything");

    await user.type(prompt, "@");
    expect(screen.getByRole("listbox", { name: "Skills" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Browse skills" }));
    expect(screen.getByRole("listbox", { name: "Skills" })).toBeInTheDocument();
  });

  it("sends a basic chat prompt", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderComposer();
    const send = screen.getByRole("button", { name: "Send" });

    expect(send).toBeDisabled();
    await user.type(screen.getByPlaceholderText("Ask anything"), "Hello Kairos");
    expect(send).toBeEnabled();
    await user.click(send);
    expect(onSubmit).toHaveBeenCalledWith("Hello Kairos");
  });

  it("requires a valid website when Copyright is selected", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(screen.getByPlaceholderText("Ask anything"), "/");
    await user.click(screen.getByRole("option", { name: /Copyright/ }));
    expect(screen.getByText("Copyright skill")).toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText("Ask anything"),
      "Write homepage copy",
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    await user.type(screen.getByPlaceholderText("https://example.com"), "nextiva");
    expect(screen.getByText(/Enter a valid/)).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText("https://example.com"));
    await user.type(
      screen.getByPlaceholderText("https://example.com"),
      "https://nextiva.com",
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("removes the Copyright skill", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole("button", { name: "Browse skills" }));
    await user.click(screen.getByRole("option", { name: /Copyright/ }));
    expect(screen.getByText("@Copyright")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove skill" }));
    expect(screen.queryByText("Copyright skill")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask anything")).toBeInTheDocument();
  });

  it("turns send into stop while a turn is pending", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    renderComposer({ isPending: true, onStop });
    await user.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});

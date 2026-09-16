from dataclasses import dataclass

import pytest
from pydantic_ai.messages import ModelMessage, ModelRequest, UserPromptPart

from app.cli import _copyright_prompt, _knowledge_prompt, run_chat


@dataclass
class FakeResult:
    output: str
    prompt: str

    def new_messages(self) -> list[ModelMessage]:
        return [ModelRequest(parts=[UserPromptPart(content=self.prompt)])]


class FakeAgent:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int, str]] = []

    async def run(
        self,
        prompt: str,
        *,
        message_history: list[ModelMessage],
        conversation_id: str,
        deps: object,
    ) -> FakeResult:
        self.calls.append((prompt, len(message_history), conversation_id))
        return FakeResult(output=f"answer {len(self.calls)}", prompt=prompt)


def input_from(values: list[str]):
    iterator = iter(values)
    return lambda _prompt: next(iterator)


@pytest.mark.asyncio
async def test_chat_preserves_history_and_can_start_over() -> None:
    agent = FakeAgent()
    output: list[str] = []

    result = await run_chat(
        agent,
        input_fn=input_from(["hello", "again", "/new", "after reset", "/quit"]),
        output_fn=output.append,
    )

    assert result == 0
    assert [(prompt, size) for prompt, size, _ in agent.calls] == [
        ("hello", 0),
        ("again", 1),
        ("after reset", 0),
    ]
    assert agent.calls[0][2] == agent.calls[1][2]
    assert agent.calls[2][2] != agent.calls[1][2]
    assert "Started a new conversation." in output


@pytest.mark.asyncio
async def test_copyright_command_passes_website_and_context_to_agent() -> None:
    agent = FakeAgent()

    await run_chat(
        agent,
        input_fn=input_from(
            [
                "/copyright https://example.com Write a homepage hero",
                "/quit",
            ]
        ),
        output_fn=lambda _value: None,
    )

    prompt, history_length, _conversation_id = agent.calls[0]
    assert "`copyright` capability" in prompt
    assert "Website: https://example.com" in prompt
    assert "Additional context: Write a homepage hero" in prompt
    assert history_length == 0


def test_copyright_command_requires_a_valid_website() -> None:
    output: list[str] = []

    prompt = _copyright_prompt(
        "/copyright",
        input_from(["not-a-url", "https://example.com", "Friendly and direct"]),
        output.append,
    )

    assert "valid http:// or https://" in output[0]
    assert "Website: https://example.com" in prompt
    assert "Additional context: Friendly and direct" in prompt


@pytest.mark.asyncio
async def test_latin_command_passes_text_to_the_agent() -> None:
    agent = FakeAgent()

    await run_chat(
        agent,
        input_fn=input_from(["/latin Knowledge is power", "/quit"]),
        output_fn=lambda _value: None,
    )

    prompt, history_length, _conversation_id = agent.calls[0]
    assert "`latin` capability" in prompt
    assert "User request: Knowledge is power" in prompt
    assert history_length == 0


def test_knowledge_command_builds_an_explicit_capability_request() -> None:
    prompt = _knowledge_prompt(
        "/knowledge What delayed billing work?",
        input_from([]),
    )

    assert "`knowledge-search` capability" in prompt
    assert "User request: What delayed billing work?" in prompt

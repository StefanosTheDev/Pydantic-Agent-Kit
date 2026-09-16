"""A minimal, stateful terminal chat for the Kairos agent."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any
from urllib.parse import urlsplit
from uuid import uuid4

from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage

from app.agent import build_agent
from app.config import get_settings
from app.dependencies import KairosDeps
from app.observability import configure_observability
from app.runtime import open_agent_dependencies

HELP = (
    "Commands: /copyright [website] [context], /latin [text], /knowledge [question], "
    "/new, /help, /quit"
)


async def run_chat(
    agent: Any,
    *,
    input_fn: Callable[[str], str] = input,
    output_fn: Callable[[str], None] = print,
    deps: KairosDeps | None = None,
) -> int:
    """Run a single in-memory conversation until the user exits."""
    history: list[ModelMessage] = []
    conversation_id = str(uuid4())
    output_fn(
        "Kairos is ready. Talk normally or use /copyright, /latin, or /knowledge. "
        "Type /help for commands."
    )

    while True:
        try:
            message = input_fn("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            output_fn("\nGoodbye.")
            return 0

        if not message:
            continue
        if message in {"/quit", "/exit"}:
            output_fn("Goodbye.")
            return 0
        if message == "/help":
            output_fn(HELP)
            continue
        if message == "/new":
            history.clear()
            conversation_id = str(uuid4())
            output_fn("Started a new conversation.")
            continue
        if message == "/copyright" or message.startswith("/copyright "):
            message = _copyright_prompt(message, input_fn, output_fn)
        if message == "/latin" or message.startswith("/latin "):
            message = _latin_prompt(message, input_fn)
        if message == "/knowledge" or message.startswith("/knowledge "):
            message = _knowledge_prompt(message, input_fn)

        try:
            result = await agent.run(
                message,
                message_history=history,
                conversation_id=conversation_id,
                deps=deps or KairosDeps(),
            )
        except Exception as exc:
            output_fn(f"\nKairos could not answer: {exc}")
            continue

        history.extend(result.new_messages())
        output_fn(f"\nKairos: {result.output}")


def _copyright_prompt(
    command: str,
    input_fn: Callable[[str], str],
    output_fn: Callable[[str], None],
) -> str:
    remainder = command.removeprefix("/copyright").strip()
    website = ""
    context = ""
    if remainder:
        website, _, context = remainder.partition(" ")

    while not _is_website(website):
        if website:
            output_fn("Please provide a valid http:// or https:// website URL.")
        website = input_fn("Website: ").strip()

    if not remainder:
        context = input_fn("Additional context (optional): ").strip()

    prompt = f"Load and use the `copyright` capability for this request.\nWebsite: {website}"
    if context:
        prompt += f"\nAdditional context: {context}"
    return prompt


def _latin_prompt(command: str, input_fn: Callable[[str], str]) -> str:
    text = command.removeprefix("/latin").strip()
    while not text:
        text = input_fn("Text to translate into Latin: ").strip()
    return f"Load and use the `latin` capability for this request.\nUser request: {text}"


def _knowledge_prompt(command: str, input_fn: Callable[[str], str]) -> str:
    question = command.removeprefix("/knowledge").strip()
    while not question:
        question = input_fn("Question about indexed reports: ").strip()
    return (
        "Load and use the `knowledge-search` capability for this request.\n"
        f"User request: {question}"
    )


def _is_website(value: str) -> bool:
    parsed = urlsplit(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.hostname)


async def _main() -> int:
    settings = get_settings()
    configure_observability(
        settings.logfire_environment,
        settings.logfire_token.get_secret_value() if settings.logfire_token else None,
    )
    if not settings.openai_api_key:
        print("OPENAI_API_KEY is not configured. Add it to .env and try again.")
        return 1
    agent: Agent[KairosDeps, str] = build_agent(settings)
    async with open_agent_dependencies(settings) as deps:
        return await run_chat(agent, deps=deps)


def main() -> None:
    raise SystemExit(asyncio.run(_main()))

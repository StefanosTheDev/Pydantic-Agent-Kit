"""Expose the single Kairos agent through a minimal chat API."""

from __future__ import annotations

import asyncio
import re
from collections.abc import AsyncIterable, AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Annotated, Any, Literal
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.sse import EventSourceResponse, ServerSentEvent
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator
from pydantic_ai.messages import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ModelMessage,
    NativeToolCallPart,
    NativeToolReturnPart,
    PartDeltaEvent,
    PartStartEvent,
    TextPart,
    TextPartDelta,
)
from pydantic_ai.run import AgentRunResultEvent

from app.agent import build_agent
from app.config import get_settings
from app.dependencies import KairosDeps
from app.observability import configure_observability
from app.runtime import open_agent_dependencies

SKILL_NAMES = {
    "copyright": "Copyright",
    "latin": "Latin",
    "project-estimate": "Project Estimate",
    "document-review": "Document Review",
    "knowledge-search": "Knowledge Search",
}

FUNCTION_TOOL_TYPES = {
    "count_words": "count_words",
    "analyze_project_report": "analyze_project_report",
    "review_document_with_specialist": "delegate_document_review",
    "search_knowledge": "search_knowledge",
}


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ChatRequest(StrictModel):
    message: str = Field(min_length=1, max_length=10_000)
    conversation_id: UUID | None = None
    skill: (
        Literal["copyright", "latin", "project-estimate", "document-review", "knowledge-search"]
        | None
    ) = None
    website: HttpUrl | None = None
    context: str | None = Field(default=None, max_length=10_000)

    @model_validator(mode="after")
    def require_skill_inputs(self) -> ChatRequest:
        if self.skill == "copyright" and self.website is None:
            raise ValueError("website is required when skill is copyright")
        return self


class ChatResponse(StrictModel):
    conversation_id: UUID
    reply: str


@dataclass
class Conversation:
    history: list[ModelMessage] = field(default_factory=list)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class ChatService:
    """Keep lightweight conversation history in this server process."""

    def __init__(self, agent: Any, deps: KairosDeps) -> None:
        self.agent = agent
        self.deps = deps
        self._conversations: dict[UUID, Conversation] = {}
        self._registry_lock = asyncio.Lock()

    async def chat(self, request: ChatRequest) -> ChatResponse:
        conversation_id = request.conversation_id or uuid4()
        async with self._registry_lock:
            conversation = self._conversations.setdefault(conversation_id, Conversation())

        prompt = _agent_prompt(request)
        async with conversation.lock:
            try:
                result = await self.agent.run(
                    prompt,
                    message_history=conversation.history,
                    conversation_id=str(conversation_id),
                    metadata={"kairos.skill": request.skill or "none"},
                    deps=self.deps,
                )
            except Exception as exc:
                raise HTTPException(status_code=502, detail="Agent request failed") from exc
            conversation.history = result.all_messages()

        return ChatResponse(conversation_id=conversation_id, reply=result.output)

    async def stream(self, request: ChatRequest) -> AsyncIterable[ServerSentEvent]:
        conversation_id = request.conversation_id or uuid4()
        async with self._registry_lock:
            conversation = self._conversations.setdefault(conversation_id, Conversation())

        yield _sse("started", {"conversation_id": str(conversation_id)})
        if request.skill:
            yield _sse(
                "skill",
                {
                    "id": request.skill,
                    "name": SKILL_NAMES[request.skill],
                    "status": "running",
                },
            )

        prompt = _agent_prompt(request)
        capability_calls: dict[str, str] = {}
        async with conversation.lock:
            try:
                async with self.agent.run_stream_events(
                    prompt,
                    message_history=conversation.history,
                    conversation_id=str(conversation_id),
                    metadata={"kairos.skill": request.skill or "none"},
                    deps=self.deps,
                ) as events:
                    async for event in events:
                        if isinstance(event, AgentRunResultEvent):
                            conversation.history = event.result.all_messages()
                            for source in _markdown_sources(event.result.output):
                                yield _sse("source", source)
                            yield _sse(
                                "completed",
                                {"conversation_id": str(conversation_id)},
                            )
                            continue
                        for event_name, data in _stream_event_payloads(event, capability_calls):
                            yield _sse(event_name, data)
            except asyncio.CancelledError:
                raise
            except Exception:
                yield _sse("error", {"message": "Agent request failed"})


def _agent_prompt(request: ChatRequest) -> str:
    if request.skill is None:
        return request.message

    parts = [
        f"Load and use the `{request.skill}` capability for this request.",
        f"User request: {request.message}",
    ]
    if request.website:
        parts.insert(1, f"Website: {request.website}")
    if request.context:
        parts.append(f"Additional context: {request.context}")
    return "\n".join(parts)


def _stream_event_payloads(
    event: object,
    capability_calls: dict[str, str] | None = None,
) -> list[tuple[str, dict[str, object]]]:
    if isinstance(event, PartStartEvent) and isinstance(event.part, TextPart):
        return [("delta", {"text": event.part.content})] if event.part.content else []
    if isinstance(event, PartDeltaEvent) and isinstance(event.delta, TextPartDelta):
        return [("delta", {"text": event.delta.content_delta})]
    if isinstance(event, FunctionToolCallEvent) and event.part.tool_name == "load_capability":
        try:
            capability_id = event.part.args_as_dict().get("id")
        except (ValueError, AssertionError):
            capability_id = None
        if not isinstance(capability_id, str) or capability_id not in SKILL_NAMES:
            return []
        if capability_calls is not None:
            capability_calls[event.part.tool_call_id] = capability_id
        return [
            (
                "skill",
                {
                    "id": capability_id,
                    "name": SKILL_NAMES[capability_id],
                    "status": "running",
                },
            )
        ]
    if (
        isinstance(event, FunctionToolResultEvent)
        and event.part is not None
        and event.part.tool_name == "load_capability"
    ):
        capability_id = (
            capability_calls.get(event.part.tool_call_id) if capability_calls is not None else None
        )
        if capability_id is None or capability_id not in SKILL_NAMES:
            return []
        return [
            (
                "skill",
                {
                    "id": capability_id,
                    "name": SKILL_NAMES[capability_id],
                    "status": "used",
                },
            )
        ]
    if isinstance(event, FunctionToolCallEvent) and event.part.tool_name in FUNCTION_TOOL_TYPES:
        try:
            tool_input = event.part.args_as_dict()
        except (ValueError, AssertionError):
            tool_input = {}
        return [
            (
                "tool",
                {
                    "type": FUNCTION_TOOL_TYPES[event.part.tool_name],
                    "state": "input-available",
                    "tool_call_id": event.part.tool_call_id,
                    "input": tool_input,
                },
            )
        ]
    if (
        isinstance(event, FunctionToolResultEvent)
        and event.part is not None
        and event.part.tool_name in FUNCTION_TOOL_TYPES
    ):
        content = event.part.content
        if isinstance(content, BaseModel):
            output = content.model_dump(mode="json")
        elif isinstance(content, dict):
            output = content
        else:
            output = {"result": content}
        return [
            (
                "tool",
                {
                    "type": FUNCTION_TOOL_TYPES[event.part.tool_name],
                    "state": "output-available",
                    "tool_call_id": event.part.tool_call_id,
                    "output": output,
                },
            )
        ]
    if (
        isinstance(event, PartStartEvent)
        and isinstance(event.part, NativeToolCallPart)
        and event.part.tool_name == "web_search"
    ):
        return [
            (
                "tool",
                {
                    "type": "search_web",
                    "state": "input-available",
                    "tool_call_id": event.part.tool_call_id,
                    "input": event.part.args if isinstance(event.part.args, dict) else {},
                },
            )
        ]
    if (
        isinstance(event, PartStartEvent)
        and isinstance(event.part, NativeToolReturnPart)
        and event.part.tool_name == "web_search"
    ):
        payloads: list[tuple[str, dict[str, object]]] = [
            (
                "tool",
                {
                    "type": "search_web",
                    "state": (
                        "output-available" if event.part.outcome == "success" else "output-error"
                    ),
                    "tool_call_id": event.part.tool_call_id,
                    "output": {"outcome": event.part.outcome},
                },
            )
        ]
        payloads.extend(("source", source) for source in _web_sources(event.part.content))
        return payloads
    return []


def _web_sources(content: object) -> list[dict[str, object]]:
    if not isinstance(content, dict) or not isinstance(content.get("sources"), list):
        return []
    sources: list[dict[str, object]] = []
    for source in content["sources"]:
        if not isinstance(source, dict) or not isinstance(source.get("url"), str):
            continue
        title = source.get("title")
        sources.append(
            {
                "href": source["url"],
                "title": title if isinstance(title, str) else source["url"],
                "description": "Web search source",
            }
        )
    return sources


def _markdown_sources(output: object) -> list[dict[str, object]]:
    """Recover provider citations embedded in final Markdown output."""
    if not isinstance(output, str):
        return []
    sources: list[dict[str, object]] = []
    seen: set[str] = set()
    for title, href in re.findall(r"\[([^\]]+)\]\((https?://[^)]+)\)", output):
        if href in seen:
            continue
        seen.add(href)
        sources.append(
            {
                "href": href,
                "title": title,
                "description": "Source cited by Kairos",
            }
        )
    return sources


def _sse(event: str, data: dict[str, object]) -> ServerSentEvent:
    return ServerSentEvent(event=event, data=data)


def get_chat_service(request: Request) -> ChatService:
    return request.app.state.chat


ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]


def create_app(
    chat_agent: Any | None = None,
    agent_deps: KairosDeps | None = None,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        settings = get_settings()
        if chat_agent is not None:
            application.state.chat = ChatService(chat_agent, agent_deps or KairosDeps())
            yield
            return

        configure_observability(
            settings.logfire_environment,
            settings.logfire_token.get_secret_value() if settings.logfire_token else None,
        )
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        runtime_agent = build_agent(settings)
        async with open_agent_dependencies(settings) as runtime_deps:
            application.state.chat = ChatService(runtime_agent, runtime_deps)
            yield

    application = FastAPI(title="Kairos", version="0.1.0", lifespan=lifespan)

    @application.post("/chat", tags=["chat"])
    async def chat(request: ChatRequest, service: ChatServiceDep) -> ChatResponse:
        return await service.chat(request)

    @application.post("/chat/stream", tags=["chat"], response_class=EventSourceResponse)
    async def stream_chat(
        request: ChatRequest,
        service: ChatServiceDep,
    ) -> AsyncIterable[ServerSentEvent]:
        async for event in service.stream(request):
            yield event

    return application


app = create_app()

from dataclasses import dataclass
from typing import Any, cast
from uuid import UUID

from fastapi.testclient import TestClient
from pydantic_ai.messages import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ModelMessage,
    ModelRequest,
    NativeToolCallPart,
    NativeToolReturnPart,
    PartDeltaEvent,
    PartStartEvent,
    TextPartDelta,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.run import AgentRunResultEvent

from app.main import _markdown_sources, _stream_event_payloads, create_app
from app.tools import ProjectEstimate


@dataclass
class FakeResult:
    output: str
    messages: list[ModelMessage]

    def all_messages(self) -> list[ModelMessage]:
        return self.messages


class FakeAgent:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int]] = []
        self.trace_contexts: list[tuple[str, dict[str, str]]] = []

    async def run(
        self,
        prompt: str,
        *,
        message_history: list[ModelMessage],
        conversation_id: str,
        metadata: dict[str, str],
        deps: object,
    ) -> FakeResult:
        self.calls.append((prompt, len(message_history)))
        self.trace_contexts.append((conversation_id, metadata))
        messages = [
            *message_history,
            ModelRequest(parts=[UserPromptPart(content=prompt)]),
        ]
        return FakeResult(output=f"answer {len(self.calls)}", messages=messages)

    def run_stream_events(
        self,
        prompt: str,
        *,
        message_history: list[ModelMessage],
        conversation_id: str,
        metadata: dict[str, str],
        deps: object,
    ) -> "FakeEventStream":
        self.calls.append((prompt, len(message_history)))
        self.trace_contexts.append((conversation_id, metadata))
        messages = [
            *message_history,
            ModelRequest(parts=[UserPromptPart(content=prompt)]),
        ]
        return FakeEventStream(
            [
                PartDeltaEvent(index=0, delta=TextPartDelta(content_delta="Hello")),
                AgentRunResultEvent(cast(Any, FakeResult(output="Hello", messages=messages))),
            ]
        )


class FakeEventStream:
    def __init__(self, events: list[object]) -> None:
        self.events = events

    async def __aenter__(self) -> "FakeEventStream":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def __aiter__(self):
        for event in self.events:
            yield event


def test_chat_continues_a_conversation() -> None:
    agent = FakeAgent()
    app = create_app(agent)

    with TestClient(app) as client:
        first = client.post("/chat", json={"message": "Hello"})
        conversation_id = first.json()["conversation_id"]
        second = client.post(
            "/chat",
            json={"message": "What did I say?", "conversation_id": conversation_id},
        )

    assert first.status_code == 200
    assert second.status_code == 200
    assert UUID(conversation_id)
    assert second.json()["conversation_id"] == conversation_id
    assert agent.calls == [("Hello", 0), ("What did I say?", 1)]
    assert agent.trace_contexts == [
        (conversation_id, {"kairos.skill": "none"}),
        (conversation_id, {"kairos.skill": "none"}),
    ]


def test_copyright_skill_requires_a_website() -> None:
    app = create_app(FakeAgent())

    with TestClient(app) as client:
        response = client.post(
            "/chat",
            json={"message": "Write a homepage", "skill": "copyright"},
        )

    assert response.status_code == 422
    assert "website is required" in response.text


def test_copyright_skill_builds_the_agent_request() -> None:
    agent = FakeAgent()
    app = create_app(agent)

    with TestClient(app) as client:
        response = client.post(
            "/chat",
            json={
                "message": "Write a homepage hero",
                "skill": "copyright",
                "website": "https://example.com",
                "context": "For technical founders",
            },
        )

    assert response.status_code == 200
    prompt = agent.calls[0][0]
    assert "`copyright` capability" in prompt
    assert "Website: https://example.com/" in prompt
    assert "User request: Write a homepage hero" in prompt
    assert "Additional context: For technical founders" in prompt
    assert agent.trace_contexts[0][1] == {"kairos.skill": "copyright"}


def test_latin_skill_builds_the_agent_request_without_a_website() -> None:
    agent = FakeAgent()
    app = create_app(agent)

    with TestClient(app) as client:
        response = client.post(
            "/chat",
            json={"message": "Translate: Fortune favors the bold", "skill": "latin"},
        )

    assert response.status_code == 200
    prompt = agent.calls[0][0]
    assert "`latin` capability" in prompt
    assert "User request: Translate: Fortune favors the bold" in prompt
    assert agent.trace_contexts[0][1] == {"kairos.skill": "latin"}


def test_project_estimate_skill_builds_the_agent_request() -> None:
    agent = FakeAgent()
    app = create_app(agent)

    with TestClient(app) as client:
        response = client.post(
            "/chat",
            json={
                "message": "Estimate this report:\n# Checkout\n- Build payments",
                "skill": "project-estimate",
            },
        )

    assert response.status_code == 200
    assert "`project-estimate` capability" in agent.calls[0][0]
    assert agent.trace_contexts[0][1] == {"kairos.skill": "project-estimate"}


def test_document_review_skill_builds_the_agent_request() -> None:
    agent = FakeAgent()
    app = create_app(agent)

    with TestClient(app) as client:
        response = client.post(
            "/chat",
            json={
                "message": "Review this report:\n# Launch plan\nShip soon.",
                "skill": "document-review",
            },
        )

    assert response.status_code == 200
    assert "`document-review` capability" in agent.calls[0][0]
    assert agent.trace_contexts[0][1] == {"kairos.skill": "document-review"}


def test_knowledge_search_skill_builds_the_agent_request() -> None:
    agent = FakeAgent()
    app = create_app(agent)

    with TestClient(app) as client:
        response = client.post(
            "/chat",
            json={
                "message": "What delayed previous integrations?",
                "skill": "knowledge-search",
            },
        )

    assert response.status_code == 200
    assert "`knowledge-search` capability" in agent.calls[0][0]
    assert agent.trace_contexts[0][1] == {"kairos.skill": "knowledge-search"}


def test_capability_stream_events_identify_the_loaded_skill() -> None:
    capability_calls: dict[str, str] = {}
    call = FunctionToolCallEvent(
        part=ToolCallPart(
            tool_name="load_capability",
            args={"id": "latin"},
            tool_call_id="capability-1",
            tool_kind="capability-load",
        )
    )
    result = FunctionToolResultEvent(
        part=ToolReturnPart(
            tool_name="load_capability",
            content={"instructions": "Translate into Latin."},
            tool_call_id="capability-1",
            tool_kind="capability-load",
        )
    )

    assert _stream_event_payloads(call, capability_calls) == [
        ("skill", {"id": "latin", "name": "Latin", "status": "running"})
    ]
    assert _stream_event_payloads(result, capability_calls) == [
        ("skill", {"id": "latin", "name": "Latin", "status": "used"})
    ]


def test_function_tool_stream_events_expose_estimate_activity() -> None:
    call = FunctionToolCallEvent(
        part=ToolCallPart(
            tool_name="analyze_project_report",
            args={"work_items": [{"title": "Build checkout", "size": "large"}], "risks": []},
            tool_call_id="estimate-1",
        )
    )
    result = FunctionToolResultEvent(
        part=ToolReturnPart(
            tool_name="analyze_project_report",
            content=ProjectEstimate(
                small_tasks=0,
                medium_tasks=0,
                large_tasks=1,
                base_engineering_days=5,
                risk_count=0,
                contingency_percent=0,
                estimated_engineering_days=5,
                formula="test formula",
            ),
            tool_call_id="estimate-1",
        )
    )

    assert _stream_event_payloads(call)[0][1]["state"] == "input-available"
    result_payload = _stream_event_payloads(result)[0][1]
    assert result_payload["type"] == "analyze_project_report"
    assert result_payload["state"] == "output-available"
    output = result_payload["output"]
    assert isinstance(output, dict)
    assert output["estimated_engineering_days"] == 5


def test_openapi_only_exposes_chat_operations() -> None:
    app = create_app(FakeAgent())

    with TestClient(app) as client:
        paths = client.get("/openapi.json").json()["paths"]

    assert set(paths) == {"/chat", "/chat/stream"}


def test_stream_chat_emits_text_and_completion_events() -> None:
    agent = FakeAgent()
    app = create_app(agent)

    with TestClient(app) as client:
        with client.stream("POST", "/chat/stream", json={"message": "Hello"}) as response:
            body = response.read().decode()

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert "event: started" in body
    assert "event: delta" in body
    assert '"text": "Hello"' in body
    assert "event: completed" in body
    assert UUID(agent.trace_contexts[0][0])
    assert agent.trace_contexts[0][1] == {"kairos.skill": "none"}


def test_stream_events_expose_real_web_search_activity_and_sources() -> None:
    call = PartStartEvent(
        index=0,
        part=NativeToolCallPart(
            tool_name="web_search",
            args={"query": "Nextiva"},
            tool_call_id="web-1",
        ),
    )
    result = PartStartEvent(
        index=0,
        part=NativeToolReturnPart(
            tool_name="web_search",
            tool_call_id="web-1",
            content={
                "sources": [
                    {"url": "https://nextiva.com", "title": "Nextiva"},
                ]
            },
        ),
    )

    assert _stream_event_payloads(call) == [
        (
            "tool",
            {
                "type": "search_web",
                "state": "input-available",
                "tool_call_id": "web-1",
                "input": {"query": "Nextiva"},
            },
        )
    ]
    payloads = _stream_event_payloads(result)
    assert payloads[0][0] == "tool"
    assert payloads[1] == (
        "source",
        {
            "href": "https://nextiva.com",
            "title": "Nextiva",
            "description": "Web search source",
        },
    )


def test_markdown_citations_are_exposed_as_sources() -> None:
    assert _markdown_sources(
        "See [Nextiva](https://nextiva.com/) and [Nextiva](https://nextiva.com/)."
    ) == [
        {
            "href": "https://nextiva.com/",
            "title": "Nextiva",
            "description": "Source cited by Kairos",
        }
    ]

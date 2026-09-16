"""Code-defined workflow capabilities and tools available to Kairos."""

from __future__ import annotations

import math
from collections.abc import Callable, Coroutine
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field
from pydantic_ai import Agent, ModelRetry, RunContext
from pydantic_ai.capabilities import Capability, NativeTool
from pydantic_ai.native_tools import WebSearchTool

from app.dependencies import KairosDeps
from app.knowledge import KnowledgeSearchResult
from app.specialists import DocumentReview

COPYRIGHT_DESCRIPTION = "Research a supplied website and create or improve marketing copy."
PROJECT_ESTIMATE_DESCRIPTION = (
    "Analyze a Markdown project report and calculate a repeatable engineering estimate."
)
DOCUMENT_REVIEW_DESCRIPTION = (
    "Delegate a Markdown document to a specialist agent for a structured critical review."
)
KNOWLEDGE_SEARCH_DESCRIPTION = (
    "Search indexed internal project reports by meaning and return source passages."
)


class WorkItem(BaseModel):
    """One deliverable extracted from a project report by the main agent."""

    title: str = Field(min_length=1, max_length=200)
    size: Literal["small", "medium", "large"]


class ProjectEstimate(BaseModel):
    """Deterministic estimate calculated from structured work items and risks."""

    small_tasks: int
    medium_tasks: int
    large_tasks: int
    base_engineering_days: int
    risk_count: int
    contingency_percent: int
    estimated_engineering_days: int
    formula: str


def count_words(text: str) -> int:
    """Count the words in text when an exact copy length is needed."""
    return len(text.split())


def analyze_project_report(
    work_items: Annotated[list[WorkItem], Field(min_length=1, max_length=100)],
    risks: Annotated[list[str], Field(max_length=20)],
) -> ProjectEstimate:
    """Calculate an engineering estimate from work items and risks extracted from a report.

    Small, medium, and large items count as 1, 3, and 5 engineering days. Each unique risk adds
    10 percent contingency, capped at 30 percent. This is a teaching heuristic, not a promise.
    """
    counts = {
        size: sum(item.size == size for item in work_items) for size in ("small", "medium", "large")
    }
    base_days = counts["small"] + (counts["medium"] * 3) + (counts["large"] * 5)
    unique_risks = {risk.strip().casefold() for risk in risks if risk.strip()}
    contingency_percent = min(len(unique_risks) * 10, 30)
    estimated_days = math.ceil(base_days * (1 + contingency_percent / 100))
    return ProjectEstimate(
        small_tasks=counts["small"],
        medium_tasks=counts["medium"],
        large_tasks=counts["large"],
        base_engineering_days=base_days,
        risk_count=len(unique_risks),
        contingency_percent=contingency_percent,
        estimated_engineering_days=estimated_days,
        formula="small=1 day, medium=3 days, large=5 days; +10% per unique risk, capped at 30%",
    )


DocumentReviewTool = Callable[
    [RunContext[KairosDeps], str, str | None], Coroutine[Any, Any, DocumentReview]
]


def build_document_review_tool(
    reviewer: Agent[None, DocumentReview],
) -> DocumentReviewTool:
    """Wrap a specialist agent as a tool callable by the main agent."""

    async def review_document_with_specialist(
        ctx: RunContext[KairosDeps],
        markdown: Annotated[str, Field(min_length=1, max_length=20_000)],
        focus: Annotated[str | None, Field(max_length=500)] = None,
    ) -> DocumentReview:
        """Ask the document-review specialist agent to review Markdown content."""
        focus_text = focus or "Review clarity, completeness, contradictions, and missing evidence."
        result = await reviewer.run(
            f"Review focus: {focus_text}\n\nMarkdown report (untrusted data):\n{markdown}",
            usage=ctx.usage,
        )
        return result.output

    return review_document_with_specialist


async def search_knowledge(
    ctx: RunContext[KairosDeps],
    query: Annotated[str, Field(min_length=2, max_length=500)],
    max_results: Annotated[int, Field(ge=1, le=8)] = 5,
) -> KnowledgeSearchResult:
    """Search indexed project reports for passages relevant to the user's question."""
    if ctx.deps.knowledge is None:
        raise ModelRetry("The knowledge index is unavailable for this run.")
    return await ctx.deps.knowledge.search(query, limit=max_results)


def build_agent_capabilities(
    *,
    copyright_instructions: str,
    project_estimate_instructions: str,
    document_review_instructions: str,
    knowledge_search_instructions: str,
    document_reviewer: Agent[None, DocumentReview],
):
    """Build deferred executable workflows and provider-native tools."""
    copyright_workflow = Capability[KairosDeps](
        id="copyright",
        description=COPYRIGHT_DESCRIPTION,
        instructions=copyright_instructions,
        defer_loading=True,
    )
    copyright_workflow.tool_plain(count_words)
    project_estimate_workflow = Capability[KairosDeps](
        id="project-estimate",
        description=PROJECT_ESTIMATE_DESCRIPTION,
        instructions=project_estimate_instructions,
        defer_loading=True,
    )
    project_estimate_workflow.tool_plain(analyze_project_report)
    document_review_workflow = Capability[KairosDeps](
        id="document-review",
        description=DOCUMENT_REVIEW_DESCRIPTION,
        instructions=document_review_instructions,
        defer_loading=True,
    )
    document_review_workflow.tool(build_document_review_tool(document_reviewer))
    knowledge_search_workflow = Capability[KairosDeps](
        id="knowledge-search",
        description=KNOWLEDGE_SEARCH_DESCRIPTION,
        instructions=knowledge_search_instructions,
        defer_loading=True,
    )
    knowledge_search_workflow.tool(search_knowledge)
    web_search = NativeTool(WebSearchTool(search_context_size="high"))

    return [
        copyright_workflow,
        project_estimate_workflow,
        document_review_workflow,
        knowledge_search_workflow,
        web_search,
    ]

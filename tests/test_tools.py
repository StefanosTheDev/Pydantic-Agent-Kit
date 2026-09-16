import pytest
from pydantic_ai import ModelRetry, RunContext, RunUsage
from pydantic_ai.models.test import TestModel
from pydantic_ai.native_tools import WebSearchTool
from pydantic_ai.toolsets import FunctionToolset

from app.dependencies import KairosDeps
from app.specialists import build_document_reviewer
from app.tools import (
    WorkItem,
    analyze_project_report,
    build_agent_capabilities,
    count_words,
    search_knowledge,
)


def test_count_words_returns_an_exact_count() -> None:
    assert count_words("Simple copy with four words") == 5
    assert count_words("  spacing\n does not\tmatter  ") == 4
    assert count_words("") == 0


def test_project_report_estimate_is_deterministic() -> None:
    result = analyze_project_report(
        work_items=[
            WorkItem(title="Update headline", size="small"),
            WorkItem(title="Build checkout", size="large"),
            WorkItem(title="Add analytics", size="medium"),
        ],
        risks=["Unknown payment API", "Late design", "unknown payment api"],
    )

    assert result.small_tasks == 1
    assert result.medium_tasks == 1
    assert result.large_tasks == 1
    assert result.base_engineering_days == 9
    assert result.risk_count == 2
    assert result.contingency_percent == 20
    assert result.estimated_engineering_days == 11


@pytest.mark.asyncio
async def test_knowledge_search_fails_clearly_without_an_index() -> None:
    context = RunContext(
        deps=KairosDeps(),
        model=TestModel(),
        usage=RunUsage(),
    )

    with pytest.raises(ModelRetry, match="knowledge index is unavailable"):
        await search_knowledge(context, "previous billing projects")


def test_capabilities_include_four_executable_workflows_and_web_search() -> None:
    reviewer = build_document_reviewer("test")
    capabilities = build_agent_capabilities(
        copyright_instructions="Copyright instructions",
        project_estimate_instructions="Project estimate instructions",
        document_review_instructions="Document review instructions",
        knowledge_search_instructions="Knowledge search instructions",
        document_reviewer=reviewer,
    )

    assert len(capabilities) == 5
    assert "id='copyright'" in repr(capabilities[0])
    copyright_tools = capabilities[0].get_toolset()
    assert isinstance(copyright_tools, FunctionToolset)
    assert "count_words" in copyright_tools.tools
    estimate_tools = capabilities[1].get_toolset()
    assert isinstance(estimate_tools, FunctionToolset)
    assert "analyze_project_report" in estimate_tools.tools
    review_tools = capabilities[2].get_toolset()
    assert isinstance(review_tools, FunctionToolset)
    assert "review_document_with_specialist" in review_tools.tools
    knowledge_tools = capabilities[3].get_toolset()
    assert isinstance(knowledge_tools, FunctionToolset)
    assert "search_knowledge" in knowledge_tools.tools
    assert isinstance(capabilities[4].tool, WebSearchTool)

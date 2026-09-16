from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.native_tools import WebSearchTool
from pydantic_ai_harness import Skills

from app.agent import (
    COPYRIGHT_INSTRUCTIONS,
    DOCUMENT_REVIEW_INSTRUCTIONS,
    KNOWLEDGE_SEARCH_INSTRUCTIONS,
    PROJECT_ESTIMATE_INSTRUCTIONS,
    build_agent,
)
from app.config import Settings


def test_agent_has_web_search_harness_skills_and_workflow_capabilities() -> None:
    agent = build_agent(Settings(openai_api_key="test-key"))

    assert agent.name == "kairos"
    assert isinstance(agent.model, OpenAIResponsesModel)
    assert agent.model_settings is not None
    assert any(isinstance(tool, WebSearchTool) for tool in agent._cap_native_tools)
    assert any(isinstance(capability, Skills) for capability in agent._root_capability.capabilities)
    assert "id='copyright'" in repr(agent._root_capability)
    assert "id='project-estimate'" in repr(agent._root_capability)
    assert "id='document-review'" in repr(agent._root_capability)
    assert "id='knowledge-search'" in repr(agent._root_capability)
    assert "defer_loading=True" in repr(agent._root_capability)
    assert "Research that website with web search" in COPYRIGHT_INSTRUCTIONS
    assert "Call analyze_project_report exactly once" in PROJECT_ESTIMATE_INSTRUCTIONS
    assert "review_document_with_specialist" in DOCUMENT_REVIEW_INSTRUCTIONS
    assert "Call search_knowledge before answering" in KNOWLEDGE_SEARCH_INSTRUCTIONS

import pytest
from pydantic import ValidationError

from app.config import Settings


def test_settings_normalize_openai_responses_model() -> None:
    assert Settings(openai_model="gpt-4.1-mini").openai_model == ("openai-responses:gpt-4.1-mini")
    assert Settings(openai_model="openai:gpt-4.1-mini").openai_model == (
        "openai-responses:gpt-4.1-mini"
    )


def test_settings_reject_other_providers() -> None:
    with pytest.raises(ValidationError):
        Settings(openai_model="anthropic:claude-sonnet-4-6")


def test_empty_api_and_logfire_tokens_are_unset() -> None:
    settings = Settings(openai_api_key="", logfire_token="")

    assert settings.openai_api_key is None
    assert settings.logfire_token is None


def test_rag_defaults_match_the_pgvector_schema() -> None:
    settings = Settings()

    assert settings.embedding_model == "openai:text-embedding-3-small"
    assert settings.embedding_dimensions == 1536
    assert settings.database_url.get_secret_value().endswith("127.0.0.1:54320/kairos")


def test_settings_reject_embedding_model_that_needs_a_different_index() -> None:
    with pytest.raises(ValidationError):
        Settings(embedding_model="openai:text-embedding-3-large")

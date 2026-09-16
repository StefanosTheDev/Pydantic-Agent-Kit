"""Load the small amount of configuration required by the chat agent."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: SecretStr | None = None
    openai_model: str = "openai-responses:gpt-4.1-mini"
    database_url: SecretStr = SecretStr("postgresql://kairos:kairos@127.0.0.1:54320/kairos")
    embedding_model: str = "openai:text-embedding-3-small"
    embedding_dimensions: int = Field(default=1536, frozen=True)
    logfire_token: SecretStr | None = None
    logfire_environment: str = "development"

    @field_validator("openai_api_key", "logfire_token", mode="before")
    @classmethod
    def empty_secret_is_unset(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("openai_model")
    @classmethod
    def add_openai_provider_prefix(cls, value: str) -> str:
        normalized = value if ":" in value else f"openai-responses:{value}"
        if normalized.startswith("openai:"):
            normalized = normalized.replace("openai:", "openai-responses:", 1)
        if not normalized.startswith("openai-responses:"):
            raise ValueError("Kairos requires an OpenAI Responses API model")
        return normalized

    @field_validator("embedding_model")
    @classmethod
    def require_supported_embedding_model(cls, value: str) -> str:
        normalized = value if ":" in value else f"openai:{value}"
        if normalized != "openai:text-embedding-3-small":
            raise ValueError(
                "Kairos currently indexes 1536-dimensional text-embedding-3-small vectors"
            )
        return normalized


@lru_cache
def get_settings() -> Settings:
    return Settings()

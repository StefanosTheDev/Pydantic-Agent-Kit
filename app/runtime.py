"""Create and close the external resources shared by Kairos runs."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from pydantic_ai import Embedder
from pydantic_ai.embeddings.openai import OpenAIEmbeddingModel
from pydantic_ai.providers.openai import OpenAIProvider

from app.config import Settings
from app.database import KnowledgeDatabase
from app.dependencies import KairosDeps
from app.knowledge import KnowledgeBase


def build_embedder(settings: Settings) -> Embedder:
    """Build the embedding client with the same explicit credential source as the chat model."""
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    model = OpenAIEmbeddingModel(
        settings.embedding_model.split(":", 1)[-1],
        provider=OpenAIProvider(api_key=settings.openai_api_key.get_secret_value()),
    )
    return Embedder(model, instrument=True)


@asynccontextmanager
async def open_agent_dependencies(settings: Settings) -> AsyncIterator[KairosDeps]:
    database = await KnowledgeDatabase.connect(settings.database_url.get_secret_value())
    try:
        yield KairosDeps(
            knowledge=KnowledgeBase(
                database,
                build_embedder(settings),
                embedding_model=settings.embedding_model,
                embedding_dimensions=settings.embedding_dimensions,
            )
        )
    finally:
        await database.close()

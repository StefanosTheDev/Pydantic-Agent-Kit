"""Direct asyncpg access for the Kairos knowledge index."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import asyncpg
from pgvector.asyncpg import register_vector


@dataclass(frozen=True)
class StoredChunk:
    document_id: str
    chunk_index: int
    source: str
    title: str
    heading: str
    content: str
    content_hash: str
    embedding: list[float]


@dataclass(frozen=True)
class SearchRow:
    source: str
    title: str
    heading: str
    content: str
    score: float


async def _initialize_connection(connection: asyncpg.Connection) -> None:
    await register_vector(connection)


class KnowledgeDatabase:
    """A bounded pool with only the operations needed by the RAG feature."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    @classmethod
    async def connect(cls, database_url: str) -> KnowledgeDatabase:
        pool = await asyncpg.create_pool(
            database_url,
            min_size=1,
            max_size=5,
            timeout=5,
            command_timeout=10,
            init=_initialize_connection,
        )
        return cls(pool)

    async def close(self) -> None:
        await self._pool.close()

    async def replace_document(
        self,
        *,
        scope: str,
        embedding_model: str,
        embedding_dimensions: int,
        chunks: Sequence[StoredChunk],
    ) -> None:
        """Replace one document atomically after embeddings have already been generated."""
        if not chunks:
            return
        document_id = chunks[0].document_id
        async with self._pool.acquire(timeout=5) as connection:
            async with connection.transaction():
                await connection.execute(
                    "DELETE FROM knowledge_chunks WHERE scope = $1 AND document_id = $2",
                    scope,
                    document_id,
                )
                await connection.executemany(
                    """
                    INSERT INTO knowledge_chunks (
                        scope, document_id, chunk_index, source, title, heading, content,
                        content_hash, embedding_model, embedding_dimensions, embedding
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    """,
                    [
                        (
                            scope,
                            chunk.document_id,
                            chunk.chunk_index,
                            chunk.source,
                            chunk.title,
                            chunk.heading,
                            chunk.content,
                            chunk.content_hash,
                            embedding_model,
                            embedding_dimensions,
                            chunk.embedding,
                        )
                        for chunk in chunks
                    ],
                )

    async def search(
        self,
        *,
        scope: str,
        embedding_model: str,
        embedding: list[float],
        limit: int,
    ) -> list[SearchRow]:
        """Perform exact cosine search within the application-owned knowledge scope."""
        async with self._pool.acquire(timeout=5) as connection:
            rows = await connection.fetch(
                """
                SELECT source, title, heading, content,
                       1 - (embedding <=> $1) AS score
                FROM knowledge_chunks
                WHERE scope = $2 AND embedding_model = $3
                ORDER BY embedding <=> $1
                LIMIT $4
                """,
                embedding,
                scope,
                embedding_model,
                limit,
            )
        return [
            SearchRow(
                source=row["source"],
                title=row["title"],
                heading=row["heading"],
                content=row["content"],
                score=float(row["score"]),
            )
            for row in rows
        ]

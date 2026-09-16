"""Markdown ingestion, embeddings, and semantic retrieval for Kairos."""

from __future__ import annotations

import hashlib
import re
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from pydantic import BaseModel, Field
from pydantic_ai import Embedder

from app.database import KnowledgeDatabase, StoredChunk

DEMO_SCOPE = "sample-project-reports"
HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


class KnowledgePassage(BaseModel):
    """One source passage returned by semantic search."""

    title: str
    heading: str
    source: str
    content: str
    score: float = Field(ge=-1, le=1)


class KnowledgeSearchResult(BaseModel):
    """Source-grounded result returned to the agent."""

    query: str
    titles: list[str]
    passages: list[KnowledgePassage]


@dataclass(frozen=True)
class MarkdownChunk:
    document_id: str
    chunk_index: int
    source: str
    title: str
    heading: str
    content: str


def chunk_markdown(path: Path, *, source: str) -> list[MarkdownChunk]:
    """Split Markdown on its natural headings while retaining source metadata."""
    text = path.read_text(encoding="utf-8").strip()
    title = path.stem.replace("-", " ").title()
    current_heading = title
    current_lines: list[str] = []
    sections: list[tuple[str, str]] = []

    def flush() -> None:
        content = "\n".join(current_lines).strip()
        if content:
            sections.append((current_heading, content))

    for line in text.splitlines():
        match = HEADING_PATTERN.match(line)
        if match:
            flush()
            current_lines = [line]
            current_heading = match.group(2)
            if len(match.group(1)) == 1:
                title = current_heading
            continue
        current_lines.append(line)
    flush()

    return [
        MarkdownChunk(
            document_id=path.stem,
            chunk_index=index,
            source=source,
            title=title,
            heading=heading,
            content=content,
        )
        for index, (heading, content) in enumerate(sections)
    ]


class KnowledgeBase:
    """Coordinate embeddings and database access without holding a connection during API calls."""

    def __init__(
        self,
        database: KnowledgeDatabase,
        embedder: Embedder,
        *,
        embedding_model: str,
        embedding_dimensions: int,
        scope: str = DEMO_SCOPE,
    ) -> None:
        self.database = database
        self.embedder = embedder
        self.embedding_model = embedding_model
        self.embedding_dimensions = embedding_dimensions
        self.scope = scope

    async def search(self, query: str, *, limit: int = 5) -> KnowledgeSearchResult:
        embedded = await self.embedder.embed_query(query)
        vector = list(embedded.embeddings[0])
        self._validate_dimensions(vector)
        rows = await self.database.search(
            scope=self.scope,
            embedding_model=self.embedding_model,
            embedding=vector,
            limit=limit,
        )
        passages = [
            KnowledgePassage(
                title=row.title,
                heading=row.heading,
                source=row.source,
                content=row.content,
                score=row.score,
            )
            for row in rows
        ]
        titles = list(dict.fromkeys(passage.title for passage in passages))
        return KnowledgeSearchResult(query=query, titles=titles, passages=passages)

    async def index_chunks(self, chunks: Sequence[MarkdownChunk]) -> int:
        """Embed chunks first, then atomically replace each document in PostgreSQL."""
        if not chunks:
            return 0
        embedded = await self.embedder.embed_documents([chunk.content for chunk in chunks])
        vectors = [list(vector) for vector in embedded.embeddings]
        for vector in vectors:
            self._validate_dimensions(vector)

        document_ids = list(dict.fromkeys(chunk.document_id for chunk in chunks))
        for document_id in document_ids:
            stored = [
                StoredChunk(
                    document_id=chunk.document_id,
                    chunk_index=chunk.chunk_index,
                    source=chunk.source,
                    title=chunk.title,
                    heading=chunk.heading,
                    content=chunk.content,
                    content_hash=hashlib.sha256(chunk.content.encode()).hexdigest(),
                    embedding=vector,
                )
                for chunk, vector in zip(chunks, vectors, strict=True)
                if chunk.document_id == document_id
            ]
            await self.database.replace_document(
                scope=self.scope,
                embedding_model=self.embedding_model,
                embedding_dimensions=self.embedding_dimensions,
                chunks=stored,
            )
        return len(chunks)

    def _validate_dimensions(self, vector: Sequence[float]) -> None:
        if len(vector) != self.embedding_dimensions:
            raise ValueError(
                f"Expected {self.embedding_dimensions} embedding dimensions, got {len(vector)}"
            )


def load_markdown_directory(directory: Path, *, project_root: Path) -> list[MarkdownChunk]:
    """Load every Markdown report in stable filename order."""
    chunks: list[MarkdownChunk] = []
    for path in sorted(directory.glob("*.md")):
        chunks.extend(chunk_markdown(path, source=str(path.relative_to(project_root))))
    return chunks

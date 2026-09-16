"""Index the sample Markdown reports into the local pgvector database."""

from __future__ import annotations

import asyncio

from app.config import PROJECT_ROOT, get_settings
from app.knowledge import load_markdown_directory
from app.observability import configure_observability
from app.runtime import open_agent_dependencies


async def _main() -> int:
    settings = get_settings()
    configure_observability(
        settings.logfire_environment,
        settings.logfire_token.get_secret_value() if settings.logfire_token else None,
    )
    reports = PROJECT_ROOT / "knowledge" / "reports"
    chunks = load_markdown_directory(reports, project_root=PROJECT_ROOT)
    if not chunks:
        print(f"No Markdown reports found in {reports}")
        return 1
    async with open_agent_dependencies(settings) as deps:
        assert deps.knowledge is not None
        count = await deps.knowledge.index_chunks(chunks)
    print(f"Indexed {count} chunks from {len({chunk.document_id for chunk in chunks})} reports.")
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(_main()))

from typing import Any, cast
from unittest.mock import AsyncMock, patch

import pytest

from app.database import KnowledgeDatabase


@pytest.mark.asyncio
async def test_database_connect_propagates_an_unavailable_database() -> None:
    with (
        patch(
            "app.database.asyncpg.create_pool",
            new=AsyncMock(side_effect=ConnectionRefusedError("database unavailable")),
        ),
        pytest.raises(ConnectionRefusedError, match="database unavailable"),
    ):
        await KnowledgeDatabase.connect("postgresql://invalid")


@pytest.mark.asyncio
async def test_database_close_releases_the_pool() -> None:
    pool = AsyncMock()
    database = KnowledgeDatabase(cast(Any, pool))

    await database.close()

    pool.close.assert_awaited_once()

"""Apply ordered, checksummed SQL migrations for the local Kairos database."""

from __future__ import annotations

import asyncio
import hashlib

import asyncpg

from app.config import PROJECT_ROOT, get_settings

MIGRATIONS_DIR = PROJECT_ROOT / "db" / "migrations"
MIGRATION_LOCK_ID = 4_245_247_615


async def apply_migrations(database_url: str) -> list[str]:
    """Apply pending migrations and reject changed migrations that already ran."""
    connection = await asyncpg.connect(database_url, timeout=5, command_timeout=30)
    applied_now: list[str] = []
    try:
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
        await connection.execute("SELECT pg_advisory_lock($1)", MIGRATION_LOCK_ID)
        try:
            applied = {
                row["version"]: row["checksum"]
                for row in await connection.fetch("SELECT version, checksum FROM schema_migrations")
            }
            for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
                sql = path.read_text(encoding="utf-8")
                checksum = hashlib.sha256(sql.encode()).hexdigest()
                previous_checksum = applied.get(path.name)
                if previous_checksum is not None:
                    if previous_checksum != checksum:
                        raise RuntimeError(f"Applied migration changed: {path.name}")
                    continue
                async with connection.transaction():
                    await connection.execute(sql)
                    await connection.execute(
                        "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)",
                        path.name,
                        checksum,
                    )
                applied_now.append(path.name)
        finally:
            await connection.execute("SELECT pg_advisory_unlock($1)", MIGRATION_LOCK_ID)
    finally:
        await connection.close()
    return applied_now


async def _main() -> int:
    settings = get_settings()
    applied = await apply_migrations(settings.database_url.get_secret_value())
    if applied:
        print(f"Applied migrations: {', '.join(applied)}")
    else:
        print("Database is already up to date.")
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(_main()))

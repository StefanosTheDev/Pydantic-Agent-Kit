"""Configure the one observability integration used by Kairos."""

from functools import lru_cache

import logfire


@lru_cache(maxsize=1)
def configure_observability(environment: str, token: str | None) -> None:
    """Trace agent runs when a Logfire token is present, without breaking local use."""
    logfire.configure(
        service_name="kairos",
        environment=environment,
        token=token,
        send_to_logfire="if-token-present",
        console=False,
    )
    logfire.instrument_pydantic_ai(include_content=True)

from unittest.mock import patch

from app.observability import configure_observability


def test_logfire_is_safe_locally_and_instruments_agent_content() -> None:
    configure_observability.cache_clear()
    with (
        patch("app.observability.logfire.configure") as configure,
        patch("app.observability.logfire.instrument_pydantic_ai") as instrument,
    ):
        configure_observability("test", "test-token")
        configure_observability("test", "test-token")

    configure.assert_called_once_with(
        service_name="kairos",
        environment="test",
        token="test-token",
        send_to_logfire="if-token-present",
        console=False,
    )
    instrument.assert_called_once_with(include_content=True)
    configure_observability.cache_clear()

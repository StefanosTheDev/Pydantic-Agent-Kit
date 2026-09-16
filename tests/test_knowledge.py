from pathlib import Path

from app.knowledge import load_markdown_directory


def test_sample_reports_split_on_markdown_headings() -> None:
    project_root = Path(__file__).resolve().parent.parent
    chunks = load_markdown_directory(
        project_root / "knowledge" / "reports",
        project_root=project_root,
    )

    document_ids = {chunk.document_id for chunk in chunks}
    assert document_ids == {
        "analytics-dashboard",
        "billing-launch",
        "mobile-notifications",
        "onboarding-redesign",
        "support-migration",
    }
    assert len(chunks) == 25
    assert all(chunk.source.startswith("knowledge/reports/") for chunk in chunks)
    assert any(chunk.heading == "Risks and lessons" for chunk in chunks)

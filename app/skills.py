"""Portable instruction-only skills available to the Kairos agent."""

from pathlib import Path

from pydantic_ai_harness import Skills

SKILL_LIBRARY = Path(__file__).resolve().parents[1] / "skills"


def build_instruction_skills() -> Skills:
    """Load the repository's Agent Skill packages as deferred capabilities."""
    return Skills(SKILL_LIBRARY, include=["latin"])

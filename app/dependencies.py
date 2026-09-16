"""Typed runtime dependencies available to Kairos tools."""

from __future__ import annotations

from dataclasses import dataclass

from app.knowledge import KnowledgeBase


@dataclass
class KairosDeps:
    knowledge: KnowledgeBase | None = None

from pydantic_ai_harness import Skills

from app.skills import SKILL_LIBRARY, build_instruction_skills


def test_latin_is_loaded_from_a_real_harness_skill_package() -> None:
    skills = build_instruction_skills()
    loaded_capabilities: list[object] = []
    skills.apply(loaded_capabilities.append)

    assert isinstance(skills, Skills)
    assert skills.directories == (SKILL_LIBRARY,)
    assert skills.include == frozenset({"latin"})
    assert len(loaded_capabilities) == 1
    assert "id='latin'" in repr(loaded_capabilities[0])


def test_latin_skill_keeps_its_instructions_in_skill_markdown() -> None:
    skill_markdown = (SKILL_LIBRARY / "latin" / "SKILL.md").read_text()

    assert "name: latin" in skill_markdown
    assert "description:" in skill_markdown
    assert "Translate the user's requested text into Latin" in skill_markdown

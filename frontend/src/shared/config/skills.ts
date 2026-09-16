export type Skill = {
  id: string;
  name: string;
  description: string;
};

export type SupportedSkillId =
  | "copyright"
  | "latin"
  | "project-estimate"
  | "document-review"
  | "knowledge-search";

export const defaultSkills: Skill[] = [
  {
    id: "copyright",
    name: "Copyright",
    description: "Research a website and create accurate marketing copy.",
  },
  {
    id: "latin",
    name: "Latin",
    description: "Translate or rewrite anything in your prompt into Latin.",
  },
  {
    id: "project-estimate",
    name: "Project Estimate",
    description: "Turn a pasted Markdown report into a repeatable engineering estimate.",
  },
  {
    id: "document-review",
    name: "Document Review",
    description: "Delegate pasted Markdown to a specialist agent for critical review.",
  },
  {
    id: "knowledge-search",
    name: "Knowledge Search",
    description: "Search indexed project reports by meaning and answer from their sources.",
  },
];

export function isSupportedSkillId(value: string | undefined): value is SupportedSkillId {
  return defaultSkills.some((skill) => skill.id === value);
}

export function supportedSkillName(skillId: SupportedSkillId) {
  return defaultSkills.find((skill) => skill.id === skillId)?.name ?? skillId;
}

export function isSkill(value: unknown): value is Skill {
  if (!value || typeof value !== "object") {
    return false;
  }
  const skill = value as Skill;
  return (
    typeof skill.id === "string" &&
    typeof skill.name === "string" &&
    typeof skill.description === "string"
  );
}

export function normalizeSkill(value: unknown): Skill | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.description !== "string"
  ) {
    return null;
  }
  return {
    id: record.id,
    name: record.name,
    description: record.description,
  };
}

export function createSkillId(name: string) {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "skill";
  return `${slug}-${crypto.randomUUID().slice(0, 8)}`;
}

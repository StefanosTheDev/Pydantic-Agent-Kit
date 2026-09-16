import * as React from "react";

import {
  createSkillId,
  defaultSkills,
  normalizeSkill,
  type Skill,
} from "@/shared/config/skills";
import { readJson, writeJson } from "@/shared/lib/local-store";

export const SKILLS_STORAGE_KEY = "openapply-skills";

type SkillsContextValue = {
  skills: Skill[];
  getSkill: (id: string | null | undefined) => Skill | null;
  addSkill: (input: { name: string; description: string }) => Skill;
  updateSkill: (
    id: string,
    patch: Partial<Pick<Skill, "name" | "description">>,
  ) => void;
  removeSkill: (id: string) => void;
};

const SkillsContext = React.createContext<SkillsContextValue | null>(null);

function readStoredSkills(): Skill[] {
  const stored = readJson<unknown>(SKILLS_STORAGE_KEY);
  if (!Array.isArray(stored)) {
    return defaultSkills;
  }
  const skills = stored
    .map((item) => normalizeSkill(item))
    .filter((skill): skill is Skill => skill !== null);
  return skills.length > 0 ? skills : defaultSkills;
}

export function SkillsProvider({ children }: { children: React.ReactNode }) {
  const [skills, setSkills] = React.useState<Skill[]>(readStoredSkills);

  React.useEffect(() => {
    writeJson(SKILLS_STORAGE_KEY, skills);
  }, [skills]);

  const value = React.useMemo(
    () => ({
      skills,
      getSkill: (id: string | null | undefined) =>
        skills.find((skill) => skill.id === id) ?? null,
      addSkill: (input: { name: string; description: string }) => {
        const skill: Skill = {
          id: createSkillId(input.name),
          name: input.name.trim() || "Untitled skill",
          description: input.description.trim(),
        };
        setSkills((current) => [...current, skill]);
        return skill;
      },
      updateSkill: (
        id: string,
        patch: Partial<Pick<Skill, "name" | "description">>,
      ) => {
        setSkills((current) =>
          current.map((skill) =>
            skill.id === id ? { ...skill, ...patch } : skill,
          ),
        );
      },
      removeSkill: (id: string) => {
        setSkills((current) => current.filter((skill) => skill.id !== id));
      },
    }),
    [skills],
  );

  return (
    <SkillsContext.Provider value={value}>{children}</SkillsContext.Provider>
  );
}

export function useSkills() {
  const context = React.useContext(SkillsContext);
  if (!context) {
    throw new Error("useSkills must be used within SkillsProvider");
  }
  return context;
}

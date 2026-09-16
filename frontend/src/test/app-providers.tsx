import type { ReactNode } from "react";

import { ComposerProvider } from "@/app/composer-context";
import { ConversationProvider } from "@/app/conversation-context";
import { SkillsProvider } from "@/app/skills-context";
import { ThemeProvider } from "@/app/theme-context";
import { TooltipProvider } from "@/shared/ui/tooltip";

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <ComposerProvider>
          <ConversationProvider>
            <SkillsProvider>{children}</SkillsProvider>
          </ConversationProvider>
        </ComposerProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

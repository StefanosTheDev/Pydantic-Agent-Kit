import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/app/app-shell";
import { ComposerProvider } from "@/app/composer-context";
import { ConversationProvider } from "@/app/conversation-context";
import { SkillsProvider } from "@/app/skills-context";
import { ThemeProvider } from "@/app/theme-context";
import { ChatPage } from "@/pages/chat/chat-page";
import { TooltipProvider } from "@/shared/ui/tooltip";

export function AppProviders() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <ComposerProvider>
          <ConversationProvider>
            <SkillsProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route index element={<Navigate to="/chat" replace />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="chat/:conversationId" element={<ChatPage />} />
                    <Route path="*" element={<Navigate to="/chat" replace />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </SkillsProvider>
          </ConversationProvider>
        </ComposerProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

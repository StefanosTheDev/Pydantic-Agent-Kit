import { Outlet } from "react-router-dom";

import {
  ChatSidebar,
  MobileChatHeader,
} from "@/widgets/chat-sidebar/chat-sidebar";

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ChatSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <MobileChatHeader />
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

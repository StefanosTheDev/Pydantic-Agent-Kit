import * as React from "react";

const SIDEBAR_STORAGE_KEY = "openapply-sidebar";

type ComposerContextValue = {
  draft: string;
  setDraft: (value: string) => void;
  focusRequestId: number;
  requestFocus: () => void;
  selectedSkillId: string | null;
  setSelectedSkillId: (id: string | null) => void;
  website: string;
  setWebsite: (value: string) => void;
  activeSourceHref: string | null;
  setActiveSourceHref: (href: string | null) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isSourcesDrawerOpen: boolean;
  setSourcesDrawerOpen: (open: boolean) => void;
  toggleSourcesDrawer: () => void;
};

const ComposerContext = React.createContext<ComposerContextValue | null>(null);

function readSidebarOpen() {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "closed") {
      return false;
    }
  } catch {
    // Ignore private-mode failures.
  }
  return true;
}

export function ComposerProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = React.useState("");
  const [focusRequestId, setFocusRequestId] = React.useState(0);
  const [selectedSkillId, setSelectedSkillId] = React.useState<string | null>(
    null,
  );
  const [website, setWebsite] = React.useState("");
  const [activeSourceHref, setActiveSourceHref] = React.useState<string | null>(
    null,
  );
  const [isSidebarOpen, setSidebarOpen] = React.useState(readSidebarOpen);
  const [isSourcesDrawerOpen, setSourcesDrawerOpen] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    setSidebarOpen((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "open" : "closed");
      } catch {
        // Ignore quota / private-mode failures.
      }
      return next;
    });
  }, []);

  const toggleSourcesDrawer = React.useCallback(() => {
    setSourcesDrawerOpen((current) => !current);
  }, []);

  const value = React.useMemo(
    () => ({
      draft,
      setDraft,
      focusRequestId,
      requestFocus: () => setFocusRequestId((current) => current + 1),
      selectedSkillId,
      setSelectedSkillId,
      website,
      setWebsite,
      activeSourceHref,
      setActiveSourceHref,
      isSidebarOpen,
      toggleSidebar,
      isSourcesDrawerOpen,
      setSourcesDrawerOpen,
      toggleSourcesDrawer,
    }),
    [
      draft,
      focusRequestId,
      selectedSkillId,
      website,
      activeSourceHref,
      isSidebarOpen,
      toggleSidebar,
      isSourcesDrawerOpen,
      toggleSourcesDrawer,
    ],
  );

  return (
    <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>
  );
}

export function useComposer() {
  const context = React.useContext(ComposerContext);
  if (!context) {
    throw new Error("useComposer must be used within ComposerProvider");
  }
  return context;
}

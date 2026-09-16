import { ArrowUp, Square, WandSparkles, X } from "lucide-react";
import * as React from "react";

import { useComposer } from "@/app/composer-context";
import { useConversations } from "@/app/conversation-context";
import { useSkills } from "@/app/skills-context";
import { defaultSkills } from "@/shared/config/skills";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { SkillIcon } from "@/shared/ui/skill-icon";
import {
  PromptInput,
  PromptInputAction,
  PromptInputTextarea,
  usePromptInput,
} from "@/shared/ui/prompt-input";

type PalettePlacement = "above" | "below";

function isValidWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getInvokeQuery(value: string): string | null {
  const match = value.match(/(?:^|\s)[@/]([^\s@/]*)$/);
  return match ? match[1] : null;
}

function stripInvokeToken(value: string) {
  return value.replace(/(^|\s)[@/][^\s@/]*$/, "$1").trimEnd();
}

export function ChatComposer({
  showDisclaimer = true,
  palettePlacement = "above",
  onSubmit,
  onStop,
  isPending,
}: {
  showDisclaimer?: boolean;
  palettePlacement?: PalettePlacement;
  onSubmit: (value: string) => void | Promise<void>;
  onStop: () => void;
  isPending: boolean;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const paletteRootRef = React.useRef<HTMLDivElement>(null);
  const {
    draft,
    setDraft,
    focusRequestId,
    selectedSkillId,
    setSelectedSkillId,
    website,
    setWebsite,
  } = useComposer();
  const { activeConversationId, patchConversation } = useConversations();
  const { skills, getSkill } = useSkills();
  const [buttonPickerOpen, setButtonPickerOpen] = React.useState(false);
  const invokeQuery = selectedSkillId ? null : getInvokeQuery(draft);
  const pickerOpen = !selectedSkillId && (buttonPickerOpen || invokeQuery !== null);
  const supportedSkills = defaultSkills.map(
    (defaultSkill) =>
      skills.find((skill) => skill.id === defaultSkill.id) ?? defaultSkill,
  );
  const visibleSkills = supportedSkills.filter((skill) =>
    `${skill.name} ${skill.description}`
      .toLowerCase()
      .includes((invokeQuery ?? "").toLowerCase()),
  );
  const selectedSkill =
    supportedSkills.find((skill) => skill.id === selectedSkillId) ??
    getSkill(selectedSkillId);
  const copyrightSelected = selectedSkillId === "copyright";
  const websiteValid = !copyrightSelected || isValidWebsite(website);
  const canSend = Boolean(draft.trim()) && websiteValid && !isPending && !pickerOpen;

  React.useEffect(() => {
    textareaRef.current?.focus();
  }, [focusRequestId]);

  React.useEffect(() => {
    if (!pickerOpen) return;

    const dismissPicker = () => {
      setButtonPickerOpen(false);
      if (invokeQuery !== null) setDraft(stripInvokeToken(draft));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dismissPicker();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (paletteRootRef.current?.contains(event.target as Node)) return;
      dismissPicker();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [draft, invokeQuery, pickerOpen, setDraft]);

  const attachSkill = (skillId: string) => {
    setSelectedSkillId(skillId);
    setDraft(stripInvokeToken(draft));
    setButtonPickerOpen(false);
    if (skillId !== "copyright") setWebsite("");
    if (activeConversationId) {
      patchConversation(activeConversationId, {
        skillId,
        website:
          skillId === "copyright" && website ? website : undefined,
      });
    }
    textareaRef.current?.focus();
  };

  const clearSkill = () => {
    setSelectedSkillId(null);
    setWebsite("");
    if (activeConversationId) {
      patchConversation(activeConversationId, {
        skillId: undefined,
        website: undefined,
      });
    }
  };

  const updateWebsite = (value: string) => {
    setWebsite(value);
    if (activeConversationId) {
      patchConversation(activeConversationId, { website: value || undefined });
    }
  };

  const handleSubmit = () => {
    if (!canSend) return;
    void onSubmit(draft);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      {selectedSkill ? (
        <div className="mb-2 rounded-2xl border border-border bg-muted/35 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              <SkillIcon size="xs" />
              {selectedSkill.name} skill
            </span>
            <button
              type="button"
              aria-label={`Remove ${selectedSkill.name} skill`}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={clearSkill}
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedSkill.description}
          </p>
          {copyrightSelected ? (
            <>
              <label className="mt-2 block text-xs text-muted-foreground">
                Website
                <input
                  type="url"
                  value={website}
                  disabled={isPending}
                  onChange={(event) => updateWebsite(event.target.value)}
                  placeholder="https://example.com"
                  aria-invalid={Boolean(website) && !websiteValid}
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
              </label>
              {website && !websiteValid ? (
                <p className="mt-1 text-xs text-destructive">
                  Enter a valid http:// or https:// website.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      <div ref={paletteRootRef} className="relative">
        <PromptInput
          value={draft}
          onValueChange={setDraft}
          onSubmit={handleSubmit}
          isLoading={isPending}
        >
          <ComposerControls
            textareaRef={textareaRef}
            selectedSkillName={selectedSkill?.name ?? null}
            pickerOpen={pickerOpen}
            isPending={isPending}
            canSend={canSend}
            onTogglePicker={() => {
              if (invokeQuery !== null) setDraft(stripInvokeToken(draft));
              setButtonPickerOpen((current) => !current);
            }}
            onClearSkill={clearSkill}
            onSubmit={handleSubmit}
            onStop={onStop}
          />
        </PromptInput>

        {pickerOpen ? (
          <div
            role="listbox"
            aria-label="Skills"
            data-placement={palettePlacement}
            className={cn(
              "absolute inset-x-0 z-30 overflow-hidden rounded-xl border border-border bg-background p-1 shadow-lg",
              palettePlacement === "above"
                ? "bottom-full mb-2"
                : "top-full mt-2",
            )}
          >
            <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Skills
            </p>
            {visibleSkills.length ? (
              visibleSkills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => attachSkill(skill.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <SkillIcon size="sm" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{skill.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {skill.description}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">
                No matching skills
              </p>
            )}
          </div>
        ) : null}
      </div>

      {showDisclaimer ? (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Kairos can make mistakes. Check important information.
        </p>
      ) : null}
    </div>
  );
}

function ComposerControls({
  textareaRef,
  selectedSkillName,
  pickerOpen,
  isPending,
  canSend,
  onTogglePicker,
  onClearSkill,
  onSubmit,
  onStop,
}: {
  textareaRef: React.Ref<HTMLTextAreaElement>;
  selectedSkillName: string | null;
  pickerOpen: boolean;
  isPending: boolean;
  canSend: boolean;
  onTogglePicker: () => void;
  onClearSkill: () => void;
  onSubmit: () => void;
  onStop: () => void;
}) {
  const { isMultiline } = usePromptInput();

  return (
    <>
      <PromptInputAction
        tooltip="Browse skills"
        className={cn(isMultiline && "col-start-1 row-start-2")}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
          aria-label="Browse skills"
          aria-expanded={pickerOpen}
          onClick={onTogglePicker}
        >
          <WandSparkles className="size-4" />
        </Button>
      </PromptInputAction>
      <div
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          isMultiline ? "col-span-3 row-start-1 px-1" : "col-start-2",
        )}
      >
        {selectedSkillName ? (
          <span className="inline-flex max-w-40 shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 py-0.5 pr-1 pl-1.5 text-xs">
            <SkillIcon size="xs" />
            <span className="truncate">@{selectedSkillName}</span>
            <button
              type="button"
              aria-label="Remove skill"
              onClick={onClearSkill}
              className="rounded-full p-0.5 hover:bg-muted"
            >
              <X className="size-3" />
            </button>
          </span>
        ) : null}
        <PromptInputTextarea
          ref={textareaRef}
          placeholder="Ask anything"
          className={cn(
            "min-h-6 flex-1",
            isMultiline
              ? "col-span-1 col-start-auto px-2 pt-1 pb-2"
              : "col-start-auto px-1",
          )}
        />
      </div>
      <PromptInputAction
        tooltip={isPending ? "Stop" : "Send"}
        className={cn(isMultiline && "col-start-3 row-start-2")}
      >
        <Button
          type="button"
          size="icon"
          className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
          onClick={isPending ? onStop : onSubmit}
          disabled={!isPending && !canSend}
          aria-label={isPending ? "Stop" : "Send"}
        >
          {isPending ? (
            <Square className="size-3 fill-current" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </Button>
      </PromptInputAction>
    </>
  );
}

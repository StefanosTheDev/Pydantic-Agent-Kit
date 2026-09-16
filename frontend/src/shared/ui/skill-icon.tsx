import { cn } from "@/shared/lib/utils";

const SIZE_CLASS = {
  xs: "size-5",
  sm: "size-7",
  md: "size-10",
} as const;

function CubeGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M12 3.75 5 7.5v9L12 20.25l7-3.75v-9L12 3.75Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.75v16.5M5 7.5l7 3.75 7-3.75M12 11.25v9"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M5.9 9.5 11.5 10.7M5.9 12.5 11.5 13.7M5.9 15.5 11.5 16.7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SkillIcon({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center text-foreground",
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden
    >
      <CubeGlyph className="size-full" />
    </span>
  );
}

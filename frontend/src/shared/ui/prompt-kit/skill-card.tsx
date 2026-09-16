import { cn } from "@/shared/lib/utils";
import { TextShimmer } from "@/shared/ui/prompt-kit/text-shimmer";

export function SkillCard({
  name,
  status,
  className,
}: {
  name: string;
  status: "running" | "used";
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {status === "running" ? (
        <TextShimmer className="text-sm">Using {name}</TextShimmer>
      ) : (
        <>Used {name}</>
      )}
    </p>
  );
}

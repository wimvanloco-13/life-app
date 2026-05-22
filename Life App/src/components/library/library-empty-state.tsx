import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface LibraryEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function LibraryEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: LibraryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-fade-in">
      <div className="flex flex-col items-center gap-4 max-w-xs text-center">
        <div className="rounded-2xl bg-muted/60 p-5">
          <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}

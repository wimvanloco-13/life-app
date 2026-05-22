import type { LibraryItemWithBookmark } from "@/types";
import type { ReactNode } from "react";

interface LibraryItemRowProps {
  item: LibraryItemWithBookmark;
  bookmarkSlot?: ReactNode;
  adminSlot?: ReactNode;
}

const TYPE_CONFIG = {
  concept: {
    label: "Concept",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  protocol: {
    label: "Protocol",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  exercise: {
    label: "Exercise",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  },
  tip: {
    label: "Tip",
    className: "bg-muted text-muted-foreground",
  },
} as const;

export function LibraryItemRow({ item, bookmarkSlot, adminSlot }: LibraryItemRowProps) {
  const badge = TYPE_CONFIG[item.type];

  return (
    <div className="group py-6 stagger-item animate-fade-up">
      {/* Header row: badge + title + actions */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide shrink-0 ${badge.className}`}
          >
            {badge.label}
          </span>
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight leading-snug">
            {item.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {bookmarkSlot}
          {adminSlot}
        </div>
      </div>

      {/* What / Why / How */}
      <dl className="space-y-3">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
            What
          </dt>
          <dd className="text-sm leading-relaxed text-foreground/90">{item.what}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
            Why
          </dt>
          <dd className="text-sm leading-relaxed text-foreground/90">{item.why}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
            How
          </dt>
          <dd className="text-sm leading-relaxed text-foreground/90">{item.how}</dd>
        </div>
        {item.durationOrReps && (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
              Duration / Reps
            </dt>
            <dd className="text-sm font-medium text-foreground font-[family-name:var(--font-mono)]">
              {item.durationOrReps}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

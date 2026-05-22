import type { LibraryCategoryWithItems } from "@/types";
import type { ReactNode } from "react";
import { LibraryItemRow } from "./library-item-row";

interface LibraryCategorySectionProps {
  category: LibraryCategoryWithItems;
  addItemSlot?: ReactNode;
}

export function LibraryCategorySection({
  category,
  addItemSlot,
}: LibraryCategorySectionProps) {
  return (
    <section>
      {/* Sticky category header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60 py-3 mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {category.title}
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-border/50">
        {category.items.map((item) => (
          <LibraryItemRow key={item.id} item={item} />
        ))}
      </div>

      {/* Admin "Add item" placeholder — wired in Phase 4 */}
      {addItemSlot && (
        <div className="pt-3 pb-6">{addItemSlot}</div>
      )}
    </section>
  );
}

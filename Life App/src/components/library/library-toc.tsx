"use client";

import { useEffect, useRef, useState } from "react";

interface TocEntry {
  id: string;
  title: string;
}

interface LibraryTocProps {
  entries: TocEntry[];
}

export function LibraryToc({ entries }: LibraryTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (entries.length === 0) return;

    // Track which sections are visible; highlight the topmost one
    const visible = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (obs) => {
        for (const entry of obs) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          // Pick the section closest to the top of the viewport
          const topmost = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
          setActiveId(topmost);
        }
      },
      { rootMargin: "-10% 0px -60% 0px", threshold: 0 }
    );

    for (const { id } of entries) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [entries]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (entries.length === 0) return null;

  return (
    <nav aria-label="On this page">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
        On this page
      </p>
      <ul className="space-y-0.5">
        {entries.map(({ id, title }) => {
          const isActive = activeId === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollTo(id)}
                className={[
                  "w-full text-left text-sm py-1.5 px-3 rounded-md transition-colors leading-snug",
                  isActive
                    ? "text-foreground font-medium bg-muted/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                ].join(" ")}
              >
                {title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

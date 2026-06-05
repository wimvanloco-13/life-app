"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const PRINCIPLES = [
  {
    heading: "Start with who you are becoming.",
    body: `Habits feel different when you frame them as evidence of identity, not as tasks. "I am the type of person who never misses a meditation" is a story you tell yourself with every check-in. The habit is the proof.`,
  },
  {
    heading: "The minimum version is the real habit.",
    body: "Most habits fail because the bar is too high. If the normal version is thirty minutes and you only have one today, do one. It still counts. The habit you maintain is more valuable than the habit you idealise.",
  },
  {
    heading: "Do not miss twice.",
    body: "Single misses are noise. Two in a row is when a habit dies. The streak is not perfection. It is the discipline of returning the next day.",
  },
  {
    heading: "Habits run on a loop, not willpower.",
    body: "Every habit has three parts: the trigger that starts it, the behaviour itself, and the reward that tells the brain to repeat it. Define all three, and the habit becomes editable. Leave the reward undefined, and willpower has to fill the gap — which it reliably cannot.",
  },
  {
    heading: "You don't break habits. You replace them.",
    body: "The trigger and the reward are encoded in the brain and do not disappear. What you can change is the behaviour in between. Keep the same cue, keep the same reward, and substitute a new routine. That is the mechanism. The rest is execution.",
  },
];

interface HabitPrinciplesProps {
  /** Compact single-column sidebar style */
  compact?: boolean;
  /** Full-width 3-column row */
  horizontal?: boolean;
  /** User ID used to scope the localStorage collapse key */
  userId?: string;
}

export function HabitPrinciples({
  compact = false,
  horizontal = false,
  userId,
}: HabitPrinciplesProps) {
  const storageKey = `habit-principles-collapsed-${userId ?? "default"}`;

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "true";
  });

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, String(next));
    }
  }

  const header = (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 select-none"
    >
      {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      Principles
    </button>
  );

  if (horizontal) {
    return (
      <div className="border-t border-border/40 pt-8">
        {header}
        {!collapsed && (
          <div className="grid grid-cols-3 gap-8">
            {PRINCIPLES.map((p, i) => (
              <section key={i}>
                <h3 className="font-display text-[13px] font-semibold leading-snug mb-2 text-foreground/75">
                  {p.heading}
                </h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{p.body}</p>
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div>
        {header}
        {!collapsed && (
          <div className="flex flex-col gap-7">
            {PRINCIPLES.map((p, i) => (
              <section key={i}>
                <h3 className="font-display text-[13px] font-semibold leading-snug mb-1.5 text-foreground/80">
                  {p.heading}
                </h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{p.body}</p>
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {header}
      {!collapsed && (
        <div className="flex flex-col gap-10">
          {PRINCIPLES.map((p, i) => (
            <section key={i} className="stagger-item">
              <h2 className="font-display text-base font-semibold mb-2 leading-snug">
                {p.heading}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

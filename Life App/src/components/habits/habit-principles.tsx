/**
 * The three house-voice habit principles.
 * Used in both the empty state (prominent) and the populated sidebar (quiet).
 */

interface HabitPrinciplesProps {
  /** When true, uses smaller quieter type suitable for a sidebar. */
  compact?: boolean;
}

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
];

export function HabitPrinciples({ compact = false }: HabitPrinciplesProps) {
  if (compact) {
    return (
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
    );
  }

  return (
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
  );
}

import type { LucideProps } from "lucide-react";
import { forwardRef } from "react";

/**
 * Custom tennis-racket icon built to Lucide conventions:
 * 24×24 viewBox, stroke="currentColor", stroke-width=2, round caps/joins,
 * aria-hidden (decorative, matches Lucide's default a11y treatment).
 * Uses forwardRef so it is assignable to the LucideIcon type.
 *
 * String endpoints are computed to lie on the ellipse boundary
 * (cx=12 cy=8 rx=6 ry=7) so no clip-path is needed:
 *   horizontal y=6/10: x ≈ 6.3–17.7   (2 units above/below centre)
 *   horizontal y=8:    x = 6–18        (full diameter at centre)
 *   vertical   x=10/14: y ≈ 1.4–14.6  (2 units left/right of centre)
 *   vertical   x=12:    y = 1–15       (full height at centre)
 */
const TennisRacket = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, strokeWidth = 2, className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Racket head */}
      <ellipse cx="12" cy="8" rx="6" ry="7" />
      {/* Horizontal strings */}
      <line x1="6.3" y1="6" x2="17.7" y2="6" />
      <line x1="6" y1="8" x2="18" y2="8" />
      <line x1="6.3" y1="10" x2="17.7" y2="10" />
      {/* Vertical strings */}
      <line x1="10" y1="1.4" x2="10" y2="14.6" />
      <line x1="12" y1="1" x2="12" y2="15" />
      <line x1="14" y1="1.4" x2="14" y2="14.6" />
      {/* Handle */}
      <line x1="12" y1="15" x2="12" y2="22" />
    </svg>
  )
);
TennisRacket.displayName = "TennisRacket";

export default TennisRacket;

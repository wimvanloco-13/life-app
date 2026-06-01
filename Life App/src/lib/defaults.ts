export const DEFAULT_ROLES = [
  { name: "Professional", description: "Career growth and work responsibilities", color: "#3B82F6", isWorkRole: true },
  { name: "Athlete", description: "Physical fitness and athletic pursuits", color: "#EF4444", isWorkRole: false },
  { name: "Partner", description: "Relationship with your significant other", color: "#EC4899", isWorkRole: false },
  { name: "Learner", description: "Personal development and education", color: "#8B5CF6", isWorkRole: false },
  { name: "Friend", description: "Social connections and community", color: "#F59E0B", isWorkRole: false },
  { name: "Individual", description: "Self-care and hobbies", color: "#10B981", isWorkRole: false },
] as const;

export type DefaultRole = (typeof DEFAULT_ROLES)[number];

export const DEFAULT_ACTIVITY_TYPES = [
  {
    name: "Running",
    type: "cardio" as const,
    icon: "footprints",
    isTracked: true,
    defaultCalories: null,
    defaultSteps: null,
    metricsConfig: [
      { key: "distance_km", label: "Distance (km)", type: "number" as const },
      { key: "pace", label: "Pace (min/km)", type: "text" as const },
      { key: "heart_rate", label: "Avg Heart Rate", type: "number" as const },
    ],
    variants: null,
    gradeSystem: null,
  },
  {
    name: "Hiking",
    type: "cardio" as const,
    icon: "mountain",
    isTracked: false,
    defaultCalories: 400,
    defaultSteps: 12000,
    metricsConfig: [
      { key: "distance_km", label: "Distance (km)", type: "number" as const },
      { key: "elevation_gain_m", label: "Elevation Gain (m)", type: "number" as const },
    ],
    variants: null,
    gradeSystem: null,
  },
  {
    name: "Tennis",
    type: "mixed" as const,
    icon: "tennis-racket",
    isTracked: false,
    defaultCalories: 500,
    defaultSteps: 8000,
    metricsConfig: [],
    variants: [
      { key: "singles", label: "Singles", defaultCalories: 500, defaultSteps: 8000 },
      { key: "doubles", label: "Doubles", defaultCalories: 350, defaultSteps: 5000 },
    ],
    gradeSystem: null,
  },
  {
    name: "Climbing (Gym)",
    type: "strength" as const,
    icon: "dumbbell",
    isTracked: false,
    defaultCalories: 400,
    defaultSteps: 0,
    metricsConfig: [
      { key: "problems_sent", label: "Problems Sent", type: "number" as const },
      { key: "max_grade", label: "Max Grade", type: "text" as const },
    ],
    variants: null,
    gradeSystem: "french",
  },
  {
    name: "Climbing (Outdoor)",
    type: "strength" as const,
    icon: "mountain-snow",
    isTracked: false,
    defaultCalories: 500,
    defaultSteps: 3000,
    metricsConfig: [
      { key: "routes_sent", label: "Routes Sent", type: "number" as const },
      { key: "max_grade", label: "Max Grade", type: "text" as const },
      { key: "elevation_gain_m", label: "Elevation Gain (m)", type: "number" as const },
    ],
    variants: null,
    gradeSystem: "french",
  },
  {
    name: "Reading",
    type: "cognitive" as const,
    icon: "book-open",
    isTracked: false,
    defaultCalories: null,
    defaultSteps: null,
    metricsConfig: [
      { key: "pages", label: "Pages", type: "number" as const },
      { key: "book_title", label: "Book Title", type: "text" as const },
    ],
    variants: null,
    gradeSystem: null,
  },
  {
    name: "Meditation",
    type: "wellness" as const,
    icon: "wind",
    isTracked: false,
    defaultCalories: null,
    defaultSteps: null,
    metricsConfig: [],
    variants: null,
    gradeSystem: null,
  },
  {
    name: "Journaling",
    type: "cognitive" as const,
    icon: "pen-line",
    isTracked: false,
    defaultCalories: null,
    defaultSteps: null,
    metricsConfig: [],
    variants: null,
    gradeSystem: null,
  },
  {
    name: "Social Event",
    type: "wellness" as const,
    icon: "users",
    isTracked: false,
    defaultCalories: null,
    defaultSteps: null,
    metricsConfig: [],
    variants: null,
    gradeSystem: null,
  },
] as const;

export type DefaultActivityType = (typeof DEFAULT_ACTIVITY_TYPES)[number];

export const DEFAULT_SPENDING_CATEGORIES = [
  { name: "Food", icon: "utensils", color: "#EF4444" },
  { name: "Rent", icon: "home", color: "#6366F1" },
  { name: "Utilities", icon: "zap", color: "#3B82F6" },
  { name: "Groceries", icon: "shopping-cart", color: "#10B981" },
  { name: "Amusement", icon: "popcorn", color: "#8B5CF6" },
  { name: "Clothes", icon: "shirt", color: "#F59E0B" },
  { name: "Transport", icon: "car", color: "#0EA5E9" },
  { name: "Savings", icon: "piggy-bank", color: "#10B981" },
  { name: "Savings Withdrawal", icon: "arrow-up-from-line", color: "#F59E0B" },
  { name: "Other", icon: "package", color: "#6B7280" },
] as const;

export type DefaultSpendingCategory = (typeof DEFAULT_SPENDING_CATEGORIES)[number];

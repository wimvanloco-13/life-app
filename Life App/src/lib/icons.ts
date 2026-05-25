import type { LucideProps } from "lucide-react";
import {
  // Spending category icons
  Utensils,
  Home,
  Zap,
  ShoppingCart,
  Popcorn,
  Shirt,
  Car,
  PiggyBank,
  ArrowUpFromLine,
  Package,
  Banknote,
  Wallet,
  Receipt,
  Building,
  GraduationCap,
  Heart,
  Coffee,
  Plane,
  Gift,
  Music,
  Monitor,
  Phone,
  Baby,
  Cross,
  CheckCircle,
  // Investing-ladder category icons
  TrendingUp,
  Landmark,
  Briefcase,
  Shield,
  CreditCard,
  AlertTriangle,
  // Activity type icons
  Footprints,
  Mountain,
  CircleDot,
  Dumbbell,
  MountainSnow,
  BookOpen,
  Wind,
  PenLine,
  Users,
  Bike,
  Waves,
  Flame,
  Timer,
  Activity,
  HeartPulse,
  PersonStanding,
  Target,
  Trophy,
  Leaf,
} from "lucide-react";
import type { FC } from "react";

export type LucideIconComponent = FC<LucideProps>;

// Static map from kebab-case name → Lucide component.
// Must use explicit named imports — no dynamic imports (Next.js tree-shaking).
const ICON_MAP: Record<string, LucideIconComponent> = {
  // Spending category icons
  utensils: Utensils,
  home: Home,
  zap: Zap,
  "shopping-cart": ShoppingCart,
  popcorn: Popcorn,
  shirt: Shirt,
  car: Car,
  "piggy-bank": PiggyBank,
  "arrow-up-from-line": ArrowUpFromLine,
  package: Package,
  banknote: Banknote,
  wallet: Wallet,
  receipt: Receipt,
  building: Building,
  "graduation-cap": GraduationCap,
  heart: Heart,
  coffee: Coffee,
  plane: Plane,
  gift: Gift,
  music: Music,
  monitor: Monitor,
  phone: Phone,
  baby: Baby,
  cross: Cross,
  "check-circle": CheckCircle,
  // Investing-ladder category icons
  "trending-up": TrendingUp,
  landmark: Landmark,
  briefcase: Briefcase,
  shield: Shield,
  "credit-card": CreditCard,
  "alert-triangle": AlertTriangle,
  // Activity type icons
  footprints: Footprints,
  mountain: Mountain,
  "circle-dot": CircleDot,
  dumbbell: Dumbbell,
  "mountain-snow": MountainSnow,
  "book-open": BookOpen,
  wind: Wind,
  "pen-line": PenLine,
  users: Users,
  bike: Bike,
  waves: Waves,
  flame: Flame,
  timer: Timer,
  activity: Activity,
  "heart-pulse": HeartPulse,
  "person-standing": PersonStanding,
  target: Target,
  trophy: Trophy,
  leaf: Leaf,
};

/**
 * Look up a Lucide component by its kebab-case icon name string.
 * Returns null for unrecognized strings (e.g. legacy emoji values).
 */
export function getLucideIcon(name: string): LucideIconComponent | null {
  return ICON_MAP[name] ?? null;
}

export interface IconDef {
  name: string;
  label: string;
}

/** Curated icon set for spending categories. */
export const CATEGORY_ICONS: IconDef[] = [
  { name: "utensils", label: "Food & Dining" },
  { name: "shopping-cart", label: "Groceries" },
  { name: "home", label: "Home / Rent" },
  { name: "zap", label: "Utilities" },
  { name: "car", label: "Transport" },
  { name: "shirt", label: "Clothes" },
  { name: "popcorn", label: "Amusement" },
  { name: "piggy-bank", label: "Savings" },
  { name: "arrow-up-from-line", label: "Withdrawal" },
  { name: "package", label: "Other / General" },
  { name: "banknote", label: "Cash" },
  { name: "wallet", label: "Wallet" },
  { name: "receipt", label: "Bills" },
  { name: "building", label: "Office / Work" },
  { name: "graduation-cap", label: "Education" },
  { name: "heart", label: "Health" },
  { name: "coffee", label: "Coffee / Cafe" },
  { name: "plane", label: "Travel" },
  { name: "gift", label: "Gifts" },
  { name: "music", label: "Entertainment" },
  { name: "monitor", label: "Electronics" },
  { name: "phone", label: "Phone" },
  { name: "baby", label: "Kids" },
  { name: "cross", label: "Medical" },
];

/** Curated icon set for activity types. */
export const ACTIVITY_TYPE_ICONS: IconDef[] = [
  { name: "footprints", label: "Running" },
  { name: "mountain", label: "Hiking" },
  { name: "circle-dot", label: "Ball Sport" },
  { name: "dumbbell", label: "Strength / Gym" },
  { name: "mountain-snow", label: "Outdoor Climbing" },
  { name: "book-open", label: "Reading" },
  { name: "wind", label: "Meditation / Breathing" },
  { name: "pen-line", label: "Journaling / Writing" },
  { name: "users", label: "Social" },
  { name: "bike", label: "Cycling" },
  { name: "waves", label: "Swimming / Water" },
  { name: "flame", label: "Cardio / HIIT" },
  { name: "timer", label: "Timed Training" },
  { name: "activity", label: "General Activity" },
  { name: "heart-pulse", label: "Cardio Health" },
  { name: "person-standing", label: "Stretching / Yoga" },
  { name: "target", label: "Skill Practice" },
  { name: "trophy", label: "Competition" },
  { name: "leaf", label: "Nature / Outdoors" },
  { name: "zap", label: "Power / Explosive" },
];

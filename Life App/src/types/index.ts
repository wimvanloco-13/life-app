export type Quadrant = "Q1" | "Q2" | "Q3" | "Q4";

export type GoalStatus = "active" | "completed" | "archived";

export type GoalHorizon = "yearly" | "monthly";

export type PaceStatus = "ahead" | "on_track" | "behind" | "no_data";

export type TargetPeriod = "weekly" | "monthly" | "yearly";

export interface Role {
  id: number;
  name: string;
  description: string | null;
  color: string;
  displayOrder: number;
  isArchived: boolean;
  isWorkRole: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalRole {
  id: number;
  name: string;
  color: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  quadrant: Quadrant;
  targetDate: string | null;
  sessionsPerWeek: number;
  activityTypeId: number | null;
  targetMetric: string | null;
  targetValue: number | null;
  targetPeriod: TargetPeriod | null;
  targetUnit: string | null;
  status: GoalStatus;
  isCompleted: boolean;
  horizon: GoalHorizon | null;
  parentGoalId: number | null;
  month: string | null;
  preferredDays: string | null;
  preferredTimeSlot: string | null;
  createdAt: string;
  updatedAt: string;
  roles: GoalRole[];
  activityTypeName?: string;
  activityTypeIcon?: string;
}

export interface WeeklyFocusGoal {
  id: number;
  weeklyPlanId: number;
  goalId: number;
  createdAt: string;
  goal?: Goal;
}

export type SessionType = "training" | "supplemental";

export interface Activity {
  id: number;
  goalId: number | null;
  roleId: number | null;
  recurringActivityId: number | null;
  activityTypeId: number | null;
  title: string;
  quadrant: Quadrant;
  activityDate: string;
  startTime: string;
  endTime: string;
  isCompleted: boolean;
  createdFromLog: boolean;
  notes: string | null;
  carryForwardFrom: string | null;
  sessionType: SessionType;
  createdAt: string;
  updatedAt: string;
  roleName?: string;
  roleColor?: string;
  /**
   * Populated by GET /api/activities via LEFT JOIN on activity_logs.
   * Non-null when this activity is the source of (or linked target for)
   * a logged workout. Drives the client-side un-check/delete prompts.
   * Endpoints that do not enrich (PATCH/POST returning(...)) may omit it.
   */
  linkedLogId?: number | null;
}

export interface RecurringActivity {
  id: number;
  roleId: number | null;
  title: string;
  quadrant: Quadrant;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
  roleName?: string;
  roleColor?: string;
}

export interface WeeklyPlan {
  id: number;
  weekStartDate: string;
  planningNotes: string | null;
  isPlanned: boolean;
  createdAt: string;
  updatedAt: string;
  focusGoals?: Goal[];
  activities?: Activity[];
}

export interface WeeklyAnalytics {
  weekStartDate: string;
  totalPlannedMinutes: number;
  totalCompletedMinutes: number;
  completionRate: number;
  byRole: {
    roleId: number;
    roleName: string;
    color: string;
    minutes: number;
    goalCount: number;
    completedGoals: number;
  }[];
  byQuadrant: Record<
    Quadrant,
    { minutes: number; percentage: number }
  >;
}

export interface TrendData {
  weeks: number;
  data: {
    weekStartDate: string;
    q2Percentage: number;
    completionRate: number;
    neglectedRoles: string[];
  }[];
}

export interface SchedulerSettings {
  id: number;
  workStartTime: string;
  workEndTime: string;
  workDays: number[];
  enforceWeeklySpread: boolean;
  maxActivitiesPerDay: number;
}

export interface SchedulerBlackoutDate {
  id: number;
  date: string;
  label: string | null;
  isRecurring: boolean;
  createdAt: string;
}

// ─── Activity Types & Logs ──────────────────────────────

export type ActivityCategory = "cardio" | "strength" | "mixed" | "wellness" | "cognitive";

export interface MetricField {
  key: string;
  label: string;
  type: "number" | "text";
}

export interface ActivityVariant {
  key: string;
  label: string;
  defaultCalories: number;
  defaultSteps: number;
}

export interface ActivityType {
  id: number;
  name: string;
  type: ActivityCategory;
  icon: string;
  isTracked: boolean;
  defaultCalories: number | null;
  defaultSteps: number | null;
  defaultDurationMinutes: number;
  metricsConfig: MetricField[];
  variants: ActivityVariant[] | null;
  gradeSystem: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: number;
  activityTypeId: number;
  activityId: number | null;
  goalId: number | null;
  date: string;
  durationMinutes: number;
  calories: number | null;
  steps: number | null;
  variant: string | null;
  metrics: Record<string, string | number>;
  notes: string | null;
  createdAt: string;
  activityTypeName?: string;
  activityTypeIcon?: string;
  goalTitle?: string;
}

export type BodyMetricType = "weight" | "vo2max" | "resting_hr";

export interface BodyMetric {
  id: number;
  date: string;
  metricType: BodyMetricType;
  value: number;
  unit: string;
  createdAt: string;
}

export interface GoalProgress {
  current: number;
  target: number;
  percentage: number;
  period: TargetPeriod;
  metricLabel: string;
  paceStatus?: PaceStatus;
  elapsedPercentage?: number;
}

export interface GoalTally {
  id: number;
  goalId: number;
  date: string;
  count: number;
  notes: string | null;
  createdAt: string;
}

export interface GoalSessionPattern {
  id: number;
  goalId: number;
  position: number;
  label: string;
  restDaysAfter: number;
  createdAt: string;
}

// ─── Budget Management ──────────────────────────────────

export type BucketKey = "fixed" | "invest" | "save" | "guilt_free";

export interface BucketTargets {
  fixed: number;
  invest: number;
  save: number;
  guilt_free: number;
}

export interface BucketActual {
  key: BucketKey | "unassigned";
  label: string;
  targetPct: number | null;
  actualPct: number;
  actualAmount: number;
}

export interface InvestingLadderRung {
  key: string;
  label: string;
  filled: boolean;
  /** True if the user has a category matching this rung mapped to the 'invest' bucket */
  categoryMapped: boolean;
}

export interface Target25x {
  computedAnnualSpending: number | null;
  overrideAnnualSpending: number | null;
  activeAnnualSpending: number;
  target: number;
  adjustedTarget: number;
}

export interface BudgetSettings {
  id: number;
  currency: string;
  monthlySavingsTarget: number;
  savingsGoalTotal: number | null;
  savingsGoalTargetDate: string | null;
  savingsStartingBalance: number | null;
  bucketTargets: BucketTargets | null;
  momentThreshold: number;
  targetAnnualSpending: number | null;
  statePensionAnnualAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeEntry {
  id: number;
  source: string;
  amount: number;
  month: string;
  isRecurring: boolean;
  notes: string | null;
  createdAt: string;
}

export interface FixedCost {
  id: number;
  name: string;
  amount: number;
  category: string;
  isActive: boolean;
  startMonth: string;
  endMonth: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpendingEntry {
  id: number;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  isItemized: boolean;
  notes: string | null;
  createdAt: string;
}

export interface SpendingCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
  bucket: BucketKey | null;
  displayOrder: number;
  isArchived: boolean;
  createdAt: string;
}

export interface BudgetSummary {
  month: string;
  totalIncome: number;
  totalFixedCosts: number;
  monthlySavingsTarget: number;
  spendingBudget: number;
  totalSpent: number;
  remaining: number;
  dailyAllowance: number;
  daysLeft: number;
  spendingByCategory: { category: string; amount: number; icon: string; color: string }[];
  savingsGoal: {
    total: number;
    targetDate: string | null;
    saved: number;
    percentage: number;
  } | null;
  totalPlannedExpenses: number;
  plannedExpenses: PlannedExpense[];
  buckets: BucketActual[];
  investingLadder: InvestingLadderRung[];
  target25x: Target25x;
}

export interface PlannedExpense {
  id: number;
  name: string;
  amount: number;
  month: string;
  categoryId: number | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Training Periodization (Multi-Sport) ───────────────

export type TrainingSport = "climbing" | "tennis" | "running";

export type ClimberLevel = "beginner" | "intermediate" | "advanced";

export type Discipline = "bouldering" | "sport";

export type TennisPlayerLevel = "beginner" | "club" | "advanced";

export type TennisPlayingStyle = "baseliner" | "all-court" | "serve-volley";

export type PhysicalLimitation = "shoulder" | "back" | "knee" | "elbow" | "ankle" | "adductor";

export type ClimbingLimitation = "fingers" | "shoulder" | "elbow" | "back" | "wrist";

export type ClimbingPeriodizationModel = "4-1" | "4-3-2-1" | "3-2-1";

export type TennisPeriodizationModel = "3-1" | "3-3-2-1" | "3-2-1";

export type RunnerLevel = "beginner" | "intermediate" | "advanced";

export type RunningGoalDistance = "5k" | "10k" | "half-marathon" | "marathon" | "general";

export type RunningPhaseType = "base-building" | "development" | "race-prep" | "base-injury-prevention" | "strength-endurance" | "speed-specificity" | "taper-race" | "rest";

export type RunningLimitation = "achilles" | "knee" | "shin" | "plantar-fascia" | "back" | "hip-adductor";

export type RunningPeriodizationModel = "3-phase" | "4-phase";

export type PeriodizationModel = ClimbingPeriodizationModel | TennisPeriodizationModel | RunningPeriodizationModel;

export type ClimbingPhaseType = "skill-stamina" | "max-strength-power" | "anaerobic-endurance" | "rest";

export type TennisPhaseType = "foundation-prehab" | "strength-power" | "tennis-endurance" | "performance" | "recovery";

export type PhaseType = ClimbingPhaseType | TennisPhaseType | RunningPhaseType;

export type PhaseStatus = "upcoming" | "active" | "completed";

export type TrainingPlanStatus = "active" | "paused" | "completed";

export interface ClimbingSportProfile {
  discipline: Discipline;
  maxBoulderGrade: string;
  maxSportGrade: string;
  physicalLimitations: ClimbingLimitation[];
}

export interface TennisSportProfile {
  selfRating: string;
  playingStyle: TennisPlayingStyle;
  matchesPerWeek: number;
  physicalLimitations: PhysicalLimitation[];
}

export interface RunningSportProfile {
  goalDistance: RunningGoalDistance;
  runsPerWeek: number;
  longestRecentRun: number;
  canRun30MinContinuous: boolean;
  hasRaced: boolean;
  physicalLimitations: RunningLimitation[];
}

export type SportProfile = ClimbingSportProfile | TennisSportProfile | RunningSportProfile;

export interface TrainingPlan {
  id: number;
  goalId: number;
  sport: TrainingSport;
  periodizationModel: PeriodizationModel;
  playerLevel: string;
  yearsExperience: number;
  sportProfile: SportProfile;
  startDate: string;
  status: TrainingPlanStatus;
  trainingSessionsPerWeek: number | null;
  supplementalSessionsPerWeek: number | null;
  trainingPreferredDays: number[];
  supplementalPreferredDays: number[];
  createdAt: string;
  updatedAt: string;
  phases?: TrainingPhase[];
}

export interface TrainingPhase {
  id: number;
  trainingPlanId: number;
  phaseType: PhaseType;
  orderIndex: number;
  durationWeeks: number;
  startDate: string;
  endDate: string;
  status: PhaseStatus;
  description: string;
  sportFocusContent: string | null;
  supplementalContent: string | null;
  mentalGameContent: string | null;
  limitationNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LevelAssessment {
  derivedLevel: string;
  recommendedModel: PeriodizationModel;
  cycleLengthWeeks?: number;
  explanation: string;
}

// ─── Habits ─────────────────────────────────────────────

export const CUE_TYPE_LABELS: Record<string, string> = {
  location: "Location",
  time: "Time",
  emotional_state: "Feeling",
  other_people: "Person",
  preceding_action: "Preceding action",
};

export type CueType = keyof typeof CUE_TYPE_LABELS;

export interface Habit {
  id: number;
  userId: string;
  identity: string;
  name: string;
  cue: string | null;
  minimumVersion: string | null;
  reward: string | null;
  cueType: string | null;
  isKeystone: boolean;
  color: string;
  displayOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: number;
  userId: string;
  habitId: number;
  date: string;
  createdAt: string;
}

/**
 * Wire shape returned by GET /api/habits.
 *
 * The server returns raw log dates only: deduplicated ISO YYYY-MM-DD strings,
 * sorted ascending, capped at the last 30 days. The client (HabitList) derives
 * the 14-day strip view-model and the current/best streaks locally using its
 * own "today" (per spec FR-005, FR-014). The server never decides what "today"
 * is.
 */
export interface HabitWithRecentLogs extends Habit {
  recentLogDates: string[];
}

/** Form payload for POST /api/habits (and the body of PATCH for the same fields). */
export interface HabitDraft {
  identity: string;
  name: string;
  cue: string | null;
  minimumVersion: string | null;
  reward?: string | null;
  cueType?: string | null;
  isKeystone?: boolean;
  color: string;
}

// ─── Moment Logs ─────────────────────────────────────────────────────────────

export type MomentDecision = "proceeded" | "declined" | "parked";

export interface MomentLog {
  id: number;
  userId: string;
  date: string;
  amount: number;
  description: string;
  categoryId: number | null;
  categoryName?: string | null;
  spendingEntryId: number | null;
  scorecardAnswer: string | null;
  utilityStatusAnswer: string | null;
  sixMonthAnswer: string | null;
  decision: MomentDecision;
  createdAt: string;
  updatedAt: string;
}

// ─── Library ─────────────────────────────────────────────────────────────────

export type LibraryItemType = "protocol" | "exercise" | "tip" | "concept";

export interface LibraryTopic {
  id: number;
  slug: string;
  title: string;
  icon: string;
  description: string | null;
  displayOrder: number;
}

export interface LibraryCategory {
  id: number;
  topicId: number;
  title: string;
  displayOrder: number;
}

export interface LibraryItem {
  id: number;
  categoryId: number;
  title: string;
  type: LibraryItemType;
  what: string;
  why: string;
  how: string;
  durationOrReps: string | null;
  displayOrder: number;
}

export interface LibraryItemWithBookmark extends LibraryItem {
  isBookmarked: boolean;
}

export interface LibraryCategoryWithItems extends LibraryCategory {
  items: LibraryItemWithBookmark[];
}

export interface LibraryTopicWithCategories extends LibraryTopic {
  categories: LibraryCategoryWithItems[];
}

export interface BookmarkedItem extends LibraryItem {
  isBookmarked: true;
  topicId: number;
  topicSlug: string;
  topicTitle: string;
  topicIcon: string;
  categoryTitle: string;
}

// ─── Body Profile ─────────────────────────────────────────

export interface UserBodyProfile {
  id: number | null;
  userId: string;
  dateOfBirth: string | null;
  biologicalSex: 'male' | 'female' | null;
  heightCm: number | null;
  waistCm: number | null;
  waistCmUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserBodyProfileInput {
  dateOfBirth?: string | null;
  biologicalSex?: 'male' | 'female' | null;
  heightCm?: number | null;
  waistCm?: number | null;
}


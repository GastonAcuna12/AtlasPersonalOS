export type TransactionType = "income" | "expense";
export type Currency = "PYG" | "USD";
export type PaymentMethod =
  | "Cash"
  | "Debit"
  | "Credit"
  | "Bank Transfer"
  | "Other";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: string;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  tag?: string;
  createdAt: string;
};

export type TransactionDraft = Omit<Transaction, "id" | "createdAt">;

export type FinanceFilters = {
  month: string;
  type: "all" | TransactionType;
  category: "all" | string;
  currency: "all" | Currency;
};

export type WorkoutType =
  | "Push"
  | "Pull"
  | "Legs"
  | "Full Body"
  | "Cardio"
  | "Rest"
  | "Other";

export type WorkoutLog = {
  id: string;
  date: string;
  workoutType: WorkoutType;
  duration: number;
  energy: number;
  intensity: number;
  notes: string;
  createdAt: string;
};

export type WorkoutDraft = Omit<WorkoutLog, "id" | "createdAt">;

export type TaskArea =
  | "Work"
  | "Academic"
  | "Personal"
  | "Finance"
  | "Fitness"
  | "Atlas"
  | "Content"
  | "Other";

export type TaskType =
  | "Deep Work"
  | "Quick Task"
  | "University"
  | "Client Work"
  | "Admin"
  | "Creative"
  | "Health"
  | "Finance"
  | "Errand"
  | "Review";

export type TaskStatus =
  | "backlog"
  | "today"
  | "in_progress"
  | "completed"
  | "skipped";

export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskEnergy = "low" | "medium" | "high";
export type AcademicTaskType =
  | "Assignment"
  | "Exam"
  | "Reading"
  | "Project"
  | "Presentation"
  | "Practice"
  | "Other";

export type AtlasTask = {
  id: string;
  title: string;
  description: string;
  area: TaskArea;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  plannedDate: string;
  estimatedMinutes: number;
  energyRequired: TaskEnergy;
  xpReward: number;
  createdAt: string;
  completedAt: string | null;
  subjectId?: string;
  academicType?: AcademicTaskType;
  grade?: string;
};

export type TaskDraft = Omit<
  AtlasTask,
  "id" | "xpReward" | "createdAt" | "completedAt"
>;

export type TaskSection =
  | "priorityFocus"
  | "quickWins"
  | "academic"
  | "work"
  | "personal"
  | "backlog";

export type SubjectStatus = "active" | "archived";

export type Subject = {
  id: string;
  name: string;
  professor?: string;
  schedule?: string;
  accent?: string;
  status: SubjectStatus;
  notes?: string;
  createdAt: string;
};

export type SubjectDraft = Omit<Subject, "id" | "status" | "createdAt">;

export type StudySession = {
  id: string;
  subjectId: string;
  date: string;
  durationMinutes: number;
  focusLevel: number;
  notes?: string;
  createdAt: string;
};

export type StudySessionDraft = Omit<StudySession, "id" | "createdAt">;

export type AcademicTaskDraft = {
  title: string;
  subjectId: string;
  academicType: AcademicTaskType;
  priority: TaskDraft["priority"];
  dueDate: string;
  plannedDate: string;
  estimatedMinutes: number;
  energyRequired: TaskDraft["energyRequired"];
  notes: string;
  grade?: string;
};

export type Note = {
  id: string;
  title: string;
  area: string;
  tags: string[];
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteDraft = Pick<Note, "title" | "area" | "tags" | "content">;

export type GoalStatus = "active" | "completed" | "paused";

export type Goal = {
  id: string;
  title: string;
  area: string;
  status: GoalStatus;
  currentValue: number;
  targetValue: number;
  deadline: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  linkedFinanceMetric?: "none" | "savings";
  currency?: Currency;
  unit?: string;
};

export type GoalDraft = Pick<
  Goal,
  | "title"
  | "area"
  | "status"
  | "currentValue"
  | "targetValue"
  | "deadline"
  | "notes"
> & {
  linkedFinanceMetric?: "none" | "savings";
  currency?: Currency;
  unit?: string;
};

export type ReviewArea =
  | "finances"
  | "fitness"
  | "academics"
  | "work"
  | "personal"
  | "energy"
  | "discipline";

export type ReviewRatings = Record<ReviewArea, number>;

export type WeeklyReview = {
  id: string;
  weekStart: string;
  weekEnd: string;
  createdAt: string;
  updatedAt: string;
  wins: string;
  problems: string;
  lessons: string;
  whatFeltOff: string;
  whatToImprove: string;
  nextWeekFocus: string;
  ratings: ReviewRatings;
  moodSummary?: string;
  biggestWin?: string;
  biggestProblem?: string;
  oneThingToStop?: string;
  oneThingToContinue?: string;
  oneThingToStart?: string;
  xpAwarded?: boolean;
};

export type ReviewDraft = Omit<
  WeeklyReview,
  "id" | "createdAt" | "updatedAt" | "xpAwarded"
>;

export type XPAction =
  | "finance-transaction"
  | "workout-log"
  | "task-completed"
  | "note-created"
  | "academic-task-completed"
  | "goal-updated"
  | "weekly-review-completed"
  | "daily-planning-completed"
  | "work-item-completed"
  | "study-session-logged"
  | "daily-wrap-completed";

export type XPActivity = {
  id: string;
  amount: number;
  label: string;
  createdAt: string;
};

export type XPState = {
  currentXP: number;
  activity: XPActivity[];
};

export type DayMode =
  | "Normal Day"
  | "University Day"
  | "Work Sprint Day"
  | "Low Energy Day"
  | "Recovery Day";

export type AtlasSettings = {
  dayMode: DayMode;
  language: "en" | "es";
  gymWeeklyTarget: number;
  baseCurrency?: Currency;
  exchangeRateUsdToPyg?: number;
  usdToPygRate?: number;
  exchangeRateUpdatedAt?: string;
  exchangeRateSource?: "manual" | "live";
};

// --- Savings ---

export type SavingsState = {
  currentAmount: number;
  currency: Currency;
  updatedAt: string;
};

// --- Daily Planning ---

export type DailyPlanStatus =
  | "not_planned"
  | "planned"
  | "in_progress"
  | "completed";

export type DailyPlanRecord = {
  date: string;
  status: DailyPlanStatus;
  completedAt?: string;
};

// --- Work / Clients ---

export type ClientType =
  | "Agency"
  | "Direct Client"
  | "Freelance Platform"
  | "Personal Project"
  | "Other";

export type ClientStatus = "active" | "paused" | "archived";

export type Difficulty = "easy" | "medium" | "hard" | "intense";

export type BillingType =
  | "per_item"
  | "fixed_monthly"
  | "hourly"
  | "non_billable";

export type Client = {
  id: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  difficulty: Difficulty;
  defaultRate?: number;
  notes?: string;
  createdAt: string;
  billingType?: BillingType;
  monthlyRate?: number;
  hourlyRate?: number;
  currency?: Currency;
};

export type ClientDraft = Omit<Client, "id" | "createdAt">;

export type WorkItemType =
  | "Video"
  | "Resize"
  | "Motion"
  | "B-roll"
  | "Design"
  | "Revision"
  | "Admin"
  | "Other";

export type WorkItemStatus =
  | "backlog"
  | "planned"
  | "in_progress"
  | "waiting_feedback"
  | "completed"
  | "archived";

export type WorkItem = {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: TaskPriority;
  difficulty: Difficulty;
  estimatedMinutes?: number;
  deadline?: string;
  plannedDate?: string;
  value?: number;
  currency?: Currency;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  xpAwarded?: boolean;
  referenceUrl?: string;
};

export type WorkItemDraft = Omit<WorkItem, "id" | "createdAt" | "completedAt">;

// --- Daily Wrap / Closed Day ---

export type DailyWrapStatsSnapshot = {
  plannedTasks: number;
  completedTasks: number;
  skippedTasks: number;
  completedWorkItems: number;
  waitingFeedbackItems: number;
  academicTasksCompleted: number;
  gymLogged: boolean;
  workoutType?: WorkoutType;
  financeTransactionsCount: number;
  dailyIncome: number;
  dailyExpenses: number;
  notesCreated: number;
  xpEarnedToday: number;
  upcomingDeadlinesTomorrow: number;
  overdueItemsRemaining: number;
};

export type DailyWrap = {
  id: string;
  date: string; // YYYY-MM-DD local
  generatedSummary: string;
  statsSnapshot: DailyWrapStatsSnapshot;
  mood?: number; // 1-10
  energy?: number; // 1-10
  productivity?: number; // 1-10
  mainTakeaway?: string;
  tomorrowFocus?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  xpAwarded: boolean;
};

// --- Unified Architectural Refactoring Types ---

export type FinanceSettings = {
  baseCurrency: Currency;
  exchangeRateUsdToPyg: number;
  exchangeRateUpdatedAt: string;
  exchangeRateSource: "manual" | "live";
  usdToPygRate: number;
};

export type StreakState = {
  current: number;
  longest: number;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: "task" | "work_item" | "goal" | "workout" | "daily_wrap" | "weekly_review";
  status?: string;
  value?: number;
  currency?: Currency;
  extraInfo?: string;
};

// --- Backwards-Compatible Aliases ---
export type Task = AtlasTask;
export type GymLog = WorkoutLog;
export type XPEvent = XPActivity;
export type DailyPlan = DailyPlanRecord;
export type Savings = SavingsState;
export type AcademicTask = AtlasTask;

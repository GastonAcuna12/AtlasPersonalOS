"use client";

import { ATLAS_STORAGE_KEYS, readFromStorage, writeToStorage, todayISO, type AtlasStorageKey } from "@/lib/storage";
import type {
  Transaction,
  WorkoutLog,
  AtlasTask,
  Subject,
  StudySession,
  Note,
  Goal,
  WeeklyReview,
  XPState,
  SavingsState,
  Client,
  WorkItem,
  DailyPlanRecord,
  AtlasSettings,
  FinanceSettings,
  DailyWrap,
} from "@/types/atlas";
import { DEFAULT_APP_SETTINGS, DEFAULT_FINANCE_SETTINGS } from "@/lib/settings";

// Helper to generate dynamic ISO dates relative to today
// positive = past, negative = future (relativeDate(-5) is 5 days from now)
function relativeDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Helper to generate dynamic ISO timestamps
function relativeTimestamp(daysAgo: number, hoursAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

export function loadSampleData(merge = false) {
  const todayStr = todayISO();

  // 1. Settings (Base exchange rate 6150, Pyg base currency)
  const sampleAppSettings: AtlasSettings = {
    ...DEFAULT_APP_SETTINGS,
    dayMode: "Normal Day",
    gymWeeklyTarget: 4,
  };

  const sampleFinanceSettings: FinanceSettings = {
    ...DEFAULT_FINANCE_SETTINGS,
    baseCurrency: "PYG",
    exchangeRateUsdToPyg: 6150,
    usdToPygRate: 6150,
    exchangeRateUpdatedAt: todayStr,
    exchangeRateSource: "manual",
  };

  // 2. Savings Amount (5,000,000 PYG)
  const sampleSavings: SavingsState = {
    currentAmount: 5000000,
    currency: "PYG",
    updatedAt: relativeTimestamp(0, 2),
  };

  // 3. Clients
  const sampleClients: Client[] = [
    {
      id: "client-a",
      name: "Direct Client Demo",
      type: "Direct Client",
      status: "active",
      difficulty: "medium",
      defaultRate: 35,
      notes: "Direct freelance contract for editorial video edits.",
      createdAt: relativeTimestamp(30),
      billingType: "per_item",
      currency: "USD",
    },
    {
      id: "agency-demo",
      name: "Agency Demo",
      type: "Agency",
      status: "active",
      difficulty: "easy",
      createdAt: relativeTimestamp(20),
      billingType: "fixed_monthly",
      monthlyRate: 3000000,
      currency: "PYG",
    },
    {
      id: "personal-proj",
      name: "Personal Project",
      type: "Personal Project",
      status: "active",
      difficulty: "medium",
      notes: "SaaS coding workspace and portfolio updates.",
      createdAt: relativeTimestamp(15),
      billingType: "non_billable",
    },
    {
      id: "hourly-client",
      name: "Hourly Client Demo",
      type: "Freelance Platform",
      status: "active",
      difficulty: "hard",
      createdAt: relativeTimestamp(10),
      billingType: "hourly",
      hourlyRate: 25,
      currency: "USD",
    },
  ];

  // 4. Work Items
  const sampleWorkItems: WorkItem[] = [
    {
      id: "work-1",
      clientId: "client-a",
      title: "Teaser Video Montage",
      description: "Assemble and color grade the 60-second social teaser.",
      type: "Video",
      status: "waiting_feedback",
      priority: "high",
      difficulty: "medium",
      estimatedMinutes: 240,
      deadline: relativeDate(-5), // 5 days in the future
      plannedDate: todayStr,
      value: 150,
      currency: "USD",
      notes: "Draft shared with client. Awaiting review.",
      createdAt: relativeTimestamp(6),
      referenceUrl: "https://drive.google.com/drive/folders/sample-teaser-montage",
    },
    {
      id: "work-2",
      clientId: "agency-demo",
      title: "Template Assets Pack",
      description: "Create standard vector logo templates for the monthly social pack.",
      type: "Design",
      status: "planned",
      priority: "medium",
      difficulty: "easy",
      estimatedMinutes: 120,
      deadline: relativeDate(-12),
      plannedDate: todayStr,
      createdAt: relativeTimestamp(3),
    },
    {
      id: "work-3",
      clientId: "client-a",
      title: "Audio revision review",
      description: "Perform compression filter testing for sound channels.",
      type: "Revision",
      status: "planned",
      priority: "medium",
      difficulty: "easy",
      estimatedMinutes: 30,
      deadline: relativeDate(0), // due today!
      plannedDate: todayStr,
      value: 30,
      currency: "USD",
      createdAt: relativeTimestamp(1),
    },
    {
      id: "work-4",
      clientId: "personal-proj",
      title: "Workspace layout refactor",
      description: "Clean up code modules and aggregate helper functions.",
      type: "Admin",
      status: "backlog",
      priority: "low",
      difficulty: "medium",
      estimatedMinutes: 180,
      deadline: relativeDate(-29),
      createdAt: relativeTimestamp(10),
    },
    {
      id: "work-5",
      clientId: "client-a",
      title: "Initial Audio Mixing",
      description: "Clean up noisy interview snippets using local filters.",
      type: "Revision",
      status: "completed",
      priority: "medium",
      difficulty: "easy",
      estimatedMinutes: 60,
      deadline: relativeDate(1), // due yesterday, completed yesterday
      plannedDate: relativeDate(1),
      value: 50,
      currency: "USD",
      createdAt: relativeTimestamp(2),
      completedAt: relativeTimestamp(1, 4),
      xpAwarded: true,
    },
    {
      id: "work-6",
      clientId: "hourly-client",
      title: "Premium layout drafts",
      description: "Sketch wireframes for client dashboard layout.",
      type: "Design",
      status: "in_progress",
      priority: "high",
      difficulty: "hard",
      estimatedMinutes: 120,
      deadline: relativeDate(-3),
      plannedDate: todayStr,
      value: 100,
      currency: "USD",
      createdAt: relativeTimestamp(4),
    },
  ];

  // 5. Academic Subjects
  const sampleSubjects: Subject[] = [
    {
      id: "subj-prog",
      name: "Programming",
      professor: "Professor Jenkins",
      accent: "border-indigo-500",
      status: "active",
      notes: "TypeScript type casting rules, centralized data layer patterns.",
      createdAt: relativeTimestamp(45),
    },
    {
      id: "subj-soc",
      name: "Sociology",
      professor: "Professor Abernathy",
      accent: "border-rose-500",
      status: "active",
      notes: "Researching networks and collaborative institutional groups.",
      createdAt: relativeTimestamp(45),
    },
    {
      id: "subj-des",
      name: "Design",
      professor: "Professor Chen",
      accent: "border-cyan-500",
      status: "active",
      notes: "Aesthetic color theories and high-fidelity wireframes.",
      createdAt: relativeTimestamp(45),
    },
  ];

  // 6. Tasks (including academic testing)
  const sampleTasks: AtlasTask[] = [
    {
      id: "task-gen-1",
      title: "Prepare weekly client report",
      description: "Organize client deliverables lists and backlogs pipeline.",
      area: "Work",
      taskType: "Client Work",
      status: "today",
      priority: "high",
      dueDate: todayStr,
      plannedDate: todayStr,
      estimatedMinutes: 45,
      energyRequired: "medium",
      xpReward: 10,
      createdAt: relativeTimestamp(1),
      completedAt: null,
    },
    {
      id: "task-gen-2",
      title: "Clear browser workspace logs",
      description: "Delete temporary JSON backup test logs.",
      area: "Personal",
      taskType: "Quick Task",
      status: "today",
      priority: "low",
      dueDate: todayStr,
      plannedDate: todayStr,
      estimatedMinutes: 10,
      energyRequired: "low",
      xpReward: 10,
      createdAt: relativeTimestamp(1),
      completedAt: null,
    },
    {
      id: "task-gen-3",
      title: "Organize vault backup folders",
      description: "Consolidate archive notes and zip local settings.",
      area: "Personal",
      taskType: "Quick Task",
      status: "completed",
      priority: "low",
      dueDate: todayStr,
      plannedDate: todayStr,
      estimatedMinutes: 15,
      energyRequired: "low",
      xpReward: 10,
      createdAt: relativeTimestamp(1),
      completedAt: relativeTimestamp(0, 5),
    },
    {
      id: "task-acad-today",
      title: "Programming Assignment 2",
      description: "Implement local collection algorithms with strict TypeScript casts.",
      area: "Academic",
      taskType: "University",
      status: "today",
      priority: "high",
      dueDate: todayStr, // Due TODAY!
      plannedDate: todayStr,
      estimatedMinutes: 90,
      energyRequired: "high",
      xpReward: 20,
      subjectId: "subj-prog",
      academicType: "Assignment",
      createdAt: relativeTimestamp(4),
      completedAt: null,
    },
    {
      id: "task-acad-7d",
      title: "Sociology Essay Draft",
      description: "Draft references sheet for institutional networks review essay.",
      area: "Academic",
      taskType: "University",
      status: "in_progress",
      priority: "medium",
      dueDate: relativeDate(-3), // Due in 3 days!
      plannedDate: todayStr,
      estimatedMinutes: 60,
      energyRequired: "medium",
      xpReward: 20,
      subjectId: "subj-soc",
      academicType: "Project",
      createdAt: relativeTimestamp(3),
      completedAt: null,
    },
    {
      id: "task-acad-20d",
      title: "Midterm project outline",
      description: "Outline the key topics for intermediate design course review.",
      area: "Academic",
      taskType: "University",
      status: "backlog",
      priority: "low",
      dueDate: relativeDate(-20), // Due in 20 days!
      plannedDate: relativeDate(-5),
      estimatedMinutes: 45,
      energyRequired: "low",
      xpReward: 20,
      subjectId: "subj-des",
      academicType: "Project",
      createdAt: relativeTimestamp(5),
      completedAt: null,
    },
    {
      id: "task-acad-future",
      title: "Programming Final Project Draft",
      description: "Outline complete codebase system architecture modules.",
      area: "Academic",
      taskType: "University",
      status: "backlog",
      priority: "high",
      dueDate: relativeDate(-45), // Due in 45 days (long term)
      plannedDate: relativeDate(-20),
      estimatedMinutes: 240,
      energyRequired: "high",
      xpReward: 20,
      subjectId: "subj-prog",
      academicType: "Project",
      createdAt: relativeTimestamp(10),
      completedAt: null,
    },
    {
      id: "task-acad-done",
      title: "TypeScript Casts Practice",
      description: "Practice object cast normalizers for offline databases.",
      area: "Academic",
      taskType: "University",
      status: "completed",
      priority: "medium",
      dueDate: relativeDate(2),
      plannedDate: relativeDate(2),
      estimatedMinutes: 40,
      energyRequired: "medium",
      xpReward: 20,
      subjectId: "subj-prog",
      academicType: "Practice",
      createdAt: relativeTimestamp(4),
      completedAt: relativeTimestamp(2, 4),
    },
    {
      id: "task-skipped-today",
      title: "Filing older physical receipts",
      description: "Sort taxi and meals tickets in physical binder.",
      area: "Finance",
      taskType: "Errand",
      status: "skipped",
      priority: "low",
      dueDate: todayStr,
      plannedDate: todayStr,
      estimatedMinutes: 20,
      energyRequired: "low",
      xpReward: 10,
      createdAt: relativeTimestamp(1),
      completedAt: null,
    },
  ];

  // 7. Study Sessions
  const sampleStudySessions: StudySession[] = [
    {
      id: "study-1",
      subjectId: "subj-prog",
      date: relativeDate(1),
      durationMinutes: 90,
      focusLevel: 5,
      notes: "TypeScript type definitions compiled successfully.",
      createdAt: relativeTimestamp(1, 5),
    },
    {
      id: "study-2",
      subjectId: "subj-soc",
      date: relativeDate(3),
      durationMinutes: 60,
      focusLevel: 4,
      notes: "Read modern sociological structures paradigms.",
      createdAt: relativeTimestamp(3, 3),
    },
  ];

  // 8. Gym Logs (multiple gym logs this week and month, Rest logs, consecutive dates for streaks)
  const sampleGymLogs: WorkoutLog[] = [
    {
      id: "gym-1",
      date: relativeDate(0), // Today
      workoutType: "Push",
      duration: 60,
      energy: 4,
      intensity: 4,
      notes: "Today: strength is optimal. Bench press sets completed.",
      createdAt: relativeTimestamp(0, 1),
    },
    {
      id: "gym-2",
      date: relativeDate(1), // Yesterday
      workoutType: "Pull",
      duration: 50,
      energy: 3,
      intensity: 4,
      notes: "Row variations focus. Good dynamic pump.",
      createdAt: relativeTimestamp(1, 2),
    },
    {
      id: "gym-3",
      date: relativeDate(2), // 2 days ago
      workoutType: "Rest", // Rest/Recovery day!
      duration: 0,
      energy: 4,
      intensity: 1,
      notes: "Passive recovery day. Dynamic stretching and mobility checks.",
      createdAt: relativeTimestamp(2, 4),
    },
    {
      id: "gym-4",
      date: relativeDate(3), // 3 days ago (consecutive logs for streak badges!)
      workoutType: "Legs",
      duration: 70,
      energy: 5,
      intensity: 5,
      notes: "Squat overload sets. High effort.",
      createdAt: relativeTimestamp(3, 3),
    },
    {
      id: "gym-5",
      date: relativeDate(15), // This month, past week
      workoutType: "Cardio",
      duration: 40,
      energy: 4,
      intensity: 3,
      notes: "Morning cardio run. Perfect pacing.",
      createdAt: relativeTimestamp(15, 1),
    },
  ];

  // 9. Finance Transactions
  const sampleTransactions: Transaction[] = [
    // Income today
    {
      id: "tx-inc-pyg",
      type: "income",
      amount: 4500000,
      currency: "PYG",
      category: "Salary",
      description: "Monthly freelance retainer (Agency Demo)",
      date: relativeDate(0), // Today!
      paymentMethod: "Bank Transfer",
      tag: "work",
      createdAt: relativeTimestamp(0),
    },
    // Expense today
    {
      id: "tx-exp-pyg",
      type: "expense",
      amount: 65000,
      currency: "PYG",
      category: "Food",
      description: "Coworking lunch and coffee",
      date: relativeDate(0), // Today!
      paymentMethod: "Debit",
      tag: "daily",
      createdAt: relativeTimestamp(0),
    },
    // Expense this month (USD) - verified 45 USD maps to PYG conversion
    {
      id: "tx-exp-usd",
      type: "expense",
      amount: 45,
      currency: "USD",
      category: "Entertainment",
      description: "Online developer tools subscription",
      date: relativeDate(8), // This month
      paymentMethod: "Credit",
      tag: "subscriptions",
      createdAt: relativeTimestamp(8),
    },
    // Older transaction (Pyg)
    {
      id: "tx-old-pyg",
      type: "expense",
      amount: 150000,
      currency: "PYG",
      category: "Transport",
      description: "Monthly train/taxi fuel pass card refuel",
      date: relativeDate(45), // Older transaction (> 30 days)
      paymentMethod: "Cash",
      tag: "commute",
      createdAt: relativeTimestamp(45),
    },
  ];

  // 10. Goals
  const sampleGoals: Goal[] = [
    {
      id: "goal-fin",
      title: "Demo financial goal",
      area: "Finance",
      status: "active",
      currentValue: 5000000, // Linked to savings (5,000,000 / 10,000,000 = 50%)
      targetValue: 10000000,
      deadline: relativeDate(-90), // Due in 90 days (Long-term, > 30 days away)
      notes: "Build up primary reserve fund. Linked reactively to savings.",
      linkedFinanceMetric: "savings",
      currency: "PYG",
      unit: "PYG",
      createdAt: relativeTimestamp(30),
      updatedAt: relativeTimestamp(0, 2),
    },
    {
      id: "goal-fit",
      title: "Run a Half Marathon",
      area: "Fitness",
      status: "active",
      currentValue: 12,
      targetValue: 21,
      deadline: relativeDate(-45), // Due in 45 days
      notes: "Incremental long distance stamina building.",
      linkedFinanceMetric: "none",
      unit: "km",
      createdAt: relativeTimestamp(20),
      updatedAt: relativeTimestamp(4),
    },
    {
      id: "goal-acad",
      title: "Read 5 Academic Papers",
      area: "Academic",
      status: "active",
      currentValue: 3,
      targetValue: 5,
      deadline: relativeDate(-60), // Due in 60 days
      notes: "Keep up with community dynamics sociology references.",
      linkedFinanceMetric: "none",
      unit: "papers",
      createdAt: relativeTimestamp(15),
      updatedAt: relativeTimestamp(3),
    },
    {
      id: "goal-short-30d",
      title: "Acquire Design Certificate",
      area: "Personal",
      status: "active",
      currentValue: 80,
      targetValue: 100,
      deadline: relativeDate(-15), // Due in 15 days! (Upcoming, <= 30 days)
      notes: "UX layout certification modules. Must appear in Upcoming Deadlines.",
      linkedFinanceMetric: "none",
      unit: "%",
      createdAt: relativeTimestamp(25),
      updatedAt: relativeTimestamp(2),
    },
  ];

  // 11. Notes (at least 5 notes, hashtags, personal/work/academic, 1 created today)
  const sampleNotes: Note[] = [
    {
      id: "note-1",
      title: "Atlas OS Design Philosophy",
      area: "Personal",
      tags: ["atlas", "philosophy", "architecture"],
      content: `# Atlas OS Design Philosophy\n\n* **Privacy First**: Everything stays in your browser's \`localStorage\`. No database connections.\n* **Minimalist Aesthetics**: HSL dark mode, responsive sidebars.\n* **Urgency Staggering**: Lists priority focus tasks today automatically.`,
      createdAt: relativeTimestamp(10),
      updatedAt: relativeTimestamp(10),
    },
    {
      id: "note-2",
      title: "Freelance Rates Reference",
      area: "Work",
      tags: ["rates", "freelance", "agency"],
      content: `# Freelance Rates Reference\n\n* **Direct Client**: $35/hour standard rate.\n* **Agency Demo**: Fixed template retainer.\n* **Hourly Client**: $25/hour plat rate.`,
      createdAt: relativeTimestamp(8),
      updatedAt: relativeTimestamp(8),
    },
    {
      id: "note-3",
      title: "Sociology Study Highlights",
      area: "Academic",
      tags: ["sociology", "notes", "study"],
      content: `# Sociology Study Highlights\n\n* **Institutional Networks**: Key themes revolve around distributed systems.\n* **Community Dynamics**: High trust collaborative paradigms.`,
      createdAt: relativeTimestamp(3),
      updatedAt: relativeTimestamp(3),
    },
    {
      id: "note-4",
      title: "Personal Coding Guidelines",
      area: "Personal",
      tags: ["code", "typescript", "clean"],
      content: `# Personal Coding Guidelines\n\n* Use strict typescript normalizers.\n* Write zero-dependency local hooks.\n* Separate derived math from rendering files.`,
      createdAt: relativeTimestamp(5),
      updatedAt: relativeTimestamp(5),
    },
    {
      id: "note-5",
      title: "Today's Architecture Review",
      area: "Personal",
      tags: ["atlas", "logs", "refactor"],
      content: `# Today's Architecture Review\n\nPracticed refactoring local data layers to split app and finance configurations reactively.\n\n* Clean splits.\n* Safe migrations.\n* QA checks in settings.`,
      createdAt: relativeTimestamp(0), // Created Today!
      updatedAt: relativeTimestamp(0),
    },
  ];

  // 12. Weekly Review
  const sampleWeeklyReviews: WeeklyReview[] = [
    {
      id: "rev-1",
      weekStart: relativeDate(10),
      weekEnd: relativeDate(3),
      wins: "Successfully finalized Client A deliverables on time. Maintained 3 intense workout sessions.",
      problems: "Felt slightly unorganized on Tuesday morning.",
      lessons: "A strong morning startup checklist beats unstructured reaction.",
      whatFeltOff: "Tuesday routing",
      whatToImprove: "Time blocking calendar templates",
      nextWeekFocus: "Sociology essay draft outlining and savings progress",
      ratings: {
        finances: 4,
        fitness: 4,
        academics: 3,
        work: 5,
        personal: 4,
        energy: 4,
        discipline: 4,
      },
      biggestWin: "Milestone completion",
      biggestProblem: "Tuesday focus focus leakage",
      xpAwarded: true,
      createdAt: relativeTimestamp(3),
      updatedAt: relativeTimestamp(3),
    },
  ];

  // 13. Daily Plans
  const sampleDailyPlans: DailyPlanRecord[] = [
    {
      date: todayStr,
      status: "in_progress",
    },
    {
      date: relativeDate(1),
      status: "completed",
      completedAt: relativeTimestamp(1, 2),
    },
  ];

  // 14. XP State
  const sampleXP: XPState = {
    currentXP: 1250, // Level 5 (Systems thinking starts at 1200)
    activity: [
      {
        id: "xp-act-1",
        amount: 25,
        label: "Completed daily planning",
        createdAt: relativeTimestamp(0, 1),
      },
      {
        id: "xp-act-2",
        amount: 15,
        label: "Completed work item",
        createdAt: relativeTimestamp(1, 3),
      },
      {
        id: "xp-act-3",
        amount: 10,
        label: "Logged workout",
        createdAt: relativeTimestamp(1, 2),
      },
      {
        id: "xp-act-4",
        amount: 50,
        label: "Completed weekly review",
        createdAt: relativeTimestamp(3, 3),
      },
      {
        id: "xp-act-5",
        amount: 20,
        label: "Completed academic task",
        createdAt: relativeTimestamp(1, 6),
      },
      {
        id: "xp-act-6",
        amount: 10,
        label: "Created note",
        createdAt: relativeTimestamp(8),
      },
      {
        id: "xp-act-7",
        amount: 10,
        label: "Added transaction",
        createdAt: relativeTimestamp(5),
      },
    ],
  };

  // 15. Daily Wraps
  const sampleDailyWraps: DailyWrap[] = [
    {
      id: "wrap-yesterday",
      date: relativeDate(1), // Yesterday
      generatedSummary: "Finalized Programming Assignment 2 successfully. Completed a strong gym legs session.",
      statsSnapshot: {
        plannedTasks: 3,
        completedTasks: 2,
        skippedTasks: 0,
        completedWorkItems: 1,
        waitingFeedbackItems: 1,
        academicTasksCompleted: 1,
        gymLogged: true,
        workoutType: "Legs",
        financeTransactionsCount: 1,
        dailyIncome: 0,
        dailyExpenses: 65000,
        notesCreated: 1,
        xpEarnedToday: 65,
        upcomingDeadlinesTomorrow: 1,
        overdueItemsRemaining: 0,
      },
      mood: 8,
      energy: 7,
      productivity: 9,
      mainTakeaway: "Consistency on high effort tasks yields great momentum.",
      tomorrowFocus: "Prepare weekly client report and work items backlog.",
      notes: "Feeling extremely focused.",
      createdAt: relativeTimestamp(1, 2),
      updatedAt: relativeTimestamp(1, 2),
      xpAwarded: true,
    },
  ];

  if (merge) {
    // Read and merge arrays to avoid duplicates
    const mergeArray = <T>(
      key: AtlasStorageKey,
      sample: T[],
      fallback: T[],
      uniqueKey: keyof T
    ): T[] => {
      const current = readFromStorage<T[]>(key, fallback);
      const existingKeys = new Set(current.map((item) => item[uniqueKey]));
      const filteredSample = sample.filter((item) => !existingKeys.has(item[uniqueKey]));
      return [...filteredSample, ...current];
    };

    writeToStorage(ATLAS_STORAGE_KEYS.clients, mergeArray(ATLAS_STORAGE_KEYS.clients, sampleClients, [], "id"));
    writeToStorage(ATLAS_STORAGE_KEYS.workItems, mergeArray(ATLAS_STORAGE_KEYS.workItems, sampleWorkItems, [], "id"));
    writeToStorage(ATLAS_STORAGE_KEYS.subjects, mergeArray(ATLAS_STORAGE_KEYS.subjects, sampleSubjects, [], "id"));
    writeToStorage(ATLAS_STORAGE_KEYS.tasks, mergeArray(ATLAS_STORAGE_KEYS.tasks, sampleTasks, [], "id"));
    writeToStorage(ATLAS_STORAGE_KEYS.studySessions, mergeArray(ATLAS_STORAGE_KEYS.studySessions, sampleStudySessions, [], "id"));
    writeToStorage(ATLAS_STORAGE_KEYS.gymLogs, mergeArray(ATLAS_STORAGE_KEYS.gymLogs, sampleGymLogs, [], "id"));
    writeToStorage(ATLAS_STORAGE_KEYS.transactions, mergeArray(ATLAS_STORAGE_KEYS.transactions, sampleTransactions, [], "id"));
    writeToStorage(ATLAS_STORAGE_KEYS.goals, mergeArray(ATLAS_STORAGE_KEYS.goals, sampleGoals, [], "id"));
    writeToStorage(ATLAS_STORAGE_KEYS.notes, mergeArray(ATLAS_STORAGE_KEYS.notes, sampleNotes, [], "id"));
    writeToStorage(ATLAS_STORAGE_KEYS.weeklyReviews, mergeArray(ATLAS_STORAGE_KEYS.weeklyReviews, sampleWeeklyReviews, [], "id"));
    writeToStorage(ATLAS_STORAGE_KEYS.dailyPlans, mergeArray(ATLAS_STORAGE_KEYS.dailyPlans, sampleDailyPlans, [], "date"));
    writeToStorage(ATLAS_STORAGE_KEYS.dailyWraps, mergeArray(ATLAS_STORAGE_KEYS.dailyWraps, sampleDailyWraps, [], "id"));

    // Keep current configs or set if missing
    const currentSavings = readFromStorage(ATLAS_STORAGE_KEYS.savings, null);
    if (!currentSavings) {
      writeToStorage(ATLAS_STORAGE_KEYS.savings, sampleSavings);
    }
  } else {
    // Pure Replace
    writeToStorage(ATLAS_STORAGE_KEYS.appSettings, sampleAppSettings);
    writeToStorage(ATLAS_STORAGE_KEYS.financeSettings, sampleFinanceSettings);
    writeToStorage(ATLAS_STORAGE_KEYS.savings, sampleSavings);
    writeToStorage(ATLAS_STORAGE_KEYS.clients, sampleClients);
    writeToStorage(ATLAS_STORAGE_KEYS.workItems, sampleWorkItems);
    writeToStorage(ATLAS_STORAGE_KEYS.subjects, sampleSubjects);
    writeToStorage(ATLAS_STORAGE_KEYS.tasks, sampleTasks);
    writeToStorage(ATLAS_STORAGE_KEYS.studySessions, sampleStudySessions);
    writeToStorage(ATLAS_STORAGE_KEYS.gymLogs, sampleGymLogs);
    writeToStorage(ATLAS_STORAGE_KEYS.transactions, sampleTransactions);
    writeToStorage(ATLAS_STORAGE_KEYS.goals, sampleGoals);
    writeToStorage(ATLAS_STORAGE_KEYS.notes, sampleNotes);
    writeToStorage(ATLAS_STORAGE_KEYS.weeklyReviews, sampleWeeklyReviews);
    writeToStorage(ATLAS_STORAGE_KEYS.dailyPlans, sampleDailyPlans);
    writeToStorage(ATLAS_STORAGE_KEYS.xp, sampleXP);
    writeToStorage(ATLAS_STORAGE_KEYS.dailyWraps, sampleDailyWraps);
  }
}

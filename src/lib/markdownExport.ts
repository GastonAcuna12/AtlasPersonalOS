"use client";

import {
  formatWeekRange,
  getWeeklyReviewAverage,
  REVIEW_AREAS,
  type WeeklyReview,
} from "@/lib/reviews";
import { getGoalProgress, type Goal } from "@/lib/goals";
import { type Note } from "@/lib/notes";
import {
  getAcademicTasks,
  getAcademicWeekRange,
  getAcademicWorkload,
  getActiveSubjects,
  getStudyMinutesThisWeek,
  getStudySessionsThisWeek,
  getUpcomingAcademicDeadlines,
  type StudySession,
  type Subject,
} from "@/lib/academics";
import {
  getThisWeekCompletedTasks,
  todayISO,
  type AtlasTask,
  type TodayGroupedV2,
} from "@/lib/tasks";

type TodayPlanExport = {
  date: string;
  dayMode: string;
  dailyLoad: string;
  plannedCount: number;
  completedTodayCount: number;
  estimatedMinutesRemaining: number;
  xpAvailableToday: number;
  sections: TodayGroupedV2;
};

function yamlValue(value: string | number | null | undefined) {
  return `"${String(value ?? "").replaceAll('"', '\\"')}"`;
}

export function safeFilename(value: string) {
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return cleaned || "untitled";
}

export function formatExportDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function frontmatter(entries: Record<string, string | number | undefined>) {
  const lines = Object.entries(entries).map(
    ([key, value]) => `${key}: ${yamlValue(value)}`,
  );

  return ["---", ...lines, "---", ""].join("\n");
}

function listOrEmpty(items: string[], empty = "No items captured.") {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : empty;
}

export function weeklyReviewToMarkdown(review: WeeklyReview) {
  const ratings = REVIEW_AREAS.map(
    (area) => `- ${area.label}: ${review.ratings[area.key]}/10`,
  );

  return [
    frontmatter({
      source: "atlas",
      type: "weekly-review",
      date: review.weekStart,
      week_start: review.weekStart,
      week_end: review.weekEnd,
    }),
    `# Weekly Review: ${formatWeekRange(review)}`,
    "",
    `Average score: ${getWeeklyReviewAverage(review)}/10`,
    "",
    "## Area Ratings",
    ratings.join("\n"),
    "",
    "## Wins",
    review.wins || "Not captured.",
    "",
    "## Problems",
    review.problems || "Not captured.",
    "",
    "## Lessons",
    review.lessons || "Not captured.",
    "",
    "## What Felt Off",
    review.whatFeltOff || "Not captured.",
    "",
    "## What To Improve",
    review.whatToImprove || "Not captured.",
    "",
    "## Next Week Focus",
    review.nextWeekFocus || "Not captured.",
    "",
    "## Pattern Notes",
    listOrEmpty([
      review.biggestWin ? `Biggest win: ${review.biggestWin}` : "",
      review.biggestProblem ? `Biggest problem: ${review.biggestProblem}` : "",
      review.oneThingToStart ? `Start: ${review.oneThingToStart}` : "",
      review.oneThingToStop ? `Stop: ${review.oneThingToStop}` : "",
      review.oneThingToContinue
        ? `Continue: ${review.oneThingToContinue}`
        : "",
    ].filter(Boolean)),
    "",
  ].join("\n");
}

export function noteToMarkdown(note: Note) {
  return [
    frontmatter({
      source: "atlas",
      type: "note",
      date: note.createdAt.slice(0, 10),
      updated: note.updatedAt.slice(0, 10),
      area: note.area,
      tags: note.tags.join(", "),
    }),
    `# ${note.title}`,
    "",
    `Area: ${note.area}`,
    note.tags.length ? `Tags: ${note.tags.map((tag) => `#${tag}`).join(" ")}` : "",
    "",
    note.content || "No content captured.",
    "",
  ].join("\n");
}

export function allNotesToMarkdown(notes: Note[]) {
  return [
    frontmatter({
      source: "atlas",
      type: "notes-export",
      date: formatExportDate(),
    }),
    "# Atlas Notes",
    "",
    notes.length
      ? notes.map((note) => noteToMarkdown(note).replace(/^---[\s\S]*?---\n\n/, "")).join("\n---\n\n")
      : "No notes captured.",
    "",
  ].join("\n");
}

export function goalsSummaryToMarkdown(goals: Goal[]) {
  const grouped = {
    Active: goals.filter((goal) => goal.status === "active"),
    Completed: goals.filter((goal) => goal.status === "completed"),
    Paused: goals.filter((goal) => goal.status === "paused"),
  };

  return [
    frontmatter({
      source: "atlas",
      type: "goals-summary",
      date: formatExportDate(),
    }),
    "# Goals Summary",
    "",
    ...Object.entries(grouped).flatMap(([label, items]) => [
      `## ${label} Goals`,
      items.length
        ? items
            .map(
              (goal) =>
                `- ${goal.title} (${getGoalProgress(goal)}%) - ${goal.area}${
                  goal.deadline ? `, deadline ${goal.deadline}` : ""
                }\n  - Current: ${goal.currentValue} / ${goal.targetValue}${
                  goal.notes ? `\n  - Notes: ${goal.notes}` : ""
                }`,
            )
            .join("\n")
        : "No goals in this state.",
      "",
    ]),
  ].join("\n");
}

export function todayPlanToMarkdown(plan: TodayPlanExport) {
  const sectionLabels: Record<keyof TodayGroupedV2, string> = {
    overdue: "Overdue",
    scheduled: "Scheduled",
    priorityFocus: "Priority Focus",
    quickWins: "Quick Wins",
    remaining: "Remaining",
    backlog: "Backlog Suggestions",
  };

  return [
    frontmatter({
      source: "atlas",
      type: "today-plan",
      date: plan.date,
      day_mode: plan.dayMode,
    }),
    `# Today Plan: ${plan.date}`,
    "",
    `Day mode: ${plan.dayMode}`,
    `Daily load: ${plan.dailyLoad}`,
    `Planned tasks: ${plan.plannedCount}`,
    `Completed today: ${plan.completedTodayCount}`,
    `Estimated minutes remaining: ${plan.estimatedMinutesRemaining}`,
    `XP available: ${plan.xpAvailableToday}`,
    "",
    ...Object.entries(plan.sections).flatMap(([key, tasks]) => [
      `## ${sectionLabels[key as keyof TodayGroupedV2]}`,
      tasks.length
        ? tasks
            .map(
              (task) =>
                `- ${task.title} (${task.priority}, ${task.estimatedMinutes} min, +${task.xpReward} XP)`,
            )
            .join("\n")
        : "No tasks.",
      "",
    ]),
  ].join("\n");
}

export function academicWeekToMarkdown({
  subjects,
  tasks,
  sessions,
}: {
  subjects: Subject[];
  tasks: AtlasTask[];
  sessions: StudySession[];
}) {
  const date = todayISO();
  const range = getAcademicWeekRange(date);
  const activeSubjects = getActiveSubjects(subjects);
  const deadlines = getUpcomingAcademicDeadlines(tasks, date);
  const weekSessions = getStudySessionsThisWeek(sessions, date);
  const workload = getAcademicWorkload(tasks, date);
  const completed = getThisWeekCompletedTasks(getAcademicTasks(tasks), date);
  const subjectName = (id?: string) =>
    subjects.find((subject) => subject.id === id)?.name ?? "No subject";

  return [
    frontmatter({
      source: "atlas",
      type: "academic-week",
      date,
      week_start: range.start,
      week_end: range.end,
    }),
    `# Academic Week: ${range.start} to ${range.end}`,
    "",
    "## Active Subjects",
    listOrEmpty(activeSubjects.map((subject) => subject.name)),
    "",
    "## Upcoming Deadlines",
    deadlines.length
      ? deadlines
          .map(
            (task) =>
              `- ${task.dueDate}: ${task.title} (${subjectName(task.subjectId)}, ${task.academicType ?? "Other"}, ${task.priority}, ${task.estimatedMinutes} min)`,
          )
          .join("\n")
      : "No upcoming deadlines.",
    "",
    "## Study Sessions This Week",
    weekSessions.length
      ? weekSessions
          .map(
            (session) =>
              `- ${session.date}: ${subjectName(session.subjectId)} - ${session.durationMinutes} min, focus ${session.focusLevel}/10`,
          )
          .join("\n")
      : "No study sessions this week.",
    "",
    `Study minutes this week: ${getStudyMinutesThisWeek(sessions, undefined, date)}`,
    `Academic workload: ${workload.label} (${workload.weekMinutes} planned min)`,
    "",
    "## Completed Academic Tasks This Week",
    listOrEmpty(completed.map((task) => `${task.title} (${task.completedAt?.slice(0, 10)})`)),
    "",
  ].join("\n");
}

export function downloadWeeklyReviewMarkdown(review: WeeklyReview) {
  downloadTextFile(
    `atlas-weekly-review-${review.weekStart}.md`,
    weeklyReviewToMarkdown(review),
  );
}

export function downloadNoteMarkdown(note: Note) {
  downloadTextFile(
    `atlas-note-${safeFilename(note.title)}.md`,
    noteToMarkdown(note),
  );
}

export function downloadAllNotesMarkdown(notes: Note[]) {
  downloadTextFile(`atlas-notes-${formatExportDate()}.md`, allNotesToMarkdown(notes));
}

export function downloadGoalsSummaryMarkdown(goals: Goal[]) {
  downloadTextFile(
    `atlas-goals-summary-${formatExportDate()}.md`,
    goalsSummaryToMarkdown(goals),
  );
}

export function downloadTodayPlanMarkdown(plan: TodayPlanExport) {
  downloadTextFile(
    `atlas-today-plan-${plan.date}.md`,
    todayPlanToMarkdown(plan),
  );
}

export function downloadAcademicWeekMarkdown(input: {
  subjects: Subject[];
  tasks: AtlasTask[];
  sessions: StudySession[];
}) {
  downloadTextFile(
    `atlas-academic-week-${formatExportDate()}.md`,
    academicWeekToMarkdown(input),
  );
}

// --- Daily Wrap Export ---

import type { DailyWrap } from "@/types/atlas";

export function dailyWrapToMarkdown(wrap: DailyWrap) {
  const s = wrap.statsSnapshot;

  const ratingLine = (label: string, value?: number) =>
    value !== undefined ? `- ${label}: ${value}/10` : "";

  const ratings = [
    ratingLine("Mood", wrap.mood),
    ratingLine("Energy", wrap.energy),
    ratingLine("Productivity", wrap.productivity),
  ].filter(Boolean);

  return [
    frontmatter({
      source: "atlas",
      type: "daily-wrap",
      date: wrap.date,
    }),
    `# Daily Wrap: ${wrap.date}`,
    "",
    "## Generated Summary",
    wrap.generatedSummary || "No activity captured.",
    "",
    "## Stats Snapshot",
    `- Tasks completed: ${s.completedTasks}/${s.plannedTasks} planned`,
    `- Tasks skipped: ${s.skippedTasks}`,
    `- Work items completed: ${s.completedWorkItems}`,
    `- Waiting feedback: ${s.waitingFeedbackItems}`,
    `- Gym logged: ${s.gymLogged ? `Yes (${s.workoutType ?? "workout"})` : "No"}`,
    `- Finance transactions: ${s.financeTransactionsCount}`,
    `- Daily income: ${s.dailyIncome.toLocaleString()}`,
    `- Daily expenses: ${s.dailyExpenses.toLocaleString()}`,
    `- Academic tasks completed: ${s.academicTasksCompleted}`,
    `- Notes created: ${s.notesCreated}`,
    `- XP earned: ${s.xpEarnedToday}`,
    `- Tomorrow deadlines: ${s.upcomingDeadlinesTomorrow}`,
    `- Overdue items remaining: ${s.overdueItemsRemaining}`,
    "",
    ...(ratings.length > 0
      ? ["## Self-Assessment", ...ratings, ""]
      : []),
    ...(wrap.mainTakeaway
      ? ["## Main Takeaway", wrap.mainTakeaway, ""]
      : []),
    ...(wrap.tomorrowFocus
      ? ["## Tomorrow's Focus", wrap.tomorrowFocus, ""]
      : []),
    ...(wrap.notes
      ? ["## Reflection Notes", wrap.notes, ""]
      : []),
  ].join("\n");
}

export function downloadDailyWrapMarkdown(wrap: DailyWrap) {
  downloadTextFile(
    `atlas-daily-wrap-${wrap.date}.md`,
    dailyWrapToMarkdown(wrap),
  );
}

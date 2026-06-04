"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ATLAS_STORAGE_KEYS, useStoredValue, writeToStorage } from "@/lib/storage";
import { TaskCard } from "./TaskCard";
import { TaskQuickAddForm } from "./TaskQuickAddForm";
import { downloadTodayPlanMarkdown } from "@/lib/markdownExport";
import { shouldShowReviewReminder, useWeeklyReviews } from "@/lib/reviews";
import { DAY_MODES, useAtlasSettings, type DayMode } from "@/lib/settings";
import type { DailyWrapStatsSnapshot } from "@/types/atlas";
import {
  buildTaskXPMessage,
  calculateTodayStats,
  groupTasksTodayV2,
  todayISO,
  type AtlasTask,
  useTasks,
  useDailyPlan,
  derivePlanStatus,
} from "@/lib/tasks";
import { useXP } from "@/lib/xp";
import { useWorkItems, useClients, getWorkItemsDueToday, calculateWorkXP } from "@/lib/work";
import { useTransactions } from "@/lib/finances";
import { useWorkoutLogs } from "@/lib/gym";
import { useNotes } from "@/lib/notes";
import {
  useDailyWraps,
  getTodayTaskStats,
  getTodayWorkStats,
  getTodayFinanceStats,
  getTodayGymStats,
  getTodayAcademicStats,
  getTodayNotesStats,
  getTodayXPStats,
  getTomorrowDeadlineStats,
  getOverdueStats,
  generateDailyWrapSummary,
} from "@/lib/dailyWraps";
import { getLanguageLocale, t } from "@/lib/i18n";

const sectionLabelKeys: Record<string, string> = {
  scheduled: "today.section.scheduled",
  priorityFocus: "today.section.priorityFocus",
  quickWins: "today.section.quickWins",
  remaining: "today.section.remaining",
  backlog: "today.section.backlog",
};

export function TodayPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const activeFocusTaskId = useStoredValue<string | null>(
    ATLAS_STORAGE_KEYS.focusTask,
    null
  );
  const setActiveFocusTaskId = (id: string | null) => writeToStorage(ATLAS_STORAGE_KEYS.focusTask, id);
  const [isCompletingFocusTask, setIsCompletingFocusTask] = useState(false);
  const [focusCompletionNotes, setFocusCompletionNotes] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const { reviews } = useWeeklyReviews();
  const { settings, setDayMode } = useAtlasSettings();
  const language = settings.language;
  const dayMode = settings.dayMode;
  const xp = useXP();
  const { workItems, completeWorkItem: finishWorkItem } = useWorkItems();
  const { clients } = useClients();
  const today = todayISO();
  const stats = calculateTodayStats(tasks, today);
  const sections = groupTasksTodayV2(tasks, today, dayMode);
  const showReviewReminder = shouldShowReviewReminder(reviews);

  const focusedTask = useMemo(() => {
    if (!activeFocusTaskId) return null;
    const task = tasks.find((t) => t.id === activeFocusTaskId);
    if (!task || task.status === "completed" || task.status === "skipped") return null;
    return task;
  }, [tasks, activeFocusTaskId]);

  const displaySections = useMemo(() => {
    if (!focusedTask) return sections;
    const s = { ...sections };
    for (const key of Object.keys(s) as Array<keyof typeof s>) {
      s[key] = s[key].filter((t) => t.id !== focusedTask.id);
    }
    return s;
  }, [sections, focusedTask]);

  const { isCompletedToday, completeDailyPlanning } = useDailyPlan();
  const currentPlanStatus = useMemo(() => {
    return derivePlanStatus(tasks, today);
  }, [tasks, today]);

  const { transactions } = useTransactions();
  const { workouts } = useWorkoutLogs();
  const { notes } = useNotes();
  const { getDailyWrapForDate, saveDailyWrap } = useDailyWraps();

  const todayWrap = getDailyWrapForDate(today);

  // Lazy initializer helpers
  const calculateLiveSnapshot = useMemo(() => {
    return () => {
      const taskStats = getTodayTaskStats(tasks, today);
      const workStats = getTodayWorkStats(workItems, today);
      const financeStats = getTodayFinanceStats(transactions, today, settings);
      const gymStats = getTodayGymStats(workouts, today);
      const academicStats = getTodayAcademicStats(tasks, today);
      const notesStats = getTodayNotesStats(notes, today);
      const xpStats = getTodayXPStats(xp.activity || [], today);
      const tomorrowDeadlines = getTomorrowDeadlineStats(tasks, today);
      const overdueStats = getOverdueStats(tasks, today);

      const snapshot = {
        ...taskStats,
        ...workStats,
        ...financeStats,
        ...gymStats,
        ...academicStats,
        ...notesStats,
        ...xpStats,
        ...tomorrowDeadlines,
        ...overdueStats,
      };

      const summary = generateDailyWrapSummary(snapshot, language);
      return { snapshot, summary };
    };
  }, [tasks, workItems, transactions, workouts, notes, settings, xp.activity, today, language]);

  // Initial States Setup via Mount-Time Closures
  const [statsSnapshot, setStatsSnapshot] = useState<DailyWrapStatsSnapshot>(() => {
    const saved = getDailyWrapForDate(todayISO());
    if (saved) return saved.statsSnapshot;
    
    const taskStats = getTodayTaskStats(tasks, todayISO());
    const workStats = getTodayWorkStats(workItems, todayISO());
    const financeStats = getTodayFinanceStats(transactions, todayISO(), settings);
    const gymStats = getTodayGymStats(workouts, todayISO());
    const academicStats = getTodayAcademicStats(tasks, todayISO());
    const notesStats = getTodayNotesStats(notes, todayISO());
    const xpStats = getTodayXPStats(xp.activity || [], todayISO());
    const tomorrowDeadlines = getTomorrowDeadlineStats(tasks, todayISO());
    const overdueStats = getOverdueStats(tasks, todayISO());

    return {
      ...taskStats,
      ...workStats,
      ...financeStats,
      ...gymStats,
      ...academicStats,
      ...notesStats,
      ...xpStats,
      ...tomorrowDeadlines,
      ...overdueStats,
    };
  });

  const [generatedSummary, setGeneratedSummary] = useState<string>(() => {
    const saved = getDailyWrapForDate(todayISO());
    if (saved) return saved.generatedSummary;

    const taskStats = getTodayTaskStats(tasks, todayISO());
    const workStats = getTodayWorkStats(workItems, todayISO());
    const financeStats = getTodayFinanceStats(transactions, todayISO(), settings);
    const gymStats = getTodayGymStats(workouts, todayISO());
    const academicStats = getTodayAcademicStats(tasks, todayISO());
    const notesStats = getTodayNotesStats(notes, todayISO());
    const xpStats = getTodayXPStats(xp.activity || [], todayISO());
    const tomorrowDeadlines = getTomorrowDeadlineStats(tasks, todayISO());
    const overdueStats = getOverdueStats(tasks, todayISO());

    const snapshot = {
      ...taskStats,
      ...workStats,
      ...financeStats,
      ...gymStats,
      ...academicStats,
      ...notesStats,
      ...xpStats,
      ...tomorrowDeadlines,
      ...overdueStats,
    };

    return generateDailyWrapSummary(snapshot, language);
  });

  const displayGeneratedSummary = useMemo(() => {
    return statsSnapshot
      ? generateDailyWrapSummary(statsSnapshot, language)
      : generatedSummary;
  }, [generatedSummary, language, statsSnapshot]);

  const [mood, setMood] = useState<number>(() => {
    const saved = getDailyWrapForDate(todayISO());
    return saved?.mood ?? 7;
  });

  const [energy, setEnergy] = useState<number>(() => {
    const saved = getDailyWrapForDate(todayISO());
    return saved?.energy ?? 7;
  });

  const [productivity, setProductivity] = useState<number>(() => {
    const saved = getDailyWrapForDate(todayISO());
    return saved?.productivity ?? 7;
  });

  const [mainTakeaway, setMainTakeaway] = useState<string>(() => {
    const saved = getDailyWrapForDate(todayISO());
    return saved?.mainTakeaway ?? "";
  });

  const [tomorrowFocus, setTomorrowFocus] = useState<string>(() => {
    const saved = getDailyWrapForDate(todayISO());
    return saved?.tomorrowFocus ?? "";
  });

  const [reflectionNotes, setReflectionNotes] = useState<string>(() => {
    const saved = getDailyWrapForDate(todayISO());
    return saved?.notes ?? "";
  });

  const [successWrapMessage, setSuccessWrapMessage] = useState("");

  function handleRefreshSummary() {
    const live = calculateLiveSnapshot();
    setStatsSnapshot(live.snapshot);
    setGeneratedSummary(live.summary);
  }

  function handleCompleteWrap(e: React.FormEvent) {
    e.preventDefault();
    if (!statsSnapshot) return;

    saveDailyWrap(
      today,
      displayGeneratedSummary,
      statsSnapshot,
      {
        mood,
        energy,
        productivity,
        mainTakeaway: mainTakeaway.trim(),
        tomorrowFocus: tomorrowFocus.trim(),
        notes: reflectionNotes.trim(),
      },
      () => {
        xp.awardXP("daily-wrap-completed", {
          amount: 20,
          label: "Completed daily wrap for " + today,
        });
      }
    );
    setSuccessWrapMessage(t(language, "today.wrap.saved"));
    setTimeout(() => setSuccessWrapMessage(""), 4000);
  }

  const todayWorkItems = useMemo(() => {
    return getWorkItemsDueToday(workItems, today);
  }, [workItems, today]);

  function startTask(task: AtlasTask) {
    updateTask(task.id, { status: "in_progress", plannedDate: today });
  }

  function completeTask(task: AtlasTask, completionNotes?: string) {
    if (activeFocusTaskId === task.id) {
      setActiveFocusTaskId(null);
      setIsCompletingFocusTask(false);
      setFocusCompletionNotes("");
    }
    updateTask(task.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      ...(completionNotes ? { completionNotes } : {}),
    });
    xp.awardXP("task-completed", {
      amount: task.xpReward,
      label: buildTaskXPMessage(task),
    });
  }

  function skipTask(task: AtlasTask) {
    if (activeFocusTaskId === task.id) setActiveFocusTaskId(null);
    updateTask(task.id, { status: "skipped" });
  }

  function handleDeleteTask(task: AtlasTask) {
    if (activeFocusTaskId === task.id) setActiveFocusTaskId(null);
    deleteTask(task.id);
  }

  function moveToday(task: AtlasTask) {
    updateTask(task.id, { status: "today", plannedDate: today });
  }

  function rescheduleTomorrow(task: AtlasTask) {
    if (activeFocusTaskId === task.id) setActiveFocusTaskId(null);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    updateTask(task.id, { plannedDate: tomorrow.toISOString().slice(0, 10) });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C8A96A]">
            {t(language, "today.eyebrow")}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            {t(language, "today.title")}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
              {hasMounted ? new Intl.DateTimeFormat(getLanguageLocale(language), {
                timeZone: "America/Asuncion",
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(new Date()) : ""}
            </p>
            <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${
              isCompletedToday
                ? "bg-[#8A9A5B]/10 border-[#8A9A5B]/25 text-[#9AAB6B]"
                : currentPlanStatus === "in_progress"
                ? "bg-[#C8A96A]/10 border-[#C8A96A]/25 text-[#C8A96A]"
                : currentPlanStatus === "planned"
                ? "bg-[#6F8799]/10 border-[#6F8799]/25 text-[#7F97A9]"
                : "bg-zinc-800 border-[#27272a] text-zinc-400"
            }`}>
              {isCompletedToday 
                ? t(language, "today.planningComplete") 
                : t(language, `today.status.${currentPlanStatus}`, currentPlanStatus.replace("_", " "))}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={dayMode}
            onChange={(event) => setDayMode(event.target.value as DayMode)}
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 focus:outline-none"
          >
            {DAY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(language, `enum.dayMode.${mode}`, mode)}
              </option>
            ))}
          </select>
          
          <button
            type="button"
            onClick={() =>
              downloadTodayPlanMarkdown({
                date: today,
                dayMode,
                dailyLoad: stats.dailyLoad,
                plannedCount: stats.plannedCount,
                completedTodayCount: stats.completedTodayCount,
                estimatedMinutesRemaining: stats.estimatedMinutesRemaining,
                xpAvailableToday: stats.xpAvailableToday,
                sections,
              })
            }
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {t(language, "today.exportPlan")}
          </button>

          {!isCompletedToday && (currentPlanStatus === "planned" || currentPlanStatus === "in_progress") && (
            <button
              type="button"
              onClick={() => {
                if (completeDailyPlanning()) {
                  xp.awardXP("daily-planning-completed", {
                    amount: 25,
                    label: "Completed daily planning",
                  });
                }
              }}
              className="rounded-lg bg-[#8A9A5B] hover:bg-[#9AAB6B] text-zinc-950 px-4 py-2 text-xs font-bold uppercase tracking-wider transition"
            >
              {t(language, "today.completePlanning")}
            </button>
          )}

          <Link
            href="/"
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {t(language, "common.dashboard")}
          </Link>
        </div>
      </header>

      {/* Main Section */}
      <section className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr] items-start">
        {/* Left Column: Quick Add and Stats */}
        <aside className="grid gap-6 content-start">
          <TaskQuickAddForm onAddTask={addTask} />
          
          {/* Today Stats */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">{t(language, "today.stats.title")}</h3>
            <p className="text-[10px] text-zinc-500 mt-1">{t(language, "today.stats.description")}</p>
            
            <div className="mt-4 grid gap-3">
              {[
                [t(language, "today.stats.planned"), stats.plannedCount],
                [t(language, "today.stats.completed"), stats.completedTodayCount],
                [t(language, "today.stats.minutes"), `${stats.estimatedMinutesRemaining}m`],
                [t(language, "today.stats.xp"), `+${stats.xpAvailableToday} XP`],
                [t(language, "today.stats.load"), stats.dailyLoad],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg border border-[#27272a]/60 bg-[#121214] px-4 py-3.5 text-xs transition hover:border-[#27272a]"
                >
                  <span className="text-zinc-400 font-semibold">{label}</span>
                  <span className="font-bold text-zinc-150">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column: Active Task Streams */}
        <div className="grid gap-6">
          {showReviewReminder && (
            <section className="rounded-xl border border-[#C8A96A]/30 bg-[#C8A96A]/5 p-5 shadow-lg flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#C8A96A] uppercase tracking-wide">
                  {t(language, "today.review.pending")}
                </p>
                <p className="mt-1 text-xs text-zinc-350 leading-relaxed">
                  {t(language, "today.review.description")}
                </p>
              </div>
              <Link
                href="/review"
                className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition shrink-0"
              >
                {t(language, "today.review.launch")} &rarr;
              </Link>
            </section>
          )}

          {focusedTask && (
            <section className="rounded-xl border border-[#C8A96A]/40 bg-[#121214] p-5 shadow-lg flex flex-col gap-4 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#C8A96A] uppercase tracking-wide">
                    {t(language, "today.focus.title", "Current Focus")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-300">
                    {t(language, "today.focus.empty", "Pick one task to focus on.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFocusTaskId(null)}
                  className="rounded-lg border border-[#27272a] bg-[#1a1a1e] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
                >
                  {t(language, "today.focus.clear", "Clear Focus")}
                </button>
              </div>
              <div className="rounded-lg bg-[#C8A96A]/5 border border-[#C8A96A]/20 p-4">
                {isCompletingFocusTask ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm font-bold text-zinc-100">
                      {t(language, "today.focus.completePrompt", "What did you complete?")}
                    </p>
                    <textarea
                      value={focusCompletionNotes}
                      onChange={(e) => setFocusCompletionNotes(e.target.value)}
                      placeholder={t(language, "today.focus.notesPlaceholder", "Optional completion notes...")}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#C8A96A]/50 focus:outline-none focus:ring-1 focus:ring-[#C8A96A]/50 min-h-[100px] resize-y"
                    />
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider pt-2 border-t border-[#C8A96A]/10">
                      <button
                        type="button"
                        onClick={() => completeTask(focusedTask, focusCompletionNotes.trim())}
                        className="rounded-lg bg-[#8A9A5B] text-zinc-950 px-3.5 py-2 transition hover:bg-[#9BAB6C] active:scale-95"
                      >
                        {t(language, "today.focus.finishTask", "Finish task")}
                      </button>
                      <button
                        type="button"
                        onClick={() => completeTask(focusedTask)}
                        className="rounded-lg border border-[#8A9A5B]/30 bg-[#8A9A5B]/10 text-[#9BAB6C] px-3.5 py-2 transition hover:bg-[#8A9A5B]/20 active:scale-95"
                      >
                        {t(language, "today.focus.finishWithoutNotes", "Finish without notes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCompletingFocusTask(false)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-300 transition hover:bg-zinc-800 active:scale-95 ml-auto"
                      >
                        {t(language, "today.focus.back", "Back")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        focusedTask.priority === "critical" || focusedTask.priority === "high" 
                          ? "text-[#C27A6B]" 
                          : "text-zinc-500"
                      }`}>
                        {t(language, `enum.priority.${focusedTask.priority}`, focusedTask.priority)}
                      </span>
                      {focusedTask.estimatedMinutes ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F8799]">
                          &middot; {focusedTask.estimatedMinutes} {t(language, "common.minutes")}
                        </span>
                      ) : null}
                      {focusedTask.scheduledTime ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F8799]">
                          &middot; {focusedTask.scheduledTime}
                        </span>
                      ) : null}
                    </div>
                    <h4 className="text-xl font-bold text-zinc-100">{focusedTask.title}</h4>
                    {focusedTask.description && (
                      <p className="mt-2 text-sm text-zinc-400 whitespace-pre-wrap">{focusedTask.description}</p>
                    )}
                    
                    <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider pt-4 border-t border-[#C8A96A]/10">
                      <button
                        type="button"
                        onClick={() => setIsCompletingFocusTask(true)}
                        className="rounded-lg bg-[#8A9A5B] text-zinc-950 px-3.5 py-2 transition hover:bg-[#9BAB6C] active:scale-95"
                      >
                        {t(language, "today.focus.markDone", "Mark done")}
                      </button>
                      <button
                        type="button"
                        onClick={() => skipTask(focusedTask)}
                        className="rounded-lg border border-[#B26A5B]/30 bg-[#B26A5B]/10 px-3.5 py-2 text-[#C27A6B] transition hover:bg-[#B26A5B]/20 active:scale-95"
                      >
                        {t(language, "task.skip")}
                      </button>
                      <button
                        type="button"
                        onClick={() => rescheduleTomorrow(focusedTask)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
                      >
                        {t(language, "task.rescheduleTomorrow")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {displaySections.overdue.length > 0 && (
            <section className="rounded-xl border border-[#B26A5B]/30 bg-[#B26A5B]/10 p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#C27A6B] uppercase tracking-wide">
                    {t(language, "today.overdue.alert")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                    {t(language, "today.overdue.description", "{n} tarea(s) atrasada(s) necesitan atención").replace("{n}", displaySections.overdue.length.toString())}
                  </p>
                </div>
                <span className="rounded-full bg-[#B26A5B]/20 border border-[#B26A5B]/40 px-3 py-1 text-xs font-bold text-[#C27A6B]">
                  {displaySections.overdue.length}
                </span>
              </div>
              <div className="grid gap-3 mt-2">
                {displaySections.overdue.slice(0, 3).map((task) => (
                  <TaskCard
                    key={`overdue-${task.id}`}
                    task={task}
                    isOverdue={true}
                    onStart={startTask}
                    onComplete={completeTask}
                    onSkip={skipTask}
                    onMoveToday={moveToday}
                    onRescheduleTomorrow={rescheduleTomorrow}
                    onDelete={handleDeleteTask}
                    onFocus={(t) => setActiveFocusTaskId(t.id)}
                  />
                ))}
                {displaySections.overdue.length > 3 && (
                  <p className="text-xs text-[#C27A6B] font-bold italic text-center mt-2">
                    + {displaySections.overdue.length - 3} {t(language, "today.overdue.more", "more tasks not shown")}
                  </p>
                )}
              </div>
            </section>
          )}

          {[
            { key: "scheduled", tasks: displaySections.scheduled },
            { key: "priorityFocus", tasks: displaySections.priorityFocus },
            { key: "quickWins", tasks: displaySections.quickWins },
            { key: "remaining", tasks: displaySections.remaining },
            { key: "backlog", tasks: displaySections.backlog },
          ].map(({ key: sectionKey, tasks: sectionTasks }) => (
            <section
              key={sectionKey}
              className="rounded-xl border border-[#27272a] bg-[#18181b]/60 p-5 shadow-lg"
            >
              <div className="flex items-center justify-between gap-4 border-b border-[#27272a]/60 pb-2.5 mb-4">
                <h3 className="text-base font-bold text-zinc-100">
                  {t(language, sectionLabelKeys[sectionKey] || `today.section.${sectionKey}`)}
                </h3>
                <span className="rounded-full bg-[#18181b] border border-[#27272a] px-2.5 py-0.5 text-xs font-bold text-[#C8A96A]">
                  {sectionTasks.length + (sectionKey === "remaining" ? todayWorkItems.length : 0)}
                </span>
              </div>

              <div className="grid gap-3">
                {/* Special Inline Work Items for Remaining Section */}
                {sectionKey === "remaining" && todayWorkItems.length > 0 && (
                  <div className="flex flex-col gap-3 mb-3 border-b border-[#27272a]/80 pb-4">
                    <p className="text-[10px] font-bold text-[#C8A96A] uppercase tracking-widest leading-none mb-1">
                      {t(language, "today.work.dueToday")}
                    </p>
                    {todayWorkItems.map((item) => {
                      const clientName = clients.find((c) => c.id === item.clientId)?.name ?? t(language, "today.work.client");
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-2 rounded-lg border border-[#27272a] bg-[#121214]/65 px-4 py-3.5 text-xs shadow-md"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[9px] font-bold text-[#C8A96A] uppercase tracking-wider">
                                  {clientName} &middot; {item.type}
                                </span>
                                <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[8px] font-bold text-zinc-400 uppercase tracking-wider border border-[#27272a]">
                                  {item.status.replace("_", " ")}
                                </span>
                                <span className={`text-[8px] font-bold uppercase ${
                                  item.priority === "critical" || item.priority === "high" ? "text-[#C27A6B]" : "text-zinc-500"
                                }`}>
                                  {t(language, `enum.priority.${item.priority}`, item.priority)}
                                </span>
                              </div>
                              <h4 className="font-bold text-zinc-150 mt-1">{item.title}</h4>
                              
                              {/* Metadata indicators */}
                              <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-zinc-500 font-medium">
                                {item.deadline && (
                                  <span className={item.deadline < today ? "text-[#C27A6B] font-bold" : "text-zinc-400"}>
                                    📅 {t(language, "today.work.deadline")}: {item.deadline} {item.deadline < today && `(${t(language, "common.overdue")})`}
                                  </span>
                                )}
                                {item.estimatedMinutes && (
                                  <span>⏱️ {item.estimatedMinutes} mins</span>
                                )}
                              </div>

                              {item.description && (
                                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{item.description}</p>
                              )}

                              {item.referenceUrl && (
                                <a
                                  href={item.referenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C8A96A] hover:text-[#D4B87A] transition hover:underline mt-2.5 cursor-pointer"
                                >
                                  🔗 {t(language, "today.work.openReference")}
                                </a>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const isAlreadyAwarded = item.xpAwarded;
                                finishWorkItem(item.id);
                                if (!isAlreadyAwarded) {
                                  const xpReward = calculateWorkXP(item);
                                  xp.awardXP("work-item-completed", {
                                    amount: xpReward.amount,
                                    label: xpReward.label,
                                  });
                                }
                              }}
                              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-[#27272a] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition shrink-0 cursor-pointer"
                            >
                              {t(language, "task.complete")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {sectionTasks.length > 0 ? (
                  sectionTasks.map((task) => (
                    <TaskCard
                      key={`${sectionKey}-${task.id}`}
                      task={task}
                      onStart={startTask}
                      onComplete={completeTask}
                      onSkip={skipTask}
                      onMoveToday={moveToday}
                      onRescheduleTomorrow={rescheduleTomorrow}
                      onDelete={handleDeleteTask}
                      onFocus={(t) => setActiveFocusTaskId(t.id)}
                    />
                  ))
                ) : todayWorkItems.length === 0 || sectionKey !== "remaining" ? (
                  <p className="text-xs text-zinc-550 italic py-4 bg-[#121214]/10 rounded-lg border border-dashed border-[#27272a]/60 text-center">
                    {t(language, "today.task.empty")}
                  </p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </section>

      {/* Daily Wrap Closing Reflection Flow */}
      <section className="mt-12 border-t border-[#27272a] pt-8 pb-12">
        {isCompletedToday ? (
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#27272a] pb-4 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {t(language, "today.wrap.eyebrow")}
                </p>
                <h2 className="text-2xl font-bold text-zinc-100 mt-1">
                  {t(language, "today.wrap.title")}
                </h2>
              </div>
              <div className="flex gap-2">
                {todayWrap && (
                  <span className="rounded-full bg-[#8A9A5B]/10 border border-[#8A9A5B]/30 px-3.5 py-1 text-xs font-bold text-[#9AAB6B] flex items-center gap-1.5">
                    <span>✓</span> {t(language, "today.wrap.logged")}
                  </span>
                )}
                {!todayWrap && (
                  <button
                    onClick={handleRefreshSummary}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800"
                  >
                    {t(language, "today.wrap.refresh")}
                  </button>
                )}
              </div>
            </div>

            {successWrapMessage && (
              <div className="mb-6 p-4 rounded-xl bg-[#8A9A5B]/10 border border-[#8A9A5B]/30 text-[#9AAB6B] text-sm font-semibold flex items-center gap-2">
                <span>✓</span> {successWrapMessage}
              </div>
            )}

            {/* 1. Generated summary digest */}
            <div className="rounded-lg border border-[#C8A96A]/20 bg-[#C8A96A]/5 p-4.5 mb-6 leading-relaxed">
              <p className="text-[9px] font-bold text-[#C8A96A] uppercase tracking-widest mb-1.5">
                {t(language, "today.wrap.digest")}
              </p>
              <p className="text-sm font-semibold text-zinc-200">
                {displayGeneratedSummary || t(language, "today.wrap.noActivity")}
              </p>
            </div>

            {/* 2. Today stats snapshot grid */}
            {statsSnapshot && (
              <div className="mb-8">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
                  {t(language, "today.wrap.snapshots")}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { label: t(language, "today.wrap.tasks"), val: `${statsSnapshot.completedTasks}/${statsSnapshot.plannedTasks}` },
                    { label: t(language, "today.wrap.freelance"), val: `${statsSnapshot.completedWorkItems} ${t(language, "today.wrap.done")}` },
                    { label: t(language, "today.wrap.gymStatus"), val: statsSnapshot.gymLogged ? `✓ ${statsSnapshot.workoutType ?? t(language, "today.wrap.active")}` : t(language, "today.wrap.restDay") },
                    { label: t(language, "today.wrap.cashFlow"), val: statsSnapshot.dailyExpenses > 0 ? `${settings.baseCurrency} ${statsSnapshot.dailyExpenses.toLocaleString()}` : `0 ${t(language, "today.wrap.spent")}` },
                    { label: t(language, "today.wrap.notesBase"), val: `${statsSnapshot.notesCreated} ${t(language, "today.wrap.captured")}` },
                    { label: t(language, "today.wrap.momentum"), val: `+${statsSnapshot.xpEarnedToday} XP` },
                    { label: t(language, "today.wrap.tomorrowDue"), val: `${statsSnapshot.upcomingDeadlinesTomorrow}` },
                  ].map((stat, idx) => (
                    <div key={idx} className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-center">
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider truncate">
                        {stat.label}
                      </span>
                      <span className="block text-sm font-black text-zinc-200 mt-1 font-mono">
                        {stat.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Reflection Inputs Form */}
            <form onSubmit={handleCompleteWrap} className="grid gap-6">
              <div className="grid gap-5 sm:grid-cols-3">
                {/* Mood Slider */}
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4.5 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    <span>{t(language, "today.wrap.dayMood")}</span>
                    <span className="text-sm font-bold text-[#C8A96A]">{mood}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={mood}
                    onChange={(e) => setMood(Number(e.target.value))}
                    className="accent-[#C8A96A] cursor-pointer"
                  />
                </div>

                {/* Energy Slider */}
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4.5 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    <span>{t(language, "today.wrap.energyLevel")}</span>
                    <span className="text-sm font-bold text-[#C8A96A]">{energy}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={energy}
                    onChange={(e) => setEnergy(Number(e.target.value))}
                    className="accent-[#C8A96A] cursor-pointer"
                  />
                </div>

                {/* Productivity Slider */}
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4.5 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    <span>{t(language, "today.wrap.productivity")}</span>
                    <span className="text-sm font-bold text-[#C8A96A]">{productivity}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={productivity}
                    onChange={(e) => setProductivity(Number(e.target.value))}
                    className="accent-[#C8A96A] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t(language, "today.wrap.takeaway")}
                  <input
                    placeholder={t(language, "today.wrap.takeawayPlaceholder")}
                    value={mainTakeaway}
                    onChange={(e) => setMainTakeaway(e.target.value)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-150 text-xs focus:border-[#C8A96A] focus:outline-none"
                  />
                </label>

                <label className="grid gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t(language, "today.wrap.tomorrowFocus")}
                  <input
                    placeholder={t(language, "today.wrap.tomorrowFocusPlaceholder")}
                    value={tomorrowFocus}
                    onChange={(e) => setTomorrowFocus(e.target.value)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-150 text-xs focus:border-[#C8A96A] focus:outline-none"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {t(language, "today.wrap.qualitative")}
                <textarea
                  placeholder={t(language, "today.wrap.qualitativePlaceholder")}
                  rows={3}
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-150 text-xs focus:border-[#C8A96A] focus:outline-none placeholder:text-zinc-650"
                />
              </label>

              <button
                type="submit"
                className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition w-full shadow-md"
              >
                {todayWrap ? t(language, "today.wrap.update") : t(language, "today.wrap.closeSave")}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-xl border border-[#27272a] bg-[#18181b]/40 p-10 shadow-xl text-center">
            <span className="text-3xl">🔒</span>
            <h3 className="mt-3 text-lg font-bold text-zinc-350">{t(language, "today.wrap.locked")}</h3>
            <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
              {t(language, "today.wrap.lockedDescription")}
            </p>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="mt-5 rounded-lg border border-[#C8A96A]/30 bg-[#C8A96A]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#C8A96A] hover:bg-[#C8A96A]/15 transition cursor-pointer"
            >
              {t(language, "today.wrap.startPlanning")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

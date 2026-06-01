"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TasksCloudPanel } from "@/components/TasksCloudPanel";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskQuickAddForm } from "@/components/tasks/TaskQuickAddForm";
import { downloadTodayPlanMarkdown } from "@/lib/markdownExport";
import { shouldShowReviewReminder, useWeeklyReviews } from "@/lib/reviews";
import { DAY_MODES, useAtlasSettings, type DayMode } from "@/lib/settings";
import type { DailyWrapStatsSnapshot } from "@/types/atlas";
import {
  buildTaskXPMessage,
  calculateTodayStats,
  groupTasksForToday,
  todayISO,
  type AtlasTask,
  type TaskSection,
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

const sectionLabelKeys: Record<TaskSection, string> = {
  priorityFocus: "today.section.priorityFocus",
  quickWins: "today.section.quickWins",
  academic: "today.section.academic",
  work: "today.section.work",
  personal: "today.section.personal",
  backlog: "today.section.backlog",
};

export function TodayPage() {
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
  const sections = groupTasksForToday(tasks, today);
  const showReviewReminder = shouldShowReviewReminder(reviews);

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

  function completeTask(task: AtlasTask) {
    updateTask(task.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    xp.awardXP("task-completed", {
      amount: task.xpReward,
      label: buildTaskXPMessage(task),
    });
  }

  function skipTask(task: AtlasTask) {
    updateTask(task.id, { status: "skipped" });
  }

  function moveToday(task: AtlasTask) {
    updateTask(task.id, { status: "today", plannedDate: today });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            {t(language, "today.eyebrow")}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            {t(language, "today.title")}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
              {new Intl.DateTimeFormat(getLanguageLocale(language), {
                timeZone: "America/Asuncion",
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(new Date())}
            </p>
            <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${
              isCompletedToday
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : currentPlanStatus === "in_progress"
                ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                : currentPlanStatus === "planned"
                ? "bg-blue-500/10 border-blue-500/25 text-blue-400"
                : "bg-zinc-800 border-[#27272a] text-zinc-400"
            }`}>
              {isCompletedToday ? t(language, "today.planningComplete") : currentPlanStatus.replace("_", " ")}
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
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2 text-xs font-bold uppercase tracking-wider transition"
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

      <TasksCloudPanel localTasks={tasks} />

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
            <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-lg flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-amber-500 uppercase tracking-wide">
                  {t(language, "today.review.pending")}
                </p>
                <p className="mt-1 text-xs text-zinc-350 leading-relaxed">
                  {t(language, "today.review.description")}
                </p>
              </div>
              <Link
                href="/review"
                className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition shrink-0"
              >
                {t(language, "today.review.launch")} &rarr;
              </Link>
            </section>
          )}

          {Object.entries(sections).map(([sectionKey, sectionTasks]) => (
            <section
              key={sectionKey}
              className="rounded-xl border border-[#27272a] bg-[#18181b]/60 p-5 shadow-lg"
            >
              <div className="flex items-center justify-between gap-4 border-b border-[#27272a]/60 pb-2.5 mb-4">
                <h3 className="text-base font-bold text-zinc-100">
                  {t(language, sectionLabelKeys[sectionKey as TaskSection])}
                </h3>
                <span className="rounded-full bg-[#18181b] border border-[#27272a] px-2.5 py-0.5 text-xs font-bold text-amber-500">
                  {sectionTasks.length + (sectionKey === "work" ? todayWorkItems.length : 0)}
                </span>
              </div>

              <div className="grid gap-3">
                {/* Special Inline Work Items for Work Section */}
                {sectionKey === "work" && todayWorkItems.length > 0 && (
                  <div className="flex flex-col gap-3 mb-3 border-b border-[#27272a]/80 pb-4">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none mb-1">
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
                                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                                  {clientName} &middot; {item.type}
                                </span>
                                <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[8px] font-bold text-zinc-400 uppercase tracking-wider border border-[#27272a]">
                                  {item.status.replace("_", " ")}
                                </span>
                                <span className={`text-[8px] font-bold uppercase ${
                                  item.priority === "critical" || item.priority === "high" ? "text-red-400" : "text-zinc-500"
                                }`}>
                                  {t(language, `enum.priority.${item.priority}`, item.priority)}
                                </span>
                              </div>
                              <h4 className="font-bold text-zinc-150 mt-1">{item.title}</h4>
                              
                              {/* Metadata indicators */}
                              <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-zinc-500 font-medium">
                                {item.deadline && (
                                  <span className={item.deadline < today ? "text-red-400 font-bold" : "text-zinc-400"}>
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
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 hover:text-amber-400 transition hover:underline mt-2.5 cursor-pointer"
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
                      onDelete={(selectedTask) => deleteTask(selectedTask.id)}
                    />
                  ))
                ) : todayWorkItems.length === 0 || sectionKey !== "work" ? (
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
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
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
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2">
                <span>✓</span> {successWrapMessage}
              </div>
            )}

            {/* 1. Generated summary digest */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4.5 mb-6 leading-relaxed">
              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">
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
                    <span className="text-sm font-bold text-amber-500">{mood}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={mood}
                    onChange={(e) => setMood(Number(e.target.value))}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Energy Slider */}
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4.5 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    <span>{t(language, "today.wrap.energyLevel")}</span>
                    <span className="text-sm font-bold text-amber-500">{energy}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={energy}
                    onChange={(e) => setEnergy(Number(e.target.value))}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Productivity Slider */}
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4.5 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    <span>{t(language, "today.wrap.productivity")}</span>
                    <span className="text-sm font-bold text-amber-500">{productivity}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={productivity}
                    onChange={(e) => setProductivity(Number(e.target.value))}
                    className="accent-amber-500 cursor-pointer"
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
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-150 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </label>

                <label className="grid gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t(language, "today.wrap.tomorrowFocus")}
                  <input
                    placeholder={t(language, "today.wrap.tomorrowFocusPlaceholder")}
                    value={tomorrowFocus}
                    onChange={(e) => setTomorrowFocus(e.target.value)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-150 text-xs focus:border-amber-500 focus:outline-none"
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
                  className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-150 text-xs focus:border-amber-500 focus:outline-none placeholder:text-zinc-650"
                />
              </label>

              <button
                type="submit"
                className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition w-full shadow-lg"
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
              className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-500 hover:bg-amber-500/15 transition cursor-pointer"
            >
              {t(language, "today.wrap.startPlanning")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

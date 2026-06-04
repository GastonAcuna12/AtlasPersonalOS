/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { XPProgress } from "@/components/shared/XPProgress";

import { useWeeklyReviews } from "@/lib/reviews";
import { useTasks, useDailyPlan, derivePlanStatus, todayISO, isTaskForToday } from "@/lib/tasks";
import { XP_RULES, useXP } from "@/lib/xp";
import {
  useTransactions,
  calculateFinanceOverview,
  calculateUpcomingCommitments,
  formatMoney,
  useSavings,
  usePlannedExpenses,
  getCurrentMonth,
  getUpcomingPlannedExpenses,
  useFinanceBudgets,
  calculateBudgetSummaryForMonth,
  useFinanceAccounts,
} from "@/lib/finances";
import { useWorkoutLogs, calculateGymOverview } from "@/lib/gym";
import {
  useGoals,
  getTopActiveGoals,
  getGoalProgress,
  getDailyHabitDashboardSummary,
  getHabitGoalStats,
  isDailyHabitGoal,
  calculateFinancialGoalPlan,
} from "@/lib/goals";
import { useAtlasSettings } from "@/lib/settings";
import { useClients, useWorkItems, getWorkItemsDueToday } from "@/lib/work";
import { getPriorityBriefing, getRelativeLabel } from "@/lib/dashboard";
import { useDailyWraps } from "@/lib/dailyWraps";
import { calculateStreak, calculateAtlasStreak } from "@/lib/streaks";
import { StreakBadge } from "@/components/shared/StreakBadge";
import { useNotes } from "@/lib/notes";
import { useStudySessions } from "@/lib/academics";
import { t } from "@/lib/i18n";
import { isModuleEnabled } from "@/lib/modules";
import type { AtlasModule } from "@/types/atlas";

const xpRuleKeys: { key: string; xp: number; module: AtlasModule }[] = [
  { key: "xp.rule.finance", xp: XP_RULES["finance-transaction"].amount, module: "finances" },
  { key: "xp.rule.workout", xp: XP_RULES["workout-log"].amount, module: "gym" },
  { key: "xp.rule.note", xp: XP_RULES["note-created"].amount, module: "notes" },
  { key: "xp.rule.task", xp: XP_RULES["task-completed"].amount, module: "today" },
  { key: "xp.rule.goal", xp: XP_RULES["goal-updated"].amount, module: "goals" },
  { key: "xp.rule.review", xp: XP_RULES["weekly-review-completed"].amount, module: "review" },
];

export function AtlasDashboard() {
  const xp = useXP();
  const { reviews } = useWeeklyReviews();
  const { tasks } = useTasks();

  const { transactions } = useTransactions();
  const { budgets } = useFinanceBudgets();
  const { savings } = useSavings();
  const { plannedExpenses } = usePlannedExpenses();
  const { workouts } = useWorkoutLogs();
  const { goals } = useGoals();
  const { settings } = useAtlasSettings();
  const { accounts } = useFinanceAccounts();
  const language = settings.language;
  const todayEnabled = isModuleEnabled(settings, "today");
  const workEnabled = isModuleEnabled(settings, "work");
  const financesEnabled = isModuleEnabled(settings, "finances");
  const gymEnabled = isModuleEnabled(settings, "gym");
  const goalsEnabled = isModuleEnabled(settings, "goals");
  const notesEnabled = isModuleEnabled(settings, "notes");
  const reviewEnabled = isModuleEnabled(settings, "review");
  const calendarEnabled = isModuleEnabled(settings, "calendar");
  const academicsEnabled = isModuleEnabled(settings, "academics");
  const { clients } = useClients();
  const { workItems } = useWorkItems();
  const { dailyWraps, getDailyWrapForDate } = useDailyWraps();
  const { notes } = useNotes();
  const { sessions: studySessions } = useStudySessions();

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const todayDate = useMemo(() => todayISO(), []);
  const todayWrap = useMemo(() => getDailyWrapForDate(todayDate), [getDailyWrapForDate, todayDate]);

  const { plans, isCompletedToday } = useDailyPlan();
  const currentPlanStatus = useMemo(() => {
    return derivePlanStatus(tasks);
  }, [tasks]);

  const todayWorkItems = useMemo(() => {
    return getWorkItemsDueToday(workItems, todayDate);
  }, [workItems, todayDate]);

  const financeOverview = useMemo(
    () =>
      calculateFinanceOverview(
        transactions,
        settings.baseCurrency,
        settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150,
        savings,
        getCurrentMonth(),
        accounts,
        settings.availableMoneyMode,
      ),
    [
      transactions,
      settings.baseCurrency,
      settings.usdToPygRate,
      settings.exchangeRateUsdToPyg,
      savings,
      accounts,
      settings.availableMoneyMode,
    ],
  );

  const currentMonthStr = useMemo(() => getCurrentMonth(), []);
  const budgetSummary = useMemo(() => {
    if (!financesEnabled) return null;
    return calculateBudgetSummaryForMonth(
      budgets,
      transactions,
      settings.baseCurrency ?? "PYG",
      settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150,
      currentMonthStr,
    );
  }, [budgets, transactions, settings.baseCurrency, settings.usdToPygRate, settings.exchangeRateUsdToPyg, financesEnabled, currentMonthStr]);

  const financeCommitments = useMemo(() => {
    return calculateUpcomingCommitments(
      plannedExpenses,
      financeOverview.availableMoney,
      settings.baseCurrency,
      settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150,
      todayDate
    );
  }, [plannedExpenses, financeOverview.availableMoney, settings.baseCurrency, settings.usdToPygRate, settings.exchangeRateUsdToPyg, todayDate]);

  const savingsRatio = financeOverview.totalBalance > 0 ? (financeOverview.savingsInBaseCurrency / financeOverview.totalBalance) : 0;
  let financeWarningMessage = "";
  let financeWarningType: "none" | "low" | "warning" | "danger" = "none";

  if (financeOverview.savingsInBaseCurrency > financeOverview.totalBalance) {
    financeWarningMessage = t(language, "dashboard.warning.savingsExceed");
    financeWarningType = "danger";
  } else if (financeOverview.availableMoney < 0) {
    financeWarningMessage = t(language, "dashboard.warning.availableNegative");
    financeWarningType = "danger";
  } else if (savingsRatio > 0.8) {
    financeWarningMessage = t(language, "dashboard.warning.mostReserved");
    financeWarningType = "warning";
  } else if (financeOverview.availableMoney > 0 && financeOverview.availableMoney < (settings.baseCurrency === "PYG" ? 500000 : 100)) {
    financeWarningMessage = t(language, "dashboard.warning.lowBalance");
    financeWarningType = "low";
  }

  const gymOverview = useMemo(() => {
    return calculateGymOverview(workouts);
  }, [workouts]);

  const habitSummary = useMemo(() => {
    return getDailyHabitDashboardSummary(goals, todayDate);
  }, [goals, todayDate]);

  const briefing = useMemo(() => {
    return getPriorityBriefing(
      tasks,
      workItems,
      goals,
      reviews,
      savings,
      settings.baseCurrency,
      settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150,
      todayDate
    );
  }, [tasks, workItems, goals, reviews, savings, settings.baseCurrency, settings.usdToPygRate, settings.exchangeRateUsdToPyg, todayDate]);

  const activeGoals = useMemo(() => {
    return getTopActiveGoals(goals, 3);
  }, [goals]);

  const gymStreak = gymOverview.currentStreak;
  const planningStreak = useMemo(() => {
    const completedPlanningDates = plans.filter((p) => p.status === "completed").map((p) => p.date);
    return calculateStreak(completedPlanningDates).current;
  }, [plans]);
  const wrapStreak = useMemo(() => {
    const wrapDates = dailyWraps.map((dw) => dw.date);
    return calculateStreak(wrapDates).current;
  }, [dailyWraps]);

  const atlasStreak = useMemo(() => {
    return calculateAtlasStreak(plans, dailyWraps, tasks, workItems, workouts, notes, transactions, studySessions);
  }, [plans, dailyWraps, tasks, workItems, workouts, notes, transactions, studySessions]);

  const xpRules = xpRuleKeys
    .filter((rule) => isModuleEnabled(settings, rule.module))
    .map((rule) => ({
      label: t(language, rule.key),
      xp: rule.xp,
    }));

  const planningBanner = useMemo(() => {
    if (isCompletedToday) {
      return {
        label: t(language, "dashboard.planning.completed.label"),
        text: t(language, "dashboard.planning.completed.text"),
        colorClass: "bg-[#8A9A5B]/10 border-[#8A9A5B]/30 text-[#9AAB6B]",
        btnClass: "border-[#8A9A5B]/30 bg-[#8A9A5B]/15 text-[#A8B582] hover:bg-[#8A9A5B]/25",
      };
    }
    if (currentPlanStatus === "in_progress" || currentPlanStatus === "planned") {
      return {
        label: t(language, "dashboard.planning.progress.label"),
        text: t(language, "dashboard.planning.progress.text"),
        colorClass: "bg-[#C8A96A]/10 border-[#C8A96A]/30 text-[#D4B87A]",
        btnClass: "border-[#C8A96A]/30 bg-[#C8A96A]/15 text-[#D4B87A] hover:bg-[#C8A96A]/25",
      };
    }
    return {
      label: t(language, "dashboard.planning.pending.label"),
      text: t(language, "dashboard.planning.pending.text"),
      colorClass: "bg-zinc-800/40 border-[#27272a] text-zinc-400",
      btnClass: "border-[#27272a] bg-zinc-800 hover:bg-zinc-700 text-zinc-200",
    };
  }, [isCompletedToday, currentPlanStatus, language]);

  const pendingTodayTasksCount = useMemo(() => {
    if (!todayEnabled) return 0;
    return tasks.filter((t) => t.area !== "Academic" && t.status !== "completed" && t.status !== "skipped" && isTaskForToday(t, todayDate)).length;
  }, [tasks, todayDate, todayEnabled]);

  const urgentPaymentsCount = useMemo(() => {
    if (!financesEnabled) return 0;
    return getUpcomingPlannedExpenses(plannedExpenses, todayDate, 3).length;
  }, [plannedExpenses, todayDate, financesEnabled]);

  const pendingHabitsCount = useMemo(() => {
    if (!goalsEnabled) return 0;
    return habitSummary.pendingToday;
  }, [habitSummary.pendingToday, goalsEnabled]);

  const pendingWorkCount = useMemo(() => {
    if (!workEnabled) return 0;
    return todayWorkItems.length;
  }, [todayWorkItems.length, workEnabled]);

  const pendingAcademicCount = useMemo(() => {
    if (!academicsEnabled) return 0;
    return tasks.filter((t) => t.area === "Academic" && t.status !== "completed" && t.status !== "skipped" && isTaskForToday(t, todayDate)).length;
  }, [tasks, todayDate, academicsEnabled]);

  const firstHabitNeedingAttention = useMemo(() => {
    if (!goalsEnabled) return null;
    const pendingList = goals
      .filter((g) => isDailyHabitGoal(g) && g.status === "active")
      .map((g) => ({ goal: g, stats: getHabitGoalStats(g, todayDate) }))
      .filter((h) => h.stats.todayStatus === "pending");
    return pendingList[0] ?? null;
  }, [goals, todayDate, goalsEnabled]);

  const upcomingAgendaSnapshot = useMemo(() => {
    const list: { id: string; title: string; type: "task" | "work" | "academic" | "finance" | "goal"; dueDate: string; amount?: string; }[] = [];
    if (todayEnabled || academicsEnabled) {
      tasks.forEach((t) => {
        if (!t.dueDate || t.status === "completed" || t.status === "skipped") return;
        const isAcademic = t.area === "Academic";
        if (isAcademic && !academicsEnabled) return;
        if (!isAcademic && !todayEnabled) return;
        list.push({ id: t.id, title: t.title, type: isAcademic ? "academic" : "task", dueDate: t.dueDate });
      });
    }
    if (workEnabled) {
      workItems.forEach((w) => {
        if (!w.deadline || w.status === "completed" || w.status === "archived") return;
        list.push({ id: w.id, title: w.title, type: "work", dueDate: w.deadline });
      });
    }
    if (goalsEnabled) {
      goals.forEach((g) => {
        if (isDailyHabitGoal(g) || !g.deadline || g.status !== "active") return;
        list.push({ id: g.id, title: g.title, type: "goal", dueDate: g.deadline });
      });
    }
    if (financesEnabled) {
      const occurrences = getUpcomingPlannedExpenses(plannedExpenses, todayDate, 30);
      occurrences.forEach((occ) => {
        list.push({ id: occ.id, title: occ.title, type: "finance", dueDate: occ.occurrenceDueDate, amount: formatMoney(occ.amount, occ.currency) });
      });
    }
    list.sort((a, b) => {
      const aOverdue = a.dueDate < todayDate;
      const bOverdue = b.dueDate < todayDate;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return a.dueDate.localeCompare(b.dueDate);
    });
    return list.slice(0, 3);
  }, [tasks, workItems, goals, plannedExpenses, todayDate, todayEnabled, academicsEnabled, workEnabled, goalsEnabled, financesEnabled]);

  function translateRelativeLabel(label: string, lang: "en" | "es") {
    if (label === "Overdue") return t(lang, "common.overdue", "Overdue");
    if (label === "Today") return t(lang, "common.today", "Today");
    if (label === "Tomorrow") return t(lang, "common.tomorrow", "Tomorrow");

    if (lang === "es") {
      if (label.startsWith("In ") && label.endsWith(" days")) {
        return `En ${label.replace(/\D/g, "")} días`;
      }
    }
    return label;
  }

  const showStreakBadges = (todayEnabled && planningStreak > 0) || (gymEnabled && gymStreak > 0) || (reviewEnabled && wrapStreak > 0);
  const showDailyWrapWidget = todayEnabled && reviewEnabled && isCompletedToday;
  const showPriorityBriefing = todayEnabled || calendarEnabled || goalsEnabled || reviewEnabled;
  const dashboardHasVisibleModuleContent = todayEnabled || workEnabled || financesEnabled || gymEnabled || goalsEnabled || notesEnabled || reviewEnabled || calendarEnabled;

  if (!hasMounted) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-400 text-sm font-semibold tracking-wider uppercase">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C8A96A]">{t(language, "dashboard.eyebrow")}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">Atlas OS</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-wider uppercase">
          <span className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-zinc-400">{t(language, "dashboard.localFoundation")}</span>
          <span className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-zinc-400">{t(language, "dashboard.vaultSyncOffline")}</span>
        </div>
      </header>

      {showStreakBadges && (
        <section className="mt-6 flex flex-wrap gap-3">
          {todayEnabled && planningStreak > 0 && <StreakBadge streak={planningStreak} label={t(language, "dashboard.streak.planning")} size="md" />}
          {gymEnabled && gymStreak > 0 && <StreakBadge streak={gymStreak} label={t(language, "dashboard.streak.gym")} size="md" />}
          {reviewEnabled && wrapStreak > 0 && <StreakBadge streak={wrapStreak} label={t(language, "dashboard.streak.wrap")} size="md" />}
        </section>
      )}

      <div className="mt-8 grid gap-6">
        {(todayEnabled || goalsEnabled) && (
          <XPProgress
            level={xp.level}
            title={xp.title}
            currentXP={xp.currentXP}
            nextLevelXP={xp.nextLevelXP}
            progressPercentage={xp.progressPercentage}
            remainingXP={xp.remainingXP}
            weeklyMomentum={xp.weeklyMomentum}
            recentActivity={xp.recentActivity}
            rules={xpRules}
            isMaxLevel={xp.isMaxLevel}
          />
        )}

        {!dashboardHasVisibleModuleContent && (
          <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">{t(language, "modules.preferences.eyebrow")}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">{t(language, "modules.dashboardEmpty.title")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{t(language, "modules.dashboardEmpty.prompt")}</p>
            <Link href="/settings" className="mt-4 inline-flex rounded-lg border border-[#27272a] bg-[#121214] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white">{t(language, "nav.settings")}</Link>
          </section>
        )}

        {todayEnabled && (
          <section className={`flex flex-col gap-4 rounded-xl border p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between transition-all duration-300 ${planningBanner.colorClass}`}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                {!isCompletedToday && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4B87A] opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isCompletedToday ? "bg-[#8A9A5B]" : currentPlanStatus === "not_planned" ? "bg-zinc-500" : "bg-[#C8A96A]"}`}></span>
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t(language, "dashboard.dailyIntentions")} &middot; {planningBanner.label}</p>
                <p className="text-sm font-semibold mt-0.5">{planningBanner.text}</p>
              </div>
            </div>
            <Link href="/today" className={`rounded-lg border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition shrink-0 text-center ${planningBanner.btnClass}`}>{isCompletedToday ? t(language, "dashboard.planning.reviewAgenda") : t(language, "dashboard.planning.startPlanning")}</Link>
          </section>
        )}

        {showDailyWrapWidget && (
          <section className={`flex flex-col gap-4 rounded-xl border p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between transition-all duration-300 ${todayWrap ? "border-[#8A9A5B]/30 bg-[#8A9A5B]/5 text-[#9AAB6B]" : "border-[#27272a] bg-zinc-800/40 text-zinc-400"}`}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                {!todayWrap && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4B87A] opacity-50"></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${todayWrap ? "bg-[#8A9A5B]" : "bg-[#C8A96A]"}`}></span>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t(language, "dashboard.dailyWrap")} &middot; {todayWrap ? t(language, "common.closed") : t(language, "common.pending")}</p>
                {todayWrap ? (
                  <div className="mt-1">
                    <p className="text-sm font-semibold text-zinc-200 line-clamp-2">{todayWrap.generatedSummary || t(language, "dashboard.dayClosedNoSummary")}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {todayWrap.mood !== undefined && <span className="rounded-full bg-zinc-800 border border-[#27272a] px-2.5 py-0.5 text-[9px] font-bold text-zinc-300">{t(language, "dashboard.mood")} {todayWrap.mood}/10</span>}
                      {todayWrap.energy !== undefined && <span className="rounded-full bg-zinc-800 border border-[#27272a] px-2.5 py-0.5 text-[9px] font-bold text-zinc-300">{t(language, "common.energy")} {todayWrap.energy}/10</span>}
                      {todayWrap.productivity !== undefined && <span className="rounded-full bg-zinc-800 border border-[#27272a] px-2.5 py-0.5 text-[9px] font-bold text-zinc-300">{t(language, "dashboard.productivity")} {todayWrap.productivity}/10</span>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold mt-0.5 text-zinc-300">{t(language, "dashboard.wrap.notCompleted")}</p>
                )}
              </div>
            </div>
            <Link href="/today" className={`rounded-lg border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition shrink-0 text-center ${todayWrap ? "border-[#8A9A5B]/30 bg-[#8A9A5B]/15 text-[#A8B582] hover:bg-[#8A9A5B]/25" : "border-[#C8A96A]/30 bg-[#C8A96A]/15 text-[#D4B87A] hover:bg-[#C8A96A]/25"}`}>{todayWrap ? t(language, "dashboard.wrap.review") : t(language, "dashboard.wrap.close")}</Link>
          </section>
        )}

        {dashboardHasVisibleModuleContent && (todayEnabled || financesEnabled || goalsEnabled || workEnabled || academicsEnabled) && (
          <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">{t(language, "dashboard.commandCenter.title")}</p>
            <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {todayEnabled && (
                <Link href="/today" className={`group rounded-lg border p-4 transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between min-h-[110px] ${pendingTodayTasksCount === 0 && briefing.overdueCount === 0 ? "border-[#8A9A5B]/20 bg-[#8A9A5B]/5 hover:border-[#8A9A5B]/35" : briefing.overdueCount > 0 ? "border-[#B26A5B]/30 bg-[#B26A5B]/5 hover:border-[#B26A5B]/45" : "border-zinc-800 bg-[#121214] hover:border-zinc-700"}`}>
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-300">{t(language, "dashboard.commandCenter.tasks")}</p>
                      {briefing.overdueCount > 0 && (
                        <span className="rounded bg-[#B26A5B]/20 border border-[#B26A5B]/40 px-1.5 py-0.5 text-[8px] font-bold text-[#C27A6B] leading-none uppercase tracking-wider">
                          {briefing.overdueCount} {t(language, "common.overdue", "Overdue")}
                        </span>
                      )}
                    </div>
                    <p className={`mt-2 text-sm font-semibold leading-tight ${pendingTodayTasksCount === 0 && briefing.overdueCount === 0 ? "text-[#9AAB6B]" : "text-zinc-200"}`}>{pendingTodayTasksCount === 0 ? t(language, "dashboard.commandCenter.noTasks") : t(language, "dashboard.commandCenter.pendingTasks").replace("{count}", pendingTodayTasksCount.toString())}</p>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold group-hover:text-zinc-300 mt-2 self-start transition-colors">{t(language, "today.title")} &rarr;</span>
                </Link>
              )}
              {financesEnabled && (
                <Link href="/finances" className={`group rounded-lg border p-4 transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between min-h-[110px] ${urgentPaymentsCount === 0 ? "border-[#8A9A5B]/20 bg-[#8A9A5B]/5 hover:border-[#8A9A5B]/35" : "border-[#B26A5B]/30 bg-[#B26A5B]/5 hover:border-[#B26A5B]/45"}`}>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-300">{t(language, "dashboard.commandCenter.payments")}</p>
                    <p className={`mt-2 text-sm font-semibold leading-tight ${urgentPaymentsCount === 0 ? "text-emerald-450" : "text-[#C27A6B]"}`}>{urgentPaymentsCount === 0 ? t(language, "dashboard.commandCenter.noPayments") : t(language, "dashboard.commandCenter.paymentsDue").replace("{count}", urgentPaymentsCount.toString())}</p>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold group-hover:text-zinc-300 mt-2 self-start transition-colors">{t(language, "nav.finances")} &rarr;</span>
                </Link>
              )}
              {goalsEnabled && (
                <Link href="/goals" className={`group rounded-lg border p-4 transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between min-h-[110px] ${pendingHabitsCount === 0 ? "border-[#8A9A5B]/20 bg-[#8A9A5B]/5 hover:border-[#8A9A5B]/35" : "border-zinc-800 bg-[#121214] hover:border-zinc-700"}`}>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-300">{t(language, "dashboard.commandCenter.habits")}</p>
                    <p className={`mt-2 text-sm font-semibold leading-tight ${pendingHabitsCount === 0 ? "text-[#9AAB6B]" : "text-zinc-200"}`}>{pendingHabitsCount === 0 ? t(language, "dashboard.commandCenter.noHabits") : t(language, "dashboard.commandCenter.pendingHabits").replace("{count}", pendingHabitsCount.toString())}</p>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold group-hover:text-zinc-300 mt-2 self-start transition-colors">{t(language, "nav.goals")} &rarr;</span>
                </Link>
              )}
              {workEnabled && (
                <Link href="/work" className={`group rounded-lg border p-4 transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between min-h-[110px] ${pendingWorkCount === 0 ? "border-[#8A9A5B]/20 bg-[#8A9A5B]/5 hover:border-[#8A9A5B]/35" : "border-zinc-800 bg-[#121214] hover:border-zinc-700"}`}>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-300">{t(language, "dashboard.commandCenter.work")}</p>
                    <p className={`mt-2 text-sm font-semibold leading-tight ${pendingWorkCount === 0 ? "text-[#9AAB6B]" : "text-zinc-200"}`}>{pendingWorkCount === 0 ? t(language, "dashboard.commandCenter.noWork") : t(language, "dashboard.commandCenter.pendingWork").replace("{count}", pendingWorkCount.toString())}</p>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold group-hover:text-zinc-300 mt-2 self-start transition-colors">{t(language, "nav.work")} &rarr;</span>
                </Link>
              )}
              {academicsEnabled && (
                <Link href="/academics" className={`group rounded-lg border p-4 transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between min-h-[110px] ${pendingAcademicCount === 0 ? "border-[#8A9A5B]/20 bg-[#8A9A5B]/5 hover:border-[#8A9A5B]/35" : "border-zinc-800 bg-[#121214] hover:border-zinc-700"}`}>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-300">{t(language, "dashboard.commandCenter.academics")}</p>
                    <p className={`mt-2 text-sm font-semibold leading-tight ${pendingAcademicCount === 0 ? "text-[#9AAB6B]" : "text-zinc-200"}`}>{pendingAcademicCount === 0 ? t(language, "dashboard.commandCenter.noAcademics") : t(language, "dashboard.commandCenter.pendingAcademics").replace("{count}", pendingAcademicCount.toString())}</p>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold group-hover:text-zinc-300 mt-2 self-start transition-colors">{t(language, "nav.academics")} &rarr;</span>
                </Link>
              )}
            </div>
          </section>
        )}

        {dashboardHasVisibleModuleContent && (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-6 content-start">
              {showPriorityBriefing && (
                <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">{t(language, "dashboard.strategicFocus")}</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">{t(language, "dashboard.priorityBriefing")}</h3>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {todayEnabled && (
                      <div className="rounded-lg bg-[#121214] border border-[#27272a] p-4 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{t(language, "dashboard.topPriorityToday")}</p>
                          <p className="mt-2 text-sm font-bold truncate text-zinc-200">{briefing.topTask ? briefing.topTask.title : t(language, "dashboard.noTasksPlanned")}</p>
                        </div>
                        {briefing.topTask && <span className="inline-block mt-3 w-fit rounded bg-zinc-800 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300 border border-[#27272a]">{t(language, `enum.priority.${briefing.topTask.priority}`, briefing.topTask.priority)} {t(language, "common.priority").toLowerCase()}</span>}
                      </div>
                    )}
                    {calendarEnabled && (
                      <div className="rounded-lg bg-[#121214] border border-[#27272a] p-4 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{t(language, "dashboard.nextCriticalDeadline")}</p>
                          <p className="mt-2 text-sm font-bold truncate text-zinc-200">{briefing.nextDeadline ? briefing.nextDeadline.title : t(language, "dashboard.noCriticalDeadlines")}</p>
                        </div>
                        {briefing.nextDeadline && <span className={`inline-block mt-3 w-fit rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${briefing.nextDeadline.isOverdue ? "bg-[#B26A5B]/10 text-[#C27A6B] border-[#B26A5B]/20" : "bg-[#C8A96A]/10 text-[#D4B87A] border-[#C8A96A]/20"}`}>{translateRelativeLabel(briefing.nextDeadline.relativeLabel, language)} ({briefing.nextDeadline.dueDate})</span>}
                      </div>
                    )}
                    {goalsEnabled && (
                      <div className="rounded-lg bg-[#121214] border border-[#27272a] p-4 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{t(language, "dashboard.keyObjectiveProgress")}</p>
                          <p className="mt-2 text-sm font-bold truncate text-zinc-200">{briefing.topGoal ? briefing.topGoal.title : t(language, "dashboard.noUrgentObjective")}</p>
                        </div>
                        {briefing.topGoal ? (
                          <div className="mt-3 flex items-center gap-3">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-gradient-to-r from-[#6F8799] to-[#7F97A9] rounded-full" style={{ width: `${briefing.topGoal.progress}%` }} /></div>
                            <span className="text-[10px] font-bold text-[#7F97A9]">{briefing.topGoal.progress}%</span>
                          </div>
                        ) : <span className="inline-block mt-3 w-fit rounded bg-zinc-800 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500 border border-[#27272a]/60">{t(language, "dashboard.focusDailyTasks")}</span>}
                      </div>
                    )}
                    {reviewEnabled && (
                      <div className="rounded-lg bg-[#121214] border border-[#27272a] p-4 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{t(language, "dashboard.reviewUrgency")}</p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${briefing.overdueCount > 0 ? "bg-[#B26A5B]/10 text-[#C27A6B] border-[#B26A5B]/20" : "bg-[#8A9A5B]/10 text-[#9AAB6B] border-[#8A9A5B]/20"}`}>{briefing.overdueCount} {t(language, "common.overdue")}</span>
                            <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${briefing.weeklyReviewStatus === "Pending" ? "bg-[#C8A96A]/10 text-[#D4B87A] border-[#C8A96A]/20" : "bg-[#8A9A5B]/10 text-[#9AAB6B] border-[#8A9A5B]/20"}`}>{t(language, "dashboard.review")}: {briefing.weeklyReviewStatus}</span>
                          </div>
                        </div>
                        <Link href="/review" className="mt-3 text-xs font-bold text-[#C8A96A] hover:text-[#D4B87A] transition hover:underline">{t(language, "dashboard.launchReflection")} &rarr;</Link>
                      </div>
                    )}
                  </div>
                </section>
              )}
              {goalsEnabled && (
                <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                  <div className="flex items-baseline justify-between border-b border-[#27272a]/60 pb-3 mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#6F8799]">{t(language, "dashboard.objectives")}</p>
                      <h3 className="mt-1 text-xl font-bold text-zinc-100">{t(language, "dashboard.habits.title")}</h3>
                    </div>
                    <Link href="/goals" className="text-xs font-bold text-zinc-400 hover:text-zinc-100 transition hover:underline">{t(language, "dashboard.manageGoals")} ({goals.length}) &rarr;</Link>
                  </div>
                  <div className="grid gap-3 grid-cols-3 mb-4">
                    <div className="rounded-lg border border-[#8A9A5B]/20 bg-[#8A9A5B]/5 p-3 flex flex-col justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{t(language, "dashboard.habits.completed")}</p>
                      <p className="mt-1 text-xl font-black text-[#A8B582]">{habitSummary.completedToday} / {habitSummary.activeHabits.length}</p>
                    </div>
                    <div className="rounded-lg border border-[#C8A96A]/20 bg-[#C8A96A]/5 p-3 flex flex-col justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{t(language, "dashboard.habits.pending")}</p>
                      <p className="mt-1 text-xl font-black text-[#D4B87A]">{habitSummary.pendingToday}</p>
                    </div>
                    <div className="rounded-lg border border-[#8A9A5B]/20 bg-[#8A9A5B]/5 p-3 flex flex-col justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{t(language, "dashboard.habits.bestStreak")}</p>
                      <p className="mt-1 text-xl font-black text-[#8A9A5B] flex items-center gap-1"><span>🔥</span> {habitSummary.bestActiveStreak}</p>
                    </div>
                  </div>
                  {habitSummary.activeHabits.length > 0 && (
                    <div className="mb-4 rounded-lg border border-[#27272a] bg-[#121214] p-4">
                      {firstHabitNeedingAttention ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4B87A]">{t(language, "dashboard.habits.keepStreak")}</p>
                            <p className="text-sm font-semibold text-zinc-200 mt-1">{firstHabitNeedingAttention.goal.title}</p>
                          </div>
                          <span className="rounded bg-[#C8A96A]/10 text-[#D4B87A] border border-[#C8A96A]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider self-start sm:self-center shrink-0">{firstHabitNeedingAttention.stats.currentStreak} {t(language, "streak.day")}</span>
                        </div>
                      ) : <div className="flex items-center gap-2 text-emerald-450"><span>🔥</span><p className="text-xs font-bold uppercase tracking-wider">{t(language, "dashboard.habits.allCompleted")}</p></div>}
                    </div>
                  )}
                  <div className="mt-6 border-t border-[#27272a]/60 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#6F8799] mb-3">{t(language, "dashboard.activeGoals")}</p>
                    <div className="grid gap-3">
                      {activeGoals.length > 0 ? activeGoals.map((goal) => {
                        const progress = getGoalProgress(goal, savings, settings.baseCurrency, settings.exchangeRateUsdToPyg);
                        return (
                          <div key={goal.id} className="rounded-lg border border-[#27272a] bg-[#121214] p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-bold text-zinc-200 text-sm">{goal.title}</p>
                                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wide">
                                  {goal.area} &middot; {t(language, "dashboard.target")}: {goal.targetValue} {goal.unit || ""}
                                  {goal.linkedFinanceMetric === "savings" && goal.deadline && (() => {
                                    const plan = calculateFinancialGoalPlan(
                                      goal,
                                      savings,
                                      settings.baseCurrency,
                                      settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150,
                                      todayDate
                                    );
                                    return ` · ${formatMoney(plan.perMonth, plan.currency)}/${language === "es" ? "mes" : "mo"}`;
                                  })()}
                                </p>
                              </div>
                              <span className="text-sm font-bold text-[#7F97A9] shrink-0">{progress}%</span>
                            </div>
                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800 border border-[#27272a]/60"><div className="h-full rounded-full bg-gradient-to-r from-[#6F8799] to-[#7F97A9]" style={{ width: `${progress}%` }} /></div>
                          </div>
                        );
                      }) : <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-4 text-xs text-zinc-500 italic">{t(language, "dashboard.noActiveGoals")}</p>}
                    </div>
                  </div>
                </section>
              )}
              {financesEnabled && (
                <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                  <div className="flex items-baseline justify-between border-b border-[#27272a]/60 pb-3 mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A9A5B]">{t(language, "dashboard.financialLedger")}</p>
                      <h3 className="mt-1 text-xl font-bold text-zinc-100">{t(language, "dashboard.financialOverview")}</h3>
                    </div>
                    <Link href="/finances" className="text-xs font-bold text-zinc-400 hover:text-zinc-100 transition hover:underline">{t(language, "dashboard.financesHub")} &rarr;</Link>
                  </div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    <div className={`rounded-lg border p-4 flex flex-col justify-between min-h-[120px] transition ${financeOverview.availableMoney < 0 ? "border-[#B26A5B]/30 bg-[#B26A5B]/5 text-red-450" : financeOverview.availableMoney < (settings.baseCurrency === "PYG" ? 500000 : 100) ? "border-[#C8A96A]/30 bg-[#C8A96A]/5 text-[#D4B87A]" : "border-[#27272a] bg-[#121214]"}`}>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          {financeOverview.isAccountAware
                            ? t(language, "finances.accounts.awareBalanceTitle", "Account-aware balance")
                            : t(language, "dashboard.availableMoney")}
                        </p>
                        <p className="mt-2 text-2xl font-black tracking-tight text-zinc-100">{formatMoney(financeOverview.availableMoney, settings.baseCurrency)}</p>
                      </div>
                      <div className="mt-3 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                        {financeOverview.isAccountAware
                          ? t(language, "finances.accounts.awareBalanceHelp", "Includes accounts + legacy transactions")
                          : t(language, "finances.accounts.legacyBalance", "Legacy ledger balance")}
                        {financeWarningMessage && <p className={`mt-1 font-bold uppercase leading-tight flex items-center gap-0.5 ${financeWarningType === "danger" ? "text-[#C27A6B]" : "text-[#D4B87A]"}`}><span>⚠️</span> {financeWarningMessage}</p>}
                      </div>
                    </div>
                    <div className={`rounded-lg border p-4 flex flex-col justify-between min-h-[120px] transition ${financeCommitments.safeToSpend7Days < 0 ? "border-[#B26A5B]/30 bg-[#B26A5B]/5 text-red-450" : financeCommitments.safeToSpend7Days < (settings.baseCurrency === "PYG" ? 500000 : 100) ? "border-[#C8A96A]/30 bg-[#C8A96A]/5 text-[#D4B87A]" : "border-[#27272a] bg-[#121214]"}`}>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t(language, "dashboard.finance.safeSpend")}</p>
                        <p className="mt-2 text-2xl font-black tracking-tight text-zinc-100">{formatMoney(financeCommitments.safeToSpend7Days, settings.baseCurrency)}</p>
                      </div>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none">{t(language, "dashboard.finance.upcoming7")}: {formatMoney(financeCommitments.upcomingCommitments7Days, settings.baseCurrency)}</p>
                    </div>
                    <div className="rounded-lg border border-[#27272a] bg-[#121214]/65 p-4 flex flex-col justify-between min-h-[120px]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t(language, "dashboard.finance.reservedSavings")}</p>
                        <p className="mt-2 text-2xl font-black tracking-tight text-zinc-400">{formatMoney(financeOverview.savingsInBaseCurrency, settings.baseCurrency)}</p>
                      </div>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none italic">{t(language, "dashboard.excludesReservedFunds")}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-[#27272a] bg-[#121214] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">{t(language, "dashboard.finance.nextPayment")}</p>
                    {financeCommitments.nextPayment ? (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${financeCommitments.nextPayment.isOverdue ? "bg-[#B26A5B]" : "bg-[#C8A96A]"}`} />
                          <p className="text-sm font-semibold text-zinc-200">{financeCommitments.nextPayment.title}</p>
                          <span className="text-xs text-zinc-500">({financeCommitments.nextPayment.occurrenceDueDate})</span>
                        </div>
                        <p className="text-sm font-mono font-bold text-zinc-300">{formatMoney(financeCommitments.nextPayment.amount, financeCommitments.nextPayment.currency)}</p>
                      </div>
                    ) : <p className="mt-2 text-xs italic text-zinc-550">{t(language, "dashboard.finance.noPayments")}</p>}
                  </div>

                  {budgetSummary && budgetSummary.activeBudgetCount > 0 && (
                    <div className="mt-4 rounded-lg border border-[#27272a] bg-[#121214] p-4 flex flex-col gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {t(language, "finances.budgets.titleSection", "Monthly Budgets")}
                      </p>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-zinc-350">
                          {budgetSummary.overBudgetCount > 0 ? (
                            <span className="text-[#C27A6B] font-bold">
                              ⚠️ {t(language, "finances.budgets.dashboard.over", "{count} categories over budget limit").replace("{count}", String(budgetSummary.overBudgetCount))}
                            </span>
                          ) : budgetSummary.nearLimitCount > 0 ? (
                            <span className="text-[#D4B87A] font-bold">
                              ⚠️ {t(language, "finances.budgets.dashboard.near", "{count} categories near budget limit").replace("{count}", String(budgetSummary.nearLimitCount))}
                            </span>
                          ) : (
                            <span className="text-[#9AAB6B] font-bold">
                              ✓ {t(language, "finances.budgets.dashboard.healthy", "All category budgets healthy")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {t(language, "finances.budgets.spent", "Spent")}: <span className="font-bold text-zinc-200">{formatMoney(budgetSummary.totalSpentInBase, settings.baseCurrency)}</span> / {formatMoney(budgetSummary.totalBudgetedInBase, settings.baseCurrency)}
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
            <div className="grid gap-6 content-start">
              {calendarEnabled && (
                <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                  <div className="flex items-baseline justify-between border-b border-[#27272a]/60 pb-3 mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t(language, "dashboard.chronology")}</p>
                      <h3 className="mt-1 text-xl font-bold text-zinc-100">{t(language, "dashboard.agenda.upcoming")}</h3>
                    </div>
                    <Link href="/calendar" className="text-xs font-bold text-zinc-400 hover:text-zinc-100 transition hover:underline">{t(language, "dashboard.agenda.open")} &rarr;</Link>
                  </div>
                  <div className="grid gap-3">
                    {upcomingAgendaSnapshot.length > 0 ? upcomingAgendaSnapshot.map((item) => {
                      const isOverdue = item.dueDate < todayDate;
                      const isDueToday = item.dueDate === todayDate;
                      const rawLabel = getRelativeLabel(item.dueDate, todayDate);
                      const label = translateRelativeLabel(rawLabel, language);
                      const typeColors = { task: "border-l-zinc-500 text-zinc-300 bg-zinc-800/20", academic: "border-l-[#8B7A99] text-[#9B8AA9] bg-[#8B7A99]/5", work: "border-l-[#9C7A5F] text-[#D4B87A] bg-[#C8A96A]/5", goal: "border-l-[#6F8799] text-[#7F97A9] bg-[#6F8799]/5", finance: "border-l-[#8A9A5B] text-emerald-450 bg-[#8A9A5B]/5" };
                      const typeNames = { task: t(language, "calendar.dot.generalTask"), academic: t(language, "calendar.agenda.academicSource"), work: t(language, "calendar.agenda.workSource"), goal: t(language, "calendar.agenda.goalSource"), finance: t(language, "calendar.agenda.financeSource") };
                      return (
                        <div key={item.id} className={`rounded-lg border border-[#27272a] border-l-4 p-3.5 text-xs flex flex-col gap-2 ${typeColors[item.type]}`}>
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-zinc-200 truncate">{item.title}</p>
                              <p className="text-[9px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">{typeNames[item.type]}</p>
                            </div>
                            {item.amount && <span className="text-xs font-mono font-bold shrink-0">{item.amount}</span>}
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t border-[#27272a]/60 pt-2 mt-1 shrink-0">
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${isOverdue ? "bg-[#B26A5B]/10 text-[#C27A6B] border-[#B26A5B]/20" : isDueToday ? "bg-[#C8A96A]/10 text-[#D4B87A] border-[#C8A96A]/20" : "bg-zinc-800 text-zinc-400 border-[#27272a]"}`}>{label}</span>
                            <span className="text-[9px] text-zinc-500 font-mono font-semibold">{item.dueDate}</span>
                          </div>
                        </div>
                      );
                    }) : <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-4 text-xs text-zinc-500 italic">{t(language, "dashboard.agenda.empty")}</p>}
                  </div>
                </section>
              )}
              {workEnabled && (
                <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#27272a]/60 pb-3 mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t(language, "dashboard.freelancePipeline")}</p>
                      <h3 className="mt-1 text-xl font-bold text-zinc-100">{t(language, "dashboard.workOverview")}</h3>
                    </div>
                    <Link href="/work" className="text-xs font-bold text-zinc-400 hover:text-zinc-100 transition hover:underline">{t(language, "dashboard.workBoard")} &rarr;</Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-center">
                      <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">{t(language, "dashboard.activeClients")}</p>
                      <p className="mt-1 text-2xl font-bold text-zinc-100">{clients.filter(c => c.status === "active").length}</p>
                    </div>
                    <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-center">
                      <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">{t(language, "dashboard.dueItemsToday")}</p>
                      <p className="mt-1 text-2xl font-bold text-zinc-100">{todayWorkItems.length}</p>
                    </div>
                  </div>
                </section>
              )}
              <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl flex flex-col gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">{t(language, "dashboard.systemHealth")}</p>
                  <h3 className="mt-1 text-xl font-bold text-zinc-100">{t(language, "dashboard.atlasStreak")}</h3>
                </div>
                {atlasStreak.current > 0 ? (
                  <div className="rounded-lg border border-[#C8A96A]/20 bg-[#C8A96A]/5 p-4.5 flex items-center gap-4">
                    <div className="relative shrink-0 flex items-center justify-center w-11 h-11 rounded-full border border-[#C8A96A]/30 bg-[#C8A96A]/10 text-[#D4B87A] shadow-[0_0_15px_rgba(245,158,11,0.2)]"><span>🔥</span></div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-zinc-100 font-mono leading-none">{atlasStreak.current}</span>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide leading-none">{t(language, "dashboard.daysActive")}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-2 leading-snug">{t(language, "dashboard.keepAlive")}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#27272a] bg-[#121214]/50 p-4.5 text-center">
                    <span className="text-xl block mb-2 opacity-50">💤</span>
                    <p className="text-xs font-semibold text-zinc-400">{t(language, "dashboard.osIdle")}</p>
                    <p className="text-[10px] text-zinc-555 mt-1.5 max-w-[200px] mx-auto leading-normal">{t(language, "dashboard.igniteStreak")}</p>
                  </div>
                )}
                {(todayEnabled || reviewEnabled) && (
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase tracking-wider">
                    {todayEnabled && (
                      <div className={`rounded-lg border p-2 text-center transition-all ${isCompletedToday ? "bg-[#8A9A5B]/5 border-[#8A9A5B]/25 text-[#9AAB6B]" : "bg-[#121214] border-[#27272a]/60 text-zinc-500"}`}><span>{t(language, "dashboard.intentions")}: {isCompletedToday ? t(language, "dashboard.set") : t(language, "common.pending")}</span></div>
                    )}
                    {reviewEnabled && (
                      <div className={`rounded-lg border p-2 text-center transition-all ${todayWrap ? "bg-[#8A9A5B]/5 border-[#8A9A5B]/25 text-[#9AAB6B]" : "bg-[#121214] border-[#27272a]/60 text-zinc-500"}`}><span>{t(language, "dashboard.wrapUp")}: {todayWrap ? t(language, "common.closed") : t(language, "common.pending")}</span></div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { XPProgress } from "@/components/XPProgress";

import { useWeeklyReviews } from "@/lib/reviews";
import { useTasks, useDailyPlan, derivePlanStatus, todayISO } from "@/lib/tasks";
import { XP_RULES, useXP } from "@/lib/xp";
import {
  useTransactions,
  calculateFinanceOverview,
  formatMoney,
  useSavings,
  getCurrentMonth,
} from "@/lib/finances";
import { useWorkoutLogs, calculateGymOverview } from "@/lib/gym";
import { useGoals, getTopActiveGoals, getGoalProgress } from "@/lib/goals";
import { useAtlasSettings } from "@/lib/settings";
import { useClients, useWorkItems, getWorkItemsDueToday } from "@/lib/work";
import { getPriorityBriefing, getUpcomingDeadlines } from "@/lib/dashboard";
import { useDailyWraps } from "@/lib/dailyWraps";
import { calculateStreak, calculateAtlasStreak } from "@/lib/streaks";
import { StreakBadge } from "@/components/StreakBadge";
import { useNotes } from "@/lib/notes";
import { useStudySessions } from "@/lib/academics";

const xpRules = [
  { label: "Adding a finance transaction", xp: XP_RULES["finance-transaction"].amount },
  {
    label: "Logging a workout, with effort bonuses",
    xp: XP_RULES["workout-log"].amount,
  },
  { label: "Creating a note", xp: XP_RULES["note-created"].amount },
  { label: "Completing structured tasks", xp: XP_RULES["task-completed"].amount },
  { label: "Updating a goal", xp: XP_RULES["goal-updated"].amount },
  {
    label: "Completing a weekly review",
    xp: XP_RULES["weekly-review-completed"].amount,
  },
];

export function AtlasDashboard() {
  const xp = useXP();
  const { reviews } = useWeeklyReviews();
  const { tasks } = useTasks();

  
  const { transactions } = useTransactions();
  const { savings } = useSavings();
  const { workouts } = useWorkoutLogs();
  const { goals } = useGoals();
  const { settings } = useAtlasSettings();
  const { clients } = useClients();
  const { workItems } = useWorkItems();
  const { dailyWraps, getDailyWrapForDate } = useDailyWraps();
  const { notes } = useNotes();
  const { sessions: studySessions } = useStudySessions();
  const todayDate = todayISO();
  const todayWrap = getDailyWrapForDate(todayDate);

  const { plans, isCompletedToday } = useDailyPlan();
  const currentPlanStatus = useMemo(() => {
    return derivePlanStatus(tasks);
  }, [tasks]);

  const todayWorkItems = useMemo(() => {
    return getWorkItemsDueToday(workItems);
  }, [workItems]);


  
  const financeOverview = useMemo(() => {
    return calculateFinanceOverview(
      transactions,
      settings.baseCurrency,
      settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150,
      savings,
      getCurrentMonth()
    );
  }, [transactions, settings.baseCurrency, settings.usdToPygRate, settings.exchangeRateUsdToPyg, savings]);

  // Financial Warning State (Calculations)
  const savingsRatio = financeOverview.totalBalance > 0 ? (financeOverview.savingsInBaseCurrency / financeOverview.totalBalance) : 0;
  let financeWarningMessage = "";
  let financeWarningType: "none" | "low" | "warning" | "danger" = "none";

  if (financeOverview.savingsInBaseCurrency > financeOverview.totalBalance) {
    financeWarningMessage = "Savings exceed current balance";
    financeWarningType = "danger";
  } else if (financeOverview.availableMoney < 0) {
    financeWarningMessage = "Available money is negative";
    financeWarningType = "danger";
  } else if (savingsRatio > 0.8) {
    financeWarningMessage = "Most funds are reserved";
    financeWarningType = "warning";
  } else if (financeOverview.availableMoney > 0 && financeOverview.availableMoney < (settings.baseCurrency === "PYG" ? 500000 : 100)) {
    financeWarningMessage = "Low available balance";
    financeWarningType = "low";
  }



  const gymOverview = useMemo(() => {
    return calculateGymOverview(workouts);
  }, [workouts]);



  // Priority Briefing
  const briefing = useMemo(() => {
    return getPriorityBriefing(
      tasks,
      workItems,
      goals,
      reviews,
      savings,
      settings.baseCurrency,
      settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150,
      todayISO()
    );
  }, [tasks, workItems, goals, reviews, savings, settings.baseCurrency, settings.usdToPygRate, settings.exchangeRateUsdToPyg]);

  // Unified Deadlines
  const upcomingDeadlines = useMemo(() => {
    return getUpcomingDeadlines(tasks, workItems, goals, todayISO());
  }, [tasks, workItems, goals]);

  // Top active goals
  const activeGoals = useMemo(() => {
    return getTopActiveGoals(goals, 3);
  }, [goals]);

  // Streaks calculations
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
    return calculateAtlasStreak(
      plans,
      dailyWraps,
      tasks,
      workItems,
      workouts,
      notes,
      transactions,
      studySessions
    );
  }, [plans, dailyWraps, tasks, workItems, workouts, notes, transactions, studySessions]);

  // Derived Daily Plan Banner Classes & Copy
  const planningBanner = useMemo(() => {
    if (isCompletedToday) {
      return {
        label: "Completed",
        text: "Daily Planning Completed (+25 XP awarded). You have locked in your priorities for today.",
        colorClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        btnClass: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25",
      };
    }
    if (currentPlanStatus === "in_progress" || currentPlanStatus === "planned") {
      return {
        label: "In Progress",
        text: "Daily Planning In Progress. Take action and lock in your commitments.",
        colorClass: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        btnClass: "border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25",
      };
    }
    return {
      label: "Pending",
      text: "Daily Planning Pending. Define your intentions and tasks to make today highly productive.",
      colorClass: "bg-zinc-800/40 border-[#27272a] text-zinc-400",
      btnClass: "border-[#27272a] bg-zinc-800 hover:bg-zinc-700 text-zinc-200",
    };
  }, [isCompletedToday, currentPlanStatus]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            Private Command Center
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            Atlas OS
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-wider uppercase">
          <span className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-zinc-400">
            Local Foundation
          </span>
          <span className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-zinc-400">
            Vault Sync Offline
          </span>
        </div>
      </header>

      {/* Streaks Header Grid */}
      {(gymStreak > 0 || planningStreak > 0 || wrapStreak > 0) && (
        <section className="mt-6 flex flex-wrap gap-3">
          <StreakBadge streak={planningStreak} label="Planning" size="md" />
          <StreakBadge streak={gymStreak} label="Gym" size="md" />
          <StreakBadge streak={wrapStreak} label="Wrap" size="md" />
        </section>
      )}

      {/* Main Container */}
      <div className="mt-8 grid gap-6">
        {/* 1. XP / Level Progress */}
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

        {/* 2. Daily Planning Status Banner */}
        <section
          className={`flex flex-col gap-4 rounded-xl border p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between transition-all duration-300 ${planningBanner.colorClass}`}
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              {!isCompletedToday && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isCompletedToday ? "bg-emerald-500" : currentPlanStatus === "not_planned" ? "bg-zinc-500" : "bg-amber-500"}`}></span>
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Daily Intentions &middot; {planningBanner.label}
              </p>
              <p className="text-sm font-semibold mt-0.5">{planningBanner.text}</p>
            </div>
          </div>
          <Link
            href="/today"
            className={`rounded-lg border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition shrink-0 text-center ${planningBanner.btnClass}`}
          >
            {isCompletedToday ? "Review agenda" : "Start planning"}
          </Link>
        </section>

        {/* Daily Wrap Status Widget - Shown only after planning completion */}
        {isCompletedToday && (
          <section
            className={`flex flex-col gap-4 rounded-xl border p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between transition-all duration-300 ${
              todayWrap
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                : "border-[#27272a] bg-zinc-800/40 text-zinc-400"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                {!todayWrap && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-50"></span>
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${todayWrap ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Daily Wrap &middot; {todayWrap ? "Closed" : "Pending"}
                </p>
                {todayWrap ? (
                  <div className="mt-1">
                    <p className="text-sm font-semibold text-zinc-200 line-clamp-2">
                      {todayWrap.generatedSummary || "Day closed with no summary."}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {todayWrap.mood !== undefined && (
                        <span className="rounded-full bg-zinc-800 border border-[#27272a] px-2.5 py-0.5 text-[9px] font-bold text-zinc-300">
                          Mood {todayWrap.mood}/10
                        </span>
                      )}
                      {todayWrap.energy !== undefined && (
                        <span className="rounded-full bg-zinc-800 border border-[#27272a] px-2.5 py-0.5 text-[9px] font-bold text-zinc-300">
                          Energy {todayWrap.energy}/10
                        </span>
                      )}
                      {todayWrap.productivity !== undefined && (
                        <span className="rounded-full bg-zinc-800 border border-[#27272a] px-2.5 py-0.5 text-[9px] font-bold text-zinc-300">
                          Productivity {todayWrap.productivity}/10
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/35 px-2.5 py-0.5 text-[9px] font-bold text-emerald-400">
                        +20 XP
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold mt-0.5 text-zinc-300">
                    End-of-day reflection not yet completed. Close your day to capture stats and earn +20 XP.
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/today"
              className={`rounded-lg border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition shrink-0 text-center ${
                todayWrap
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  : "border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
              }`}
            >
              {todayWrap ? "Review wrap" : "Close your day"}
            </Link>
          </section>
        )}

        {/* Two-column major section */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Column */}
          <div className="grid gap-6 content-start">
            
            {/* 3. Priority Briefing Card */}
            <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                Strategic Focus
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">Priority Briefing</h3>
              
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-[#121214] border border-[#27272a] p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Top Priority Today</p>
                    <p className="mt-2 text-sm font-bold truncate text-zinc-200">
                      {briefing.topTask ? briefing.topTask.title : "No tasks planned"}
                    </p>
                  </div>
                  {briefing.topTask && (
                    <span className="inline-block mt-3 w-fit rounded bg-zinc-800 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300 border border-[#27272a]">
                      {briefing.topTask.priority} priority
                    </span>
                  )}
                </div>

                <div className="rounded-lg bg-[#121214] border border-[#27272a] p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Next Critical Deadline</p>
                    <p className="mt-2 text-sm font-bold truncate text-zinc-200">
                      {briefing.nextDeadline ? briefing.nextDeadline.title : "No critical deadlines"}
                    </p>
                  </div>
                  {briefing.nextDeadline && (
                    <span className={`inline-block mt-3 w-fit rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                      briefing.nextDeadline.isOverdue 
                        ? "bg-red-500/10 text-red-400 border-red-500/20" 
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {briefing.nextDeadline.relativeLabel} ({briefing.nextDeadline.dueDate})
                    </span>
                  )}
                </div>

                <div className="rounded-lg bg-[#121214] border border-[#27272a] p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Key Objective Progress</p>
                    <p className="mt-2 text-sm font-bold truncate text-zinc-200">
                      {briefing.topGoal ? briefing.topGoal.title : "No urgent objective"}
                    </p>
                  </div>
                  {briefing.topGoal ? (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full" style={{ width: `${briefing.topGoal.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-cyan-400">{briefing.topGoal.progress}%</span>
                    </div>
                  ) : (
                    <span className="inline-block mt-3 w-fit rounded bg-zinc-800 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500 border border-[#27272a]/60">
                      Focus on daily tasks
                    </span>
                  )}
                </div>

                <div className="rounded-lg bg-[#121214] border border-[#27272a] p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Review & Urgency</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                        briefing.overdueCount > 0 
                          ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse" 
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {briefing.overdueCount} Overdue
                      </span>
                      <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                        briefing.weeklyReviewStatus === "Pending" 
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        Review: {briefing.weeklyReviewStatus}
                      </span>
                    </div>
                  </div>
                  <Link href="/review" className="mt-3 text-xs font-bold text-amber-500 hover:text-amber-400 transition hover:underline">
                    Launch Reflection &rarr;
                  </Link>
                </div>
              </div>
            </section>

            {/* 4. Goals Progress List */}
            <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <div className="flex items-baseline justify-between border-b border-[#27272a]/60 pb-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">
                    Objectives
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-zinc-100">Active Goals</h3>
                </div>
                <Link href="/goals" className="text-xs font-bold text-zinc-400 hover:text-zinc-100 transition hover:underline">
                  Manage goals ({goals.length}) &rarr;
                </Link>
              </div>
              <div className="grid gap-4">
                {activeGoals.length > 0 ? (
                  activeGoals.map((goal) => {
                    const progress = getGoalProgress(goal, savings, settings.baseCurrency, settings.exchangeRateUsdToPyg);
                    return (
                      <div key={goal.id} className="rounded-lg border border-[#27272a] bg-[#121214] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-zinc-200 text-sm">{goal.title}</p>
                            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wide">
                              {goal.area} &middot; Target: {goal.targetValue} {goal.unit || ""}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-cyan-400 shrink-0">{progress}%</span>
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800 border border-[#27272a]/60">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-4 text-xs text-zinc-500 italic">
                    No active goals currently being tracked.
                  </p>
                )}
              </div>
            </section>

            {/* 5. Finances Balance & Savings Summary */}
            <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <div className="flex items-baseline justify-between border-b border-[#27272a]/60 pb-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                    Financial Ledger
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-zinc-100">Financial Overview</h3>
                </div>
                <Link href="/finances" className="text-xs font-bold text-zinc-400 hover:text-zinc-100 transition hover:underline">
                  Finances Hub &rarr;
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Available Money */}
                <div className={`rounded-lg border p-4 flex flex-col justify-between min-h-[140px] transition ${
                  financeWarningType === "danger" 
                    ? "border-red-500/30 bg-red-500/5 text-red-400" 
                    : financeWarningType === "warning"
                    ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
                    : financeWarningType === "low"
                    ? "border-blue-500/30 bg-blue-500/5 text-blue-400"
                    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                }`}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Available Money
                    </p>
                    <p className="mt-2.5 text-3xl font-black tracking-tight text-zinc-100 break-words leading-none">
                      {formatMoney(financeOverview.availableMoney, settings.baseCurrency)}
                    </p>
                    <p className="text-[10px] text-zinc-450 font-semibold uppercase mt-1.5 tracking-wide">
                      Spendable balance
                    </p>
                  </div>
                  <div className="mt-3 border-t border-[#27272a]/40 pt-2.5 flex flex-col gap-1 text-[9px] text-zinc-500">
                    <p className="font-bold uppercase tracking-wider">
                      Excludes reserved goal funds
                    </p>
                    {financeWarningMessage && (
                      <p className={`mt-1 text-[8px] font-bold uppercase tracking-wider leading-tight flex items-center gap-0.5 ${
                        financeWarningType === "danger"
                          ? "text-red-400 animate-pulse"
                          : financeWarningType === "warning"
                          ? "text-amber-400"
                          : "text-blue-400"
                      }`}>
                        <span>⚠️</span> {financeWarningMessage}
                      </p>
                    )}
                  </div>
                </div>

                {/* Income Card */}
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Income This Month</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-400 tracking-tight break-words leading-none">
                      {formatMoney(financeOverview.monthlyIncome, settings.baseCurrency)}
                    </p>
                  </div>
                  <p className="text-[9px] text-zinc-500 font-semibold uppercase leading-none">Month inflow</p>
                </div>

                {/* Expenses Card */}
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Expenses This Month</p>
                    <p className="mt-2 text-2xl font-bold text-red-400 tracking-tight break-words leading-none">
                      {formatMoney(financeOverview.monthlyExpenses, settings.baseCurrency)}
                    </p>
                  </div>
                  <p className="text-[9px] text-zinc-500 font-semibold uppercase leading-none">Month outflow</p>
                </div>

                {/* Monthly Net Card */}
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Monthly Net</p>
                    <p className={`mt-2 text-2xl font-bold tracking-tight break-words leading-none ${financeOverview.monthlyNet >= 0 ? "text-emerald-450" : "text-red-400"}`}>
                      {formatMoney(financeOverview.monthlyNet, settings.baseCurrency)}
                    </p>
                  </div>
                  <p className="text-[9px] text-zinc-500 font-semibold uppercase leading-none">Current month cash flow</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="grid gap-6 content-start">
            
            {/* 6. Upcoming Deadlines unified widget */}
            <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Chronology
              </p>
              <h3 className="mt-1 text-xl font-bold text-zinc-100">Upcoming Deadlines</h3>
              
              <div className="mt-5 grid gap-3">
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.map((deadline) => {
                    const typeColors = {
                      task: "border-l-zinc-500 text-zinc-300 bg-zinc-800/20",
                      academic: "border-l-indigo-500 text-indigo-400 bg-indigo-500/5",
                      work: "border-l-amber-600 text-amber-400 bg-amber-500/5",
                      goal: "border-l-cyan-500 text-cyan-400 bg-cyan-500/5",
                    };

                    return (
                      <div
                        key={deadline.id}
                        className={`rounded-lg border border-[#27272a] border-l-4 p-3.5 text-xs flex flex-col gap-2 ${typeColors[deadline.type]}`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-200 truncate">{deadline.title}</p>
                          <p className="text-[9px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">{deadline.type} &middot; {deadline.area}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-[#27272a]/60 pt-2 mt-1 shrink-0">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                            deadline.isOverdue 
                              ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse" 
                              : deadline.isDueToday 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                              : "bg-zinc-800 text-zinc-400 border-[#27272a]"
                          }`}>
                            {deadline.relativeLabel}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono font-semibold">{deadline.dueDate}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-4 text-xs text-zinc-500 italic">
                    No upcoming deadlines in the next 30 days.
                  </p>
                )}
              </div>
            </section>

            {/* 7. Work / Clients counts */}
            <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#27272a]/60 pb-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Freelance Pipeline
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-zinc-100">Work Overview</h3>
                </div>
                <Link href="/work" className="text-xs font-bold text-zinc-400 hover:text-zinc-100 transition hover:underline">
                  Work Board &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-center">
                  <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Active Clients</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-100">
                    {clients.filter(c => c.status === "active").length}
                  </p>
                </div>
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-center">
                  <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Due Items Today</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-100">
                    {todayWorkItems.length}
                  </p>
                </div>
              </div>
            </section>

            {/* 8. Atlas Usage Streak widget */}
            <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                  System Health
                </p>
                <h3 className="mt-1 text-xl font-bold text-zinc-100">Atlas Streak</h3>
              </div>

              {atlasStreak.current > 0 ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4.5 flex items-center gap-4">
                  <div className="relative shrink-0 flex items-center justify-center w-11 h-11 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <span className="text-xl">🔥</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-zinc-100 font-mono leading-none">{atlasStreak.current}</span>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide leading-none">Days Active</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2 leading-snug">
                      Keep the OS alive: plan, execute, close.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#27272a] bg-[#121214]/50 p-4.5 text-center">
                  <span className="text-xl block mb-2 opacity-50">💤</span>
                  <p className="text-xs font-semibold text-zinc-400">OS Status: Idle</p>
                  <p className="text-[10px] text-zinc-550 mt-1.5 max-w-[200px] mx-auto leading-normal">
                    Complete Daily Intentions or log activities to ignite your system usage streak.
                  </p>
                </div>
              )}

              {/* Status Snaps */}
              <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase tracking-wider">
                <div className={`rounded-lg border p-2 text-center transition-all ${
                  isCompletedToday 
                    ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400" 
                    : "bg-[#121214] border-[#27272a]/60 text-zinc-500"
                }`}>
                  <span>Intentions: {isCompletedToday ? "Set" : "Pending"}</span>
                </div>
                <div className={`rounded-lg border p-2 text-center transition-all ${
                  todayWrap 
                    ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400" 
                    : "bg-[#121214] border-[#27272a]/60 text-zinc-500"
                }`}>
                  <span>Wrap-up: {todayWrap ? "Closed" : "Pending"}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

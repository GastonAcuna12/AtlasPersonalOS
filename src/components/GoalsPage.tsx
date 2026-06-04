"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";
import { downloadGoalsSummaryMarkdown } from "@/lib/markdownExport";
import {
  getGoalProgress,
  getHabitGoalStats,
  isDailyHabitGoal,
  useGoals,
  calculateFinancialGoalPlan,
  type GoalDraft,
  type GoalStatus,
  type Goal,
  type HabitCheckInStatus,
} from "@/lib/goals";
import { useXP } from "@/lib/xp";
import { useSavings, formatMoney, formatDateStable } from "@/lib/finances";
import { useAtlasSettings } from "@/lib/settings";
import { todayISO } from "@/lib/storage";
import { StreakBadge } from "@/components/shared/StreakBadge";
import { t } from "@/lib/i18n";
import type { Currency } from "@/types/atlas";

const initialDraft: GoalDraft = {
  title: "",
  area: "Personal",
  status: "active",
  currentValue: 0,
  targetValue: 100,
  deadline: "",
  notes: "",
  linkedFinanceMetric: "none",
  currency: "PYG",
  unit: "",
};

const initialHabitDraft = {
  title: "",
  area: "Personal",
  targetPerDay: 1,
  unit: "day",
  notes: "",
};

const goalNumberFormatter = new Intl.NumberFormat("en-US");

function formatGoalNumber(value: number) {
  return goalNumberFormatter.format(value);
}

function subscribeToClientReady() {
  return () => {};
}

function getClientReadySnapshot() {
  return true;
}

function getServerReadySnapshot() {
  return false;
}

export function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal, checkInHabitGoal } = useGoals();
  const xp = useXP();
  const { savings, updateSavings } = useSavings();
  const { settings } = useAtlasSettings();
  const language = settings.language;

  const [isEditingSavings, setIsEditingSavings] = useState(false);
  const hasMounted = useSyncExternalStore(
    subscribeToClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot,
  );
  const [savingsAmountDraft, setSavingsAmountDraft] = useState(savings.currentAmount);
  const [savingsCurrencyDraft, setSavingsCurrencyDraft] = useState<Currency>(savings.currency);
  const todayDate = hasMounted ? todayISO() : "1970-01-01";
  const habitGoals = goals.filter(isDailyHabitGoal);
  const standardGoals = goals.filter((goal) => !isDailyHabitGoal(goal));
  const activeHabitGoals = habitGoals.filter((goal) => goal.status === "active");

  function handleSaveSavings() {
    updateSavings(savingsAmountDraft, savingsCurrencyDraft);
    setIsEditingSavings(false);
    xp.awardXP("finance-transaction", {
      amount: 10,
      label: "Updated savings balance",
    });
  }

  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [habitDraft, setHabitDraft] = useState(initialHabitDraft);
  const [habitError, setHabitError] = useState("");
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [habitNotes, setHabitNotes] = useState<Record<string, string>>({});

  // Edit State
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editStatus, setEditStatus] = useState<GoalStatus>("active");
  const [editCurrentValue, setEditCurrentValue] = useState(0);
  const [editTargetValue, setEditTargetValue] = useState(100);
  const [editDeadline, setEditDeadline] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLinkedFinanceMetric, setEditLinkedFinanceMetric] = useState<"none" | "savings">("none");
  const [editCurrency, setEditCurrency] = useState<Currency>("PYG");
  const [editUnit, setEditUnit] = useState("");

  function startEditing(goal: Goal) {
    setEditingGoalId(goal.id);
    setEditTitle(goal.title);
    setEditArea(goal.area);
    setEditStatus(goal.status);
    setEditCurrentValue(goal.currentValue);
    setEditTargetValue(goal.targetValue);
    setEditDeadline(goal.deadline);
    setEditNotes(goal.notes);
    setEditLinkedFinanceMetric(goal.linkedFinanceMetric ?? "none");
    setEditCurrency(goal.currency ?? "PYG");
    setEditUnit(goal.unit ?? "");
  }

  function handleSaveEdit(id: string) {
    if (!editTitle.trim()) {
      alert(t(language, "goals.errorTitle", "Goal title cannot be empty."));
      return;
    }

    updateGoal(id, {
      title: editTitle.trim(),
      area: editArea.trim(),
      status: editStatus,
      currentValue: editLinkedFinanceMetric === "savings" ? 0 : editCurrentValue,
      targetValue: editTargetValue,
      deadline: editDeadline,
      notes: editNotes.trim(),
      linkedFinanceMetric: editLinkedFinanceMetric,
      currency: editCurrency,
      unit: editUnit.trim(),
    });

    xp.awardXP("goal-updated", {
      amount: 25,
      label: `Updated goal: ${editTitle}`,
    });

    setEditingGoalId(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError(t(language, "goals.errorAddTitle", "Add a goal title."));
      return;
    }

    addGoal({
      ...draft,
      currentValue: draft.linkedFinanceMetric === "savings" ? 0 : draft.currentValue,
    });
    
    xp.awardXP("goal-updated", {
      amount: 25,
      label: `Created goal: ${draft.title}`,
    });

    setDraft(initialDraft);
    setError("");
    setShowAddForm(false);
  }

  function handleHabitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!habitDraft.title.trim()) {
      setHabitError(t(language, "goals.habit.errorTitle"));
      return;
    }

    addGoal({
      title: habitDraft.title.trim(),
      area: habitDraft.area.trim() || "Personal",
      status: "active",
      currentValue: 0,
      targetValue: habitDraft.targetPerDay > 0 ? habitDraft.targetPerDay : 1,
      deadline: "",
      notes: habitDraft.notes.trim(),
      linkedFinanceMetric: "none",
      currency: "PYG",
      unit: habitDraft.unit.trim() || "day",
      goalType: "daily_habit",
      habitFrequency: "daily",
      habitTargetPerDay: habitDraft.targetPerDay > 0 ? habitDraft.targetPerDay : 1,
      habitUnit: habitDraft.unit.trim() || "day",
      habitStartDate: todayISO(),
      habitCheckIns: {},
    });

    setHabitDraft(initialHabitDraft);
    setHabitError("");
    setShowHabitForm(false);
  }

  function handleHabitCheckIn(goal: Goal, status: HabitCheckInStatus) {
    checkInHabitGoal(
      goal.id,
      status,
      todayISO(),
      status === "completed" ? goal.habitTargetPerDay ?? 1 : undefined,
      habitNotes[goal.id],
    );
    setHabitNotes((current) => ({ ...current, [goal.id]: "" }));
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C8A96A]">
            {t(language, "goals.eyebrow", "Objectives & Vision")}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            {t(language, "goals.title", "Goals Tracker")}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadGoalsSummaryMarkdown(goals)}
            disabled={goals.length === 0}
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-850 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t(language, "goals.exportSummary", "Export Goals summary")}
          </button>
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
        {/* Left Column: Form Toggle and Collapsible Form */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center"
          >
            {showAddForm ? t(language, "goals.closeForm", "Close Form") : t(language, "goals.createNew", "+ Create New Goal")}
          </button>

          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl flex flex-col gap-4.5 animate-fade-in-up"
            >
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-[#27272a] pb-2 mb-1">
                {t(language, "goals.newDetails", "New Goal Details")}
              </p>
              
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.goalTitle", "Goal Title *")}
                <input
                  placeholder={t(language, "goals.titlePlaceholder", "e.g. Build $10,000 emergency fund")}
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-[#C8A96A] focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3.5">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "goals.targetArea", "Target Area")}
                  <input
                    placeholder={t(language, "goals.areaPlaceholder", "e.g. Personal, Health")}
                    value={draft.area}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, area: event.target.value }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                  />
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "goals.initialStatus", "Initial Status")}
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        status: event.target.value as GoalStatus,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                  >
                    <option value="active">{t(language, "common.active")}</option>
                    <option value="completed">{t(language, "common.completed")}</option>
                    <option value="paused">{t(language, "common.paused")}</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "goals.financialLink", "Financial Link")}
                  <select
                    value={draft.linkedFinanceMetric}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        linkedFinanceMetric: event.target.value as "none" | "savings",
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                  >
                    <option value="none">{t(language, "common.none")}</option>
                    <option value="savings">{t(language, "goals.savingsVault", "Savings Vault")}</option>
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "goals.baseCurrency", "Base Currency")}
                  <select
                    value={draft.currency}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        currency: event.target.value as Currency,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                  >
                    <option value="PYG">PYG</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3.5">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "goals.metricUnit", "Metric Unit Description")}
                  <input
                    placeholder={t(language, "goals.unitPlaceholder", "e.g. USD, kg, books, miles")}
                    value={draft.unit}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, unit: event.target.value }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm font-semibold focus:border-[#C8A96A] focus:outline-none"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3.5">
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t(language, "goals.currentProgress", "Current Progress")}
                    <input
                      type="number"
                      disabled={draft.linkedFinanceMetric === "savings"}
                      value={draft.linkedFinanceMetric === "savings" ? "" : draft.currentValue}
                      placeholder={draft.linkedFinanceMetric === "savings" ? t(language, "goals.auto", "Auto") : "0"}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          currentValue: Number(event.target.value) || 0,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </label>

                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t(language, "goals.targetValue", "Target Goal Value")}
                    <input
                      type="number"
                      value={draft.targetValue}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          targetValue: Number(event.target.value) || 0,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.milestoneDeadline", "Milestone Deadline")}
                <input
                  type="date"
                  value={draft.deadline}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, deadline: event.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.objectiveNotes", "Objective Action Notes")}
                <textarea
                  placeholder={t(language, "goals.notesPlaceholder", "Describe strategy, schedule, or details...")}
                  rows={3}
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none placeholder:text-zinc-650"
                />
              </label>

              {error && (
                <p className="text-sm font-semibold text-[#C27A6B]">{error}</p>
              )}
              
              <button
                type="submit"
                className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full"
              >
                {t(language, "goals.saveObjective", "Save Goal Objective")}
              </button>
            </form>
          )}

          <button
            onClick={() => setShowHabitForm(!showHabitForm)}
            className="rounded-lg border border-[#8A9A5B]/25 bg-[#8A9A5B]/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#A8B582] transition hover:bg-[#8A9A5B]/20 w-full shadow-md text-center"
          >
            {showHabitForm ? t(language, "goals.habit.closeForm") : t(language, "goals.habit.create")}
          </button>

          {showHabitForm && (
            <form
              onSubmit={handleHabitSubmit}
              className="rounded-xl border border-[#8A9A5B]/20 bg-[#18181b] p-6 shadow-xl flex flex-col gap-4 animate-fade-in-up"
            >
              <div className="border-b border-[#27272a] pb-2">
                <p className="text-xs font-bold text-[#9AAB6B] uppercase tracking-widest">
                  {t(language, "goals.habit.new")}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                  {t(language, "goals.habit.helper")}
                </p>
              </div>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.habit.title")}
                <input
                  placeholder={t(language, "goals.habit.titlePlaceholder")}
                  value={habitDraft.title}
                  onChange={(event) =>
                    setHabitDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-[#8A9A5B] focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3.5">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "common.area")}
                  <input
                    placeholder={t(language, "goals.areaPlaceholder", "e.g. Personal, Health")}
                    value={habitDraft.area}
                    onChange={(event) =>
                      setHabitDraft((current) => ({ ...current, area: event.target.value }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#8A9A5B] focus:outline-none"
                  />
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "goals.habit.targetPerDay")}
                  <input
                    type="number"
                    min={1}
                    value={habitDraft.targetPerDay}
                    onChange={(event) =>
                      setHabitDraft((current) => ({
                        ...current,
                        targetPerDay: Number(event.target.value) || 1,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#8A9A5B] focus:outline-none"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.habit.unit")}
                <input
                  placeholder={t(language, "goals.habit.unitPlaceholder")}
                  value={habitDraft.unit}
                  onChange={(event) =>
                    setHabitDraft((current) => ({ ...current, unit: event.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-[#8A9A5B] focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "common.notes")}
                <textarea
                  placeholder={t(language, "goals.habit.notesPlaceholder")}
                  rows={3}
                  value={habitDraft.notes}
                  onChange={(event) =>
                    setHabitDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-[#8A9A5B] focus:outline-none placeholder:text-zinc-650"
                />
              </label>

              {habitError && (
                <p className="text-sm font-semibold text-[#C27A6B]">{habitError}</p>
              )}

              <button
                type="submit"
                className="rounded-lg bg-[#8A9A5B] hover:bg-[#9AAB6B] text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full"
              >
                {t(language, "goals.habit.save")}
              </button>
            </form>
          )}

          {/* Compact Savings Vault Control */}
          <div className="rounded-xl border border-[#C8A96A]/20 bg-[#18181b] p-5 shadow-lg flex flex-col gap-3.5 mt-2">
            <div>
              <p className="text-[10px] font-bold text-[#C8A96A] uppercase tracking-wider leading-none mb-1">{t(language, "goals.vaultBalance", "Vault Balance")}</p>
              <h3 className="text-sm font-bold text-zinc-300">{t(language, "goals.savingsVault", "Goal Savings Vault")}</h3>
            </div>

            {isEditingSavings ? (
              <div className="flex flex-col gap-3 rounded-lg bg-[#121214] p-3.5 border border-[#27272a] animate-fade-in-up">
                <label className="grid gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "goals.amount", "Amount")}
                  <input
                    type="number"
                    value={savingsAmountDraft}
                    onChange={(e) => setSavingsAmountDraft(Number(e.target.value) || 0)}
                    className="rounded border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-100 font-bold focus:outline-none text-xs"
                  />
                </label>
                <label className="grid gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "goals.currency", "Currency")}
                  <select
                    value={savingsCurrencyDraft}
                    onChange={(e) => setSavingsCurrencyDraft(e.target.value as Currency)}
                    className="rounded border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-105 focus:outline-none text-xs cursor-pointer w-full"
                  >
                    <option value="PYG">PYG</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleSaveSavings}
                    className="rounded bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition flex-1 text-center cursor-pointer"
                  >
                    {t(language, "common.save")}
                  </button>
                  <button
                    onClick={() => setIsEditingSavings(false)}
                    className="rounded border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition flex-1 text-center cursor-pointer"
                  >
                    {t(language, "common.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5 flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-2xl font-black text-[#C8A96A] tracking-tight leading-none">
                    {formatMoney(savings.currentAmount, savings.currency)}
                  </p>
                  <button
                    onClick={() => {
                      setSavingsAmountDraft(savings.currentAmount);
                      setSavingsCurrencyDraft(savings.currency);
                      setIsEditingSavings(true);
                    }}
                    className="text-[10px] font-bold uppercase tracking-wider text-[#D4B87A] hover:text-[#D4B87A] transition hover:underline cursor-pointer"
                  >
                    {t(language, "goals.adjustBalance", "Adjust Balance")}
                  </button>
                </div>
                {hasMounted && savings.updatedAt && (
                  <p className="text-[9px] text-zinc-500 italic leading-none">
                    {t(language, "goals.synced", "Synced")}: {formatDateStable(savings.updatedAt)}
                  </p>
                )}
              </div>
            )}

            <div className="text-[10px] text-zinc-400 bg-[#C8A96A]/5 border border-[#C8A96A]/10 p-3 rounded-lg leading-normal flex flex-col gap-1.5">
              <p className="font-bold text-amber-450 uppercase tracking-wide leading-none">🔒 {t(language, "goals.reservedNotice", "Reserved Savings Notice")}</p>
              <p>{t(language, "goals.reservedDescription", "These funds are completely reserved for target milestones and excluded from spendable Available Money.")}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Goal list */}
        <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
          <div className="mb-8 rounded-xl border border-[#8A9A5B]/20 bg-[#8A9A5B]/[0.03] p-5">
            <div className="flex flex-col gap-3 border-b border-[#27272a]/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9AAB6B]">
                  {t(language, "goals.habit.eyebrow")}
                </p>
                <h3 className="mt-1 text-xl font-bold text-zinc-100">
                  {t(language, "goals.habit.titleSection")}
                </h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {t(language, "goals.habit.description")}
                </p>
              </div>
              {activeHabitGoals.length > 0 && (
                <span className="w-fit rounded-full border border-[#8A9A5B]/25 bg-[#8A9A5B]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#A8B582]">
                  {activeHabitGoals.length} {t(language, "goals.habit.active")}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-3">
              {habitGoals.length > 0 ? (
                habitGoals.map((goal) => {
                  const stats = getHabitGoalStats(goal, todayDate);
                  const todayStatusClass =
                    stats.todayStatus === "completed"
                      ? "border-[#8A9A5B]/25 bg-[#8A9A5B]/10 text-[#A8B582]"
                      : stats.todayStatus === "missed"
                      ? "border-[#B26A5B]/25 bg-[#B26A5B]/10 text-[#C27A6B]"
                      : stats.todayStatus === "skipped"
                      ? "border-zinc-600/40 bg-zinc-800/50 text-zinc-300"
                      : "border-[#C8A96A]/25 bg-[#C8A96A]/10 text-[#D4B87A]";

                  return (
                    <article
                      key={goal.id}
                      className="rounded-lg border border-[#27272a] bg-[#121214] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-bold text-zinc-100">
                              {goal.title}
                            </h4>
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${todayStatusClass}`}>
                              {t(language, `goals.habit.status.${stats.todayStatus}`, stats.todayStatus)}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                            {goal.area} &middot; {goal.habitTargetPerDay ?? 1} {goal.habitUnit ?? goal.unit ?? t(language, "goals.habit.defaultUnit")} / {t(language, "goals.habit.day")}
                          </p>
                          {goal.notes && (
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
                              {goal.notes}
                            </p>
                          )}
                        </div>

                        <div className="grid min-w-[220px] grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-2">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                              {t(language, "goals.habit.currentStreak")}
                            </p>
                            <p className="mt-1 text-lg font-black text-[#A8B582]">
                              {stats.currentStreak}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-2">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                              {t(language, "goals.habit.bestStreak")}
                            </p>
                            <p className="mt-1 text-lg font-black text-[#D4B87A]">
                              {stats.bestStreak}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-2">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                              {t(language, "goals.habit.completionRate")}
                            </p>
                            <p className="mt-1 text-lg font-black text-[#7F97A9]">
                              {stats.completionRate}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-3 border-t border-[#27272a]/60 pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {stats.currentStreak > 0 && (
                            <StreakBadge
                              streak={stats.currentStreak}
                              label={t(language, "goals.habit.streakLabel")}
                              size="sm"
                            />
                          )}
                          <span className="rounded-full border border-[#27272a] bg-[#18181b] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                            {stats.totalCompletedDays} {t(language, "goals.habit.completedDays")}
                          </span>
                        </div>

                        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                          <input
                            value={habitNotes[goal.id] ?? ""}
                            onChange={(event) =>
                              setHabitNotes((current) => ({
                                ...current,
                                [goal.id]: event.target.value,
                              }))
                            }
                            placeholder={t(language, "goals.habit.todayNotePlaceholder")}
                            className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-zinc-100 focus:border-[#8A9A5B] focus:outline-none"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!hasMounted || goal.status !== "active"}
                              onClick={() => handleHabitCheckIn(goal, "completed")}
                              className="rounded-lg border border-[#8A9A5B]/25 bg-[#8A9A5B]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#A8B582] transition hover:bg-[#8A9A5B]/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t(language, "goals.habit.markCompleted")}
                            </button>
                            <button
                              type="button"
                              disabled={!hasMounted || goal.status !== "active"}
                              onClick={() => handleHabitCheckIn(goal, "missed")}
                              className="rounded-lg border border-[#B26A5B]/25 bg-[#B26A5B]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#C27A6B] transition hover:bg-[#B26A5B]/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t(language, "goals.habit.markMissed")}
                            </button>
                            <button
                              type="button"
                              disabled={!hasMounted || goal.status !== "active"}
                              onClick={() => handleHabitCheckIn(goal, "skipped")}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t(language, "goals.habit.skipToday")}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteGoal(goal.id)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#C27A6B] transition hover:border-[#B26A5B]/20 hover:bg-[#B26A5B]/10"
                            >
                              {t(language, "common.delete")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-5 text-xs leading-6 text-zinc-500">
                  {t(language, "goals.habit.empty")}
                </p>
              )}
            </div>
          </div>

          <h3 className="text-base font-bold text-zinc-100">{t(language, "goals.activeDirectory", "Active Goals Directory")}</h3>
          <p className="text-xs text-zinc-400 mt-1">{t(language, "goals.directoryDescription", "Review active targets, metrics, and linked saving progress.")}</p>
          
          <div className="mt-6 grid gap-4">
            {standardGoals.length > 0 ? (
              standardGoals.map((goal) => {
                const progress = getGoalProgress(
                  goal,
                  savings,
                  settings.baseCurrency,
                  settings.exchangeRateUsdToPyg
                );
                const isEditing = editingGoalId === goal.id;

                return (
                  <article
                    key={goal.id}
                    className="rounded-lg border border-[#27272a] bg-[#121214]/60 p-5 shadow-md transition hover:bg-[#121214]"
                  >
                    {isEditing ? (
                      <div className="grid gap-4.5 text-xs">
                        <div className="flex justify-between items-center border-b border-[#27272a] pb-2">
                          <span className="font-bold text-[#C8A96A] uppercase tracking-widest text-[10px]">{t(language, "goals.editingObjective", "Editing Goal Objective")}</span>
                          <button
                            onClick={() => setEditingGoalId(null)}
                            className="text-zinc-400 hover:text-white"
                          >
                            {t(language, "goals.discard", "Discard")}
                          </button>
                        </div>
                        
                        <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                          {t(language, "goals.goalTitleShort", "Goal Title")}
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-sm font-semibold text-zinc-100 focus:outline-none"
                          />
                        </label>

                        <div className="grid grid-cols-2 gap-3.5">
                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "common.area")}
                            <input
                              type="text"
                              value={editArea}
                              onChange={(e) => setEditArea(e.target.value)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-zinc-100 focus:outline-none"
                            />
                          </label>

                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "common.status")}
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as GoalStatus)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-100 focus:outline-none"
                            >
                              <option value="active">{t(language, "common.active")}</option>
                              <option value="completed">{t(language, "common.completed")}</option>
                              <option value="paused">{t(language, "common.paused")}</option>
                            </select>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "goals.financialLink", "Financial Link")}
                            <select
                              value={editLinkedFinanceMetric}
                              onChange={(e) =>
                                setEditLinkedFinanceMetric(e.target.value as "none" | "savings")
                              }
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-100 focus:outline-none"
                            >
                              <option value="none">{t(language, "common.none")}</option>
                              <option value="savings">{t(language, "goals.savingsVault", "Savings Vault")}</option>
                            </select>
                          </label>

                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "goals.currency", "Currency")}
                            <select
                              value={editCurrency}
                              onChange={(e) => setEditCurrency(e.target.value as Currency)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-100 focus:outline-none"
                            >
                              <option value="PYG">PYG</option>
                              <option value="USD">USD</option>
                            </select>
                          </label>
                        </div>

                        <div className="grid gap-3.5">
                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "goals.unit", "Unit")}
                            <input
                              type="text"
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-zinc-100 focus:outline-none"
                            />
                          </label>

                          <div className="grid grid-cols-2 gap-3.5">
                            <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                              {t(language, "goals.currentProgress", "Current Progress")}
                              <input
                                type="number"
                                disabled={editLinkedFinanceMetric === "savings"}
                                value={editLinkedFinanceMetric === "savings" ? "" : editCurrentValue}
                                placeholder={editLinkedFinanceMetric === "savings" ? t(language, "goals.auto", "Auto") : "0"}
                                onChange={(e) => setEditCurrentValue(Number(e.target.value) || 0)}
                                className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-100 focus:outline-none disabled:opacity-40"
                              />
                            </label>

                            <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                              {t(language, "goals.targetValue", "Target Goal Value")}
                              <input
                                type="number"
                                value={editTargetValue}
                                onChange={(e) => setEditTargetValue(Number(e.target.value) || 100)}
                                className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-100 focus:outline-none"
                              />
                            </label>
                          </div>
                        </div>

                        <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                          {t(language, "goals.deadline", "Deadline")}
                          <input
                            type="date"
                            value={editDeadline}
                            onChange={(e) => setEditDeadline(e.target.value)}
                            className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-zinc-100 focus:outline-none"
                          />
                        </label>

                        <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                          {t(language, "common.notes")}
                          <textarea
                            rows={2}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-zinc-100 focus:outline-none resize-none"
                          />
                        </label>

                        <div className="flex gap-2 justify-end border-t border-[#27272a] pt-3">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(goal.id)}
                            className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-2 font-bold uppercase tracking-wider transition"
                          >
                            {t(language, "goals.saveChanges", "Save Changes")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingGoalId(null)}
                            className="rounded-lg border border-[#27272a] bg-zinc-800 hover:bg-zinc-700 px-4 py-2 font-bold uppercase tracking-wider text-zinc-300 transition"
                          >
                            {t(language, "common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-zinc-100 text-lg leading-snug break-words">
                                {goal.title}
                              </h4>
                              <span className="rounded bg-zinc-900 border border-[#27272a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-400">
                                {goal.area}
                              </span>
                              <span className="rounded bg-[#C8A96A]/10 border border-[#C8A96A]/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#C8A96A] capitalize">
                                {t(language, `goals.status.${goal.status}`, goal.status)}
                              </span>
                              {goal.linkedFinanceMetric === "savings" && (
                                <span className="rounded bg-[#8A9A5B]/10 border border-[#8A9A5B]/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#9AAB6B]">
                                  {t(language, "goals.fundedBySavings", "Funded by savings")}
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 text-xs text-zinc-500 font-bold uppercase tracking-wide">
                              {goal.deadline ? `${t(language, "goals.deadlineTarget", "Deadline Target")}: ${goal.deadline}` : t(language, "goals.noDeadline", "No specific deadline")}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditing(goal)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                            >
                              {t(language, "goals.edit", "Edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteGoal(goal.id)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#C27A6B] transition hover:bg-[#B26A5B]/10 hover:border-[#B26A5B]/20"
                            >
                              {t(language, "common.delete")}
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="h-1.5 rounded-full bg-zinc-850 overflow-hidden border border-[#27272a]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#9C7A5F] to-[#D4B87A] shadow-[0_0_8px_rgba(245,158,11,0.3)] transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-zinc-400">
                            <span>
                              {goal.linkedFinanceMetric === "savings" ? (
                                <>
                                  {t(language, "goals.savingsBalanceVs", "Savings balance vs")}{" "}
                                  {formatGoalNumber(goal.targetValue)}{" "}
                                  {goal.unit || goal.currency}
                                </>
                              ) : (
                                <>
                                  {formatGoalNumber(goal.currentValue)} /{" "}
                                  {formatGoalNumber(goal.targetValue)}{" "}
                                  {goal.unit}
                                </>
                              )}
                            </span>
                            <span className="font-bold text-[#C8A96A]">{progress}%</span>
                          </div>
                        </div>

                        {goal.notes && (
                          <div className="mt-3.5 text-xs text-zinc-400 bg-[#18181b] border border-[#27272a]/70 p-3 rounded-lg leading-relaxed italic">
                            &ldquo;{goal.notes}&rdquo;
                          </div>
                        )}

                        {goal.linkedFinanceMetric === "savings" && (
                          <div className="mt-4 rounded-xl border border-[#C8A96A]/10 bg-[#C8A96A]/[0.02] p-4 text-xs animate-fade-in-up">
                            <p className="font-bold text-[#C8A96A] uppercase tracking-widest text-[9px] mb-3">
                              📊 {t(language, "goals.planning.title", "Financial Plan")}
                            </p>
                            
                            {!goal.deadline ? (
                              <p className="text-zinc-550 italic">
                                {t(language, "goals.planning.addDeadlinePrompt", "Add a target date to calculate a savings pace.")}
                              </p>
                            ) : (
                              (() => {
                                const plan = calculateFinancialGoalPlan(
                                  goal,
                                  savings,
                                  settings.baseCurrency,
                                  settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150,
                                  todayDate
                                );
                                
                                return (
                                  <div className="grid gap-3">
                                    {plan.isReached ? (
                                      <div className="rounded bg-[#8A9A5B]/10 border border-[#8A9A5B]/20 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9AAB6B]">
                                        🎉 {t(language, "goals.planning.reached", "Goal reached")}
                                      </div>
                                    ) : plan.isPastDeadline ? (
                                      <div className="rounded bg-[#B26A5B]/10 border border-[#B26A5B]/20 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C27A6B]">
                                        ⚠️ {t(language, "goals.planning.behindTarget", "Behind target")} / {t(language, "goals.planning.deadlineReached", "Deadline reached")}
                                      </div>
                                    ) : null}

                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                      <div>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                          {t(language, "goals.planning.remaining", "Remaining")}
                                        </p>
                                        <p className="mt-1 font-bold text-zinc-200">
                                          {formatMoney(plan.remainingAmount, plan.currency)}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                          {t(language, "goals.planning.perDay", "Needed per day")}
                                        </p>
                                        <p className="mt-1 font-bold text-zinc-200">
                                          {formatMoney(plan.perDay, plan.currency)}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                          {t(language, "goals.planning.perWeek", "Needed per week")}
                                        </p>
                                        <p className="mt-1 font-bold text-zinc-200">
                                          {formatMoney(plan.perWeek, plan.currency)}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                          {t(language, "goals.planning.perMonth", "Needed per month")}
                                        </p>
                                        <p className="mt-1 font-bold text-zinc-200">
                                          {formatMoney(plan.perMonth, plan.currency)}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-[#27272a]/40 pt-2 text-[10px] text-zinc-500">
                                      <span>
                                        {t(language, "goals.planning.targetDate", "Target date")}:{" "}
                                        <span className="font-bold text-zinc-400">{goal.deadline}</span>
                                      </span>
                                      {!plan.isReached && !plan.isPastDeadline && (
                                        <span>
                                          {plan.daysRemaining} {language === "es" ? "días restantes" : "days remaining"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-6 text-xs text-zinc-500 italic text-center">
                {t(language, "goals.empty", "No goals created yet. Use panel on the left to set active targets.")}
              </p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

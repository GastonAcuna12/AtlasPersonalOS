"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { GoalsCloudPanel } from "@/components/GoalsCloudPanel";
import { downloadGoalsSummaryMarkdown } from "@/lib/markdownExport";
import { getGoalProgress, useGoals, type GoalDraft, type GoalStatus, type Goal } from "@/lib/goals";
import { useXP } from "@/lib/xp";
import { useSavings, formatMoney, formatDateStable } from "@/lib/finances";
import { useAtlasSettings } from "@/lib/settings";
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

export function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();
  const xp = useXP();
  const { savings, updateSavings } = useSavings();
  const { settings } = useAtlasSettings();

  const [isEditingSavings, setIsEditingSavings] = useState(false);
  const [savingsAmountDraft, setSavingsAmountDraft] = useState(savings.currentAmount);
  const [savingsCurrencyDraft, setSavingsCurrencyDraft] = useState<Currency>(savings.currency);

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
      alert("Goal title cannot be empty.");
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
      setError("Add a goal title.");
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            Objectives &amp; Vision
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            Goals Tracker
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadGoalsSummaryMarkdown(goals)}
            disabled={goals.length === 0}
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-850 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export Goals summary
          </button>
          <Link
            href="/"
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <GoalsCloudPanel localGoals={goals} />

      {/* Main Section */}
      <section className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr] items-start">
        {/* Left Column: Form Toggle and Collapsible Form */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center"
          >
            {showAddForm ? "Close Form" : "+ Create New Goal"}
          </button>

          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl flex flex-col gap-4.5 animate-fade-in-up"
            >
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-[#27272a] pb-2 mb-1">
                New Goal Details
              </p>
              
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Goal Title *
                <input
                  placeholder="e.g. Build $10,000 emergency fund"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-amber-500 focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3.5">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Target Area
                  <input
                    placeholder="e.g. Personal, Health"
                    value={draft.area}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, area: event.target.value }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Initial Status
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        status: event.target.value as GoalStatus,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Financial Link
                  <select
                    value={draft.linkedFinanceMetric}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        linkedFinanceMetric: event.target.value as "none" | "savings",
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="savings">Savings Vault</option>
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Base Currency
                  <select
                    value={draft.currency}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        currency: event.target.value as Currency,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="PYG">PYG</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3.5">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Metric Unit Description
                  <input
                    placeholder="e.g. USD, kg, books, miles"
                    value={draft.unit}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, unit: event.target.value }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm font-semibold focus:border-amber-500 focus:outline-none"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3.5">
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Current Progress
                    <input
                      type="number"
                      disabled={draft.linkedFinanceMetric === "savings"}
                      value={draft.linkedFinanceMetric === "savings" ? "" : draft.currentValue}
                      placeholder={draft.linkedFinanceMetric === "savings" ? "Auto" : "0"}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          currentValue: Number(event.target.value) || 0,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </label>

                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Target Goal Value
                    <input
                      type="number"
                      value={draft.targetValue}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          targetValue: Number(event.target.value) || 0,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Milestone Deadline
                <input
                  type="date"
                  value={draft.deadline}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, deadline: event.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Objective Action Notes
                <textarea
                  placeholder="Describe strategy, schedule, or details..."
                  rows={3}
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none placeholder:text-zinc-650"
                />
              </label>

              {error && (
                <p className="text-sm font-semibold text-red-400">{error}</p>
              )}
              
              <button
                type="submit"
                className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full"
              >
                Save Goal Objective
              </button>
            </form>
          )}

          {/* Compact Savings Vault Control */}
          <div className="rounded-xl border border-amber-500/20 bg-[#18181b] p-5 shadow-lg flex flex-col gap-3.5 mt-2">
            <div>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider leading-none mb-1">Vault Balance</p>
              <h3 className="text-sm font-bold text-zinc-300">Goal Savings Vault</h3>
            </div>

            {isEditingSavings ? (
              <div className="flex flex-col gap-3 rounded-lg bg-[#121214] p-3.5 border border-[#27272a] animate-fade-in-up">
                <label className="grid gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Amount
                  <input
                    type="number"
                    value={savingsAmountDraft}
                    onChange={(e) => setSavingsAmountDraft(Number(e.target.value) || 0)}
                    className="rounded border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-100 font-bold focus:outline-none text-xs"
                  />
                </label>
                <label className="grid gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Currency
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
                    className="rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition flex-1 text-center cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingSavings(false)}
                    className="rounded border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition flex-1 text-center cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5 flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-2xl font-black text-amber-500 tracking-tight leading-none">
                    {formatMoney(savings.currentAmount, savings.currency)}
                  </p>
                  <button
                    onClick={() => {
                      setSavingsAmountDraft(savings.currentAmount);
                      setSavingsCurrencyDraft(savings.currency);
                      setIsEditingSavings(true);
                    }}
                    className="text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition hover:underline cursor-pointer"
                  >
                    Adjust Balance
                  </button>
                </div>
                {savings.updatedAt && (
                  <p className="text-[9px] text-zinc-500 italic leading-none">
                    Synced: {formatDateStable(savings.updatedAt)}
                  </p>
                )}
              </div>
            )}

            <div className="text-[10px] text-zinc-400 bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg leading-normal flex flex-col gap-1.5">
              <p className="font-bold text-amber-450 uppercase tracking-wide leading-none">🔒 Reserved Savings Notice</p>
              <p>These funds are completely reserved for target milestones and excluded from spendable Available Money.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Goal list */}
        <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
          <h3 className="text-base font-bold text-zinc-100">Active Goals Directory</h3>
          <p className="text-xs text-zinc-400 mt-1">Review active targets, metrics, and linked saving progress.</p>
          
          <div className="mt-6 grid gap-4">
            {goals.length > 0 ? (
              goals.map((goal) => {
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
                          <span className="font-bold text-amber-500 uppercase tracking-widest text-[10px]">Editing Goal Objective</span>
                          <button
                            onClick={() => setEditingGoalId(null)}
                            className="text-zinc-400 hover:text-white"
                          >
                            Discard
                          </button>
                        </div>
                        
                        <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                          Goal Title
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-sm font-semibold text-zinc-100 focus:outline-none"
                          />
                        </label>

                        <div className="grid grid-cols-2 gap-3.5">
                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            Area
                            <input
                              type="text"
                              value={editArea}
                              onChange={(e) => setEditArea(e.target.value)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-zinc-100 focus:outline-none"
                            />
                          </label>

                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            Status
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as GoalStatus)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-100 focus:outline-none"
                            >
                              <option value="active">Active</option>
                              <option value="completed">Completed</option>
                              <option value="paused">Paused</option>
                            </select>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            Financial Link
                            <select
                              value={editLinkedFinanceMetric}
                              onChange={(e) =>
                                setEditLinkedFinanceMetric(e.target.value as "none" | "savings")
                              }
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-100 focus:outline-none"
                            >
                              <option value="none">None</option>
                              <option value="savings">Savings Vault</option>
                            </select>
                          </label>

                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            Currency
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
                            Unit
                            <input
                              type="text"
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-zinc-100 focus:outline-none"
                            />
                          </label>

                          <div className="grid grid-cols-2 gap-3.5">
                            <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                              Current Progress
                              <input
                                type="number"
                                disabled={editLinkedFinanceMetric === "savings"}
                                value={editLinkedFinanceMetric === "savings" ? "" : editCurrentValue}
                                placeholder={editLinkedFinanceMetric === "savings" ? "Auto" : "0"}
                                onChange={(e) => setEditCurrentValue(Number(e.target.value) || 0)}
                                className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-zinc-100 focus:outline-none disabled:opacity-40"
                              />
                            </label>

                            <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                              Target Goal Value
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
                          Deadline
                          <input
                            type="date"
                            value={editDeadline}
                            onChange={(e) => setEditDeadline(e.target.value)}
                            className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-zinc-100 focus:outline-none"
                          />
                        </label>

                        <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                          Notes
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
                            className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2 font-bold uppercase tracking-wider transition"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingGoalId(null)}
                            className="rounded-lg border border-[#27272a] bg-zinc-800 hover:bg-zinc-700 px-4 py-2 font-bold uppercase tracking-wider text-zinc-300 transition"
                          >
                            Cancel
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
                              <span className="rounded bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-500 capitalize">
                                {goal.status}
                              </span>
                              {goal.linkedFinanceMetric === "savings" && (
                                <span className="rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                                  Funded by savings
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 text-xs text-zinc-500 font-bold uppercase tracking-wide">
                              {goal.deadline ? `Deadline Target: ${goal.deadline}` : "No specific deadline"}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditing(goal)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteGoal(goal.id)}
                              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500/10 hover:border-red-500/20"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="h-1.5 rounded-full bg-zinc-850 overflow-hidden border border-[#27272a]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)] transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-zinc-400">
                            <span>
                              {goal.linkedFinanceMetric === "savings" ? (
                                <>
                                  Savings balance vs{" "}
                                  {new Intl.NumberFormat().format(goal.targetValue)}{" "}
                                  {goal.unit || goal.currency}
                                </>
                              ) : (
                                <>
                                  {new Intl.NumberFormat().format(goal.currentValue)} /{" "}
                                  {new Intl.NumberFormat().format(goal.targetValue)}{" "}
                                  {goal.unit}
                                </>
                              )}
                            </span>
                            <span className="font-bold text-amber-500">{progress}%</span>
                          </div>
                        </div>

                        {goal.notes && (
                          <div className="mt-3.5 text-xs text-zinc-400 bg-[#18181b] border border-[#27272a]/70 p-3 rounded-lg leading-relaxed italic">
                            &ldquo;{goal.notes}&rdquo;
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-6 text-xs text-zinc-500 italic text-center">
                No goals created yet. Use panel on the left to set active targets.
              </p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

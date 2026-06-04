"use client";

import React, { useState, FormEvent, useMemo } from "react";
import { t } from "@/lib/i18n";
import { formatMoney, calculateBudgetUsage, calculateBudgetSummaryForMonth } from "@/lib/finances";
import type { Currency, FinanceBudgetDraft, FinanceBudget, Transaction } from "@/types/atlas";

interface FinancesBudgetsPanelProps {
  language: "en" | "es";
  baseCurrency: Currency;
  usdToPygRate: number;
  budgets: FinanceBudget[];
  transactions: Transaction[];
  activeMonth: string;
  categories: string[];
  createFinanceBudget: (draft: FinanceBudgetDraft) => FinanceBudget;
  updateFinanceBudget: (id: string, changes: Partial<FinanceBudgetDraft & Pick<FinanceBudget, "isActive">>) => void;
  deleteFinanceBudget: (id: string) => void;
}

const initialBudgetDraft: FinanceBudgetDraft = {
  name: "",
  category: "Food",
  amount: 0,
  currency: "PYG",
  period: "monthly",
  isActive: true,
  notes: "",
  warningThresholdPercent: 80,
  rolloverEnabled: false,
  startMonth: "",
  endMonth: "",
};

export function FinancesBudgetsPanel({
  language,
  baseCurrency,
  usdToPygRate,
  budgets,
  transactions,
  activeMonth,
  categories,
  createFinanceBudget,
  updateFinanceBudget,
  deleteFinanceBudget,
}: FinancesBudgetsPanelProps) {
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState<FinanceBudgetDraft>(initialBudgetDraft);
  const [budgetError, setBudgetError] = useState("");

  const budgetSummary = useMemo(() => {
    return calculateBudgetSummaryForMonth(budgets, transactions, baseCurrency, usdToPygRate, activeMonth);
  }, [budgets, transactions, baseCurrency, usdToPygRate, activeMonth]);

  const resetBudgetForm = () => {
    setBudgetDraft(initialBudgetDraft);
    setEditingBudgetId(null);
    setShowBudgetForm(false);
    setBudgetError("");
  };

  const handleBudgetSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!budgetDraft.name.trim()) {
      setBudgetError("Please enter a name for the budget.");
      return;
    }
    if (budgetDraft.amount <= 0) {
      setBudgetError("Please enter an amount greater than 0.");
      return;
    }

    if (editingBudgetId) {
      updateFinanceBudget(editingBudgetId, budgetDraft);
    } else {
      createFinanceBudget(budgetDraft);
    }

    resetBudgetForm();
  };

  const editBudget = (budget: FinanceBudget) => {
    setBudgetDraft({
      name: budget.name,
      category: budget.category,
      amount: budget.amount,
      currency: budget.currency,
      period: budget.period,
      isActive: budget.isActive,
      notes: budget.notes ?? "",
      warningThresholdPercent: budget.warningThresholdPercent ?? 80,
      rolloverEnabled: budget.rolloverEnabled ?? false,
      startMonth: budget.startMonth ?? "",
      endMonth: budget.endMonth ?? "",
    });
    setEditingBudgetId(budget.id);
    setShowBudgetForm(true);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr] items-start animate-fade-in-up">
      {/* Left Column: Form Toggle and Form */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => {
            if (showBudgetForm) {
              resetBudgetForm();
            } else {
              setShowBudgetForm(true);
            }
          }}
          className="rounded-lg border border-[#C8A96A]/25 bg-[#C8A96A]/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#D4B87A] transition hover:bg-[#C8A96A]/15 w-full shadow-md text-center"
        >
          {showBudgetForm ? t(language, "goals.closeForm", "Close Form") : t(language, "finances.budgets.create", "+ Create Budget")}
        </button>

        {showBudgetForm && (
          <form
            onSubmit={handleBudgetSubmit}
            className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl flex flex-col gap-4.5 animate-fade-in-up"
          >
            <div className="border-b border-[#27272a] pb-2 mb-1">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {editingBudgetId ? t(language, "finances.budgets.edit", "Edit Budget") : t(language, "finances.budgets.new", "New Budget")}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                {t(
                  language,
                  "finances.budgets.noCommitment",
                  "Budgets track expected spending by category. They do not reserve money or create transactions."
                )}
              </p>
            </div>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.budgets.name", "Budget Name")}
              <input
                value={budgetDraft.name}
                onChange={(e) => setBudgetDraft({ ...budgetDraft, name: e.target.value })}
                placeholder="e.g. Food budget"
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                required
              />
            </label>

            <div className="grid grid-cols-2 gap-3.5">
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.budgets.amount", "Budget Amount")}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetDraft.amount || ""}
                  onChange={(e) => setBudgetDraft({ ...budgetDraft, amount: Number(e.target.value) })}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-[#C8A96A] focus:outline-none"
                  required
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.currency", "Currency")}
                <select
                  value={budgetDraft.currency}
                  onChange={(e) => setBudgetDraft({ ...budgetDraft, currency: e.target.value as Currency })}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                >
                  <option value="PYG">PYG</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.budgets.category", "Budget Category")}
              <select
                value={budgetDraft.category}
                onChange={(e) => setBudgetDraft({ ...budgetDraft, category: e.target.value })}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-[#C8A96A] focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider cursor-pointer py-1">
              <input
                type="checkbox"
                checked={budgetDraft.isActive}
                onChange={(e) => setBudgetDraft({ ...budgetDraft, isActive: e.target.checked })}
                className="accent-[#C8A96A] h-4 w-4 rounded border-[#27272a] bg-[#121214]"
              />
              {t(language, "finances.budgets.active", "Active")}
            </label>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.budgets.notes", "Notes / Description")}
              <textarea
                value={budgetDraft.notes}
                onChange={(e) => setBudgetDraft({ ...budgetDraft, notes: e.target.value })}
                rows={2}
                className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
              />
            </label>

            {budgetError && <p className="text-[#C27A6B] text-xs font-semibold">{budgetError}</p>}

            <button
              type="submit"
              className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full"
            >
              {editingBudgetId
                ? t(language, "finances.budgets.update", "Update Budget")
                : t(language, "finances.budgets.save", "Save Budget")}
            </button>
          </form>
        )}
      </div>

      {/* Right Column: Listing */}
      <div className="grid gap-6">
        <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
          <div className="flex flex-col gap-2 border-b border-[#27272a] pb-3 mb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">
                {t(language, "finances.budgets.eyebrow", "Expense Budgets")}
              </p>
              <h3 className="mt-1 text-xl font-bold text-zinc-100">
                {t(language, "finances.budgets.titleSection", "Monthly Budgets")}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t(language, "finances.budgets.spent", "Spent")}:{" "}
                {formatMoney(budgetSummary.totalSpentInBase, baseCurrency)} /{" "}
                {formatMoney(budgetSummary.totalBudgetedInBase, baseCurrency)}
              </p>
            </div>
          </div>

          <div className="grid gap-3.5">
            {budgets.length > 0 ? (
              budgets.map((budget) => {
                const usage = calculateBudgetUsage(budget, transactions, usdToPygRate, activeMonth);
                const isNear = usage.status === "near_limit";
                const isOver = usage.status === "over_budget";
                const statusLabel = isOver
                  ? t(language, "finances.budgets.status.over_budget", "Over Budget")
                  : isNear
                  ? t(language, "finances.budgets.status.near_limit", "Near Limit")
                  : t(language, "finances.budgets.status.healthy", "Healthy");

                return (
                  <article
                    key={budget.id}
                    className={`grid gap-4 rounded-lg border bg-[#121214]/60 p-4 md:grid-cols-[1fr_auto] items-center transition ${
                      !budget.isActive
                        ? "opacity-50 border-[#27272a]"
                        : isOver
                        ? "border-[#B26A5B]/25"
                        : isNear
                        ? "border-[#C8A96A]/25"
                        : "border-[#27272a]"
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-zinc-100 text-sm leading-snug">{budget.name}</p>
                        <span className="rounded bg-zinc-900 border border-[#27272a] px-2 py-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          {budget.category}
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            !budget.isActive
                              ? "bg-zinc-800 text-zinc-500 border-[#27272a]"
                              : isOver
                              ? "bg-[#B26A5B]/10 text-[#C27A6B] border-[#B26A5B]/20"
                              : isNear
                              ? "bg-[#C8A96A]/10 text-[#D4B87A] border-[#C8A96A]/20"
                              : "bg-[#8A9A5B]/10 text-[#9AAB6B] border-[#8A9A5B]/20"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {budget.isActive && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-zinc-400 font-semibold mb-1">
                            <span>
                              {usage.percentUsed.toFixed(0)}% {t(language, "finances.budgets.used", "used")}
                            </span>
                            <span>
                              {formatMoney(usage.spent, budget.currency)} / {formatMoney(budget.amount, budget.currency)}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                isOver ? "bg-[#B26A5B]" : isNear ? "bg-[#C8A96A]" : "bg-[#8A9A5B]"
                              }`}
                              style={{ width: `${Math.min(100, usage.percentUsed)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {budget.notes && <p className="mt-2.5 text-[11px] text-zinc-400 italic">{budget.notes}</p>}
                    </div>

                    <div className="flex flex-col gap-2 md:items-end justify-between">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-zinc-300">
                          {usage.remaining >= 0
                            ? `${t(language, "finances.budgets.remaining", "Remaining")}: ${formatMoney(
                                usage.remaining,
                                budget.currency
                              )}`
                            : `${t(language, "finances.budgets.status.over_budget", "Over Budget")}: ${formatMoney(
                                Math.abs(usage.remaining),
                                budget.currency
                              )}`}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => editBudget(budget)}
                          className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800"
                        >
                          {t(language, "common.edit", "Edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                t(
                                  language,
                                  "finances.budgets.confirmDelete",
                                  "Are you sure you want to delete this budget?"
                                )
                              )
                            ) {
                              deleteFinanceBudget(budget.id);
                            }
                          }}
                          className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C27A6B] transition hover:bg-[#B26A5B]/10 hover:border-[#B26A5B]/20"
                        >
                          {t(language, "common.delete")}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-6 text-xs text-zinc-500 italic text-center">
                {t(language, "finances.budgets.empty", "No category budgets configured yet.")}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

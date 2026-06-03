"use client";

import React, { useState, FormEvent } from "react";
import { t } from "@/lib/i18n";
import { useXP } from "@/lib/xp";
import { formatMoney, PAYMENT_METHODS, type PlannedExpenseOccurrence } from "@/lib/finances";
import type { Currency, PaymentMethod, PlannedExpenseDraft, PlannedExpense, PlannedExpenseRecurrence, Transaction } from "@/types/atlas";

interface FinancesPlannedPaymentsPanelProps {
  language: "en" | "es";
  categories: string[];
  visiblePlannedExpenses: PlannedExpenseOccurrence[];
  createPlannedExpense: (draft: PlannedExpenseDraft) => PlannedExpense;
  updatePlannedExpense: (id: string, changes: Partial<PlannedExpenseDraft & Pick<PlannedExpense, "status">>) => void;
  deletePlannedExpense: (id: string) => void;
  markPlannedExpensePaid: (id: string, occurrenceDueDate?: string) => Transaction | null;
  skipPlannedExpense: (id: string, occurrenceDueDate?: string) => void;
  getPlannedTimingLabel: (plannedExpense: PlannedExpenseOccurrence) => string;
}

function createInitialPlannedDraft(): PlannedExpenseDraft {
  return {
    title: "",
    amount: 0,
    currency: "PYG",
    category: "",
    dueDate: new Date().toISOString().slice(0, 10),
    recurrence: "none",
    dayOfMonth: undefined,
    paymentMethod: "Debit",
    notes: "",
  };
}

function plannedExpenseStatusClass(status: string) {
  if (status === "paid") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  }
  if (status === "skipped") {
    return "border-zinc-600 bg-zinc-800/60 text-zinc-400";
  }
  if (status === "cancelled") {
    return "border-red-500/25 bg-red-500/10 text-red-300";
  }
  return "border-amber-500/25 bg-amber-500/10 text-amber-400";
}

export function FinancesPlannedPaymentsPanel({
  language,
  categories,
  visiblePlannedExpenses,
  createPlannedExpense,
  updatePlannedExpense,
  deletePlannedExpense,
  markPlannedExpensePaid,
  skipPlannedExpense,
  getPlannedTimingLabel,
}: FinancesPlannedPaymentsPanelProps) {
  const xp = useXP();
  const [plannedDraft, setPlannedDraft] = useState<PlannedExpenseDraft>(createInitialPlannedDraft);
  const [showPlannedForm, setShowPlannedForm] = useState(false);
  const [editingPlannedId, setEditingPlannedId] = useState<string | null>(null);
  const [plannedError, setPlannedError] = useState("");

  function updatePlannedDraft<Value extends keyof PlannedExpenseDraft>(key: Value, value: PlannedExpenseDraft[Value]) {
    setPlannedDraft((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      if (key === "dueDate" && next.recurrence === "monthly") {
        next.dayOfMonth = Number(String(value).slice(8, 10)) || next.dayOfMonth;
      }

      if (key === "recurrence" && value === "monthly" && !next.dayOfMonth) {
        next.dayOfMonth = Number(next.dueDate.slice(8, 10)) || 1;
      }

      return next;
    });
  }

  function validatePlannedExpense(plannedExpense: PlannedExpenseDraft) {
    if (!plannedExpense.title.trim()) {
      return t(language, "finances.planned.errorTitle");
    }
    if (!plannedExpense.amount || plannedExpense.amount <= 0) {
      return t(language, "finances.errorAmount", "Enter an amount greater than 0.");
    }
    if (!plannedExpense.category.trim()) {
      return t(language, "finances.errorCategory", "Choose or enter a category.");
    }
    if (!plannedExpense.dueDate) {
      return t(language, "finances.errorDate", "Choose a transaction date.");
    }
    if (
      plannedExpense.recurrence === "monthly" &&
      (!plannedExpense.dayOfMonth || plannedExpense.dayOfMonth < 1 || plannedExpense.dayOfMonth > 31)
    ) {
      return t(language, "finances.planned.errorDayOfMonth");
    }
    return "";
  }

  function resetPlannedForm() {
    setPlannedDraft(createInitialPlannedDraft());
    setEditingPlannedId(null);
    setPlannedError("");
    setShowPlannedForm(false);
  }

  function handlePlannedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validatePlannedExpense(plannedDraft);

    if (validationMessage) {
      setPlannedError(validationMessage);
      return;
    }

    const payload = {
      ...plannedDraft,
      title: plannedDraft.title.trim(),
      category: plannedDraft.category.trim(),
      notes: plannedDraft.notes?.trim(),
      dayOfMonth:
        plannedDraft.recurrence === "monthly"
          ? plannedDraft.dayOfMonth ?? Number(plannedDraft.dueDate.slice(8, 10))
          : undefined,
    };

    if (editingPlannedId) {
      updatePlannedExpense(editingPlannedId, payload);
    } else {
      createPlannedExpense(payload);
    }

    resetPlannedForm();
  }

  function editPlannedExpense(plannedExpense: PlannedExpenseOccurrence) {
    setPlannedDraft({
      title: plannedExpense.title,
      amount: plannedExpense.amount,
      currency: plannedExpense.currency,
      category: plannedExpense.category,
      dueDate: plannedExpense.dueDate,
      recurrence: plannedExpense.recurrence,
      dayOfMonth: plannedExpense.dayOfMonth,
      paymentMethod: plannedExpense.paymentMethod,
      notes: plannedExpense.notes,
    });
    setEditingPlannedId(plannedExpense.sourceExpenseId);
    setShowPlannedForm(true);
    setPlannedError("");
  }

  function handleMarkPlannedPaidInternal(plannedExpense: PlannedExpenseOccurrence) {
    const confirmed = window.confirm(`${t(language, "finances.planned.confirmPaid")} ${plannedExpense.title}?`);

    if (!confirmed) {
      return;
    }

    const transaction = markPlannedExpensePaid(plannedExpense.sourceExpenseId, plannedExpense.occurrenceDueDate);

    if (transaction) {
      xp.awardXP("finance-transaction", {
        amount: 10,
        label: t(language, "finances.planned.paidXp"),
      });
    }
  }

  function handleSkipPlannedInternal(plannedExpense: PlannedExpenseOccurrence) {
    const confirmed = window.confirm(`${t(language, "finances.planned.confirmSkip")} ${plannedExpense.title}?`);

    if (confirmed) {
      skipPlannedExpense(plannedExpense.sourceExpenseId, plannedExpense.occurrenceDueDate);
    }
  }

  function handleDeletePlannedInternal(plannedExpense: PlannedExpenseOccurrence) {
    const confirmed = window.confirm(`${t(language, "finances.planned.confirmDelete")} ${plannedExpense.title}?`);

    if (confirmed) {
      deletePlannedExpense(plannedExpense.sourceExpenseId);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr] items-start animate-fade-in-up">
      {/* Left Column: Form Toggle and Form */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => {
            if (showPlannedForm) {
              resetPlannedForm();
            } else {
              setShowPlannedForm(true);
            }
          }}
          className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center"
        >
          {showPlannedForm ? t(language, "goals.closeForm", "Close Form") : t(language, "finances.addTransaction", "+ Add Planned")}
        </button>

        {showPlannedForm && (
          <form
            onSubmit={handlePlannedSubmit}
            className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl flex flex-col gap-4.5 animate-fade-in-up"
          >
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-[#27272a] pb-2 mb-1">
              {editingPlannedId
                ? t(language, "finances.planned.update", "Update Planned")
                : t(language, "finances.newTransaction", "New Planned")}
            </p>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "common.title")} *
              <input
                type="text"
                value={plannedDraft.title}
                onChange={(event) => updatePlannedDraft("title", event.target.value)}
                placeholder="e.g. Rent, internet bill"
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                required
              />
            </label>

            <div className="grid grid-cols-2 gap-3.5">
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.amount")} *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={plannedDraft.amount || ""}
                  onChange={(event) => updatePlannedDraft("amount", Number(event.target.value))}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-amber-500 focus:outline-none"
                  required
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.currency")}
                <select
                  value={plannedDraft.currency}
                  onChange={(event) => updatePlannedDraft("currency", event.target.value as Currency)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="PYG">PYG</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.categoryRequired", "Category *")}
              <select
                value={plannedDraft.category}
                onChange={(event) => updatePlannedDraft("category", event.target.value)}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-amber-500 focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                required
              >
                <option value="" disabled>
                  {t(language, "finances.selectCategory", "Select category")}
                </option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3.5">
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.planned.dueDate")}
                <input
                  type="date"
                  value={plannedDraft.dueDate}
                  onChange={(event) => updatePlannedDraft("dueDate", event.target.value)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.planned.recurrence")}
                <select
                  value={plannedDraft.recurrence}
                  onChange={(event) =>
                    updatePlannedDraft("recurrence", event.target.value as PlannedExpenseRecurrence)
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="none">{t(language, "finances.planned.oneTime")}</option>
                  <option value="monthly">{t(language, "finances.planned.monthly")}</option>
                </select>
              </label>
            </div>

            {plannedDraft.recurrence === "monthly" && (
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.planned.dayOfMonth")}
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={plannedDraft.dayOfMonth || ""}
                  onChange={(event) => updatePlannedDraft("dayOfMonth", Number(event.target.value))}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>
            )}

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.method", "Method")}
              <select
                value={plannedDraft.paymentMethod || ""}
                onChange={(event) => updatePlannedDraft("paymentMethod", (event.target.value as PaymentMethod) || undefined)}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="">{t(language, "finances.planned.methodOptional")}</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "common.notes")}
              <textarea
                value={plannedDraft.notes || ""}
                onChange={(event) => updatePlannedDraft("notes", event.target.value)}
                rows={2}
                className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-amber-500 focus:outline-none"
              />
            </label>

            {plannedError && <p className="text-red-400 text-xs font-semibold">{plannedError}</p>}

            <button
              type="submit"
              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full"
            >
              {editingPlannedId ? t(language, "finances.planned.update") : t(language, "finances.planned.save")}
            </button>
          </form>
        )}
      </div>

      {/* Right Column: Listing */}
      <div className="grid gap-6">
        <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
          <div className="flex flex-col gap-2 border-b border-[#27272a] pb-3 mb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                {t(language, "finances.planned.eyebrow")}
              </p>
              <h3 className="mt-1 text-xl font-bold text-zinc-100">
                {t(language, "finances.planned.titleSection")}
              </h3>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {visiblePlannedExpenses.length} {t(language, "finances.planned.items")}
            </p>
          </div>

          <div className="grid gap-3.5">
            {visiblePlannedExpenses.length > 0 ? (
              visiblePlannedExpenses.map((plannedExpense) => (
                <article
                  key={`${plannedExpense.sourceExpenseId}-${plannedExpense.occurrenceMonth}`}
                  className={`grid gap-4 rounded-lg border bg-[#121214]/60 p-4 md:grid-cols-[1fr_auto] items-center transition ${
                    plannedExpense.isOverdue
                      ? "border-red-500/25"
                      : plannedExpense.isDueSoon
                      ? "border-amber-500/25"
                      : "border-[#27272a]"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-zinc-100 text-sm leading-snug">{plannedExpense.title}</p>
                      <span className="rounded bg-zinc-900 border border-[#27272a] px-2 py-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {plannedExpense.category}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${plannedExpenseStatusClass(
                          plannedExpense.effectiveStatus
                        )}`}
                      >
                        {t(
                          language,
                          `finances.planned.status.${plannedExpense.effectiveStatus}`,
                          plannedExpense.effectiveStatus
                        )}
                      </span>
                      {plannedExpense.recurrence === "monthly" && (
                        <span className="rounded border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                          {t(language, "finances.planned.monthly")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {plannedExpense.occurrenceDueDate} &middot; {getPlannedTimingLabel(plannedExpense)}
                      {plannedExpense.paymentMethod ? ` · ${plannedExpense.paymentMethod}` : ""}
                    </p>
                    {plannedExpense.notes && (
                      <p className="mt-2 text-[11px] text-zinc-400 italic line-clamp-2">{plannedExpense.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <p className="font-bold text-sm tracking-tight text-zinc-100">
                      {formatMoney(plannedExpense.amount, plannedExpense.currency)}
                    </p>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <button
                        type="button"
                        onClick={() => handleMarkPlannedPaidInternal(plannedExpense)}
                        className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/15"
                      >
                        {t(language, "finances.planned.markPaid")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSkipPlannedInternal(plannedExpense)}
                        className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:bg-zinc-800"
                      >
                        {t(language, "finances.planned.skip")}
                      </button>
                      <button
                        type="button"
                        onClick={() => editPlannedExpense(plannedExpense)}
                        className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800"
                      >
                        {t(language, "common.edit", "Edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlannedInternal(plannedExpense)}
                        className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500/10 hover:border-red-500/20"
                      >
                        {t(language, "common.delete")}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-6 text-xs text-zinc-500 italic text-center">
                {t(language, "finances.planned.empty")}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

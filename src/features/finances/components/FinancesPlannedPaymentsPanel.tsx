"use client";

import React, { useState, FormEvent, useMemo } from "react";
import { t } from "@/lib/i18n";
import { useXP } from "@/lib/xp";
import {
  formatMoney,
  PAYMENT_METHODS,
  type PlannedExpenseOccurrence,
  useFinanceAccounts,
} from "@/lib/finances";
import { useAtlasSettings } from "@/lib/settings";
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

function createInitialPlannedDraft(accountId?: string): PlannedExpenseDraft {
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
    cashflowType: "expense",
    accountId,
  };
}

function plannedExpenseStatusClass(status: string, isIncome = false) {
  if (isIncome) {
    return status === "paid"
      ? "border-[#6F8799]/25 bg-[#6F8799]/10 text-[#7F97A9]"
      : "border-[#8A9A5B]/25 bg-[#8A9A5B]/10 text-[#9AAB6B]";
  }
  if (status === "skipped") {
    return "border-zinc-600 bg-zinc-800/60 text-zinc-400";
  }
  if (status === "overdue") {
    return "border-[#B26A5B]/25 bg-[#B26A5B]/10 text-[#C27A6B]";
  }
  return "border-[#C8A96A]/25 bg-[#C8A96A]/10 text-[#D4B87A]";
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
  const { accounts } = useFinanceAccounts();
  const { settings } = useAtlasSettings();

  const activeAccounts = useMemo(() => accounts.filter((acc) => acc.isActive), [accounts]);
  const defaultAccount = useMemo(() => {
    if (!settings.defaultFinanceAccountId) return undefined;
    return activeAccounts.find((acc) => acc.id === settings.defaultFinanceAccountId);
  }, [activeAccounts, settings.defaultFinanceAccountId]);

  function getInitialAccountId() {
    if (activeAccounts.length === 1) return activeAccounts[0].id;
    if (activeAccounts.length > 1 && defaultAccount) return defaultAccount.id;
    return undefined;
  }

  const [plannedDraft, setPlannedDraft] = useState<PlannedExpenseDraft>(() =>
    createInitialPlannedDraft(getInitialAccountId())
  );
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
    if (activeAccounts.length > 0 && !plannedExpense.accountId) {
      return t(language, "finances.accounts.errorSelectRequired", "Please select an account.");
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
    setPlannedDraft(createInitialPlannedDraft(getInitialAccountId()));
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
      cashflowType: plannedExpense.cashflowType ?? "expense",
      accountId: plannedExpense.accountId,
    });
    setEditingPlannedId(plannedExpense.sourceExpenseId);
    setShowPlannedForm(true);
    setPlannedError("");
  }

  function handleMarkPlannedPaidInternal(plannedExpense: PlannedExpenseOccurrence) {
    const confirmed = window.confirm(`${t(language, "finances.planned.confirmPaid", "Mark paid")} ${plannedExpense.title}?`);

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

  function handleMarkPlannedReceivedInternal(plannedExpense: PlannedExpenseOccurrence) {
    const confirmed = window.confirm(`${t(language, "finances.planned.confirmReceived", "Mark this expected income as received?")} ${plannedExpense.title}?`);

    if (!confirmed) {
      return;
    }

    const transaction = markPlannedExpensePaid(plannedExpense.sourceExpenseId, plannedExpense.occurrenceDueDate);

    if (transaction) {
      xp.awardXP("finance-transaction", {
        amount: 10,
        label: t(language, "finances.planned.receivedXp", "Received expected income"),
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
          className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center"
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
                ? (plannedDraft.cashflowType === "income"
                  ? t(language, "finances.planned.updateIncome", "Update Income")
                  : t(language, "finances.planned.update", "Update Planned"))
                : (plannedDraft.cashflowType === "income"
                  ? t(language, "finances.planned.newIncome", "New Income")
                  : t(language, "finances.newTransaction", "New Planned"))}
            </p>

            {/* Type Selector */}
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => updatePlannedDraft("cashflowType", "expense")}
                className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition border cursor-pointer ${
                  plannedDraft.cashflowType !== "income"
                    ? "bg-[#C8A96A] text-zinc-950 border-[#C8A96A]"
                    : "bg-[#121214] text-zinc-400 border-[#27272a] hover:bg-zinc-800"
                }`}
              >
                {t(language, "finances.planned.type.expense", "Expense")}
              </button>
              <button
                type="button"
                onClick={() => updatePlannedDraft("cashflowType", "income")}
                className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition border cursor-pointer ${
                  plannedDraft.cashflowType === "income"
                    ? "bg-[#6F8799] text-zinc-950 border-[#6F8799]"
                    : "bg-[#121214] text-zinc-400 border-[#27272a] hover:bg-zinc-800"
                }`}
              >
                {t(language, "finances.planned.type.income", "Income")}
              </button>
            </div>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "common.title")} *
              <input
                type="text"
                value={plannedDraft.title}
                onChange={(event) => updatePlannedDraft("title", event.target.value)}
                placeholder={plannedDraft.cashflowType === "income" ? "e.g. Salary, monthly retainer" : "e.g. Rent, internet bill"}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
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
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-[#C8A96A] focus:outline-none"
                  required
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.currency")}
                <select
                  value={plannedDraft.currency}
                  onChange={(event) => updatePlannedDraft("currency", event.target.value as Currency)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                >
                  <option value="PYG">PYG</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            {/* Account Selector */}
            {activeAccounts.length > 0 && (
              <div className="grid gap-2 animate-fade-in-up">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>
                    {plannedDraft.cashflowType === "income"
                      ? t(language, "finances.planned.targetAccount", "Target account")
                      : t(language, "finances.planned.sourceAccount", "Source account")}{" "}
                    *
                  </span>
                  {activeAccounts.length === 1 && (
                    <span className="text-[10px] text-zinc-550 lowercase italic">
                      ({t(language, "finances.accounts.autoSelected", "auto-selected")})
                    </span>
                  )}
                </label>
                
                {activeAccounts.length === 1 ? (
                  <div className="rounded-lg border border-[#27272a] bg-[#121214]/60 px-3.5 py-2.5 text-zinc-350 text-sm font-medium">
                    {activeAccounts[0].name} ({activeAccounts[0].currency})
                  </div>
                ) : (
                  <select
                    value={plannedDraft.accountId || ""}
                    onChange={(event) => updatePlannedDraft("accountId", event.target.value || undefined)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                    required
                  >
                    <option value="" disabled>
                      -- {t(language, "finances.accounts.select", "Select account")} --
                    </option>
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({t(language, `finances.accounts.type.${acc.type}`, acc.type)}) [{acc.currency}] {acc.institution ? `· ${acc.institution}` : ""}
                      </option>
                    ))}
                  </select>
                )}

                {/* Currency mismatch warning */}
                {(() => {
                  if (!plannedDraft.accountId) return null;
                  const selectedAcc = activeAccounts.find((a) => a.id === plannedDraft.accountId);
                  if (selectedAcc && selectedAcc.currency !== plannedDraft.currency) {
                    return (
                      <p className="text-[10px] font-semibold text-[#C8A96A] bg-[#C8A96A]/5 border border-[#C8A96A]/10 p-2 rounded leading-normal mt-0.5 animate-fade-in-up">
                        ⚠️ {t(language, "finances.accounts.currencyMismatch", "Transaction currency differs from account currency.")}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {activeAccounts.length === 0 && (
              <p className="text-[10px] font-medium text-zinc-550 italic leading-normal">
                ℹ️ {t(language, "finances.accounts.saveWithoutAccount", "This transaction will be saved without an account.")}{" "}
                {t(language, "finances.accounts.createPrompt", "Create an account to organize transactions.")}
              </p>
            )}

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.categoryRequired", "Category *")}
              <select
                value={plannedDraft.category}
                onChange={(event) => updatePlannedDraft("category", event.target.value)}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-[#C8A96A] focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
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
                {plannedDraft.cashflowType === "income"
                  ? t(language, "finances.planned.expectedDate", "Expected date")
                  : t(language, "finances.planned.dueDate", "Due date")}
                <input
                  type="date"
                  value={plannedDraft.dueDate}
                  onChange={(event) => updatePlannedDraft("dueDate", event.target.value)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.planned.recurrence")}
                <select
                  value={plannedDraft.recurrence}
                  onChange={(event) =>
                    updatePlannedDraft("recurrence", event.target.value as PlannedExpenseRecurrence)
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
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
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                />
              </label>
            )}

            {plannedDraft.cashflowType !== "income" && (
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.method", "Method")}
                <select
                  value={plannedDraft.paymentMethod || ""}
                  onChange={(event) => updatePlannedDraft("paymentMethod", (event.target.value as PaymentMethod) || undefined)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                >
                  <option value="">{t(language, "finances.planned.methodOptional")}</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "common.notes")}
              <textarea
                value={plannedDraft.notes || ""}
                onChange={(event) => updatePlannedDraft("notes", event.target.value)}
                rows={2}
                className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-[#C8A96A] focus:outline-none"
              />
            </label>

            {plannedError && <p className="text-[#C27A6B] text-xs font-semibold">{plannedError}</p>}

            <button
              type="submit"
              className={`rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center ${
                plannedDraft.cashflowType === "income"
                  ? "bg-[#6F8799] hover:bg-[#7F97A9] text-zinc-950"
                  : "bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950"
              }`}
            >
              {editingPlannedId
                ? (plannedDraft.cashflowType === "income" ? t(language, "finances.planned.updateIncome", "Update Income") : t(language, "finances.planned.update"))
                : (plannedDraft.cashflowType === "income" ? t(language, "finances.planned.saveIncome", "Save Income") : t(language, "finances.planned.save"))}
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
              visiblePlannedExpenses.map((plannedExpense) => {
                const isIncome = plannedExpense.cashflowType === "income";
                return (
                  <article
                    key={`${plannedExpense.sourceExpenseId}-${plannedExpense.occurrenceMonth}`}
                    className={`grid gap-4 rounded-lg border bg-[#121214]/60 p-4 md:grid-cols-[1fr_auto] items-center transition ${
                      plannedExpense.isOverdue && !isIncome
                        ? "border-[#B26A5B]/25"
                        : plannedExpense.isDueSoon && !isIncome
                        ? "border-[#C8A96A]/25"
                        : isIncome && plannedExpense.effectiveStatus === "pending"
                        ? "border-[#6F8799]/15"
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
                            plannedExpense.effectiveStatus,
                            isIncome
                          )}`}
                        >
                          {plannedExpense.effectiveStatus === "paid" && isIncome
                            ? t(language, "finances.planned.status.received", "Received")
                            : t(
                                language,
                                `finances.planned.status.${plannedExpense.effectiveStatus}`,
                                plannedExpense.effectiveStatus
                              )}
                        </span>
                        {plannedExpense.accountId && (() => {
                          const acc = accounts.find((a) => a.id === plannedExpense.accountId);
                          if (acc) {
                            return (
                              <span className="rounded bg-[#1b1b1e] border border-[#27272a] px-2 py-0.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                                🏦 {acc.name}
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {plannedExpense.recurrence === "monthly" && (
                          <span className="rounded border border-[#6F8799]/25 bg-[#6F8799]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
                            {t(language, "finances.planned.monthly")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {plannedExpense.occurrenceDueDate} &middot; {getPlannedTimingLabel(plannedExpense)}
                        {plannedExpense.paymentMethod && !isIncome ? ` · ${plannedExpense.paymentMethod}` : ""}
                      </p>
                      {plannedExpense.notes && (
                        <p className="mt-2 text-[11px] text-zinc-400 italic line-clamp-2">{plannedExpense.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      <p className={`font-bold text-sm tracking-tight ${isIncome ? "text-[#7F97A9]" : "text-zinc-100"}`}>
                        {isIncome ? "+" : ""}
                        {formatMoney(plannedExpense.amount, plannedExpense.currency)}
                      </p>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {plannedExpense.effectiveStatus === "pending" && (
                          isIncome ? (
                            <button
                              type="button"
                              onClick={() => handleMarkPlannedReceivedInternal(plannedExpense)}
                              className="rounded-lg border border-[#6F8799]/25 bg-[#6F8799]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7F97A9] transition hover:bg-[#6F8799]/15 cursor-pointer"
                            >
                              {t(language, "finances.planned.markReceived", "Mark received")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMarkPlannedPaidInternal(plannedExpense)}
                              className="rounded-lg border border-[#8A9A5B]/25 bg-[#8A9A5B]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9AAB6B] transition hover:bg-[#8A9A5B]/15 cursor-pointer"
                            >
                              {t(language, "finances.planned.markPaid", "Mark paid")}
                            </button>
                          )
                        )}
                        {plannedExpense.effectiveStatus === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleSkipPlannedInternal(plannedExpense)}
                            className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:bg-zinc-800 cursor-pointer"
                          >
                            {t(language, "finances.planned.skip")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => editPlannedExpense(plannedExpense)}
                          className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 cursor-pointer"
                        >
                          {t(language, "common.edit", "Edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlannedInternal(plannedExpense)}
                          className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C27A6B] transition hover:bg-[#B26A5B]/10 hover:border-[#B26A5B]/20 cursor-pointer"
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
                {t(language, "finances.planned.empty")}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

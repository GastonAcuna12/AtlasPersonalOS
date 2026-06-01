"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  calculateFinanceOverview,
  buildFinanceInsights,
  FINANCE_CATEGORIES,
  filterTransactions,
  formatMoney,
  getCurrentMonth,
  PAYMENT_METHODS,
  useTransactions,
  useSavings,
} from "@/lib/finances";
import { useXP } from "@/lib/xp";
import { useAtlasSettings } from "@/lib/settings";
import { t } from "@/lib/i18n";

import type { Currency, PaymentMethod, TransactionDraft, TransactionType } from "@/types/atlas";

const initialDraft: TransactionDraft = {
  type: "expense",
  amount: 0,
  currency: "PYG",
  category: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "Debit",
  tag: "",
};

const quickExamples: TransactionDraft[] = [
  {
    type: "expense",
    amount: 65000,
    currency: "PYG",
    category: "Food",
    description: "Lunch and groceries",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "Debit",
    tag: "daily",
  },
  {
    type: "expense",
    amount: 12,
    currency: "USD",
    category: "Entertainment",
    description: "Streaming subscription",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "Credit",
    tag: "subscription",
  },
  {
    type: "income",
    amount: 4500000,
    currency: "PYG",
    category: "Salary",
    description: "Monthly salary",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "Bank Transfer",
    tag: "work",
  },
];

export function FinancesPage() {
  const xp = useXP();
  const { transactions, categories, addTransaction, deleteTransaction } = useTransactions();
  const { settings, setExchangeRate } = useAtlasSettings();
  const language = settings.language;
  const { savings } = useSavings();


  const [draft, setDraft] = useState(initialDraft);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filters, setFilters] = useState({
    month: getCurrentMonth(),
    type: "all" as "all" | TransactionType,
    category: "all",
    currency: "all" as "all" | Currency,
  });
  const [error, setError] = useState("");



  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [filters, transactions]
  );

  const overview = useMemo(
    () =>
      calculateFinanceOverview(
        transactions,
        settings.baseCurrency,
        settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150,
        savings,
        filters.month
      ),
    [transactions, settings.baseCurrency, settings.usdToPygRate, settings.exchangeRateUsdToPyg, savings, filters.month]
  );

  const insights = useMemo(
    () =>
      buildFinanceInsights(
        filteredTransactions,
        settings.baseCurrency,
        settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150
      ),
    [filteredTransactions, settings.baseCurrency, settings.usdToPygRate, settings.exchangeRateUsdToPyg]
  );

  const displayCurrency =
    filters.currency === "all" ? settings.baseCurrency : filters.currency;
  const expenseTotal = overview.expenses || 1;



  // Financial Warning State (Calculations)
  const savingsRatio = overview.totalBalance > 0 ? (overview.savingsInBaseCurrency / overview.totalBalance) : 0;
  let warningMessage = "";
  let warningType: "none" | "low" | "warning" | "danger" = "none";

  if (overview.savingsInBaseCurrency > overview.totalBalance) {
    warningMessage = t(language, "dashboard.warning.savingsExceed");
    warningType = "danger";
  } else if (overview.availableMoney < 0) {
    warningMessage = t(language, "dashboard.warning.availableNegative");
    warningType = "danger";
  } else if (savingsRatio > 0.8) {
    warningMessage = t(language, "dashboard.warning.mostReserved");
    warningType = "warning";
  } else if (overview.availableMoney > 0 && overview.availableMoney < (settings.baseCurrency === "PYG" ? 500000 : 100)) {
    warningMessage = t(language, "dashboard.warning.lowBalance");
    warningType = "low";
  }

  function updateDraft<Value extends keyof TransactionDraft>(
    key: Value,
    value: TransactionDraft[Value]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validateTransaction(transaction: TransactionDraft) {
    if (!transaction.amount || transaction.amount <= 0) {
      return t(language, "finances.errorAmount", "Enter an amount greater than 0.");
    }
    if (!transaction.category.trim()) {
      return t(language, "finances.errorCategory", "Choose or enter a category.");
    }
    if (!transaction.description.trim()) {
      return t(language, "finances.errorDescription", "Add a short description.");
    }
    if (!transaction.date) {
      return t(language, "finances.errorDate", "Choose a transaction date.");
    }
    return "";
  }

  function saveTransaction(transaction: TransactionDraft) {
    const validationMessage = validateTransaction(transaction);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    addTransaction({
      ...transaction,
      category: transaction.category.trim(),
      description: transaction.description.trim(),
      tag: transaction.tag?.trim(),
    });
    
    xp.awardXP("finance-transaction", {
      amount: 10,
      label: "Added finance transaction",
    });
    setDraft(initialDraft);
    setError("");
    setShowAddForm(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveTransaction(draft);
  }



  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            {t(language, "finances.eyebrow", "Capital Ledger")}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            {t(language, "finances.title", "Finances Hub")}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            {t(language, "finances.base", "Base")}: {settings.baseCurrency}
          </span>
          <div className="flex items-center gap-2 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span>{t(language, "finances.rate", "Rate")}: 1 USD =</span>
            <input
              type="number"
              value={settings.usdToPygRate}
              onChange={(e) => setExchangeRate(Number(e.target.value) || 6150)}
              className="w-16 rounded-md border border-[#27272a] bg-[#121214] px-2 py-1 text-center font-bold text-zinc-100 focus:outline-none"
            />
            <span>PYG</span>
          </div>
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
            className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center"
          >
            {showAddForm ? t(language, "goals.closeForm", "Close Form") : t(language, "finances.addTransaction", "+ Add Transaction")}
          </button>

          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl flex flex-col gap-4.5 animate-fade-in-up"
            >
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-[#27272a] pb-2 mb-1">
                {t(language, "finances.newTransaction", "New Transaction")}
              </p>
              
              <div className="grid grid-cols-2 gap-3.5">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "common.type")}
                  <select
                    value={draft.type}
                    onChange={(event) =>
                      updateDraft("type", event.target.value as TransactionType)
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                  >
                    <option value="expense">{t(language, "common.expense")}</option>
                    <option value="income">{t(language, "common.income")}</option>
                  </select>
                </label>
 
                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "goals.currency", "Currency")}
                  <select
                    value={draft.currency}
                    onChange={(event) =>
                      updateDraft("currency", event.target.value as Currency)
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                  >
                    <option value="PYG">PYG</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "work.amount", "Amount")}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.amount || ""}
                  onChange={(event) => updateDraft("amount", Number(event.target.value))}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-amber-500 focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.categoryRequired", "Category *")}
                <select
                  value={draft.category}
                  onChange={(event) => updateDraft("category", event.target.value)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-150 text-sm focus:border-amber-500 focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                  required
                >
                  <option value="" disabled>{t(language, "finances.selectCategory", "Select category")}</option>
                  {FINANCE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.descriptionMemo", "Description / Memo")}
                <input
                  value={draft.description}
                  onChange={(event) => updateDraft("description", event.target.value)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3.5">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "common.date")}
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => updateDraft("date", event.target.value)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "finances.method", "Method")}
                  <select
                    value={draft.paymentMethod}
                    onChange={(event) =>
                      updateDraft("paymentMethod", event.target.value as PaymentMethod)
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.optionalTag", "Optional Tag")}
                <input
                  value={draft.tag}
                  onChange={(event) => updateDraft("tag", event.target.value)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>

              {error && (
                <p className="text-red-400 text-xs font-semibold">{error}</p>
              )}

              <button
                type="submit"
                className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full"
              >
                {t(language, "finances.saveTransaction", "Save Transaction")}
              </button>

              <div className="mt-4 border-t border-[#27272a]/60 pt-4">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">{t(language, "finances.quickExamples", "Quick Examples")}</p>
                <div className="grid gap-1.5">
                  {quickExamples.map((example) => (
                    <button
                      type="button"
                      key={`${example.description}-${example.currency}`}
                      onClick={() => saveTransaction(example)}
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-left text-xs text-zinc-300 transition hover:bg-zinc-800"
                    >
                      {example.description} ({formatMoney(example.amount, example.currency)})
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Ledger balances, savings tracker, and transaction history */}
        <div className="grid gap-6">
          {/* Responsive Overview Grid */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Available Money Card */}
            <div className={`rounded-xl border p-5 shadow-lg flex flex-col justify-between min-h-[140px] transition ${
              warningType === "danger" 
                ? "border-red-500/30 bg-red-500/5 text-red-400" 
                : warningType === "warning"
                ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
                : warningType === "low"
                ? "border-blue-500/30 bg-blue-500/5 text-blue-400"
                : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
            }`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {t(language, "dashboard.availableMoney")}
                </p>
                <p className="mt-2.5 text-3xl font-black tracking-tight text-zinc-100 break-words leading-none">
                  {formatMoney(overview.availableMoney, settings.baseCurrency)}
                </p>
                <p className="text-[10px] text-zinc-450 font-semibold uppercase mt-1.5 tracking-wide">
                  {t(language, "dashboard.spendableBalance")}
                </p>
              </div>
              <div className="mt-3.5 border-t border-[#27272a]/40 pt-2.5 flex flex-col gap-1 text-[10px] text-zinc-500">
                <p className="text-[9px] font-bold uppercase tracking-wider">
                  {t(language, "finances.reservedExcluded", "Reserved goal funds are excluded")}
                </p>

                {warningMessage && (
                  <p className={`mt-1.5 text-[9px] font-bold uppercase tracking-wider leading-tight flex items-center gap-0.5 ${
                    warningType === "danger"
                      ? "text-red-400 animate-pulse"
                      : warningType === "warning"
                      ? "text-amber-400"
                      : "text-blue-400"
                  }`}>
                    <span>⚠️</span> {warningMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Income This Month */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg flex flex-col justify-between min-h-[140px]">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{t(language, "dashboard.incomeThisMonth")}</p>
                <p className="mt-2 text-2xl font-bold text-emerald-450 tracking-tight break-words leading-none">
                  {formatMoney(overview.monthlyIncome, settings.baseCurrency)}
                </p>
              </div>
              <p className="text-[9px] text-zinc-500 font-semibold uppercase leading-none">{t(language, "dashboard.monthInflow")}</p>
            </div>

            {/* Expenses This Month */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg flex flex-col justify-between min-h-[140px]">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{t(language, "dashboard.expensesThisMonth")}</p>
                <p className="mt-2 text-2xl font-bold text-red-400 tracking-tight break-words leading-none">
                  {formatMoney(overview.monthlyExpenses, settings.baseCurrency)}
                </p>
              </div>
              <p className="text-[9px] text-zinc-500 font-semibold uppercase leading-none">{t(language, "dashboard.monthOutflow")}</p>
            </div>

            {/* Net gain/loss */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg flex flex-col justify-between min-h-[140px]">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{t(language, "finances.netGainLoss", "Net Gain / Loss")}</p>
                <p className={`mt-2 text-2xl font-bold tracking-tight break-words leading-none ${overview.monthlyNet >= 0 ? "text-emerald-450" : "text-red-400"}`}>
                  {formatMoney(overview.monthlyNet, settings.baseCurrency)}
                </p>
              </div>
              <p className="text-[9px] text-zinc-500 font-semibold uppercase leading-none">{t(language, "finances.cashFlowBalance", "Cash Flow Balance")}</p>
            </div>
          </section>

          {/* Filtering Ledgers */}
          <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-450 border-b border-[#27272a] pb-2 mb-4">
              {t(language, "finances.filterRecords", "Filter Transaction Records")}
            </h3>
            <div className="grid gap-4.5 md:grid-cols-4">
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "common.month", "Month")}
                <input
                  type="month"
                  value={filters.month}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      month: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:outline-none"
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "common.type")}
                <select
                  value={filters.type}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      type: event.target.value as "all" | TransactionType,
                    }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:outline-none"
                >
                  <option value="all">{t(language, "common.all")}</option>
                  <option value="income">{t(language, "common.income")}</option>
                  <option value="expense">{t(language, "common.expense")}</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.category", "Category")}
                <select
                  value={filters.category}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:outline-none"
                >
                  <option value="all">{t(language, "common.all")}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.currency", "Currency")}
                <select
                  value={filters.currency}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      currency: event.target.value as "all" | Currency,
                    }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:outline-none"
                >
                  <option value="all">{t(language, "common.all")}</option>
                  <option value="PYG">PYG</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>
          </section>

          {/* Breakdown & Spending Insights */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Category breakdown */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-450 border-b border-[#27272a] pb-2 mb-4">
                {t(language, "finances.categoryDistribution", "Category Distribution")}
              </h3>
              <div className="grid gap-4">
                {Object.entries(overview.categoryTotals).length > 0 ? (
                  Object.entries(overview.categoryTotals).map(([category, total]) => (
                    <div key={category} className="text-xs">
                      <div className="flex justify-between gap-4 font-semibold">
                        <span className="text-zinc-300">{category}</span>
                        <span className="text-zinc-400">
                          {formatMoney(total, displayCurrency)} &middot;{" "}
                          <span className="text-amber-500 font-bold">{Math.round((total / expenseTotal) * 100)}%</span>
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-zinc-900 border border-[#27272a]/60">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{
                            width: `${Math.round((total / expenseTotal) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 italic py-2">
                    {t(language, "finances.noExpenses", "No expenses logged for this month.")}
                  </p>
                )}
              </div>
            </div>

            {/* Spending Insights */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-450 border-b border-[#27272a] pb-2 mb-4">
                {t(language, "finances.insights", "Financial Insights")}
              </h3>
              <div className="grid gap-3 text-xs leading-relaxed">
                {insights.length > 0 ? (
                  insights.map((insight) => (
                    <p
                      key={insight}
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-300 leading-relaxed"
                    >
                      {insight}
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 italic py-2">
                    {t(language, "finances.noInsights", "Add transaction logs to compute spend dynamics and signals.")}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Transactions list history */}
          <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-450 border-b border-[#27272a] pb-2 mb-4">
              {t(language, "finances.ledgerTransactions", "Ledger Transactions")}
            </h3>
            <div className="grid gap-3.5 max-h-[400px] overflow-y-auto pr-1">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <article
                    key={transaction.id}
                    className="grid gap-4 rounded-lg border border-[#27272a] bg-[#121214]/60 p-4 md:grid-cols-[1fr_auto] items-center hover:bg-[#121214] transition"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-zinc-150 text-sm leading-snug">{transaction.description}</p>
                        <span className="rounded bg-zinc-900 border border-[#27272a] px-2 py-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          {transaction.category}
                        </span>
                        {transaction.tag && (
                          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                            #{transaction.tag}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {transaction.date} &middot; {t(language, "finances.paidVia", "Paid via")} {transaction.paymentMethod}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 md:justify-end">
                      <p
                        className={`font-bold text-sm tracking-tight ${
                          transaction.type === "income" ? "text-emerald-450" : "text-zinc-200"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatMoney(transaction.amount, transaction.currency)}
                      </p>
                      <button
                        type="button"
                        onClick={() => deleteTransaction(transaction.id)}
                        className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500/10 hover:border-red-500/20"
                      >
                        {t(language, "common.delete")}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-6 text-xs text-zinc-500 italic text-center">
                  {t(language, "finances.empty", "No transaction records found matching active filter.")}
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

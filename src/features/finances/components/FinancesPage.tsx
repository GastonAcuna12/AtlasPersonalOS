/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  calculateFinanceOverview,
  calculateUpcomingCommitments,
  buildFinanceInsights,
  filterTransactions,
  getUpcomingPlannedExpenses,
  usePlannedExpenses,
  useTransactions,
  useSavings,
  useFinanceBudgets,
  useFinanceAccounts,
  type PlannedExpenseOccurrence,
} from "@/lib/finances";
import { useAtlasSettings } from "@/lib/settings";
import { t } from "@/lib/i18n";

import type { Currency, TransactionType } from "@/types/atlas";

import { FinancesOverviewPanel } from "./FinancesOverviewPanel";
import { FinancesAccountsPanel } from "./FinancesAccountsPanel";
import { FinancesTransactionsPanel } from "./FinancesTransactionsPanel";
import { FinancesPlannedPaymentsPanel } from "./FinancesPlannedPaymentsPanel";
import { FinancesBudgetsPanel } from "./FinancesBudgetsPanel";
import { FinancesSavingsPanel } from "./FinancesSavingsPanel";

export function FinancesPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [rateDraft, setRateDraft] = useState("");
  const [rateError, setRateError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "accounts" | "transactions" | "planned" | "budgets" | "savings"
  >("overview");

  const { transactions, categories, addTransaction, deleteTransaction } = useTransactions();
  const {
    plannedExpenses,
    createPlannedExpense,
    updatePlannedExpense,
    deletePlannedExpense,
    markPlannedExpensePaid,
    skipPlannedExpense,
  } = usePlannedExpenses();
  const { settings, setExchangeRate } = useAtlasSettings();
  const language = settings.language;
  const { savings } = useSavings();
  const { accounts } = useFinanceAccounts();

  const [filters, setFilters] = useState({
    month: "2026-06",
    type: "all" as "all" | TransactionType,
    category: "all",
    currency: "all" as "all" | Currency,
  });

  // Budgets hooks
  const { budgets, createFinanceBudget, updateFinanceBudget, deleteFinanceBudget } = useFinanceBudgets();

  useEffect(() => {
    setHasMounted(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    setFilters((curr) => ({ ...curr, month: todayStr.slice(0, 7) }));
  }, []);

  useEffect(() => {
    if (settings.usdToPygRate) {
      setRateDraft(String(settings.usdToPygRate));
    }
  }, [settings.usdToPygRate]);

  const handleCommitRate = () => {
    const val = Number(rateDraft);
    if (isNaN(val) || val <= 0) {
      setRateError(t(language, "finances.rate.validation"));
      return;
    }
    setExchangeRate(val);
    setRateError("");
  };

  const filteredTransactions = useMemo(() => filterTransactions(transactions, filters), [filters, transactions]);

  const usdToPygRate = settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150;

  const overview = useMemo(() => {
    return calculateFinanceOverview(
      transactions,
      settings.baseCurrency,
      usdToPygRate,
      savings,
      filters.month,
      accounts,
      settings.availableMoneyMode,
    );
  }, [transactions, settings.baseCurrency, usdToPygRate, savings, filters.month, accounts, settings.availableMoneyMode]);

  const insights = useMemo(() => {
    return buildFinanceInsights(filteredTransactions, settings.baseCurrency, usdToPygRate);
  }, [filteredTransactions, settings.baseCurrency, usdToPygRate]);

  const commitmentSummary = useMemo(() => {
    return calculateUpcomingCommitments(
      plannedExpenses,
      overview.availableMoney,
      settings.baseCurrency,
      usdToPygRate,
      hasMounted ? new Date().toISOString().slice(0, 10) : "2026-06-02"
    );
  }, [plannedExpenses, overview.availableMoney, settings.baseCurrency, usdToPygRate, hasMounted]);

  const visiblePlannedExpenses = useMemo(() => {
    return getUpcomingPlannedExpenses(plannedExpenses, hasMounted ? new Date().toISOString().slice(0, 10) : "2026-06-02", 365);
  }, [plannedExpenses, hasMounted]);

  // Financial Warning State (Calculations)
  const savingsRatio = overview.totalBalance > 0 ? overview.savingsInBaseCurrency / overview.totalBalance : 0;
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

  function getPlannedTimingLabel(plannedExpense: PlannedExpenseOccurrence) {
    if (plannedExpense.daysUntilDue < 0) {
      return `${t(language, "finances.planned.overdue")} ${Math.abs(
        plannedExpense.daysUntilDue
      )} ${t(language, "finances.planned.days").toLowerCase()}`;
    }
    if (plannedExpense.daysUntilDue === 0) {
      return t(language, "finances.planned.dueToday");
    }
    if (plannedExpense.daysUntilDue === 1) {
      return t(language, "finances.planned.dueTomorrow");
    }

    return `${t(language, "finances.planned.in")} ${
      plannedExpense.daysUntilDue
    } ${t(language, "finances.planned.days").toLowerCase()}`;
  }

  if (!hasMounted) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 flex items-center justify-center min-h-[300px]">
        <p className="text-sm font-semibold tracking-wider uppercase text-zinc-500 animate-pulse">
          {t(language, "common.loading", "Loading...")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C8A96A]">
            {t(language, "finances.eyebrow", "Capital Ledger")}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            {t(language, "finances.title", "Finances Hub")}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Global Month Selector */}
          <div className="flex items-center gap-2 rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span>{t(language, "common.month", "Month")}:</span>
            <input
              type="month"
              value={filters.month}
              onChange={(e) =>
                setFilters((curr) => ({
                  ...curr,
                  month: e.target.value,
                }))
              }
              className="bg-transparent text-zinc-100 font-bold focus:outline-none cursor-pointer w-28 md:w-auto"
            />
          </div>

          <span className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            {t(language, "finances.base", "Base")}: {settings.baseCurrency}
          </span>
          <div className="flex flex-col gap-1 items-end">
            <div className="flex items-center gap-2 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <span>{t(language, "finances.rate.manual", "Manual exchange rate")}: 1 USD =</span>
              <input
                type="number"
                min="1"
                value={rateDraft}
                onChange={(e) => {
                  setRateDraft(e.target.value);
                  setRateError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCommitRate();
                  }
                }}
                onBlur={handleCommitRate}
                className={`w-16 rounded-md border bg-[#121214] px-2 py-1 text-center font-bold text-zinc-100 focus:outline-none ${
                  rateError ? "border-[#C27A6B] animate-shake" : "border-[#27272a]"
                }`}
              />
              <span>PYG</span>
            </div>
            {rateError && (
              <span className="text-[10px] font-semibold text-[#C27A6B] block max-w-[200px] text-right">
                {rateError}
              </span>
            )}
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {t(language, "common.dashboard")}
          </Link>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="mt-6 flex border-b border-[#27272a] overflow-x-auto scrollbar-none gap-2">
        {(["overview", "accounts", "transactions", "planned", "budgets", "savings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
              activeTab === tab ? "border-[#C8A96A] text-[#C8A96A]" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t(language, `finances.tabs.${tab}`, tab)}
          </button>
        ))}
      </nav>

      {/* Main Section */}
      <section className="mt-8">
        {activeTab === "overview" && (
          <FinancesOverviewPanel
            language={language}
            baseCurrency={settings.baseCurrency}
            overview={overview}
            commitmentSummary={commitmentSummary}
            insights={insights}
            warningType={warningType}
            warningMessage={warningMessage}
            getPlannedTimingLabel={getPlannedTimingLabel}
          />
        )}

        {activeTab === "accounts" && (
          <FinancesAccountsPanel language={language} />
        )}

        {activeTab === "transactions" && (
          <FinancesTransactionsPanel
            language={language}
            transactions={transactions}
            filteredTransactions={filteredTransactions}
            categories={categories}
            addTransaction={addTransaction}
            deleteTransaction={deleteTransaction}
            filters={filters}
            setFilters={setFilters}
          />
        )}

        {activeTab === "planned" && (
          <FinancesPlannedPaymentsPanel
            language={language}
            categories={categories}
            visiblePlannedExpenses={visiblePlannedExpenses}
            createPlannedExpense={createPlannedExpense}
            updatePlannedExpense={updatePlannedExpense}
            deletePlannedExpense={deletePlannedExpense}
            markPlannedExpensePaid={markPlannedExpensePaid}
            skipPlannedExpense={skipPlannedExpense}
            getPlannedTimingLabel={getPlannedTimingLabel}
          />
        )}

        {activeTab === "budgets" && (
          <FinancesBudgetsPanel
            language={language}
            baseCurrency={settings.baseCurrency}
            usdToPygRate={usdToPygRate}
            budgets={budgets}
            transactions={transactions}
            activeMonth={filters.month}
            categories={categories}
            createFinanceBudget={createFinanceBudget}
            updateFinanceBudget={updateFinanceBudget}
            deleteFinanceBudget={deleteFinanceBudget}
          />
        )}

        {activeTab === "savings" && (
          <FinancesSavingsPanel language={language} baseCurrency={settings.baseCurrency} savings={savings} />
        )}
      </section>
    </div>
  );
}

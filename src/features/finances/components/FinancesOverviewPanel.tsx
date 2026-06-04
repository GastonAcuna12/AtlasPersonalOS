"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { formatMoney, useSavings, type PlannedExpenseOccurrence } from "@/lib/finances";
import { useGoals, calculateFinancialGoalPlan } from "@/lib/goals";
import { useAtlasSettings } from "@/lib/settings";
import { isModuleEnabled } from "@/lib/modules";
import type { Currency } from "@/types/atlas";
import { FinanceStatCard } from "./FinanceStatCard";

interface FinancesOverviewPanelProps {
  language: "en" | "es";
  baseCurrency: Currency;
  overview: {
    availableMoney: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyNet: number;
    savingsInBaseCurrency: number;
    categoryTotals: Record<string, number>;
    isAccountAware?: boolean;
  };
  commitmentSummary: {
    upcomingCommitments7Days: number;
    upcomingCommitments30Days: number;
    safeToSpend7Days: number;
    safeToSpend30Days: number;
    overdueCount: number;
    nextPayment: PlannedExpenseOccurrence | null;
    upcomingInflows7Days?: number;
    upcomingInflows30Days?: number;
  };
  insights: string[];
  warningType: "none" | "low" | "warning" | "danger";
  warningMessage: string;
  getPlannedTimingLabel: (plannedExpense: PlannedExpenseOccurrence) => string;
}

export function FinancesOverviewPanel({
  language,
  baseCurrency,
  overview,
  commitmentSummary,
  insights,
  warningType,
  warningMessage,
  getPlannedTimingLabel,
}: FinancesOverviewPanelProps) {
  const { goals } = useGoals();
  const { savings } = useSavings();
  const { settings } = useAtlasSettings();

  const [commitmentHorizon, setCommitmentHorizon] = useState<7 | 30>(7);
  const currentCommitments = commitmentHorizon === 7 ? commitmentSummary.upcomingCommitments7Days : commitmentSummary.upcomingCommitments30Days;
  const currentSafe = commitmentHorizon === 7 ? commitmentSummary.safeToSpend7Days : commitmentSummary.safeToSpend30Days;

  const activeFinancialGoals = useMemo(() => {
    if (!isModuleEnabled(settings, "goals")) return [];

    return goals
      .filter((goal) => {
        return (
          goal.status === "active" &&
          goal.goalType !== "daily_habit" &&
          goal.linkedFinanceMetric === "savings" &&
          goal.targetValue > 0 &&
          goal.deadline
        );
      })
      .slice(0, 3);
  }, [goals, settings]);

  const expenseTotal = useMemo(() => {
    return overview.monthlyExpenses || 1;
  }, [overview.monthlyExpenses]);

  return (
    <div className="grid gap-6 animate-fade-in-up">
      {/* Responsive Overview Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Available Money Card */}
        <FinanceStatCard
          title={overview.isAccountAware
            ? t(language, "finances.accounts.awareBalanceTitle", "Account-aware balance")
            : t(language, "dashboard.availableMoney")}
          value={formatMoney(overview.availableMoney, baseCurrency)}
          subtext={overview.isAccountAware
            ? t(language, "finances.accounts.awareBalanceHelp", "Includes accounts + legacy transactions")
            : t(language, "finances.accounts.legacyBalance", "Legacy ledger balance")}
          warningMessage={warningMessage}
          warningType={warningType}
          valueColorClass="text-zinc-100"
        />

        {/* Monthly Flow */}
        <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg flex flex-col justify-between min-h-[140px]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {t(language, "finances.monthlyFlow", "Monthly Flow")}
            </p>
            <p className={`mt-2 text-2xl font-bold tracking-tight break-words leading-none ${overview.monthlyNet >= 0 ? "text-[#9AAB6B]" : "text-[#C27A6B]"}`}>
              {formatMoney(overview.monthlyNet, baseCurrency)}
            </p>
          </div>
          <div className="mt-3 border-t border-[#27272a]/20 pt-2 flex flex-col gap-1 text-[10px] text-zinc-500">
            <p className="text-[9px] font-semibold uppercase tracking-wide">
              {t(language, "finances.income", "Income")} <span className="text-zinc-300">{formatMoney(overview.monthlyIncome, baseCurrency)}</span> &middot; {t(language, "finances.expenses", "Expenses")} <span className="text-zinc-300">{formatMoney(overview.monthlyExpenses, baseCurrency)}</span>
            </p>
          </div>
        </div>

        {/* Next Payment */}
        <div
          className={`rounded-xl border p-5 shadow-lg ${
            commitmentSummary.overdueCount > 0
              ? "border-[#B26A5B]/30 bg-[#B26A5B]/5"
              : commitmentSummary.nextPayment?.isDueSoon
              ? "border-[#C8A96A]/30 bg-[#C8A96A]/5"
              : "border-[#27272a] bg-[#18181b]"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t(language, "finances.planned.nextPayment")}
          </p>
          {commitmentSummary.nextPayment ? (
            <>
              <p className="mt-2 text-sm font-bold text-zinc-100 truncate">
                {commitmentSummary.nextPayment.title}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {formatMoney(commitmentSummary.nextPayment.amount, commitmentSummary.nextPayment.currency)}
              </p>
              <p
                className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${
                  commitmentSummary.nextPayment.isOverdue
                    ? "text-[#C27A6B]"
                    : commitmentSummary.nextPayment.isDueSoon
                    ? "text-[#D4B87A]"
                    : "text-zinc-500"
                }`}
              >
                {getPlannedTimingLabel(commitmentSummary.nextPayment)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {t(language, "finances.planned.noUpcoming")}
            </p>
          )}
        </div>
      </section>

      {/* Commitments & Inflows */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">
                {t(language, "finances.planned.projection", "Commitment Projection")}
              </p>
              <div className="flex rounded-md border border-[#27272a] bg-[#121214] p-0.5">
                <button
                  onClick={() => setCommitmentHorizon(7)}
                  className={`rounded px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest transition ${
                    commitmentHorizon === 7 ? "bg-[#C8A96A] text-zinc-950" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t(language, "finances.planned.7days", "7 days")}
                </button>
                <button
                  onClick={() => setCommitmentHorizon(30)}
                  className={`rounded px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest transition ${
                    commitmentHorizon === 30 ? "bg-[#C8A96A] text-zinc-950" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t(language, "finances.planned.30days", "30 days")}
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-semibold">
                  {t(language, "finances.planned.commitmentsLabel", "Commitments")}:
                </p>
                <p className="mt-1 text-xl font-black tracking-tight text-[#E8E4DD]">
                  {formatMoney(currentCommitments, baseCurrency)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-semibold">
                  {t(language, "finances.planned.safeAfter", "Safe after")}:
                </p>
                <p
                  className={`mt-1 text-xl font-black tracking-tight ${
                    currentSafe < 0 ? "text-[#B26A5B]" : "text-[#8A9A5B]"
                  }`}
                >
                  {formatMoney(currentSafe, baseCurrency)}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-5 text-[9px] text-zinc-500 italic uppercase tracking-wider">
            {t(language, "finances.planned.projectedHelper", "Projected after upcoming planned expenses.")}
          </p>
        </div>

        {((commitmentSummary.upcomingInflows7Days ?? 0) > 0 || (commitmentSummary.upcomingInflows30Days ?? 0) > 0) && (
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6F8799] mb-4">
                {t(language, "finances.planned.upcomingInflows", "Upcoming Inflows")}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="rounded border border-[#27272a] bg-[#121214] p-3 text-zinc-400">
                  <p className="text-[9px] font-semibold text-zinc-550 uppercase tracking-wider">
                    {t(language, "finances.planned.expected", "Expected income")} (7 {t(language, "finances.planned.days", "days").toLowerCase()})
                  </p>
                  <p className="text-xl font-black text-[#7F97A9] mt-1">
                    +{formatMoney(commitmentSummary.upcomingInflows7Days ?? 0, baseCurrency)}
                  </p>
                </div>
                
                <div className="rounded border border-[#27272a] bg-[#121214] p-3 text-zinc-400">
                  <p className="text-[9px] font-semibold text-zinc-550 uppercase tracking-wider">
                    {t(language, "finances.planned.expected", "Expected income")} (30 {t(language, "finances.planned.days", "days").toLowerCase()})
                  </p>
                  <p className="text-xl font-black text-[#7F97A9] mt-1">
                    +{formatMoney(commitmentSummary.upcomingInflows30Days ?? 0, baseCurrency)}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed italic">
              ℹ️ {t(language, "finances.planned.incomeNotice", "This expected income is not counted as Available Money until received.")}{" "}
              {t(language, "finances.planned.safeToSpendIncomeHelp", "Expected income is shown separately and not included in Safe-to-Spend.")}
            </p>
          </div>
        )}
      </section>

      {/* Financial Goals Pace section */}
      {activeFinancialGoals.length > 0 && (
        <section className="rounded-xl border border-[#C8A96A]/10 bg-[#C8A96A]/[0.01] p-5 shadow-lg animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-[#27272a]/60 pb-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">
                🎯 {t(language, "finances.planning.paceTitle", "Savings Pace")}
              </p>
              <h3 className="mt-1 text-lg font-bold text-zinc-100">
                {t(language, "finances.planning.title", "Financial Goals Pace")}
              </h3>
            </div>
            <Link
              href="/goals"
              className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition hover:bg-zinc-800"
            >
              {t(language, "finances.planning.openGoals", "Open Goals")} &rarr;
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeFinancialGoals.map((goal) => {
              const plan = calculateFinancialGoalPlan(
                goal,
                savings,
                baseCurrency,
                settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150
              );

              return (
                <div
                  key={goal.id}
                  className="rounded-lg border border-[#27272a] bg-[#121214] p-4 flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-bold text-zinc-200 text-sm truncate">
                      {goal.title}
                    </h4>
                    <p className="text-[10px] text-zinc-550 mt-1 uppercase font-semibold">
                      {t(language, "goals.planning.remaining", "Remaining")}:{" "}
                      <span className="text-zinc-400 font-bold">
                        {formatMoney(plan.remainingAmount, plan.currency)}
                      </span>
                    </p>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-[#27272a]/45 pt-2">
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
                        {t(language, "finances.planning.neededPerMonth", "Needed per month")}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-[#C8A96A]">
                        {formatMoney(plan.perMonth, plan.currency)}
                      </p>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-bold">
                      {goal.deadline}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
                      {formatMoney(total, baseCurrency)} &middot;{" "}
                      <span className="text-[#C8A96A] font-bold">{Math.round((total / expenseTotal) * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-900 border border-[#27272a]/60">
                    <div
                      className="h-full rounded-full bg-[#C8A96A]"
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
    </div>
  );
}

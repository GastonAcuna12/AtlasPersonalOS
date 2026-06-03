"use client";

import React, { useMemo } from "react";
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
  };
  commitmentSummary: {
    upcomingCommitments7Days: number;
    upcomingCommitments30Days: number;
    safeToSpend7Days: number;
    safeToSpend30Days: number;
    overdueCount: number;
    nextPayment: PlannedExpenseOccurrence | null;
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
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Available Money Card */}
        <FinanceStatCard
          title={t(language, "dashboard.availableMoney")}
          value={formatMoney(overview.availableMoney, baseCurrency)}
          subtext={t(language, "dashboard.spendableBalance")}
          warningMessage={warningMessage}
          warningType={warningType}
          valueColorClass="text-zinc-100"
        />

        {/* Income This Month */}
        <FinanceStatCard
          title={t(language, "dashboard.incomeThisMonth")}
          value={formatMoney(overview.monthlyIncome, baseCurrency)}
          subtext={t(language, "dashboard.monthInflow")}
          valueColorClass="text-emerald-400"
        />

        {/* Expenses This Month */}
        <FinanceStatCard
          title={t(language, "dashboard.expensesThisMonth")}
          value={formatMoney(overview.monthlyExpenses, baseCurrency)}
          subtext={t(language, "dashboard.monthOutflow")}
          valueColorClass="text-red-400"
        />

        {/* Net gain/loss */}
        <FinanceStatCard
          title={t(language, "finances.netGainLoss", "Net Gain / Loss")}
          value={formatMoney(overview.monthlyNet, baseCurrency)}
          subtext={t(language, "finances.cashFlowBalance", "Cash Flow Balance")}
          valueColorClass={overview.monthlyNet >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </section>

      {/* Upcoming commitment warnings */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div
          className={`rounded-xl border p-5 shadow-lg ${
            commitmentSummary.safeToSpend7Days < 0 ? "border-red-500/30 bg-red-500/5" : "border-[#27272a] bg-[#18181b]"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
            {t(language, "finances.planned.commitments7")}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-zinc-100">
            {formatMoney(commitmentSummary.upcomingCommitments7Days, baseCurrency)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {t(language, "finances.planned.safeToSpend7")}:{" "}
            <span
              className={commitmentSummary.safeToSpend7Days < 0 ? "font-bold text-red-400" : "font-bold text-emerald-400"}
            >
              {formatMoney(commitmentSummary.safeToSpend7Days, baseCurrency)}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t(language, "finances.planned.commitments30")}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-zinc-100">
            {formatMoney(commitmentSummary.upcomingCommitments30Days, baseCurrency)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {t(language, "finances.planned.safeToSpend30")}:{" "}
            <span
              className={commitmentSummary.safeToSpend30Days < 0 ? "font-bold text-red-400" : "font-bold text-zinc-300"}
            >
              {formatMoney(commitmentSummary.safeToSpend30Days, baseCurrency)}
            </span>
          </p>
        </div>

        <div
          className={`rounded-xl border p-5 shadow-lg ${
            commitmentSummary.overdueCount > 0
              ? "border-red-500/30 bg-red-500/5"
              : commitmentSummary.nextPayment?.isDueSoon
              ? "border-amber-500/30 bg-amber-500/5"
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
                    ? "text-red-400"
                    : commitmentSummary.nextPayment.isDueSoon
                    ? "text-amber-400"
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

      {/* Financial Goals Pace section */}
      {activeFinancialGoals.length > 0 && (
        <section className="rounded-xl border border-amber-500/10 bg-amber-500/[0.01] p-5 shadow-lg animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-[#27272a]/60 pb-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
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
                      <p className="mt-0.5 text-sm font-bold text-amber-500">
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
    </div>
  );
}

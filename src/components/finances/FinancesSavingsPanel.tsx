"use client";

import React from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { formatMoney, convertToBase } from "@/lib/finances";
import { useGoals, calculateFinancialGoalPlan } from "@/lib/goals";
import { useAtlasSettings } from "@/lib/settings";
import { isModuleEnabled } from "@/lib/modules";
import type { Currency, SavingsState } from "@/types/atlas";

interface FinancesSavingsPanelProps {
  language: "en" | "es";
  baseCurrency: Currency;
  savings: SavingsState;
}

export function FinancesSavingsPanel({ language, baseCurrency, savings }: FinancesSavingsPanelProps) {
  const { goals } = useGoals();
  const { settings } = useAtlasSettings();

  const activeFinancialGoals = React.useMemo(() => {
    if (!isModuleEnabled(settings, "goals")) return [];

    return goals.filter((goal) => {
      return (
        goal.status === "active" &&
        goal.goalType !== "daily_habit" &&
        goal.linkedFinanceMetric === "savings" &&
        goal.targetValue > 0
      );
    });
  }, [goals, settings]);

  return (
    <div className="grid gap-6 max-w-3xl mx-auto animate-fade-in-up">
      {/* Compact Reserved Savings Summary */}
      <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left Side: Icon, Title, and Excluded Label */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
            🏦
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              {t(language, "dashboard.finance.reservedSavings", "Reserved Savings")}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {t(language, "finances.savings.excludedFromAvailable", "Excluded from Available Money")}
            </p>
          </div>
        </div>

        {/* Center/Right Side: Amount, conversion, and CTA button */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 sm:gap-6">
          <div className="text-left sm:text-right">
            <span className="text-2xl font-black text-zinc-100 tracking-tight">
              {formatMoney(savings.currentAmount, savings.currency)}
            </span>
            {savings.currency !== baseCurrency && (
              <p className="text-[10px] text-zinc-550 mt-0.5 font-semibold">
                {t(language, "finances.equivalent", "Equivalent in base currency")}: {baseCurrency}
              </p>
            )}
          </div>

          <Link
            href="/goals"
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition hover:bg-zinc-800 cursor-pointer shrink-0"
          >
            {t(language, "finances.savings.manageInGoals", "Manage in Goals")}
          </Link>
        </div>
      </section>

      {/* Small informative line helper */}
      <p className="text-[11px] text-zinc-500 text-center -mt-2">
        ℹ️ {t(language, "finances.savings.reservedHelp", "Reserved funds stay out of Available Money to protect long-term goals.")}
      </p>

      {/* Financial Goals Savings Pace section */}
      {isModuleEnabled(settings, "goals") && (
        <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl w-full text-left">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-3 mb-5">
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                🎯 {t(language, "finances.planning.paceTitle", "Savings Pace")}
              </p>
              <h3 className="text-lg font-bold text-zinc-100 mt-1">
                {t(language, "finances.planning.title", "Financial Goals")}
              </h3>
            </div>
            <Link
              href="/goals"
              className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition hover:bg-zinc-800 cursor-pointer"
            >
              {t(language, "finances.savings.manageInGoals", "Manage in Goals")}
            </Link>
          </div>

          {activeFinancialGoals.length > 0 ? (
            <div className="grid gap-5">
              {activeFinancialGoals.map((goal) => {
                const usdToPygRate = settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150;
                const plan = calculateFinancialGoalPlan(
                  goal,
                  savings,
                  baseCurrency,
                  usdToPygRate
                );
                
                const currentInGoalCurrency = convertToBase(
                  savings.currentAmount,
                  savings.currency,
                  goal.currency ?? "PYG",
                  usdToPygRate
                );

                const progressPercent = goal.targetValue > 0
                  ? Math.min(Math.round((currentInGoalCurrency / goal.targetValue) * 100), 100)
                  : 0;

                return (
                  <div
                    key={goal.id}
                    className="rounded-lg border border-[#27272a] bg-[#121214] p-5 shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#27272a]/45 pb-3 mb-4">
                      <div>
                        <h4 className="font-bold text-zinc-100 text-base">{goal.title}</h4>
                        <p className="text-[10px] text-zinc-505 mt-0.5 uppercase tracking-wide">
                          {t(language, "goals.planning.targetDate", "Target date")}:{" "}
                          <span className="font-semibold text-zinc-400">
                            {goal.deadline || (language === "es" ? "Sin fecha" : "No deadline")}
                          </span>
                        </p>
                      </div>

                      {/* Status Badges */}
                      <div className="flex gap-2 shrink-0">
                        {plan.isReached ? (
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                            {t(language, "goals.planning.reached", "Goal reached")}
                          </span>
                        ) : plan.isPastDeadline ? (
                          <span className="rounded bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-400 animate-pulse">
                            {t(language, "goals.planning.behindTarget", "Behind target")}
                          </span>
                        ) : (
                          <span className="rounded bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
                            {t(language, "goals.planning.onTrack", "On track")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="h-1.5 rounded-full bg-zinc-850 overflow-hidden border border-[#27272a]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)] transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                        <span>
                          {t(language, "finances.savings.current", "Current")}:{" "}
                          <span className="text-zinc-300 font-bold">{formatMoney(currentInGoalCurrency, plan.currency)}</span>
                          {" / "}
                          {t(language, "finances.savings.target", "Target")}:{" "}
                          <span className="text-zinc-400">{formatMoney(goal.targetValue, plan.currency)}</span>
                        </span>
                        <span className="font-bold text-amber-500">{progressPercent}%</span>
                      </div>
                    </div>

                    {/* Pace calculations */}
                    {!goal.deadline ? (
                      <p className="text-xs text-zinc-500 italic mt-2">
                        {t(language, "goals.planning.addDeadlinePrompt", "Add a target date to calculate a savings pace.")}
                      </p>
                    ) : !plan.isReached ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-[#27272a]/30 pt-3 mt-3 text-xs">
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
                          <p className="mt-1 font-bold text-zinc-300">
                            {formatMoney(plan.perDay, plan.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            {t(language, "goals.planning.perWeek", "Needed per week")}
                          </p>
                          <p className="mt-1 font-bold text-zinc-300">
                            {formatMoney(plan.perWeek, plan.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            {t(language, "goals.planning.perMonth", "Needed per month")}
                          </p>
                          <p className="mt-1 font-bold text-amber-500 font-black">
                            {formatMoney(plan.perMonth, plan.currency)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded mt-2">
                        🎉 {t(language, "goals.planning.reached", "Goal reached")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-[#27272a] bg-[#121214] p-8 text-center flex flex-col items-center justify-center">
              <span className="text-3xl mb-3">🎯</span>
              <p className="text-sm text-zinc-300 font-bold">
                {t(language, "finances.savings.noLinkedGoals", "No financial goals linked to savings yet.")}
              </p>
              <p className="text-xs text-zinc-500 mt-1 mb-4">
                {t(language, "finances.savings.createGoalPrompt", "Create one in Goals to track your savings pace.")}
              </p>
              <Link
                href="/goals"
                className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2 text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
              >
                {language === "es" ? "Ir a Objetivos" : "Go to Goals"}
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

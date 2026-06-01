"use client";

import React, { useState } from "react";
import { t } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";

type XPRule = {
  label: string;
  xp: number;
};

type XPActivity = {
  id: string;
  amount: number;
  label: string;
  createdAt?: string;
};

type XPProgressProps = {
  level: number;
  title: string;
  currentXP: number;
  nextLevelXP: number;
  progressPercentage: number;
  remainingXP: number;
  weeklyMomentum: number;
  recentActivity: XPActivity[];
  rules: XPRule[];
  isMaxLevel?: boolean;
};

export function XPProgress({
  level,
  title,
  currentXP,
  nextLevelXP,
  progressPercentage,
  remainingXP,
  weeklyMomentum,
  recentActivity,
  rules,
  isMaxLevel: propIsMaxLevel,
}: XPProgressProps) {
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const [showRules, setShowRules] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const isMaxLevel = propIsMaxLevel ?? level === 10;

  return (
    <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl animate-fade-in-up">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            {t(language, "xp.systemProgression")}
          </p>
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="xp-progress-title" className="text-3xl font-bold tracking-tight text-zinc-100">
              {t(language, "xp.level")} {level}
            </h2>
            <span className="text-lg font-medium text-zinc-400">&mdash; {title}</span>
            {isMaxLevel && (
              <span className="ml-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-400 animate-pulse">
                {t(language, "xp.maxRank")}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 shrink-0 flex items-center gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{t(language, "xp.weeklyMomentum")}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">{weeklyMomentum}%</p>
          </div>
          <div className="h-8 w-px bg-[#27272a]" />
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-medium uppercase">{t(language, "xp.activeDaysTarget")}</p>
            <p className="text-xs font-bold text-amber-500 mt-1">{t(language, "xp.daysPerWeek")}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col gap-2 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-bold text-zinc-100">{currentXP.toLocaleString()} XP</span> {t(language, "xp.earned")}
          </p>
          {!isMaxLevel ? (
            <p>
              <span className="font-bold text-zinc-100">{remainingXP.toLocaleString()} XP</span> {t(language, "xp.toLevel")} {level + 1}
            </p>
          ) : (
            <p className="text-amber-500 font-semibold">{t(language, "xp.ultimateRank")}</p>
          )}
          {!isMaxLevel && (
            <p>
              {t(language, "xp.target")}: <span className="font-bold text-zinc-100">{nextLevelXP.toLocaleString()} XP</span>
            </p>
          )}
        </div>

        {/* Progress Bar with Glow */}
        <div className="mt-3 relative">
          <div
            className="h-3.5 overflow-hidden rounded-full bg-zinc-900 border border-[#27272a]"
            role="progressbar"
            aria-label={`${t(language, "xp.level")} ${level} ${t(language, "xp.progressAria")}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercentage}
            aria-valuetext={`${progressPercentage}% ${t(language, "xp.progressAriaText")}`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-zinc-400">
          {t(language, "xp.status")}
        </p>
      </div>

      {/* Grid for Activities & Rules Toggle */}
      <div className="mt-6 border-t border-[#27272a] pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              {t(language, "xp.progressionLog")}
            </h3>
            <button
              type="button"
              onClick={() => setShowActivity(!showActivity)}
              className="text-xs text-amber-500 hover:text-amber-400 transition font-semibold"
            >
              {showActivity ? t(language, "xp.hideLog") : t(language, "xp.showLog")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowRules(!showRules)}
            className="text-xs text-zinc-500 hover:text-zinc-400 transition flex items-center gap-1"
          >
            {showRules ? t(language, "xp.hideRules") : t(language, "xp.howWorks")} &rarr;
          </button>
        </div>

        {showRules && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 animate-fade-in-up">
            {rules.map((rule) => (
              <div
                key={rule.label}
                className="flex items-center justify-between gap-4 rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-xs"
              >
                <span className="text-zinc-300 font-medium">{rule.label}</span>
                <span className="font-bold text-amber-500 shrink-0">+{rule.xp} XP</span>
              </div>
            ))}
          </div>
        )}

        {showActivity && (
          recentActivity.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 animate-fade-in-up">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between gap-4 rounded-lg bg-[#121214] border border-[#27272a]/60 px-4 py-2.5 text-xs transition hover:border-zinc-700"
                >
                  <span className="text-zinc-300 truncate font-medium">{activity.label}</span>
                  <span className="font-bold text-amber-500 shrink-0">
                    +{activity.amount} XP
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs leading-6 text-zinc-550 italic">
              {t(language, "xp.noActivity")}
            </p>
          )
        )}
      </div>
    </div>
  );
}

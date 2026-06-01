"use client";

import Link from "next/link";
import { ChangeEvent, useRef, useState } from "react";
import {
  useAtlasAuth,
  useLocalAtlasDataSummary,
} from "@/lib/auth";
import { t, type Language } from "@/lib/i18n";
import {
  downloadAcademicWeekMarkdown,
  downloadAllNotesMarkdown,
  downloadGoalsSummaryMarkdown,
  downloadTodayPlanMarkdown,
  downloadWeeklyReviewMarkdown,
} from "@/lib/markdownExport";
import {
  getAcademicTasks,
  useAcademicSubjects,
  useStudySessions,
} from "@/lib/academics";
import {
  ATLAS_STORAGE_KEY_VALUES,
  clearAtlasLocalData,
  downloadAtlasBackup,
  importAtlasBackup,
  validateAtlasBackup,
} from "@/lib/dataManagement";
import { useGoals } from "@/lib/goals";
import { useNotes } from "@/lib/notes";
import { getLatestReview, useWeeklyReviews } from "@/lib/reviews";
import { useAtlasSettings } from "@/lib/settings";
import {
  calculateTodayStats,
  groupTasksForToday,
  todayISO,
  useTasks,
} from "@/lib/tasks";
import { useClients, useWorkItems } from "@/lib/work";
import { useTransactions } from "@/lib/finances";
import { useWorkoutLogs } from "@/lib/gym";
import { useXP } from "@/lib/xp";
import { useDailyWraps } from "@/lib/dailyWraps";
import type { Currency, DayMode } from "@/types/atlas";
import { loadSampleData } from "@/lib/sampleData";
import { CloudDiagnostics } from "@/components/CloudDiagnostics";
import { CloudQAChecklist } from "@/components/CloudQAChecklist";
import { MigrationDecisionPanel } from "@/components/MigrationDecisionPanel";

export function SettingsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const auth = useAtlasAuth();
  const localDataSummary = useLocalAtlasDataSummary();
  
  // Storage Hooks for live QA diagnosis
  const { reviews } = useWeeklyReviews();
  const { notes } = useNotes();
  const { goals } = useGoals();
  const { tasks } = useTasks();
  const { subjects } = useAcademicSubjects();
  const { sessions } = useStudySessions();
  const { clients } = useClients();
  const { workItems } = useWorkItems();
  const { transactions } = useTransactions();
  const { workouts } = useWorkoutLogs();
  const xp = useXP();
  const { dailyWraps } = useDailyWraps();

  const {
    settings,
    setDayMode,
    setBaseCurrency,
    setExchangeRate,
    setLanguage,
    setGymWeeklyTarget,
  } = useAtlasSettings();
  const language = settings.language;
  
  const latestReview = getLatestReview(reviews);
  const today = todayISO();
  const todayStats = calculateTodayStats(tasks, today);
  const todaySections = groupTasksForToday(tasks, today);
  const academicTasks = getAcademicTasks(tasks);

  const accountSyncState = (() => {
    if (!auth.isConfigured) {
      return {
        status: t(language, "settings.accountSync.notConfigured.status"),
        mode: t(language, "settings.accountSync.notConfigured.mode"),
        message: t(language, "settings.accountSync.notConfigured.message"),
        badgeClass: "border-zinc-700 bg-zinc-800/70 text-zinc-300",
      };
    }

    if (auth.status === "signed_in") {
      return {
        status: t(language, "settings.accountSync.signedIn.status"),
        mode: t(language, "settings.accountSync.signedIn.mode"),
        message: t(language, "settings.accountSync.signedIn.message"),
        badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      };
    }

    if (auth.status === "error") {
      return {
        status: t(language, "settings.accountSync.error.status"),
        mode: t(language, "settings.accountSync.notConfigured.mode"),
        message:
          auth.errorMessage ||
          t(language, "settings.accountSync.error.message"),
        badgeClass: "border-red-500/30 bg-red-500/10 text-red-300",
      };
    }

    if (auth.status === "loading") {
      return {
        status: t(language, "settings.accountSync.loading.status"),
        mode: t(language, "settings.accountSync.notConfigured.mode"),
        message: t(language, "settings.accountSync.loading.message"),
        badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      };
    }

    return {
      status: t(language, "settings.accountSync.available.status"),
      mode: t(language, "settings.accountSync.notConfigured.mode"),
      message: t(language, "settings.accountSync.available.message"),
      badgeClass: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    };
  })();

  const accountSessionHint =
    auth.status === "signed_in"
      ? t(language, "settings.accountSync.hintSignedIn")
      : auth.isConfigured
        ? t(language, "settings.accountSync.hintConfigured")
        : t(language, "settings.accountSync.hintUnconfigured");

  function exportData() {
    setError("");
    downloadAtlasBackup();
    setMessage(t(language, "settings.data.exported"));
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setError("");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!validateAtlasBackup(parsed)) {
        setError(t(language, "settings.data.invalidSchema"));
        return;
      }

      if (!importAtlasBackup(parsed)) {
        setError(t(language, "settings.data.importFailed"));
        return;
      }

      setMessage(t(language, "settings.data.imported"));
      window.location.reload();
    } catch {
      setError(t(language, "settings.data.parseError"));
    } finally {
      event.target.value = "";
    }
  }

  function handleResetWorkspace() {
    const confirmed = window.confirm(
      t(language, "settings.data.resetConfirm"),
    );
    if (!confirmed) return;

    try {
      clearAtlasLocalData();
      setMessage(t(language, "settings.data.resetSuccess"));
      window.setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch {
      setError(t(language, "settings.data.resetFailed"));
    }
  }

  function handleLoadSampleDataOverwrite() {
    setError("");
    setMessage("");

    const hasExistingData =
      notes.length > 0 ||
      goals.length > 0 ||
      tasks.length > 0 ||
      subjects.length > 0 ||
      sessions.length > 0 ||
      clients.length > 0 ||
      workItems.length > 0 ||
      transactions.length > 0 ||
      workouts.length > 0;

    const messageCopy = hasExistingData
      ? t(language, "settings.sample.overwriteConfirmExisting")
      : t(language, "settings.sample.overwriteConfirmEmpty");

    const confirmed = window.confirm(messageCopy);
    if (!confirmed) return;

    try {
      loadSampleData(false); // Replace
      setMessage(t(language, "settings.sample.overwriteSuccess"));
      window.setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch {
      setError(t(language, "settings.sample.overwriteFailed"));
    }
  }

  function handleLoadSampleDataMerge() {
    setError("");
    setMessage("");

    const confirmed = window.confirm(
      t(language, "settings.sample.mergeConfirm"),
    );
    if (!confirmed) return;

    try {
      loadSampleData(true); // Merge
      setMessage(t(language, "settings.sample.mergeSuccess"));
      window.setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch {
      setError(t(language, "settings.sample.mergeFailed"));
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d0e] text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 animate-fade-in-up">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
              {t(language, "settings.eyebrow")}
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
              {t(language, "settings.title")}
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {t(language, "settings.dashboard")}
          </Link>
        </header>

        {/* Messaging Notifications */}
        {message && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-xs font-semibold text-emerald-400 animate-fade-in-up">
            ✓ {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-400 animate-fade-in-up">
            ⚠️ {error}
          </div>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
          {/* Left Column — Config, Backup & RESET */}
          <div className="grid gap-6">
            
            {/* Account & Sync */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                    {t(language, "settings.accountSync.eyebrow")}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                    {t(language, "settings.accountSync.title")}
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    {t(language, "settings.accountSync.description")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/account"
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  >
                    {t(language, "settings.accountSync.openAccount")}
                  </Link>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${accountSyncState.badgeClass}`}
                  >
                    {accountSyncState.status}
                  </span>
                  <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {accountSyncState.mode}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {t(language, "settings.accountSync.status")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-100">
                    {accountSyncState.status}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {accountSyncState.message}
                  </p>
                </div>
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {t(language, "settings.accountSync.session")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-100">
                    {auth.status === "signed_in"
                      ? (auth.user?.email ?? t(language, "settings.accountSync.signedIn"))
                      : t(language, "settings.accountSync.noLogin")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {accountSessionHint}
                  </p>
                </div>
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {t(language, "settings.accountSync.localWorkspace")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-100">
                    {localDataSummary.hasLocalData
                      ? t(language, "settings.accountSync.detected")
                      : t(language, "settings.accountSync.noRecords")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {localDataSummary.hasLocalData
                      ? `${localDataSummary.approximateRecordCount} ${t(language, "settings.accountSync.approximateRecordsAcross")} ${localDataSummary.populatedKeyCount} ${t(language, "settings.accountSync.storageKeys")}.`
                      : t(language, "settings.accountSync.noPopulatedKeys")}
                  </p>
                </div>
              </div>
            </div>

            <MigrationDecisionPanel />
            
            {/* System Configuration */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                {t(language, "settings.core.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                {t(language, "settings.core.title")}
              </h2>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                {t(language, "settings.core.description")}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                  {t(language, "settings.core.language")}
                  <select
                    value={settings.language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="en">{t(language, "settings.core.languageEnglish")}</option>
                    <option value="es">{t(language, "settings.core.languageSpanish")}</option>
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                  {t(language, "settings.core.dayMode")}
                  <select
                    value={settings.dayMode}
                    onChange={(e) => setDayMode(e.target.value as DayMode)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Normal Day">{t(language, "enum.dayMode.Normal Day")}</option>
                    <option value="University Day">{t(language, "enum.dayMode.University Day")}</option>
                    <option value="Work Sprint Day">{t(language, "enum.dayMode.Work Sprint Day")}</option>
                    <option value="Low Energy Day">{t(language, "enum.dayMode.Low Energy Day")}</option>
                    <option value="Recovery Day">{t(language, "enum.dayMode.Recovery Day")}</option>
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                  {t(language, "settings.core.baseCurrency")}
                  <select
                    value={settings.baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value as Currency)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="PYG">PYG (₲)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </label>

                {/* Exchange Rate Card */}
                <div className="grid gap-3 border border-[#27272a] bg-[#121214] p-4 rounded-lg sm:col-span-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="grid gap-1.5 text-xs font-semibold text-zinc-400 shrink-0">
                      {t(language, "settings.core.exchangeRate")}
                      <input
                        type="number"
                        value={settings.usdToPygRate}
                        onChange={(e) => setExchangeRate(Number(e.target.value) || 6150)}
                        className="rounded-lg border border-[#27272a] bg-[#0d0d0e] px-3 py-2 text-zinc-100 font-bold w-48 focus:outline-none focus:border-amber-500/50"
                      />
                    </label>
                    <div className="text-[10px] text-zinc-500 space-y-1">
                      <p>
                        <span className="font-bold text-zinc-400">{t(language, "settings.core.source")}</span>{" "}
                        <span className="rounded bg-amber-500/10 border border-amber-500/35 px-1.5 py-0.5 text-[9px] text-amber-500 font-bold uppercase tracking-wider">
                          {settings.exchangeRateSource ?? t(language, "settings.core.manual")}
                        </span>
                      </p>
                      <p>
                        <span className="font-bold text-zinc-400">{t(language, "settings.core.lastUpdated")}</span>{" "}
                        <span className="font-mono text-zinc-400 font-medium">
                          {settings.exchangeRateUpdatedAt ?? t(language, "settings.core.initialSetup")}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-zinc-500 italic mt-0.5">
                    {t(language, "settings.core.exchangeRateNote")}
                  </p>
                </div>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 sm:col-span-2">
                  {t(language, "settings.core.gymWeeklyTarget")}
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={settings.gymWeeklyTarget}
                    onChange={(e) => setGymWeeklyTarget(Number(e.target.value) || 4)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 font-bold focus:outline-none focus:border-amber-500/50"
                  />
                </label>
              </div>
            </div>

            {/* Privacy warnings & Database Backups */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                {t(language, "settings.data.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                {t(language, "settings.data.title")}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {t(language, "settings.data.description")}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={exportData}
                  className="rounded-lg bg-amber-500 text-zinc-950 px-4 py-3 hover:bg-amber-400 transition"
                >
                  {t(language, "settings.data.exportJson")}
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-200 hover:bg-zinc-800 transition"
                >
                  {t(language, "settings.data.importJson")}
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={importData}
                  className="hidden"
                />
              </div>
            </div>

            {/* Polished Testing & Sample Data section */}
            <div className="rounded-xl border border-amber-500/25 bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                {t(language, "settings.testing.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                {t(language, "settings.testing.title")}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {t(language, "settings.testing.description")}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={handleLoadSampleDataOverwrite}
                  className="rounded-lg bg-amber-500 text-zinc-950 px-3 py-3 hover:bg-amber-400 transition text-center"
                  title={t(language, "settings.sample.replaceTitle")}
                >
                  {t(language, "settings.testing.replace")}
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleDataMerge}
                  className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-3 text-amber-500 hover:bg-amber-500/10 transition text-center font-bold"
                  title={t(language, "settings.sample.mergeTitle")}
                >
                  {t(language, "settings.testing.merge")}
                </button>
                <button
                  type="button"
                  onClick={handleResetWorkspace}
                  className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-3 text-red-400 hover:bg-red-500/20 transition text-center"
                  title={t(language, "settings.sample.resetTitle")}
                >
                  {t(language, "settings.testing.reset")}
                </button>
              </div>
            </div>

            {/* Markdown & Obsidian Exporter */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                {t(language, "settings.markdown.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                {t(language, "settings.markdown.title")}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {t(language, "settings.markdown.description")}
              </p>
              
              <div className="mt-5 grid gap-3 sm:grid-cols-2 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  disabled={!latestReview}
                  onClick={() => latestReview && downloadWeeklyReviewMarkdown(latestReview)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t(language, "settings.markdown.exportLatestReview")}
                </button>
                <button
                  type="button"
                  disabled={notes.length === 0}
                  onClick={() => downloadAllNotesMarkdown(notes)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t(language, "settings.markdown.exportNotes")}
                </button>
                <button
                  type="button"
                  disabled={goals.length === 0}
                  onClick={() => downloadGoalsSummaryMarkdown(goals)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t(language, "settings.markdown.exportGoals")}
                </button>
                <button
                  type="button"
                  disabled={tasks.length === 0}
                  onClick={() =>
                    downloadTodayPlanMarkdown({
                      date: today,
                      dayMode: settings.dayMode,
                      dailyLoad: todayStats.dailyLoad,
                      plannedCount: todayStats.plannedCount,
                      completedTodayCount: todayStats.completedTodayCount,
                      estimatedMinutesRemaining:
                        todayStats.estimatedMinutesRemaining,
                      xpAvailableToday: todayStats.xpAvailableToday,
                      sections: todaySections,
                    })
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t(language, "settings.markdown.exportToday")}
                </button>
                <button
                  type="button"
                  disabled={subjects.length === 0 && tasks.length === 0 && sessions.length === 0}
                  onClick={() =>
                    downloadAcademicWeekMarkdown({ subjects, tasks, sessions })
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2"
                >
                  {t(language, "settings.markdown.exportAcademicWeek")}
                </button>
              </div>
              <p className="mt-3 text-[10px] text-zinc-500 italic">
                {t(language, "settings.markdown.disabledNote")}
              </p>
            </div>

          </div>

          {/* Right Column — QA checklist & Scope */}
          <div className="grid gap-6">
            <CloudDiagnostics
              notes={notes}
              tasks={tasks}
              goals={goals}
              subjects={subjects}
              academicTasks={academicTasks}
              studySessions={sessions}
              gymLogs={workouts}
              clients={clients}
              workItems={workItems}
              transactions={transactions}
            />

            <CloudQAChecklist />
            
            {/* Live QA Checklist Box */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                {t(language, "settings.qa.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                {t(language, "settings.qa.title")}
              </h2>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                {t(language, "settings.qa.description")}
              </p>

              <div className="mt-6 space-y-2.5">
                {[
                  { label: t(language, "settings.qa.dashboardBriefed"), ok: tasks.length > 0 || workItems.length > 0, desc: `${tasks.length + workItems.length} ${t(language, "settings.qa.activeAgendaItems")}` },
                  { label: t(language, "settings.qa.xpProgress"), ok: xp.currentXP > 0, desc: `${t(language, "settings.qa.current")}: ${xp.currentXP} XP (${t(language, "xp.level")} ${xp.level})` },
                  { label: t(language, "settings.qa.financeLedger"), ok: transactions.length > 0, desc: `${transactions.length} ${t(language, "settings.qa.ledgerEntries")}` },
                  { label: t(language, "settings.qa.savingsLinked"), ok: goals.some(g => g.linkedFinanceMetric === "savings"), desc: goals.some(g => g.linkedFinanceMetric === "savings") ? t(language, "settings.qa.verified") : t(language, "settings.qa.missing") },
                  { label: t(language, "settings.qa.gymLogs"), ok: workouts.length > 0, desc: `${workouts.length} ${t(language, "settings.qa.gymLogsActive")}` },
                  { label: t(language, "settings.qa.academicTimeline"), ok: subjects.length > 0 && tasks.some(t => t.area === "Academic"), desc: `${subjects.length} ${t(language, "settings.qa.subjectsAcademicTasks")}` },
                  { label: t(language, "settings.qa.clientBoard"), ok: clients.length > 0 && workItems.length > 0, desc: `${clients.length} ${t(language, "settings.qa.clients")}, ${workItems.length} ${t(language, "settings.qa.items")}` },
                  { label: t(language, "settings.qa.notesKnowledge"), ok: notes.length > 0, desc: `${notes.length} ${t(language, "settings.qa.markdownNotes")}` },
                  { label: t(language, "settings.qa.weeklyReflection"), ok: reviews.length > 0, desc: `${reviews.length} ${t(language, "settings.qa.completedReviews")}` },
                  { label: t(language, "settings.qa.dailyWraps"), ok: dailyWraps.length > 0, desc: `${dailyWraps.length} ${t(language, "settings.qa.dailyReflections")}` },
                ].map((check) => (
                  <div key={check.label} className="flex items-center justify-between gap-3 text-xs border-b border-[#27272a]/45 pb-2">
                    <span className="font-semibold text-zinc-300">{check.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 font-mono">{check.desc}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${
                        check.ok 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 animate-pulse-subtle" 
                          : "bg-zinc-800 text-zinc-500 border-[#27272a]"
                      }`}>
                        {check.ok ? `✓ ${t(language, "settings.qa.mapped")}` : `○ ${t(language, "settings.qa.empty")}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scope Audit */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "settings.scope.eyebrow")}
              </p>
              <h2 className="mt-2 text-xl font-bold text-zinc-100">{t(language, "settings.scope.title")}</h2>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                {t(language, "settings.scope.description")}
              </p>
              <div className="mt-4 grid gap-2">
                {ATLAS_STORAGE_KEY_VALUES.map((key) => (
                  <code
                    key={key}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-xs text-amber-500/90 font-mono flex items-center justify-between"
                  >
                    <span>{key}</span>
                    <span className="text-[8px] rounded bg-zinc-800 border border-[#27272a] px-1.5 py-0.5 text-zinc-500 font-bold uppercase tracking-wider">{t(language, "settings.scope.vault")}</span>
                  </code>
                ))}
              </div>
            </div>

            {/* Obsidian Vault Context */}
            <div className="rounded-xl border border-[#27272a]/60 bg-gradient-to-br from-[#18181b] to-[#141416] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                {t(language, "settings.obsidian.eyebrow")}
              </p>
              <h2 className="mt-2 text-xl font-bold text-zinc-100">{t(language, "settings.obsidian.title")}</h2>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                {t(language, "settings.obsidian.description")}
              </p>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}

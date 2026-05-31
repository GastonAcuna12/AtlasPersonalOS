"use client";

import Link from "next/link";
import { ChangeEvent, useRef, useState } from "react";
import {
  useAtlasAuth,
  useLocalAtlasDataSummary,
} from "@/lib/auth";
import {
  downloadAcademicWeekMarkdown,
  downloadAllNotesMarkdown,
  downloadGoalsSummaryMarkdown,
  downloadTodayPlanMarkdown,
  downloadWeeklyReviewMarkdown,
} from "@/lib/markdownExport";
import {
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
    setGymWeeklyTarget,
  } = useAtlasSettings();
  
  const latestReview = getLatestReview(reviews);
  const today = todayISO();
  const todayStats = calculateTodayStats(tasks, today);
  const todaySections = groupTasksForToday(tasks, today);

  const accountSyncState = (() => {
    if (!auth.isConfigured) {
      return {
        status: "Cloud sync not configured",
        mode: "Local-only",
        message: "Atlas is running fully locally on this browser.",
        badgeClass: "border-zinc-700 bg-zinc-800/70 text-zinc-300",
      };
    }

    if (auth.status === "signed_in") {
      return {
        status: "Cloud session detected",
        mode: "Cloud-ready",
        message: "No data is synced yet. Migration will be added later.",
        badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      };
    }

    if (auth.status === "error") {
      return {
        status: "Cloud session check failed",
        mode: "Local-only",
        message:
          auth.errorMessage ||
          "Atlas remains local-only while the cloud session is unavailable.",
        badgeClass: "border-red-500/30 bg-red-500/10 text-red-300",
      };
    }

    if (auth.status === "loading") {
      return {
        status: "Checking cloud session",
        mode: "Local-only",
        message: "Atlas remains local-only while account state is checked.",
        badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      };
    }

    return {
      status: "Cloud sync available",
      mode: "Local-only",
      message: "Sign in is available on the Account page. No data is synced yet.",
      badgeClass: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    };
  })();

  const accountSessionHint =
    auth.status === "signed_in"
      ? "Use Account to sign out. No migration controls are active."
      : auth.isConfigured
        ? "Sign in to prepare sync. No data will upload."
        : "Configure Supabase env vars to enable sign-in.";

  function exportData() {
    setError("");
    downloadAtlasBackup();
    setMessage("Atlas data exported as a local JSON backup file successfully.");
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
        setError("Invalid backup schema. This file does not look like a valid Atlas backup JSON.");
        return;
      }

      if (!importAtlasBackup(parsed)) {
        setError("Import failed. Atlas could not import this backup file.");
        return;
      }

      setMessage("Atlas backup imported successfully. Syncing state...");
      window.location.reload();
    } catch {
      setError("Error parsing file. Atlas could not read that JSON file.");
    } finally {
      event.target.value = "";
    }
  }

  function handleResetWorkspace() {
    const confirmed = window.confirm(
      "CRITICAL WARNING: This will permanently wipe out your entire Atlas workspace. All configurations, habits, streaks, finances, tasks, client logs, academic logs, daily wraps, weekly reviews, and settings will be lost. This action is irreversible. Do you wish to proceed?"
    );
    if (!confirmed) return;

    try {
      clearAtlasLocalData();
      setMessage("Atlas workspace reset to empty successfully. Syncing state...");
      window.setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch {
      setError("Failed to clear local workspace storage.");
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
      ? "WARNING: Replacing the workspace with sample data will COMPLETELY OVERWRITE and DELETE all your current notes, goals, tasks, finance logs, client/freelance board tickets, and gym logs. This action is irreversible. Are you sure you want to proceed?"
      : "Are you sure you want to replace your empty workspace with the complete demo sample dataset? This will load safe development mock data for public demonstration.";

    const confirmed = window.confirm(messageCopy);
    if (!confirmed) return;

    try {
      loadSampleData(false); // Replace
      setMessage("Safe development mock data loaded (Overwrite Mode). Syncing workspace...");
      window.setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch {
      setError("Failed to load sample data in overwrite mode.");
    }
  }

  function handleLoadSampleDataMerge() {
    setError("");
    setMessage("");

    const confirmed = window.confirm(
      "Are you sure you want to merge demo sample data into your active workspace? This will inject development mock records directly alongside your existing data."
    );
    if (!confirmed) return;

    try {
      loadSampleData(true); // Merge
      setMessage("Safe development mock data merged successfully. Syncing workspace...");
      window.setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch {
      setError("Failed to load sample data in merge mode.");
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d0e] text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 animate-fade-in-up">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
              Atlas System Hub
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
              System Settings
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Dashboard
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
                    Account &amp; Sync
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                    Local-first account status
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Account controls live on the optional Account page. Atlas
                    does not sync, migrate, or upload local data yet.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/account"
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  >
                    Open Account
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
                    Status
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
                    Session
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-100">
                    {auth.status === "signed_in"
                      ? (auth.user?.email ?? "Signed in")
                      : "No active login"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {accountSessionHint}
                  </p>
                </div>
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Local Workspace
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-100">
                    {localDataSummary.hasLocalData
                      ? "Detected"
                      : "No records detected"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {localDataSummary.hasLocalData
                      ? `${localDataSummary.approximateRecordCount} approximate records across ${localDataSummary.populatedKeyCount} Atlas storage keys.`
                      : "Atlas found no populated local workspace keys yet."}
                  </p>
                </div>
              </div>
            </div>

            <MigrationDecisionPanel />
            
            {/* System Configuration */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                Core Engine
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                Preferences &amp; Thresholds
              </h2>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                Customize operational modes, base currencies, and gym habit metrics.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                  Active Day Mode
                  <select
                    value={settings.dayMode}
                    onChange={(e) => setDayMode(e.target.value as DayMode)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Normal Day">Normal Day</option>
                    <option value="University Day">University Day</option>
                    <option value="Work Sprint Day">Work Sprint Day</option>
                    <option value="Low Energy Day">Low Energy Day</option>
                    <option value="Recovery Day">Recovery Day</option>
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                  Base Currency
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
                      Exchange Rate (1 USD = X PYG)
                      <input
                        type="number"
                        value={settings.usdToPygRate}
                        onChange={(e) => setExchangeRate(Number(e.target.value) || 6150)}
                        className="rounded-lg border border-[#27272a] bg-[#0d0d0e] px-3 py-2 text-zinc-100 font-bold w-48 focus:outline-none focus:border-amber-500/50"
                      />
                    </label>
                    <div className="text-[10px] text-zinc-500 space-y-1">
                      <p>
                        <span className="font-bold text-zinc-400">Source:</span>{" "}
                        <span className="rounded bg-amber-500/10 border border-amber-500/35 px-1.5 py-0.5 text-[9px] text-amber-500 font-bold uppercase tracking-wider">
                          {settings.exchangeRateSource ?? "Manual"}
                        </span>
                      </p>
                      <p>
                        <span className="font-bold text-zinc-400">Last updated:</span>{" "}
                        <span className="font-mono text-zinc-400 font-medium">
                          {settings.exchangeRateUpdatedAt ?? "Initial Setup"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-zinc-500 italic mt-0.5">
                    ℹ️ Atlas does not query dynamic online exchange rates yet. Update this manually when required.
                  </p>
                </div>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 sm:col-span-2">
                  Gym Weekly Target (Workouts / Week)
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
                Security Sandbox
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                Privacy &amp; Data Vault
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Atlas is offline-first. Your reviews, finances, workouts, and plans are stored directly in your local browser storage. Backups contain sensitive personal data — keep them safe and out of public Git repos.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={exportData}
                  className="rounded-lg bg-amber-500 text-zinc-950 px-4 py-3 hover:bg-amber-400 transition"
                >
                  Export Local Backup (JSON)
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-200 hover:bg-zinc-800 transition"
                >
                  Import Local Backup (JSON)
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
                Mocking Harness
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                Testing &amp; Sample Data
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Sample data is fake and safe for public demos. It is meant to test Atlas without using real personal data.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={handleLoadSampleDataOverwrite}
                  className="rounded-lg bg-amber-500 text-zinc-950 px-3 py-3 hover:bg-amber-400 transition text-center"
                  title="Overwrite current local workspace with complete sample data"
                >
                  Replace Workspace
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleDataMerge}
                  className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-3 text-amber-500 hover:bg-amber-500/10 transition text-center font-bold"
                  title="Safely merge sample mock records into your active workspace"
                >
                  Merge Demo Data
                </button>
                <button
                  type="button"
                  onClick={handleResetWorkspace}
                  className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-3 text-red-400 hover:bg-red-500/20 transition text-center"
                  title="Wipe out everything and reset workspace to pristine empty state"
                >
                  Reset Workspace
                </button>
              </div>
            </div>

            {/* Markdown & Obsidian Exporter */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Interoperability
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                Markdown / Obsidian Export
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Download structured knowledge-base Markdown files optimized for direct drag-and-drop import into Obsidian or any other markdown viewer.
              </p>
              
              <div className="mt-5 grid gap-3 sm:grid-cols-2 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  disabled={!latestReview}
                  onClick={() => latestReview && downloadWeeklyReviewMarkdown(latestReview)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Export Latest Weekly Review
                </button>
                <button
                  type="button"
                  disabled={notes.length === 0}
                  onClick={() => downloadAllNotesMarkdown(notes)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Export Notes Library
                </button>
                <button
                  type="button"
                  disabled={goals.length === 0}
                  onClick={() => downloadGoalsSummaryMarkdown(goals)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Export Goals Roadmap
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
                  Export Today&apos;s Plan
                </button>
                <button
                  type="button"
                  disabled={subjects.length === 0 && tasks.length === 0 && sessions.length === 0}
                  onClick={() =>
                    downloadAcademicWeekMarkdown({ subjects, tasks, sessions })
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2"
                >
                  Export Academic Week Logs
                </button>
              </div>
              <p className="mt-3 text-[10px] text-zinc-500 italic">
                * Buttons are disabled if no local data exists yet in that category.
              </p>
            </div>

          </div>

          {/* Right Column — QA checklist & Scope */}
          <div className="grid gap-6">
            
            {/* Live QA Checklist Box */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                System Quality Assurance
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                Harness QA Checklist
              </h2>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                Live diagnostic indicators calculating local database volumes.
              </p>

              <div className="mt-6 space-y-2.5">
                {[
                  { label: "Dashboard briefed", ok: tasks.length > 0 || workItems.length > 0, desc: `${tasks.length + workItems.length} active agenda items` },
                  { label: "XP / Levels progress", ok: xp.currentXP > 0, desc: `Current: ${xp.currentXP} XP (Level ${xp.level})` },
                  { label: "Finance Ledger conversion", ok: transactions.length > 0, desc: `${transactions.length} PYG/USD ledger entries` },
                  { label: "Savings-linked Goal mapped", ok: goals.some(g => g.linkedFinanceMetric === "savings"), desc: goals.some(g => g.linkedFinanceMetric === "savings") ? "Verified" : "Missing" },
                  { label: "Gym intensity logs & Streaks", ok: workouts.length > 0, desc: `${workouts.length} gym logs active` },
                  { label: "Academic course timeline", ok: subjects.length > 0 && tasks.some(t => t.area === "Academic"), desc: `${subjects.length} subjects & acad tasks` },
                  { label: "Client Freelance Board tickets", ok: clients.length > 0 && workItems.length > 0, desc: `${clients.length} clients, ${workItems.length} items` },
                  { label: "Notes Knowledge base", ok: notes.length > 0, desc: `${notes.length} markdown notes` },
                  { label: "Weekly reflection logs", ok: reviews.length > 0, desc: `${reviews.length} completed review journals` },
                  { label: "Daily wraps & reflections", ok: dailyWraps.length > 0, desc: `${dailyWraps.length} daily reflections logged` },
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
                        {check.ok ? "✓ MAPPED" : "○ EMPTY"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scope Audit */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Auditing
              </p>
              <h2 className="mt-2 text-xl font-bold text-zinc-100">Export Scope</h2>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                Export and clear options affect strictly Atlas Personal OS-specific local browser storage tokens. Other site cookies, extensions, or browser settings are completely untouched.
              </p>
              <div className="mt-4 grid gap-2">
                {ATLAS_STORAGE_KEY_VALUES.map((key) => (
                  <code
                    key={key}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-xs text-amber-500/90 font-mono flex items-center justify-between"
                  >
                    <span>{key}</span>
                    <span className="text-[8px] rounded bg-zinc-800 border border-[#27272a] px-1.5 py-0.5 text-zinc-500 font-bold uppercase tracking-wider">Vault</span>
                  </code>
                ))}
              </div>
            </div>

            {/* Obsidian Vault Context */}
            <div className="rounded-xl border border-[#27272a]/60 bg-gradient-to-br from-[#18181b] to-[#141416] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                Knowledge Mapping
              </p>
              <h2 className="mt-2 text-xl font-bold text-zinc-100">Obsidian Integration</h2>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                These generated templates represent snapshots of your local workspace. Drag downloaded files into your vault directory. They include parsed statistics, metadata, and links mapped perfectly to Obsidian frontmatter structures.
              </p>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}

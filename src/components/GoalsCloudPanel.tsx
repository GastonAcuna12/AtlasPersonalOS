"use client";

import Link from "next/link";
import { useState } from "react";
import { useAtlasAuth } from "@/lib/auth";
import { createCloudGoal, listCloudGoals } from "@/lib/supabase/goals";
import type { Goal, GoalDraft } from "@/types/atlas";
import { t } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";

type CloudAction = "load" | "create" | "upload" | null;

type GoalsCloudPanelProps = {
  localGoals: Goal[];
};

function getSelectedGoal(localGoals: Goal[], selectedGoalId: string) {
  const selectedId = selectedGoalId || localGoals[0]?.id || "";
  return localGoals.find((goal) => goal.id === selectedId) ?? null;
}

function getPreviewProgress(goal: Goal) {
  if (goal.targetValue <= 0 || goal.linkedFinanceMetric === "savings") {
    return null;
  }

  return Math.min(
    Math.max(Math.round((goal.currentValue / goal.targetValue) * 100), 0),
    100,
  );
}

export function GoalsCloudPanel({ localGoals }: GoalsCloudPanelProps) {
  const auth = useAtlasAuth();
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const [cloudGoals, setCloudGoals] = useState<Goal[]>([]);
  const [hasLoadedCloudGoals, setHasLoadedCloudGoals] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [activeAction, setActiveAction] = useState<CloudAction>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedGoal = getSelectedGoal(localGoals, selectedGoalId);
  const selectedValue = selectedGoal?.id ?? "";

  async function handleLoadCloudGoals() {
    setActiveAction("load");
    setMessage("");
    setError("");

    try {
      const result = await listCloudGoals();

      if (result.ok) {
        setCloudGoals(result.data);
        setHasLoadedCloudGoals(true);
        setMessage(result.message);
      } else {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateTestCloudGoal() {
    setActiveAction("create");
    setMessage("");
    setError("");

    const testGoal: GoalDraft = {
      title: "Atlas Cloud Goals POC",
      area: "Atlas",
      status: "active",
      currentValue: 1,
      targetValue: 3,
      deadline: "",
      notes:
        "Manual cloud goal created from Atlas for Supabase Goals testing only.",
      linkedFinanceMetric: "none",
      currency: "PYG",
      unit: "milestones",
    };

    try {
      const result = await createCloudGoal(testGoal);

      if (result.ok && result.data) {
        setCloudGoals((current) => [result.data as Goal, ...current]);
        setHasLoadedCloudGoals(true);
        setMessage(result.message);
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleUploadSelectedGoal() {
    if (!selectedGoal) {
      setError(t(language, "cloud.chooseLocalGoal"));
      return;
    }

    const confirmed = window.confirm(
      t(
        language,
        "cloud.goals.confirmUpload",
        "Upload this selected local goal copy to Supabase Cloud Goals? This sends its title, notes, area, status, values, unit, currency, deadline, and linked metric. The local goal will remain unchanged.",
      ),
    );

    if (!confirmed) {
      return;
    }

    setActiveAction("upload");
    setMessage("");
    setError("");

    try {
      const result = await createCloudGoal(selectedGoal);

      if (result.ok && result.data) {
        setCloudGoals((current) => [result.data as Goal, ...current]);
        setHasLoadedCloudGoals(true);
        setMessage(
          t(language, "cloud.uploadedGoal"),
        );
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  if (!auth.isConfigured) {
    return (
      <section className="mt-6 rounded-xl border border-[#27272a] bg-[#18181b] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t(language, "cloud.goals.title")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localGoals")}
            </p>
          </div>
          <span className="w-fit rounded-full border border-zinc-700 bg-zinc-800/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
            {t(language, "settings.accountSync.notConfigured.status")}
          </span>
        </div>
      </section>
    );
  }

  if (auth.status !== "signed_in") {
    return (
      <section className="mt-6 rounded-xl border border-[#27272a] bg-[#18181b] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
              {t(language, "cloud.goals.title")}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localGoals")}
            </p>
            <p className="mt-1 text-xs leading-6 text-zinc-500">
              {t(language, "cloud.goals.signIn")}
            </p>
          </div>
          <Link
            href="/account"
            className="w-fit rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {t(language, "account.eyebrow")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-sky-500/25 bg-[#18181b] p-6 shadow-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
            {t(language, "cloud.goals.title")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {t(language, "cloud.goals.available")}
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">
            {t(language, "common.manualCloudPreview")}. {t(language, "common.cloudDataSeparate")}
          </p>
        </div>
        <span className="w-fit rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          {t(language, "settings.accountSync.signedIn")}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleLoadCloudGoals}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "load" ? t(language, "common.loading") : t(language, "cloud.loadGoals")}
          </button>
          <button
            type="button"
            onClick={handleCreateTestCloudGoal}
            disabled={activeAction !== null}
            className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create"
              ? t(language, "common.creating")
              : t(language, "cloud.createGoal")}
          </button>
        </div>

        <button
          type="button"
          disabled
          className="rounded-lg border border-[#27272a] bg-[#121214]/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 opacity-60"
        >
          {t(language, "cloud.uploadAllGoals")}
          <span className="ml-2 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400">
            {t(language, "common.comingSoon")}
          </span>
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "cloud.uploadGoal")}
          <select
            value={selectedValue}
            onChange={(event) => setSelectedGoalId(event.target.value)}
            disabled={localGoals.length === 0 || activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {localGoals.length === 0 ? (
              <option value="">{t(language, "cloud.noLocalGoals", "No local goals available")}</option>
            ) : (
              localGoals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          onClick={handleUploadSelectedGoal}
          disabled={!selectedGoal || activeAction !== null}
          className="self-end rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {activeAction === "upload" ? t(language, "common.uploading") : t(language, "cloud.uploadGoal")}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-xs font-semibold text-emerald-400">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-300">
          {error}
        </p>
      ) : null}

      {hasLoadedCloudGoals ? (
        <div className="mt-6 rounded-xl border border-[#27272a] bg-[#121214] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "cloud.goals.title")}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {t(language, "common.manualCloudPreview")}
              </p>
            </div>
            <span className="w-fit rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {cloudGoals.length} {t(language, "cloud.loaded", "loaded")}
            </span>
          </div>

          {cloudGoals.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {cloudGoals.map((goal) => {
                const progress = getPreviewProgress(goal);

                return (
                  <article
                    key={goal.id}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100">
                          {goal.title}
                        </h3>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          {goal.area || t(language, "common.personal")} - {t(language, `goals.status.${goal.status}`, goal.status)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {goal.currency ? (
                          <span className="rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">
                            {goal.currency}
                          </span>
                        ) : null}
                        {goal.deadline ? (
                          <span className="rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">
                            {t(language, "task.due")} {goal.deadline}
                          </span>
                        ) : null}
                        {goal.linkedFinanceMetric === "savings" ? (
                          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                            {t(language, "goals.savingsLinked", "savings linked")}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full border border-[#27272a] bg-zinc-850">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-300"
                          style={{ width: `${progress ?? 0}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        <span>
                          {goal.currentValue} / {goal.targetValue}{" "}
                          {goal.unit || goal.currency || ""}
                        </span>
                        <span>{progress === null ? t(language, "cloud.localCopy") : `${progress}%`}</span>
                      </div>
                    </div>

                    {goal.notes ? (
                      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-6 text-zinc-400">
                        {goal.notes}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-[#27272a] bg-[#18181b] p-4 text-xs leading-6 text-zinc-500">
              {t(language, "cloud.goals.empty", "No cloud goals returned. Local goals are still unchanged.")}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

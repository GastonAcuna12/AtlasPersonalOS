"use client";

import Link from "next/link";
import { useState } from "react";
import { useAtlasAuth } from "@/lib/auth";
import { todayISO } from "@/lib/gym";
import { useAtlasSettings } from "@/lib/settings";
import {
  createCloudGymLog,
  listCloudGymLogs,
} from "@/lib/supabase/gym";
import { t } from "@/lib/i18n";
import type { WorkoutDraft, WorkoutLog } from "@/types/atlas";

type CloudAction = "load" | "create" | "upload" | null;

type GymCloudPanelProps = {
  localGymLogs: WorkoutLog[];
};

function getSelectedGymLog(localGymLogs: WorkoutLog[], selectedLogId: string) {
  const selectedId = selectedLogId || localGymLogs[0]?.id || "";
  return localGymLogs.find((log) => log.id === selectedId) ?? null;
}

export function GymCloudPanel({ localGymLogs }: GymCloudPanelProps) {
  const auth = useAtlasAuth();
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const [cloudGymLogs, setCloudGymLogs] = useState<WorkoutLog[]>([]);
  const [hasLoadedCloudGymLogs, setHasLoadedCloudGymLogs] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState("");
  const [activeAction, setActiveAction] = useState<CloudAction>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedLog = getSelectedGymLog(localGymLogs, selectedLogId);
  const selectedValue = selectedLog?.id ?? "";

  async function handleLoadCloudGymLogs() {
    setActiveAction("load");
    setMessage("");
    setError("");

    try {
      const result = await listCloudGymLogs();

      if (result.ok) {
        setCloudGymLogs(result.data);
        setHasLoadedCloudGymLogs(true);
        setMessage(t(language, "cloud.gym.loadedMessage"));
      } else {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateTestCloudGymLog() {
    setActiveAction("create");
    setMessage("");
    setError("");

    const testGymLog: WorkoutDraft = {
      date: todayISO(),
      workoutType: "Push",
      duration: 45,
      energy: 6,
      intensity: 7,
      notes: t(language, "cloud.gym.testNotes"),
    };

    try {
      const result = await createCloudGymLog(testGymLog);

      if (result.ok && result.data) {
        setCloudGymLogs((current) => [result.data as WorkoutLog, ...current]);
        setHasLoadedCloudGymLogs(true);
        setMessage(t(language, "cloud.gym.createdMessage"));
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleUploadSelectedGymLog() {
    if (!selectedLog) {
      setError(t(language, "cloud.chooseLocalGymLog"));
      return;
    }

    const confirmed = window.confirm(
      t(
        language,
        "cloud.gym.confirmUpload",
        "Upload this selected local gym log copy to Supabase Cloud Gym? This sends date, workout type, duration, energy, intensity, and notes. The local gym log will remain unchanged.",
      ),
    );

    if (!confirmed) {
      return;
    }

    setActiveAction("upload");
    setMessage("");
    setError("");

    try {
      const result = await createCloudGymLog(selectedLog);

      if (result.ok && result.data) {
        setCloudGymLogs((current) => [result.data as WorkoutLog, ...current]);
        setHasLoadedCloudGymLogs(true);
        setMessage(t(language, "cloud.uploadedGymLog"));
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
              {t(language, "cloud.gym.title")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localGym")}
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
              {t(language, "cloud.gym.title")}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localGym")}
            </p>
            <p className="mt-1 text-xs leading-6 text-zinc-500">
              {t(language, "cloud.gym.signIn")}
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
            {t(language, "cloud.gym.title")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {t(language, "cloud.gym.available")}
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">
            {t(language, "common.manualCloudPreview")}.{" "}
            {t(language, "common.cloudDataSeparate")}
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
            onClick={handleLoadCloudGymLogs}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "load"
              ? t(language, "common.loading")
              : t(language, "cloud.loadGymLogs")}
          </button>
          <button
            type="button"
            onClick={handleCreateTestCloudGymLog}
            disabled={activeAction !== null}
            className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create"
              ? t(language, "common.creating")
              : t(language, "cloud.createGymLog")}
          </button>
        </div>

        <button
          type="button"
          disabled
          className="rounded-lg border border-[#27272a] bg-[#121214]/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 opacity-60"
        >
          {t(language, "cloud.uploadAllGymLogs")}
          <span className="ml-2 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400">
            {t(language, "common.comingSoon")}
          </span>
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "cloud.uploadGymLog")}
          <select
            value={selectedValue}
            onChange={(event) => setSelectedLogId(event.target.value)}
            disabled={localGymLogs.length === 0 || activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {localGymLogs.length === 0 ? (
              <option value="">
                {t(language, "cloud.noLocalGymLogs")}
              </option>
            ) : (
              localGymLogs.map((log) => (
                <option key={log.id} value={log.id}>
                  {log.date} - {t(language, `gym.workoutType.${log.workoutType}`, log.workoutType)} -{" "}
                  {log.duration} {t(language, "common.minutes").toLowerCase()}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          onClick={handleUploadSelectedGymLog}
          disabled={!selectedLog || activeAction !== null}
          className="self-end rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {activeAction === "upload"
            ? t(language, "common.uploading")
            : t(language, "cloud.uploadGymLog")}
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

      {hasLoadedCloudGymLogs ? (
        <div className="mt-6 rounded-xl border border-[#27272a] bg-[#121214] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "cloud.gym.title")}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {t(language, "common.manualCloudPreview")}
              </p>
            </div>
            <span className="w-fit rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {cloudGymLogs.length} {t(language, "cloud.loaded", "loaded")}
            </span>
          </div>

          {cloudGymLogs.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {cloudGymLogs.map((log) => {
                const isRest = log.workoutType === "Rest";

                return (
                  <article
                    key={log.id}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100">
                          {t(language, `gym.workoutType.${log.workoutType}`, log.workoutType)}{" "}
                          {isRest
                            ? `(${t(language, "gym.restDay", "Rest day")})`
                            : t(language, "calendar.session", "Session")}
                        </h3>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          {log.date} - {isRest ? t(language, "gym.restDay") : `${log.duration} ${t(language, "common.minutes").toLowerCase()}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">
                          {t(language, "common.energy")}: {log.energy}/10
                        </span>
                        <span className="rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">
                          {t(language, "common.intensity")}: {log.intensity}/10
                        </span>
                      </div>
                    </div>

                    {log.notes ? (
                      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-6 text-zinc-400">
                        {log.notes}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-[#27272a] bg-[#18181b] p-4 text-xs leading-6 text-zinc-500">
              {t(language, "cloud.gym.empty")}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

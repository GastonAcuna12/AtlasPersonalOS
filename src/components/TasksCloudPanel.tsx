"use client";

import Link from "next/link";
import { useState } from "react";
import { useAtlasAuth } from "@/lib/auth";
import {
  createCloudTask,
  listCloudTasks,
} from "@/lib/supabase/tasks";
import { todayISO } from "@/lib/tasks";
import type { AtlasTask, TaskDraft } from "@/types/atlas";

type CloudAction = "load" | "create" | "upload" | null;

type TasksCloudPanelProps = {
  localTasks: AtlasTask[];
};

function getSelectedTask(localTasks: AtlasTask[], selectedTaskId: string) {
  const selectedId = selectedTaskId || localTasks[0]?.id || "";
  return localTasks.find((task) => task.id === selectedId) ?? null;
}

export function TasksCloudPanel({ localTasks }: TasksCloudPanelProps) {
  const auth = useAtlasAuth();
  const [cloudTasks, setCloudTasks] = useState<AtlasTask[]>([]);
  const [hasLoadedCloudTasks, setHasLoadedCloudTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [activeAction, setActiveAction] = useState<CloudAction>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedTask = getSelectedTask(localTasks, selectedTaskId);
  const selectedValue = selectedTask?.id ?? "";

  async function handleLoadCloudTasks() {
    setActiveAction("load");
    setMessage("");
    setError("");

    try {
      const result = await listCloudTasks();

      if (result.ok) {
        setCloudTasks(result.data);
        setHasLoadedCloudTasks(true);
        setMessage(result.message);
      } else {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateTestCloudTask() {
    setActiveAction("create");
    setMessage("");
    setError("");

    const today = todayISO();
    const testTask: TaskDraft = {
      title: "Atlas Cloud Tasks POC",
      description:
        "Manual cloud task created from Atlas for Supabase Tasks testing only.",
      area: "Atlas",
      taskType: "Quick Task",
      status: "today",
      priority: "medium",
      dueDate: "",
      plannedDate: today,
      estimatedMinutes: 30,
      energyRequired: "medium",
    };

    try {
      const result = await createCloudTask(testTask);

      if (result.ok && result.data) {
        setCloudTasks((current) => [result.data as AtlasTask, ...current]);
        setHasLoadedCloudTasks(true);
        setMessage(result.message);
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleUploadSelectedTask() {
    if (!selectedTask) {
      setError("Choose a local task before uploading one cloud copy.");
      return;
    }

    const confirmed = window.confirm(
      "Upload this selected local task copy to Supabase Cloud Tasks? This sends its title, notes, area, type, priority, status, dates, duration, and energy. The local task will remain unchanged.",
    );

    if (!confirmed) {
      return;
    }

    setActiveAction("upload");
    setMessage("");
    setError("");

    try {
      const result = await createCloudTask(selectedTask);

      if (result.ok && result.data) {
        setCloudTasks((current) => [result.data as AtlasTask, ...current]);
        setHasLoadedCloudTasks(true);
        setMessage(
          "Uploaded one selected local task copy to Cloud Tasks. Local tasks were not changed.",
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
              Tasks Cloud POC
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              Local-only tasks
            </p>
          </div>
          <span className="w-fit rounded-full border border-zinc-700 bg-zinc-800/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
            Supabase not configured
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
              Tasks Cloud POC
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              Tasks are stored locally.
            </p>
            <p className="mt-1 text-xs leading-6 text-zinc-500">
              Sign in from Account to test cloud tasks. Local tasks keep
              working without an account.
            </p>
          </div>
          <Link
            href="/account"
            className="w-fit rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Account
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
            Tasks Cloud POC
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            Cloud Tasks POC available
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">
            Cloud task actions are manual and do not affect Today stats, XP,
            streaks, dashboard, Daily Wrap, or local task data.
          </p>
        </div>
        <span className="w-fit rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Signed in
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleLoadCloudTasks}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "load" ? "Loading..." : "Load cloud tasks"}
          </button>
          <button
            type="button"
            onClick={handleCreateTestCloudTask}
            disabled={activeAction !== null}
            className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create"
              ? "Creating..."
              : "Create test cloud task"}
          </button>
        </div>

        <button
          type="button"
          disabled
          className="rounded-lg border border-[#27272a] bg-[#121214]/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 opacity-60"
        >
          Upload all local tasks
          <span className="ml-2 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400">
            Coming soon
          </span>
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          Upload selected local task copy
          <select
            value={selectedValue}
            onChange={(event) => setSelectedTaskId(event.target.value)}
            disabled={localTasks.length === 0 || activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {localTasks.length === 0 ? (
              <option value="">No local tasks available</option>
            ) : (
              localTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          onClick={handleUploadSelectedTask}
          disabled={!selectedTask || activeAction !== null}
          className="self-end rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {activeAction === "upload" ? "Uploading..." : "Upload selected copy"}
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

      {hasLoadedCloudTasks ? (
        <div className="mt-6 rounded-xl border border-[#27272a] bg-[#121214] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Cloud Tasks Preview
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                Separate cloud-only preview
              </p>
            </div>
            <span className="w-fit rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {cloudTasks.length} loaded
            </span>
          </div>

          {cloudTasks.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {cloudTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-lg border border-[#27272a] bg-[#18181b] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">
                        {task.title}
                      </h3>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {task.area} - {task.taskType} - {task.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">
                        {task.priority}
                      </span>
                      <span className="rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">
                        {task.estimatedMinutes} min
                      </span>
                      {task.plannedDate ? (
                        <span className="rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">
                          planned {task.plannedDate}
                        </span>
                      ) : null}
                      {task.dueDate ? (
                        <span className="rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">
                          due {task.dueDate}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {task.description ? (
                    <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-6 text-zinc-400">
                      {task.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-[#27272a] bg-[#18181b] p-4 text-xs leading-6 text-zinc-500">
              No cloud tasks returned. Local tasks are still unchanged.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

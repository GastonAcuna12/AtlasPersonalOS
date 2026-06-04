"use client";

import { FormEvent, useState } from "react";
import {
  TASK_AREAS,
  TASK_ENERGY_LEVELS,
  TASK_PRIORITIES,
  TASK_TYPES,
  todayISO,
  type TaskArea,
  type TaskDraft,
  type TaskEnergy,
  type TaskPriority,
  type TaskType,
} from "@/lib/tasks";
import { t } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";

type TaskQuickAddFormProps = {
  defaultArea?: TaskArea;
  defaultTaskType?: TaskType;
  onAddTask: (draft: TaskDraft) => void;
};

function createInitialDraft(
  area: TaskArea = "Personal",
  taskType: TaskType = "Quick Task",
): TaskDraft {
  return {
    title: "",
    description: "",
    area,
    taskType,
    status: "today",
    priority: "medium",
    dueDate: "",
    plannedDate: todayISO(),
    estimatedMinutes: 30,
    energyRequired: "medium",
    scheduledTime: "",
  };
}

export function TaskQuickAddForm({
  defaultArea,
  defaultTaskType,
  onAddTask,
}: TaskQuickAddFormProps) {
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const [draft, setDraft] = useState(() =>
    createInitialDraft(defaultArea, defaultTaskType),
  );
  const [error, setError] = useState("");

  function updateDraft<Value extends keyof TaskDraft>(
    key: Value,
    value: TaskDraft[Value],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError(t(language, "task.errorTitle"));
      return;
    }

    if (!draft.estimatedMinutes || draft.estimatedMinutes <= 0) {
      setError(t(language, "task.errorMinutes"));
      return;
    }

    onAddTask({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
    });
    setDraft(createInitialDraft(defaultArea, defaultTaskType));
    setError("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl text-zinc-100"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">{t(language, "task.quickCapture")}</p>
      <h3 className="text-lg font-bold text-zinc-100 mt-1">{t(language, "task.addAgenda")}</h3>
      
      <div className="mt-4 grid gap-4">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "task.title")}
          <input
            placeholder={t(language, "task.titlePlaceholder")}
            value={draft.title}
            onChange={(event) => updateDraft("title", event.target.value)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-[#C8A96A]/50 font-bold"
            required
          />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "task.notesDetails")}
          <textarea
            placeholder={t(language, "task.notesPlaceholder")}
            rows={3}
            value={draft.description}
            onChange={(event) => updateDraft("description", event.target.value)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-[#C8A96A]/50 resize-none"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            {t(language, "common.area")}
            <select
              value={draft.area}
              onChange={(event) =>
                updateDraft("area", event.target.value as TaskArea)
              }
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#C8A96A]/50"
            >
              {TASK_AREAS.map((area) => (
                <option key={area} value={area}>
                  {t(language, `enum.taskArea.${area}`, area)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            {t(language, "task.taskType")}
            <select
              value={draft.taskType}
              onChange={(event) =>
                updateDraft("taskType", event.target.value as TaskType)
              }
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#C8A96A]/50"
            >
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(language, `enum.taskType.${type}`, type)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            {t(language, "common.priority")}
            <select
              value={draft.priority}
              onChange={(event) =>
                updateDraft("priority", event.target.value as TaskPriority)
              }
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#C8A96A]/50 cursor-pointer"
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t(language, `enum.priority.${priority}`, priority)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            {t(language, "common.energy")}
            <select
              value={draft.energyRequired}
              onChange={(event) =>
                updateDraft("energyRequired", event.target.value as TaskEnergy)
              }
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#C8A96A]/50 cursor-pointer"
            >
              {TASK_ENERGY_LEVELS.map((energy) => (
                <option key={energy} value={energy}>
                  {t(language, `enum.energy.${energy}`, energy)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "task.estimatedDuration")}
          <input
            type="number"
            min="1"
            value={draft.estimatedMinutes}
            onChange={(event) =>
              updateDraft("estimatedMinutes", Number(event.target.value))
            }
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-[#C8A96A]/50 font-semibold"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            {t(language, "task.plannedDate")}
            <input
              type="date"
              value={draft.plannedDate}
              onChange={(event) => updateDraft("plannedDate", event.target.value)}
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#C8A96A]/50"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            {t(language, "task.dueDateOptional")}
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) => updateDraft("dueDate", event.target.value)}
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#C8A96A]/50"
            />
          </label>
        </div>

        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "task.scheduledTime", "Scheduled Time (Optional)")}
          <input
            type="time"
            value={draft.scheduledTime || ""}
            onChange={(event) => updateDraft("scheduledTime", event.target.value)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-[#C8A96A]/50 font-semibold"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-[#B26A5B]/30 bg-[#B26A5B]/5 px-4 py-3 text-xs font-semibold text-[#C27A6B]">
          ⚠️ {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-6 w-full rounded-lg bg-[#C8A96A] text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-[#D4B87A] transition"
      >
        {t(language, "task.addTask")}
      </button>
    </form>
  );
}

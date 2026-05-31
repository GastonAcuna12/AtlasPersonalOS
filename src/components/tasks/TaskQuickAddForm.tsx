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
  };
}

export function TaskQuickAddForm({
  defaultArea,
  defaultTaskType,
  onAddTask,
}: TaskQuickAddFormProps) {
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
      setError("Please add a task title.");
      return;
    }

    if (!draft.estimatedMinutes || draft.estimatedMinutes <= 0) {
      setError("Estimated minutes must be greater than 0.");
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Quick capture</p>
      <h3 className="text-lg font-bold text-zinc-100 mt-1">Add Agenda Task</h3>
      
      <div className="mt-4 grid gap-4">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          Task Title *
          <input
            placeholder="e.g. Prepare lecture notes"
            value={draft.title}
            onChange={(event) => updateDraft("title", event.target.value)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 font-bold"
            required
          />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          Notes / Details
          <textarea
            placeholder="Add links, focus details, or guides..."
            rows={3}
            value={draft.description}
            onChange={(event) => updateDraft("description", event.target.value)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 resize-none"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            Area
            <select
              value={draft.area}
              onChange={(event) =>
                updateDraft("area", event.target.value as TaskArea)
              }
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
            >
              {TASK_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            Task Type
            <select
              value={draft.taskType}
              onChange={(event) =>
                updateDraft("taskType", event.target.value as TaskType)
              }
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
            >
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            Priority
            <select
              value={draft.priority}
              onChange={(event) =>
                updateDraft("priority", event.target.value as TaskPriority)
              }
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            Energy
            <select
              value={draft.energyRequired}
              onChange={(event) =>
                updateDraft("energyRequired", event.target.value as TaskEnergy)
              }
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              {TASK_ENERGY_LEVELS.map((energy) => (
                <option key={energy} value={energy}>
                  {energy}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          Estimated Duration (Minutes)
          <input
            type="number"
            min="1"
            value={draft.estimatedMinutes}
            onChange={(event) =>
              updateDraft("estimatedMinutes", Number(event.target.value))
            }
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 font-semibold"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            Planned Date
            <input
              type="date"
              value={draft.plannedDate}
              onChange={(event) => updateDraft("plannedDate", event.target.value)}
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            Due Date (Optional)
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) => updateDraft("dueDate", event.target.value)}
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
            />
          </label>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-400">
          ⚠️ {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-6 w-full rounded-lg bg-amber-500 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-amber-400 transition"
      >
        Add Task
      </button>
    </form>
  );
}

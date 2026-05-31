"use client";

import type { AtlasTask } from "@/lib/tasks";

type TaskCardProps = {
  task: AtlasTask;
  onStart?: (task: AtlasTask) => void;
  onComplete?: (task: AtlasTask) => void;
  onSkip?: (task: AtlasTask) => void;
  onMoveToday?: (task: AtlasTask) => void;
  onDelete?: (task: AtlasTask) => void;
};

const priorityTone: Record<AtlasTask["priority"], string> = {
  low: "bg-zinc-800 text-zinc-400 border border-[#27272a]/60",
  medium: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  high: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  critical: "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse",
};

export function TaskCard({
  task,
  onStart,
  onComplete,
  onSkip,
  onMoveToday,
  onDelete,
}: TaskCardProps) {
  return (
    <article className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg flex flex-col justify-between hover:border-zinc-500 transition-all duration-300">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold text-zinc-100 text-base break-words">{task.title}</h3>
            {task.description ? (
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {task.description}
              </p>
            ) : null}
          </div>
          <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/35 px-2.5 py-1 text-xs font-bold text-emerald-400 shrink-0 leading-none h-fit">
            +{task.xpReward} XP
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-wider">
          <span className="rounded bg-zinc-800 border border-[#27272a] px-2 py-0.5 text-zinc-400">
            {task.area}
          </span>
          <span className="rounded bg-zinc-800 border border-[#27272a] px-2 py-0.5 text-zinc-400">
            {task.taskType}
          </span>
          <span className={`rounded px-2 py-0.5 ${priorityTone[task.priority]}`}>
            {task.priority}
          </span>
          <span className="rounded bg-zinc-800 border border-[#27272a] px-2 py-0.5 text-zinc-400">
            {task.energyRequired} energy
          </span>
          <span className="rounded bg-zinc-800 border border-[#27272a] px-2 py-0.5 text-zinc-400 font-mono">
            {task.estimatedMinutes} min
          </span>
          {task.dueDate ? (
            <span className="rounded bg-zinc-800 border border-[#27272a] px-2 py-0.5 text-zinc-400 font-mono">
              due {task.dueDate}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider pt-4 border-t border-[#27272a]/60">
        {task.status !== "in_progress" && onStart ? (
          <button
            type="button"
            onClick={() => onStart(task)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          >
            Start
          </button>
        ) : null}
        {task.status !== "completed" && onComplete ? (
          <button
            type="button"
            onClick={() => onComplete(task)}
            className="rounded-lg bg-amber-500 text-zinc-950 px-3.5 py-2 transition hover:bg-amber-400 active:scale-95"
          >
            Complete
          </button>
        ) : null}
        {task.status !== "skipped" && onSkip ? (
          <button
            type="button"
            onClick={() => onSkip(task)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          >
            Skip
          </button>
        ) : null}
        {task.status === "backlog" && onMoveToday ? (
          <button
            type="button"
            onClick={() => onMoveToday(task)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          >
            Move to today
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2 text-red-400 transition hover:bg-red-500/20 active:scale-95 ml-auto"
          >
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
}

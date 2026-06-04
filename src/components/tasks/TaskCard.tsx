"use client";

import type { AtlasTask } from "@/lib/tasks";
import { t } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";

type TaskCardProps = {
  task: AtlasTask;
  onStart?: (task: AtlasTask) => void;
  onComplete?: (task: AtlasTask) => void;
  onSkip?: (task: AtlasTask) => void;
  onMoveToday?: (task: AtlasTask) => void;
  onRescheduleTomorrow?: (task: AtlasTask) => void;
  onDelete?: (task: AtlasTask) => void;
  onFocus?: (task: AtlasTask) => void;
  isOverdue?: boolean;
};

const priorityTone: Record<AtlasTask["priority"], string> = {
  low: "bg-zinc-800 text-zinc-400 border border-[#27272a]/60",
  medium: "bg-[#C8A96A]/10 text-[#C8A96A] border border-[#C8A96A]/20",
  high: "bg-[#C89060]/10 text-[#C89060] border border-[#C89060]/20",
  critical: "bg-[#B26A5B]/10 text-[#C27A6B] border border-[#B26A5B]/20",
};

export function TaskCard({
  task,
  onStart,
  onComplete,
  onSkip,
  onMoveToday,
  onRescheduleTomorrow,
  onDelete,
  onFocus,
  isOverdue,
}: TaskCardProps) {
  const { settings } = useAtlasSettings();
  const language = settings.language;

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
          <p className="rounded-lg bg-[#8A9A5B]/10 border border-[#8A9A5B]/35 px-2.5 py-1 text-xs font-bold text-[#9AAB6B] shrink-0 leading-none h-fit">
            +{task.xpReward} XP
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-wider">
          <span className="rounded bg-zinc-800 border border-[#27272a] px-2 py-0.5 text-zinc-400">
            {t(language, `enum.taskArea.${task.area}`, task.area)}
          </span>
          <span className="rounded bg-zinc-800 border border-[#27272a] px-2 py-0.5 text-zinc-400">
            {t(language, `enum.taskType.${task.taskType}`, task.taskType)}
          </span>
          <span className={`rounded px-2 py-0.5 ${priorityTone[task.priority]}`}>
            {t(language, `enum.priority.${task.priority}`, task.priority)}
          </span>
          <span className="rounded bg-zinc-800 border border-[#27272a] px-2 py-0.5 text-zinc-400">
            {t(language, `enum.energy.${task.energyRequired}`, task.energyRequired)} {t(language, "task.energySuffix")}
          </span>
          <span className="rounded bg-zinc-800 border border-[#27272a] px-2 py-0.5 text-zinc-400 font-mono">
            {task.estimatedMinutes} min
          </span>
          {task.dueDate ? (
            <span className={`rounded px-2 py-0.5 font-mono ${isOverdue ? 'bg-[#B26A5B]/10 border border-[#B26A5B]/20 text-[#C27A6B]' : 'bg-zinc-800 border border-[#27272a] text-zinc-400'}`}>
              {t(language, "task.due")} {task.dueDate} {isOverdue && `(${t(language, "common.overdue", "Overdue")})`}
            </span>
          ) : null}
          {task.scheduledTime ? (
            <span className="rounded bg-[#6F8799]/10 border border-[#6F8799]/20 px-2 py-0.5 text-[#7F97A9] font-mono">
              🕒 {task.scheduledTime}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider pt-4 border-t border-[#27272a]/60">
        {task.status !== "completed" && task.status !== "skipped" && onFocus ? (
          <button
            type="button"
            onClick={() => onFocus(task)}
            className="rounded-lg border border-[#C8A96A]/30 bg-[#C8A96A]/10 px-3.5 py-2 text-[#C8A96A] transition hover:bg-[#C8A96A]/20 hover:border-[#C8A96A]/50 active:scale-95"
          >
            {t(language, "today.focus.action", "Focus")}
          </button>
        ) : null}
        {task.status !== "in_progress" && onStart ? (
          <button
            type="button"
            onClick={() => onStart(task)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          >
            {t(language, "task.start")}
          </button>
        ) : null}
        {task.status !== "completed" && onComplete ? (
          <button
            type="button"
            onClick={() => onComplete(task)}
            className="rounded-lg bg-[#C8A96A] text-zinc-950 px-3.5 py-2 transition hover:bg-[#D4B87A] active:scale-95"
          >
            {t(language, "task.complete")}
          </button>
        ) : null}
        {task.status !== "skipped" && onSkip ? (
          <button
            type="button"
            onClick={() => onSkip(task)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          >
            {t(language, "task.skip")}
          </button>
        ) : null}
        {task.status === "backlog" && onMoveToday ? (
          <button
            type="button"
            onClick={() => onMoveToday(task)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          >
            {t(language, "task.moveToday")}
          </button>
        ) : null}
        {task.status !== "completed" && onRescheduleTomorrow ? (
          <button
            type="button"
            onClick={() => onRescheduleTomorrow(task)}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          >
            {t(language, "task.rescheduleTomorrow", "Reschedule to tomorrow")}
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="rounded-lg border border-[#B26A5B]/25 bg-[#B26A5B]/10 px-3.5 py-2 text-[#C27A6B] transition hover:bg-[#B26A5B]/20 active:scale-95 ml-auto"
          >
            {t(language, "common.delete")}
          </button>
        ) : null}
      </div>
    </article>
  );
}

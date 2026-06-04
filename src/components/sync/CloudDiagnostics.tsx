"use client";

import { AcademicsCloudPanel } from "@/components/AcademicsCloudPanel";
import { FinancesCloudPanel } from "@/components/FinancesCloudPanel";
import { GoalsCloudPanel } from "@/components/GoalsCloudPanel";
import { GymCloudPanel } from "@/components/GymCloudPanel";
import { NotesCloudPanel } from "@/components/NotesCloudPanel";
import { TasksCloudPanel } from "@/components/TasksCloudPanel";
import { WorkCloudPanel } from "@/components/WorkCloudPanel";
import { t } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";
import type {
  AtlasTask,
  Client,
  Goal,
  Note,
  StudySession,
  Subject,
  Transaction,
  WorkItem,
  WorkoutLog,
} from "@/types/atlas";

type CloudDiagnosticsProps = {
  notes: Note[];
  tasks: AtlasTask[];
  goals: Goal[];
  subjects: Subject[];
  academicTasks: AtlasTask[];
  studySessions: StudySession[];
  gymLogs: WorkoutLog[];
  clients: Client[];
  workItems: WorkItem[];
  transactions: Transaction[];
};

export function CloudDiagnostics({
  notes,
  tasks,
  goals,
  subjects,
  academicTasks,
  studySessions,
  gymLogs,
  clients,
  workItems,
  transactions,
}: CloudDiagnosticsProps) {
  const { settings } = useAtlasSettings();
  const language = settings.language;

  const modules = [
    {
      key: "notes",
      title: t(language, "cloud.notes.title"),
      count: notes.length,
      panel: <NotesCloudPanel localNotes={notes} />,
    },
    {
      key: "tasks",
      title: t(language, "cloud.tasks.title"),
      count: tasks.length,
      panel: <TasksCloudPanel localTasks={tasks} />,
    },
    {
      key: "goals",
      title: t(language, "cloud.goals.title"),
      count: goals.length,
      panel: <GoalsCloudPanel localGoals={goals} />,
    },
    {
      key: "academics",
      title: t(language, "cloud.academics.title"),
      count: subjects.length + academicTasks.length + studySessions.length,
      panel: (
        <AcademicsCloudPanel
          localSubjects={subjects}
          localAcademicTasks={academicTasks}
          localStudySessions={studySessions}
        />
      ),
    },
    {
      key: "gym",
      title: t(language, "cloud.gym.title"),
      count: gymLogs.length,
      panel: <GymCloudPanel localGymLogs={gymLogs} />,
    },
    {
      key: "work",
      title: t(language, "cloud.work.title"),
      count: clients.length + workItems.length,
      panel: <WorkCloudPanel localClients={clients} localWorkItems={workItems} />,
    },
    {
      key: "finances",
      title: t(language, "cloud.finances.title"),
      count: transactions.length,
      panel: <FinancesCloudPanel localTransactions={transactions} />,
    },
  ];

  return (
    <section className="rounded-xl border border-[#6F8799]/20 bg-[#18181b] p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F97A9]">
            {t(language, "settings.cloudDiagnostics.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {t(language, "settings.cloudDiagnostics.title")}
          </h2>
          <p className="mt-2 text-xs leading-6 text-zinc-400">
            {t(language, "settings.cloudDiagnostics.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            t(language, "settings.cloudDiagnostics.noSync"),
            t(language, "settings.cloudDiagnostics.noMigration"),
            t(language, "settings.cloudDiagnostics.noLocalImpact"),
          ].map((label) => (
            <span
              key={label}
              className="rounded-full border border-[#6F8799]/25 bg-[#6F8799]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#27272a] bg-[#121214] p-4 text-xs leading-6 text-zinc-500">
        <p>{t(language, "settings.cloudDiagnostics.temporary")}</p>
        <p className="mt-1">{t(language, "settings.cloudDiagnostics.openModuleToSelect")}</p>
      </div>

      <div className="mt-5 grid gap-3">
        {modules.map((module) => (
          <details
            key={module.key}
            className="group rounded-xl border border-[#27272a] bg-[#121214]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 transition hover:bg-zinc-800/60">
              <div>
                <p className="text-sm font-bold text-zinc-100">{module.title}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {module.count} {t(language, "settings.cloudDiagnostics.localRecords")}
                </p>
              </div>
              <span className="rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition group-open:text-sky-300">
                {t(language, "settings.cloudDiagnostics.expand")}
              </span>
            </summary>
            <div className="border-t border-[#27272a] px-4 pb-4">
              {module.panel}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useAtlasAuth } from "@/lib/auth";
import {
  createCloudAcademicTask,
  createCloudStudySession,
  createCloudSubject,
  listCloudAcademicTasks,
  listCloudStudySessions,
  listCloudSubjects,
} from "@/lib/supabase/academics";
import { todayISO } from "@/lib/tasks";
import { t } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";
import type {
  AcademicTaskDraft,
  AtlasTask,
  StudySession,
  StudySessionDraft,
  Subject,
  SubjectDraft,
} from "@/types/atlas";

type CloudAction =
  | "load"
  | "create-subject"
  | "create-task"
  | "create-session"
  | "upload-subject"
  | "upload-task"
  | "upload-session"
  | null;

type AcademicsCloudPanelProps = {
  localSubjects: Subject[];
  localAcademicTasks: AtlasTask[];
  localStudySessions: StudySession[];
};

function getSelectedItem<T extends { id: string }>(
  items: T[],
  selectedId: string,
) {
  const fallbackId = selectedId || items[0]?.id || "";
  return items.find((item) => item.id === fallbackId) ?? null;
}

function getSubjectName(subjects: Subject[], subjectId: string | undefined, fallback: string) {
  return subjects.find((subject) => subject.id === subjectId)?.name ?? fallback;
}

export function AcademicsCloudPanel({
  localSubjects,
  localAcademicTasks,
  localStudySessions,
}: AcademicsCloudPanelProps) {
  const auth = useAtlasAuth();
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const [cloudSubjects, setCloudSubjects] = useState<Subject[]>([]);
  const [cloudTasks, setCloudTasks] = useState<AtlasTask[]>([]);
  const [cloudSessions, setCloudSessions] = useState<StudySession[]>([]);
  const [hasLoadedCloudAcademics, setHasLoadedCloudAcademics] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [activeAction, setActiveAction] = useState<CloudAction>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedSubject = getSelectedItem(localSubjects, selectedSubjectId);
  const selectedTask = getSelectedItem(localAcademicTasks, selectedTaskId);
  const selectedSession = getSelectedItem(localStudySessions, selectedSessionId);

  async function handleLoadCloudAcademics() {
    setActiveAction("load");
    setMessage("");
    setError("");

    try {
      const [subjectsResult, tasksResult, sessionsResult] = await Promise.all([
        listCloudSubjects(),
        listCloudAcademicTasks(),
        listCloudStudySessions(),
      ]);

      const errors = [subjectsResult, tasksResult, sessionsResult]
        .filter((result) => !result.ok)
        .map((result) => (result.ok ? "" : result.error));

      if (subjectsResult.ok) {
        setCloudSubjects(subjectsResult.data);
      }

      if (tasksResult.ok) {
        setCloudTasks(tasksResult.data);
      }

      if (sessionsResult.ok) {
        setCloudSessions(sessionsResult.data);
      }

      if (subjectsResult.ok || tasksResult.ok || sessionsResult.ok) {
        setHasLoadedCloudAcademics(true);
      }

      if (errors.length > 0) {
        setError(errors[0]);
      } else {
        setMessage(
          `Loaded ${subjectsResult.data.length} cloud subjects, ${tasksResult.data.length} cloud tasks, and ${sessionsResult.data.length} cloud study sessions.`,
        );
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateTestSubject() {
    setActiveAction("create-subject");
    setMessage("");
    setError("");

    const testSubject: SubjectDraft = {
      name: "Atlas Cloud Academics POC",
      professor: "Test Instructor",
      schedule: "Manual QA only",
      notes: "Manual cloud subject created for Supabase Academics testing only.",
      accent: "border-indigo-500",
    };

    try {
      const result = await createCloudSubject(testSubject);

      if (result.ok && result.data) {
        setCloudSubjects((current) => [result.data as Subject, ...current]);
        setHasLoadedCloudAcademics(true);
        setMessage(result.message);
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateTestTask() {
    setActiveAction("create-task");
    setMessage("");
    setError("");

    const testTask: AcademicTaskDraft = {
      title: "Atlas Cloud Academics Task POC",
      subjectId: "",
      academicType: "Assignment",
      priority: "medium",
      dueDate: todayISO(),
      plannedDate: todayISO(),
      estimatedMinutes: 45,
      energyRequired: "medium",
      notes: "Manual cloud academic task created for Supabase Academics testing only.",
      grade: "",
    };

    try {
      const result = await createCloudAcademicTask(testTask);

      if (result.ok && result.data) {
        setCloudTasks((current) => [result.data as AtlasTask, ...current]);
        setHasLoadedCloudAcademics(true);
        setMessage(result.message);
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateTestSession() {
    setActiveAction("create-session");
    setMessage("");
    setError("");

    const testSession: StudySessionDraft = {
      subjectId: "",
      date: todayISO(),
      durationMinutes: 30,
      focusLevel: 7,
      notes: "Manual cloud study session created for Supabase Academics testing only.",
    };

    try {
      const result = await createCloudStudySession(testSession);

      if (result.ok && result.data) {
        setCloudSessions((current) => [
          result.data as StudySession,
          ...current,
        ]);
        setHasLoadedCloudAcademics(true);
        setMessage(result.message);
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleUploadSelectedSubject() {
    if (!selectedSubject) {
      setError(t(language, "cloud.chooseLocalSubject"));
      return;
    }

    const confirmed = window.confirm(
      t(language, "cloud.academics.confirmSubject", "Upload this selected local subject copy to Supabase Cloud Academics? This sends its name, color, professor, schedule, notes, and status. The local subject will remain unchanged."),
    );

    if (!confirmed) {
      return;
    }

    setActiveAction("upload-subject");
    setMessage("");
    setError("");

    try {
      const result = await createCloudSubject(selectedSubject);

      if (result.ok && result.data) {
        setCloudSubjects((current) => [result.data as Subject, ...current]);
        setHasLoadedCloudAcademics(true);
        setMessage(
          t(language, "cloud.uploadedSubject"),
        );
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleUploadSelectedTask() {
    if (!selectedTask) {
      setError(t(language, "cloud.chooseLocalAcademicTask"));
      return;
    }

    const confirmed = window.confirm(
      t(language, "cloud.academics.confirmTask", "Upload this selected local academic task copy to Supabase Cloud Academics? This sends its title, notes, academic type, priority, status, dates, minutes, energy, and grade. Local subject links are not preserved unless already cloud UUIDs. The local task will remain unchanged."),
    );

    if (!confirmed) {
      return;
    }

    setActiveAction("upload-task");
    setMessage("");
    setError("");

    try {
      const result = await createCloudAcademicTask(selectedTask);

      if (result.ok && result.data) {
        setCloudTasks((current) => [result.data as AtlasTask, ...current]);
        setHasLoadedCloudAcademics(true);
        setMessage(
          t(language, "cloud.uploadedAcademicTask"),
        );
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleUploadSelectedSession() {
    if (!selectedSession) {
      setError(t(language, "cloud.chooseLocalStudySession"));
      return;
    }

    const confirmed = window.confirm(
      t(language, "cloud.academics.confirmSession", "Upload this selected local study session copy to Supabase Cloud Academics? This sends its date, duration, focus score, and notes. Local subject links are not preserved unless already cloud UUIDs. The local session will remain unchanged."),
    );

    if (!confirmed) {
      return;
    }

    setActiveAction("upload-session");
    setMessage("");
    setError("");

    try {
      const result = await createCloudStudySession(selectedSession);

      if (result.ok && result.data) {
        setCloudSessions((current) => [
          result.data as StudySession,
          ...current,
        ]);
        setHasLoadedCloudAcademics(true);
        setMessage(
          t(language, "cloud.uploadedStudySession"),
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
              {t(language, "cloud.academics.title")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localAcademics")}
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
              {t(language, "cloud.academics.title")}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localAcademics")}
            </p>
            <p className="mt-1 text-xs leading-6 text-zinc-500">
              {t(language, "cloud.academics.signIn")}
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
            {t(language, "cloud.academics.title")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {t(language, "cloud.academics.available")}
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">
            {t(language, "common.manualCloudPreview")}. {t(language, "common.cloudDataSeparate")}
          </p>
        </div>
        <span className="w-fit rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          {t(language, "settings.accountSync.signedIn")}
        </span>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_auto]">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={handleLoadCloudAcademics}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "load" ? t(language, "common.loading") : t(language, "cloud.loadAcademics")}
          </button>
          <button
            type="button"
            onClick={handleCreateTestSubject}
            disabled={activeAction !== null}
            className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create-subject"
              ? t(language, "common.creating")
              : t(language, "cloud.createSubject")}
          </button>
          <button
            type="button"
            onClick={handleCreateTestTask}
            disabled={activeAction !== null}
            className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create-task"
              ? t(language, "common.creating")
              : t(language, "cloud.createAcademicTask")}
          </button>
          <button
            type="button"
            onClick={handleCreateTestSession}
            disabled={activeAction !== null}
            className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create-session"
              ? t(language, "common.creating")
              : t(language, "cloud.createStudySession")}
          </button>
        </div>

        <button
          type="button"
          disabled
          className="rounded-lg border border-[#27272a] bg-[#121214]/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 opacity-60"
        >
          {t(language, "cloud.uploadAllAcademics")}
          <span className="ml-2 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400">
            {t(language, "common.comingSoon")}
          </span>
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "cloud.uploadSubject")}
          <select
            value={selectedSubject?.id ?? ""}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            disabled={localSubjects.length === 0 || activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {localSubjects.length === 0 ? (
              <option value="">{t(language, "cloud.noLocalSubjects", "No local subjects available")}</option>
            ) : (
              localSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={handleUploadSelectedSubject}
            disabled={!selectedSubject || activeAction !== null}
            className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "upload-subject" ? t(language, "common.uploading") : t(language, "cloud.uploadSubject")}
          </button>
        </label>

        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "cloud.uploadAcademicTask")}
          <select
            value={selectedTask?.id ?? ""}
            onChange={(event) => setSelectedTaskId(event.target.value)}
            disabled={localAcademicTasks.length === 0 || activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {localAcademicTasks.length === 0 ? (
              <option value="">{t(language, "cloud.noLocalAcademicTasks", "No local academic tasks available")}</option>
            ) : (
              localAcademicTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={handleUploadSelectedTask}
            disabled={!selectedTask || activeAction !== null}
            className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "upload-task" ? t(language, "common.uploading") : t(language, "cloud.uploadAcademicTask")}
          </button>
        </label>

        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "cloud.uploadStudySession")}
          <select
            value={selectedSession?.id ?? ""}
            onChange={(event) => setSelectedSessionId(event.target.value)}
            disabled={localStudySessions.length === 0 || activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {localStudySessions.length === 0 ? (
              <option value="">{t(language, "cloud.noLocalStudySessions", "No local study sessions available")}</option>
            ) : (
              localStudySessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.date} - {session.durationMinutes} {t(language, "common.minutes").toLowerCase()}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={handleUploadSelectedSession}
            disabled={!selectedSession || activeAction !== null}
            className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "upload-session"
              ? t(language, "common.uploading")
              : t(language, "cloud.uploadStudySession")}
          </button>
        </label>
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

      {hasLoadedCloudAcademics ? (
        <div className="mt-6 rounded-xl border border-[#27272a] bg-[#121214] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "cloud.academics.title")}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {t(language, "common.manualCloudPreview")}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {cloudSubjects.length} {t(language, "academics.subjectsLower", "subjects")}
              </span>
              <span className="rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {cloudTasks.length} {t(language, "academics.tasksLower", "tasks")}
              </span>
              <span className="rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {cloudSessions.length} {t(language, "academics.sessionsLower", "sessions")}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "academics.cloudSubjects", "Cloud Subjects")}
              </h3>
              <div className="mt-3 grid gap-2">
                {cloudSubjects.length > 0 ? (
                  cloudSubjects.slice(0, 6).map((subject) => (
                    <article
                      key={subject.id}
                      className="rounded-lg border border-[#27272a] bg-[#18181b] p-3"
                    >
                      <p className="text-sm font-bold text-zinc-100">
                        {subject.name}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {subject.status} - {subject.professor || t(language, "common.noProfessor")}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 text-xs leading-6 text-zinc-500">
                    {t(language, "academics.noCloudSubjects", "No cloud subjects returned.")}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "academics.cloudTasks", "Cloud Academic Tasks")}
              </h3>
              <div className="mt-3 grid gap-2">
                {cloudTasks.length > 0 ? (
                  cloudTasks.slice(0, 6).map((task) => (
                    <article
                      key={task.id}
                      className="rounded-lg border border-[#27272a] bg-[#18181b] p-3"
                    >
                      <p className="text-sm font-bold text-zinc-100">
                        {task.title}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {getSubjectName(cloudSubjects, task.subjectId, t(language, "common.noCloudSubject"))} -{" "}
                        {t(language, `academics.type.${task.academicType ?? "Other"}`, task.academicType ?? "Other")} - {task.status}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {t(language, "task.due")} {task.dueDate || t(language, "common.none")} - {task.estimatedMinutes} {t(language, "common.minutes").toLowerCase()}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 text-xs leading-6 text-zinc-500">
                    {t(language, "academics.noCloudTasks", "No cloud academic tasks returned.")}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "academics.cloudStudySessions", "Cloud Study Sessions")}
              </h3>
              <div className="mt-3 grid gap-2">
                {cloudSessions.length > 0 ? (
                  cloudSessions.slice(0, 6).map((session) => (
                    <article
                      key={session.id}
                      className="rounded-lg border border-[#27272a] bg-[#18181b] p-3"
                    >
                      <p className="text-sm font-bold text-zinc-100">
                        {session.date} - {session.durationMinutes} {t(language, "common.minutes").toLowerCase()}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {getSubjectName(cloudSubjects, session.subjectId, t(language, "common.noCloudSubject"))} -
                        {t(language, "academics.focus", "Focus")} {session.focusLevel}/10
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 text-xs leading-6 text-zinc-500">
                    {t(language, "academics.noCloudStudySessions", "No cloud study sessions returned.")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

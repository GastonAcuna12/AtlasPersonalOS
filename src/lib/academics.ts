"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import {
  getDailyLoad,
  getThisWeekCompletedTasks,
  isTaskForToday,
  todayISO,
  type AtlasTask,
  type TaskDraft,
  useTasks,
} from "@/lib/tasks";
import type {
  AcademicTaskDraft,
  AcademicTaskType,
  StudySession,
  StudySessionDraft,
  Subject,
  SubjectDraft,
} from "@/types/atlas";

export type {
  AcademicTaskDraft,
  AcademicTaskType,
  StudySession,
  StudySessionDraft,
  Subject,
  SubjectDraft,
  SubjectStatus,
} from "@/types/atlas";

const INITIAL_SUBJECTS: Subject[] = [];
const INITIAL_SESSIONS: StudySession[] = [];

export const ACADEMIC_TYPES: AcademicTaskType[] = [
  "Assignment",
  "Exam",
  "Reading",
  "Project",
  "Presentation",
  "Practice",
  "Other",
];

const accents = [
  "border-indigo-500",
  "border-cyan-500",
  "border-emerald-500",
  "border-amber-500",
  "border-rose-500",
];

function normalizeSubjects(value: unknown): Subject[] {
  if (!Array.isArray(value)) {
    return INITIAL_SUBJECTS;
  }

  return value.map((subject) => {
    const candidate =
      subject && typeof subject === "object"
        ? (subject as Partial<Subject>)
        : {};

    return {
      id:
        typeof candidate.id === "string"
          ? candidate.id
          : `${Date.now()}-subject`,
      name:
        typeof candidate.name === "string"
          ? candidate.name
          : "Untitled subject",
      professor: candidate.professor ?? "",
      schedule: candidate.schedule ?? "",
      accent: candidate.accent ?? accents[0],
      status: candidate.status ?? "active",
      notes: candidate.notes ?? "",
      createdAt: candidate.createdAt ?? new Date().toISOString(),
    };
  });
}

function normalizeStudySessions(value: unknown): StudySession[] {
  if (!Array.isArray(value)) {
    return INITIAL_SESSIONS;
  }

  return value.map((session) => {
    const candidate =
      session && typeof session === "object"
        ? (session as Partial<StudySession>)
        : {};

    return {
      id:
        typeof candidate.id === "string"
          ? candidate.id
          : `${Date.now()}-study-session`,
      subjectId: candidate.subjectId ?? "",
      date: candidate.date ?? todayISO(),
      durationMinutes: candidate.durationMinutes ?? 0,
      focusLevel: candidate.focusLevel ?? 5,
      notes: candidate.notes ?? "",
      createdAt: candidate.createdAt ?? new Date().toISOString(),
    };
  });
}

function readSubjects() {
  return readFromStorage(
    ATLAS_STORAGE_KEYS.subjects,
    INITIAL_SUBJECTS,
    normalizeSubjects,
  );
}

function readStudySessions() {
  return readFromStorage(
    ATLAS_STORAGE_KEYS.studySessions,
    INITIAL_SESSIONS,
    normalizeStudySessions,
  );
}

function saveSubjects(subjects: Subject[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.subjects, subjects);
}

function saveSessions(sessions: StudySession[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.studySessions, sessions);
}

export function getActiveSubjects(subjects: Subject[]) {
  return subjects.filter((subject) => subject.status === "active");
}

export function mapAcademicTaskToTask(draft: AcademicTaskDraft): TaskDraft {
  return {
    title: draft.title,
    description: draft.notes,
    area: "Academic",
    taskType: draft.academicType === "Exam" ? "Deep Work" : "University",
    status: "backlog",
    priority: draft.priority,
    dueDate: draft.dueDate,
    plannedDate: draft.plannedDate,
    estimatedMinutes: draft.estimatedMinutes,
    energyRequired: draft.energyRequired,
    subjectId: draft.subjectId,
    academicType: draft.academicType,
    grade: draft.grade ?? "",
  };
}

export function getAcademicTasks(tasks: AtlasTask[]) {
  return tasks.filter((task) => task.area === "Academic");
}

export function getAcademicTasksForToday(tasks: AtlasTask[], date = todayISO()) {
  return getAcademicTasks(tasks).filter((task) => isTaskForToday(task, date));
}

function weekRange(date = todayISO()) {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function getAcademicWeekRange(date = todayISO()) {
  return weekRange(date);
}

export function getStudyMinutesThisWeek(
  sessions: StudySession[],
  subjectId?: string,
  date = todayISO(),
) {
  const range = weekRange(date);

  return sessions
    .filter(
      (session) =>
        session.date >= range.start &&
        session.date <= range.end &&
        (!subjectId || session.subjectId === subjectId),
    )
    .reduce((sum, session) => sum + session.durationMinutes, 0);
}

export function getStudySessionsThisWeek(
  sessions: StudySession[],
  date = todayISO(),
) {
  const range = weekRange(date);

  return sessions.filter(
    (session) => session.date >= range.start && session.date <= range.end,
  );
}

export function getUpcomingAcademicDeadlines(
  tasks: AtlasTask[],
  date = todayISO(),
) {
  return getAcademicTasks(tasks)
    .filter(
      (task) =>
        task.dueDate &&
        task.status !== "completed" &&
        task.status !== "skipped",
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((task) => ({
      ...task,
      isOverdue: task.dueDate < date,
      isDueToday: task.dueDate === date,
    }));
}

export function getAcademicWorkload(tasks: AtlasTask[], date = todayISO()) {
  const range = weekRange(date);
  const active = getAcademicTasks(tasks).filter(
    (task) => task.status !== "completed" && task.status !== "skipped",
  );
  const todayMinutes = active
    .filter((task) => task.plannedDate === date || task.dueDate === date)
    .reduce((sum, task) => sum + task.estimatedMinutes, 0);
  const weekMinutes = active
    .filter(
      (task) =>
        (task.plannedDate >= range.start && task.plannedDate <= range.end) ||
        (task.dueDate >= range.start && task.dueDate <= range.end),
    )
    .reduce((sum, task) => sum + task.estimatedMinutes, 0);

  return {
    todayMinutes,
    weekMinutes,
    label: getDailyLoad(weekMinutes),
  };
}

export function getSubjectStats(
  subject: Subject,
  tasks: AtlasTask[],
  sessions: StudySession[],
) {
  const subjectTasks = getAcademicTasks(tasks).filter(
    (task) => task.subjectId === subject.id,
  );
  const pending = subjectTasks.filter(
    (task) => task.status !== "completed" && task.status !== "skipped",
  );
  const nextDeadline = pending
    .filter((task) => task.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  return {
    pendingCount: pending.length,
    nextDeadline,
    studyMinutesThisWeek: getStudyMinutesThisWeek(sessions, subject.id),
  };
}

export function getAcademicOverview(
  subjects: Subject[],
  tasks: AtlasTask[],
  sessions: StudySession[],
  date = todayISO(),
) {
  const activeSubjects = getActiveSubjects(subjects);
  const academicTasks = getAcademicTasks(tasks);
  const pending = academicTasks.filter(
    (task) => task.status !== "completed" && task.status !== "skipped",
  );
  const range = weekRange(date);
  const dueThisWeek = pending.filter(
    (task) => task.dueDate >= range.start && task.dueDate <= range.end,
  );
  const upcomingExams = pending.filter(
    (task) => task.academicType === "Exam" && task.dueDate >= date,
  );
  const completedThisWeek = getThisWeekCompletedTasks(academicTasks, date);

  return {
    activeSubjects: activeSubjects.length,
    pendingTasks: pending.length,
    dueThisWeek: dueThisWeek.length,
    upcomingExams: upcomingExams.length,
    studyMinutesThisWeek: getStudyMinutesThisWeek(sessions, undefined, date),
    completedThisWeek: completedThisWeek.length,
  };
}

export function getAcademicDashboardSummary(
  subjects: Subject[],
  tasks: AtlasTask[],
  sessions: StudySession[],
  date = todayISO(),
) {
  const academicTasks = getAcademicTasks(tasks);
  const deadlines = getUpcomingAcademicDeadlines(tasks, date);
  const range = weekRange(date);
  const dueThisWeek = deadlines.filter(
    (task) => task.dueDate >= range.start && task.dueDate <= range.end,
  );
  const completedThisWeek = getThisWeekCompletedTasks(academicTasks, date);
  const weekTasks = academicTasks.filter(
    (task) =>
      (task.plannedDate >= range.start && task.plannedDate <= range.end) ||
      (task.dueDate >= range.start && task.dueDate <= range.end),
  );

  return {
    nextDeadline: deadlines[0],
    dueThisWeekCount: dueThisWeek.length,
    studyMinutesThisWeek: getStudyMinutesThisWeek(sessions, undefined, date),
    completionPercentage:
      weekTasks.length > 0
        ? Math.round((completedThisWeek.length / weekTasks.length) * 100)
        : 0,
    activeSubjects: getActiveSubjects(subjects).length,
  };
}

export function useAcademicSubjects() {
  const subjects = useStoredValue(
    ATLAS_STORAGE_KEYS.subjects,
    INITIAL_SUBJECTS,
    normalizeSubjects,
  );
  const activeSubjects = useMemo(() => getActiveSubjects(subjects), [subjects]);

  function addSubject(draft: SubjectDraft) {
    const subject: Subject = {
      ...draft,
      id: `${Date.now()}-subject`,
      accent: draft.accent || accents[subjects.length % accents.length],
      status: "active",
      createdAt: new Date().toISOString(),
    };

    saveSubjects([subject, ...readSubjects()]);
    return subject;
  }

  function archiveSubject(id: string) {
    saveSubjects(
      readSubjects().map((subject) =>
        subject.id === id ? { ...subject, status: "archived" } : subject,
      ),
    );
  }

  return {
    subjects,
    activeSubjects,
    addSubject,
    archiveSubject,
  };
}

export const SUBJECT_COLORS = [
  { name: "Indigo", borderClass: "border-indigo-500", textClass: "text-indigo-600", bgClass: "bg-indigo-50", accentClass: "border-indigo-500" },
  { name: "Cyan", borderClass: "border-cyan-500", textClass: "text-cyan-600", bgClass: "bg-cyan-50", accentClass: "border-cyan-500" },
  { name: "Emerald", borderClass: "border-emerald-500", textClass: "text-emerald-600", bgClass: "bg-emerald-50", accentClass: "border-emerald-500" },
  { name: "Amber", borderClass: "border-amber-500", textClass: "text-amber-600", bgClass: "bg-amber-50", accentClass: "border-amber-500" },
  { name: "Rose", borderClass: "border-rose-500", textClass: "text-rose-600", bgClass: "bg-rose-50", accentClass: "border-rose-500" },
  { name: "Violet", borderClass: "border-violet-500", textClass: "text-violet-600", bgClass: "bg-violet-50", accentClass: "border-violet-500" },
  { name: "Orange", borderClass: "border-orange-500", textClass: "text-orange-600", bgClass: "bg-orange-50", accentClass: "border-orange-500" },
  { name: "Sky", borderClass: "border-sky-500", textClass: "text-sky-600", bgClass: "bg-sky-50", accentClass: "border-sky-500" },
  { name: "Teal", borderClass: "border-teal-500", textClass: "text-teal-600", bgClass: "bg-teal-50", accentClass: "border-teal-500" },
  { name: "Red", borderClass: "border-red-500", textClass: "text-red-600", bgClass: "bg-red-50", accentClass: "border-red-500" },
  { name: "Fuchsia", borderClass: "border-fuchsia-500", textClass: "text-fuchsia-600", bgClass: "bg-fuchsia-50", accentClass: "border-fuchsia-500" },
  { name: "Lime", borderClass: "border-lime-500", textClass: "text-lime-600", bgClass: "bg-lime-50", accentClass: "border-lime-500" },
];

export function getSubjectColor(subject: Subject) {
  const accent = subject.accent ?? "";
  const found = SUBJECT_COLORS.find(
    (c) => c.accentClass === accent || c.borderClass === accent
  );
  return found ?? SUBJECT_COLORS[0];
}

export function getAcademicWorkloadStatus(tasks: AtlasTask[], date = todayISO()) {
  const workload = getAcademicWorkload(tasks, date);
  const mins = workload.weekMinutes;

  if (mins === 0) return { status: "Clear", colorClass: "text-stone-500 bg-stone-50 border-stone-200" };
  if (mins <= 120) return { status: "Light", colorClass: "text-green-600 bg-green-50 border-green-200" };
  if (mins <= 300) return { status: "Manageable", colorClass: "text-blue-600 bg-blue-50 border-blue-200" };
  if (mins <= 600) return { status: "Heavy", colorClass: "text-orange-600 bg-orange-50 border-orange-200" };
  return { status: "Critical", colorClass: "text-red-600 bg-red-50 border-red-200" };
}

export function useStudySessions() {
  const sessions = useStoredValue(
    ATLAS_STORAGE_KEYS.studySessions,
    INITIAL_SESSIONS,
    normalizeStudySessions,
  );

  function addStudySession(draft: StudySessionDraft) {
    const session: StudySession = {
      ...draft,
      id: `${Date.now()}-study-session`,
      createdAt: new Date().toISOString(),
    };

    saveSessions([session, ...readStudySessions()]);
    return session;
  }

  function deleteStudySession(id: string) {
    saveSessions(readStudySessions().filter((s) => s.id !== id));
  }

  return {
    sessions,
    addStudySession,
    deleteStudySession,
  };
}

export const useSubjects = useAcademicSubjects;

export function useAcademicTasks() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();

  const academicTasks = useMemo(() => {
    return tasks.filter((t) => t.area === "Academic");
  }, [tasks]);

  function addAcademicTask(draft: AcademicTaskDraft) {
    const taskDraft = mapAcademicTaskToTask(draft);
    return addTask(taskDraft);
  }

  function completeAcademicTask(id: string) {
    updateTask(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  }

  return {
    tasks: academicTasks,
    addTask: addAcademicTask,
    updateTask,
    deleteTask,
    completeAcademicTask,
  };
}

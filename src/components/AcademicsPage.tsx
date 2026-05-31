"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { TaskCard } from "@/components/tasks/TaskCard";
import {
  ACADEMIC_TYPES,
  getAcademicOverview,
  getAcademicTasksForToday,
  getAcademicWorkload,
  getSubjectStats,
  getUpcomingAcademicDeadlines,
  mapAcademicTaskToTask,
  type AcademicTaskDraft,
  type StudySessionDraft,
  type SubjectDraft,
  useAcademicSubjects,
  useStudySessions,
  SUBJECT_COLORS,
  getSubjectColor,
  getAcademicWorkloadStatus,
} from "@/lib/academics";
import { downloadAcademicWeekMarkdown } from "@/lib/markdownExport";
import {
  buildTaskXPMessage,
  TASK_ENERGY_LEVELS,
  TASK_PRIORITIES,
  todayISO,
  type AtlasTask,
  type TaskEnergy,
  type TaskPriority,
  useTasks,
} from "@/lib/tasks";
import { useXP } from "@/lib/xp";

const initialSubject: SubjectDraft = {
  name: "",
  professor: "",
  schedule: "",
  notes: "",
  accent: "",
};

function createInitialAcademicTask(subjectId = ""): AcademicTaskDraft {
  return {
    title: "",
    subjectId,
    academicType: "Assignment",
    priority: "medium",
    dueDate: "",
    plannedDate: todayISO(),
    estimatedMinutes: 45,
    energyRequired: "medium",
    notes: "",
    grade: "",
  };
}

function createInitialStudySession(subjectId = ""): StudySessionDraft {
  return {
    subjectId,
    date: todayISO(),
    durationMinutes: 45,
    focusLevel: 7,
    notes: "",
  };
}

export function AcademicsPage() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const { subjects, activeSubjects, addSubject, archiveSubject } =
    useAcademicSubjects();
  const { sessions, addStudySession, deleteStudySession } = useStudySessions();
  const xp = useXP();
  
  const [subjectDraft, setSubjectDraft] = useState(initialSubject);
  const [taskDraft, setTaskDraft] = useState(() =>
    createInitialAcademicTask(activeSubjects[0]?.id || "")
  );
  const [sessionDraft, setSessionDraft] = useState(() =>
    createInitialStudySession(activeSubjects[0]?.id || "")
  );

  const [subjectError, setSubjectError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [sessionError, setSessionError] = useState("");

  // Collapsibility States
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);

  const overview = getAcademicOverview(subjects, tasks, sessions);
  const workload = getAcademicWorkload(tasks);
  const workloadStatus = getAcademicWorkloadStatus(tasks);
  const deadlines = getUpcomingAcademicDeadlines(tasks).slice(0, 8);
  const todayAcademicTasks = getAcademicTasksForToday(tasks);

  function completeTask(task: AtlasTask) {
    updateTask(task.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    xp.awardXP("task-completed", {
      amount: task.xpReward,
      label: buildTaskXPMessage(task),
    });
  }

  function handleSubjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subjectDraft.name.trim()) {
      setSubjectError("Add a subject name.");
      return;
    }

    const subject = addSubject({
      ...subjectDraft,
      name: subjectDraft.name.trim(),
      professor: subjectDraft.professor?.trim(),
      schedule: subjectDraft.schedule?.trim(),
      notes: subjectDraft.notes?.trim(),
    });

    setSubjectDraft(initialSubject);
    setTaskDraft((current) => ({ ...current, subjectId: subject.id }));
    setSessionDraft((current) => ({ ...current, subjectId: subject.id }));
    setSubjectError("");
    setShowSubjectForm(false);
  }

  function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskDraft.title.trim()) {
      setTaskError("Add a task title.");
      return;
    }

    if (!taskDraft.subjectId) {
      setTaskError("Choose a subject first.");
      return;
    }

    if (!taskDraft.dueDate) {
      setTaskError("Choose a due date.");
      return;
    }

    addTask(mapAcademicTaskToTask({ ...taskDraft, title: taskDraft.title.trim() }));
    setTaskDraft(createInitialAcademicTask(taskDraft.subjectId));
    setTaskError("");
    setShowTaskForm(false);
  }

  function handleSessionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionDraft.subjectId) {
      setSessionError("Choose a subject first.");
      return;
    }

    if (sessionDraft.durationMinutes <= 0) {
      setSessionError("Study minutes must be greater than 0.");
      return;
    }

    addStudySession({
      ...sessionDraft,
      notes: sessionDraft.notes?.trim(),
    });

    xp.awardXP("study-session-logged");

    setSessionDraft(createInitialStudySession(sessionDraft.subjectId));
    setSessionError("");
    setShowSessionForm(false);
  }

  function subjectName(subjectId?: string) {
    return subjects.find((subject) => subject.id === subjectId)?.name ?? "No subject";
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            University Planning
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
              Academics
            </h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border uppercase tracking-wider ${
              workloadStatus.status === "Clear"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : workloadStatus.status === "Light"
                ? "bg-green-500/10 border-green-500/25 text-green-400"
                : workloadStatus.status === "Manageable"
                ? "bg-blue-500/10 border-blue-500/25 text-blue-400"
                : "bg-red-500/10 border-red-500/25 text-red-400"
            }`}>
              {workloadStatus.status} Workload
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/today"
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800"
          >
            Open Today
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() =>
              downloadAcademicWeekMarkdown({ subjects, tasks, sessions })
            }
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800"
          >
            Export academic week
          </button>
        </div>
      </header>

      {/* Overview stats */}
      <section className="grid gap-4 mt-6 grid-cols-2 lg:grid-cols-6">
        {[
          ["Active subjects", overview.activeSubjects],
          ["Pending tasks", overview.pendingTasks],
          ["Due this week", overview.dueThisWeek],
          ["Upcoming exams", overview.upcomingExams],
          ["Study minutes", overview.studyMinutesThisWeek],
          ["Done this week", overview.completedThisWeek],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#27272a] bg-[#18181b] p-4 shadow-lg text-center">
            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">{value}</p>
          </div>
        ))}
      </section>

      {/* Main Section */}
      <section className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr] items-start">
        {/* Left Column: Form Toggles & Forms */}
        <div className="flex flex-col gap-4">
          
          {/* Subject Form Toggle */}
          <div>
            <button
              onClick={() => setShowSubjectForm(!showSubjectForm)}
              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center"
            >
              {showSubjectForm ? "Close Subject Form" : "+ Add Subject course"}
            </button>
            {showSubjectForm && (
              <form
                onSubmit={handleSubjectSubmit}
                className="mt-3 rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-xl flex flex-col gap-4 animate-fade-in-up"
              >
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-[#27272a] pb-2">
                  New Subject details
                </p>
                <div className="grid gap-3">
                  <input
                    placeholder="Subject course name"
                    value={subjectDraft.name}
                    onChange={(event) =>
                      setSubjectDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <input
                    placeholder="Professor / Instructor"
                    value={subjectDraft.professor}
                    onChange={(event) =>
                      setSubjectDraft((current) => ({
                        ...current,
                        professor: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <input
                    placeholder="Schedule details"
                    value={subjectDraft.schedule}
                    onChange={(event) =>
                      setSubjectDraft((current) => ({
                        ...current,
                        schedule: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <textarea
                    placeholder="Notes (professor contacts, links...)"
                    rows={3}
                    value={subjectDraft.notes}
                    onChange={(event) =>
                      setSubjectDraft((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none placeholder:text-zinc-650"
                  />
                  <div className="grid gap-1 mt-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Color Accent</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {SUBJECT_COLORS.map((color) => {
                        const isSelected = subjectDraft.accent === color.accentClass;
                        return (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() =>
                              setSubjectDraft((current) => ({
                                ...current,
                                accent: color.accentClass,
                              }))
                            }
                            className={`h-6 w-6 rounded-full border transition-all ${color.bgClass} ${color.borderClass} ${
                              isSelected
                                ? "ring-2 ring-amber-500 ring-offset-2 scale-110"
                                : "hover:scale-105 border-zinc-700"
                            }`}
                            title={color.name}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
                {subjectError && (
                  <p className="text-red-400 text-xs font-semibold">{subjectError}</p>
                )}
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition w-full"
                >
                  Save Subject
                </button>
              </form>
            )}
          </div>

          {/* Task Form Toggle */}
          <div>
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center"
            >
              {showTaskForm ? "Close Task Form" : "+ Add Academic Task"}
            </button>
            {showTaskForm && (
              <form
                onSubmit={handleTaskSubmit}
                className="mt-3 rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-xl flex flex-col gap-4 animate-fade-in-up"
              >
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-[#27272a] pb-2">
                  New Academic Task
                </p>
                <div className="grid gap-3">
                  <input
                    placeholder="Task title"
                    value={taskDraft.title}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-amber-500 focus:outline-none"
                  />
                  <select
                    value={taskDraft.subjectId}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        subjectId: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                  >
                    <option value="">Choose subject</option>
                    {activeSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={taskDraft.academicType}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        academicType: event.target.value as AcademicTaskDraft["academicType"],
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                  >
                    {ACADEMIC_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3.5">
                    <select
                      value={taskDraft.priority}
                      onChange={(event) =>
                        setTaskDraft((current) => ({
                          ...current,
                          priority: event.target.value as TaskPriority,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                    >
                      {TASK_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                    <select
                      value={taskDraft.energyRequired}
                      onChange={(event) =>
                        setTaskDraft((current) => ({
                          ...current,
                          energyRequired: event.target.value as TaskEnergy,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                    >
                      {TASK_ENERGY_LEVELS.map((energy) => (
                        <option key={energy} value={energy}>
                          {energy}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                      Due Date
                      <input
                        type="date"
                        value={taskDraft.dueDate}
                        onChange={(event) =>
                          setTaskDraft((current) => ({
                            ...current,
                            dueDate: event.target.value,
                          }))
                        }
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-xs focus:outline-none"
                      />
                    </label>
                    <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                      Planned Date
                      <input
                        type="date"
                        value={taskDraft.plannedDate}
                        onChange={(event) =>
                          setTaskDraft((current) => ({
                            ...current,
                            plannedDate: event.target.value,
                          }))
                        }
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-xs focus:outline-none"
                      />
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                    Est. Study Minutes
                    <input
                      type="number"
                      min="1"
                      value={taskDraft.estimatedMinutes}
                      onChange={(event) =>
                        setTaskDraft((current) => ({
                          ...current,
                          estimatedMinutes: Number(event.target.value),
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:outline-none"
                    />
                  </label>
                  <textarea
                    placeholder="Task details or rubric notes..."
                    rows={3}
                    value={taskDraft.notes}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none placeholder:text-zinc-650"
                  />
                </div>
                {taskError && (
                  <p className="text-red-400 text-xs font-semibold">{taskError}</p>
                )}
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition w-full"
                >
                  Save Task
                </button>
              </form>
            )}
          </div>

          {/* Session Form Toggle */}
          <div>
            <button
              onClick={() => setShowSessionForm(!showSessionForm)}
              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center"
            >
              {showSessionForm ? "Close Session Form" : "+ Log Study Session"}
            </button>
            {showSessionForm && (
              <form
                onSubmit={handleSessionSubmit}
                className="mt-3 rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-xl flex flex-col gap-4 animate-fade-in-up"
              >
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-[#27272a] pb-2">
                  New Study Session
                </p>
                <div className="grid gap-3">
                  <select
                    value={sessionDraft.subjectId}
                    onChange={(event) =>
                      setSessionDraft((current) => ({
                        ...current,
                        subjectId: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                  >
                    <option value="">Choose subject</option>
                    {activeSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={sessionDraft.date}
                    onChange={(event) =>
                      setSessionDraft((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                    Duration Minutes
                    <input
                      type="number"
                      min="1"
                      value={sessionDraft.durationMinutes}
                      onChange={(event) =>
                        setSessionDraft((current) => ({
                          ...current,
                          durationMinutes: Number(event.target.value),
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-[#121214] p-3 rounded-lg border border-[#27272a]">
                    <div className="flex justify-between">
                      <span>Focus Level</span>
                      <span className="text-amber-500 font-bold">{sessionDraft.focusLevel}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sessionDraft.focusLevel}
                      onChange={(event) =>
                        setSessionDraft((current) => ({
                          ...current,
                          focusLevel: Number(event.target.value),
                        }))
                      }
                      className="accent-amber-505 mt-1 cursor-pointer"
                    />
                  </label>
                  <textarea
                    placeholder="Reflective session notes..."
                    rows={3}
                    value={sessionDraft.notes}
                    onChange={(event) =>
                      setSessionDraft((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none placeholder:text-zinc-650"
                  />
                </div>
                {sessionError && (
                  <p className="text-red-400 text-xs font-semibold">{sessionError}</p>
                )}
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition w-full"
                >
                  Save Session
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Subjects list, deadlines and study ledger */}
        <div className="grid gap-6">
          {/* Active subjects grid */}
          <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[#27272a] pb-3 mb-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Academic Courses
                </p>
                <h2 className="text-xl font-bold text-zinc-100">
                  Active Subjects
                </h2>
              </div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                {activeSubjects.length} active subject ledger
              </p>
            </div>
            <div className="grid gap-4.5 md:grid-cols-2 xl:grid-cols-3">
              {activeSubjects.length > 0 ? (
                activeSubjects.map((subject) => {
                  const stats = getSubjectStats(subject, tasks, sessions);
                  const colorInfo = getSubjectColor(subject);
                  return (
                    <article
                      key={subject.id}
                      className={`rounded-lg border border-[#27272a] border-l-4 ${colorInfo.borderClass} bg-[#121214]/60 p-4 transition hover:bg-[#121214]`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-zinc-100 text-sm truncate">
                            {subject.name}
                          </h3>
                          <p className="mt-0.5 text-[10px] text-zinc-500">
                            {subject.professor || "No professor set"}
                          </p>
                        </div>
                        <span className={`rounded-full bg-zinc-900 border border-[#27272a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colorInfo.textClass}`}>
                          {colorInfo.name}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 text-xs text-zinc-400">
                        <p className="font-medium text-zinc-300">{stats.pendingCount} pending tasks</p>
                        <p className="text-zinc-500">
                          Next deadline:{" "}
                          <span className="text-zinc-400 font-semibold">{stats.nextDeadline?.dueDate ?? "None"}</span>
                        </p>
                        <p className="text-zinc-550">{stats.studyMinutesThisWeek} min studied this week</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => archiveSubject(subject.id)}
                        className="mt-4 rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 transition hover:bg-zinc-800"
                      >
                        Archive Course
                      </button>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-4 text-xs text-zinc-500 italic col-span-3">
                  No courses active. Use form on the left to set up subjects.
                </p>
              )}
            </div>
          </section>

          {/* Deadlines & Workload */}
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-start">
            {/* Upcoming academic deadlines */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-450 border-b border-[#27272a] pb-2 mb-4">
                Upcoming Academic Deadlines
              </h3>
              <div className="grid gap-3 max-h-[350px] overflow-y-auto pr-1">
                {deadlines.length > 0 ? (
                  deadlines.map((task) => {
                    const subjectObj = subjects.find(s => s.id === task.subjectId);
                    const colorInfo = subjectObj ? getSubjectColor(subjectObj) : SUBJECT_COLORS[0];
                    return (
                      <article
                        key={task.id}
                        className={`rounded-lg border border-[#27272a] border-l-4 px-4 py-3.5 ${colorInfo.borderClass} ${
                          task.isOverdue
                            ? "bg-red-500/5 text-red-400 border-red-500/20"
                            : task.isDueToday
                            ? "bg-amber-500/5 text-amber-400 border-amber-500/20"
                            : "bg-[#121214]/60 text-zinc-300"
                        }`}
                      >
                        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold text-zinc-150 text-sm">
                              {task.title}
                            </p>
                            <p className="mt-1 text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                              {subjectName(task.subjectId)} &middot;{" "}
                              {task.academicType ?? "Other"} &middot; {task.priority}
                            </p>
                          </div>
                          <div className="text-right sm:shrink-0">
                            <span className="text-xs font-bold text-zinc-300">{task.dueDate}</span>
                            <span className="text-[10px] text-zinc-550 block font-mono">{task.estimatedMinutes} mins</span>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-4 text-xs text-zinc-500 italic">
                    No academic tasks active in queue.
                  </p>
                )}
              </div>
            </div>

            {/* Academic Workload Status */}
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-450 border-b border-[#27272a] pb-2 mb-4">
                Workload Audit
              </h3>
              <div className="grid gap-4">
                <div className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3.5 text-center">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Today Planned</p>
                  <p className="mt-1 text-xl font-extrabold text-zinc-100">
                    {workload.todayMinutes} mins
                  </p>
                </div>
                <div className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3.5 text-center">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">This Week Target</p>
                  <p className="mt-1 text-xl font-extrabold text-zinc-100">
                    {workload.weekMinutes} mins
                  </p>
                </div>
                <div className={`rounded-lg border px-4 py-3.5 text-center transition ${
                  workloadStatus.status === "Clear"
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : workloadStatus.status === "Light"
                    ? "bg-green-500/10 border-green-500/25 text-green-400"
                    : workloadStatus.status === "Manageable"
                    ? "bg-blue-500/10 border-blue-500/25 text-blue-400"
                    : "bg-red-500/10 border-red-500/25 text-red-400"
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider">Weekly Workload Level</p>
                  <p className="mt-1 text-xl font-extrabold">
                    {workloadStatus.status}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Today scheduled academic tasks */}
          <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-450 border-b border-[#27272a] pb-2 mb-4">
              Academic tasks inside Today Agenda
            </h3>
            <div className="grid gap-3.5">
              {todayAcademicTasks.length > 0 ? (
                todayAcademicTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStart={(selectedTask) =>
                      updateTask(selectedTask.id, { status: "in_progress" })
                    }
                    onComplete={completeTask}
                    onSkip={(selectedTask) =>
                      updateTask(selectedTask.id, { status: "skipped" })
                    }
                    onMoveToday={(selectedTask) =>
                      updateTask(selectedTask.id, {
                        status: "today",
                        plannedDate: todayISO(),
                      })
                    }
                    onDelete={(selectedTask) => deleteTask(selectedTask.id)}
                  />
                ))
              ) : (
                <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-4 text-xs text-zinc-500 italic">
                  No academic tasks are scheduled in Today Agenda yet.
                </p>
              )}
            </div>
          </section>

          {/* Study sessions log list */}
          <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[#27272a] pb-3 mb-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Log Ledger
                </p>
                <h2 className="text-xl font-bold text-zinc-100">
                  Recent study sessions
                </h2>
              </div>
              <p className="text-xs text-zinc-400 font-bold uppercase">
                {overview.studyMinutesThisWeek} min logged this week
              </p>
            </div>
            <div className="grid gap-3.5 max-h-[300px] overflow-y-auto pr-1">
              {sessions.length > 0 ? (
                sessions.slice(0, 8).map((session) => (
                  <article
                    key={session.id}
                    className="group relative rounded-lg border border-[#27272a] bg-[#121214]/60 p-4 transition hover:bg-[#121214] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-zinc-150 text-sm leading-snug">
                        {subjectName(session.subjectId)}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {session.date} &middot; Duration: {session.durationMinutes} mins &middot; Focus Level: {session.focusLevel}/10
                      </p>
                      {session.notes && (
                        <p className="mt-2 text-xs leading-relaxed text-zinc-400 italic">
                          &ldquo;{session.notes}&rdquo;
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteStudySession(session.id)}
                      className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500/10 hover:border-red-500/20"
                    >
                      Delete
                    </button>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-6 text-xs text-zinc-500 italic text-center">
                  No study sessions recorded. Use panel on left to log focus sessions.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

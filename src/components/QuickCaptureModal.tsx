"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FINANCE_CATEGORIES,
  PAYMENT_METHODS,
  useTransactions,
  formatMoney,
} from "@/lib/finances";
import { useWorkoutLogs, WORKOUT_TYPES, calculateWorkoutXP } from "@/lib/gym";
import { useTasks, TASK_AREAS, TASK_TYPES, TASK_PRIORITIES, TASK_ENERGY_LEVELS } from "@/lib/tasks";
import { useNotes } from "@/lib/notes";
import { useGoals } from "@/lib/goals";
import { useClients, useWorkItems, WORK_ITEM_TYPES, WORK_ITEM_STATUSES, DIFFICULTIES, PRIORITIES, getStatusLabel } from "@/lib/work";
import { useAcademicSubjects, ACADEMIC_TYPES, mapAcademicTaskToTask } from "@/lib/academics";
import { useXP } from "@/lib/xp";
import type { Currency, TransactionType, WorkoutType, TaskArea, TaskType, TaskPriority, TaskEnergy, WorkItemType, WorkItemStatus, Difficulty, PaymentMethod, AcademicTaskType } from "@/types/atlas";

type CaptureTab = "finance" | "gym" | "task" | "note" | "goal" | "work" | "academic";

export function QuickCaptureModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CaptureTab>("task");
  const [successMessage, setSuccessMessage] = useState("");

  const xp = useXP();
  const { addTransaction } = useTransactions();
  const { addWorkout } = useWorkoutLogs();
  const { addTask } = useTasks();
  const { addNote } = useNotes();
  const { addGoal } = useGoals();
  const { clients, activeClients } = useClients();
  const { addWorkItem } = useWorkItems();
  const { activeSubjects } = useAcademicSubjects();

  // Keyboard accessibility: Escape to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Reset success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // --- Sub-Form States & Handlers ---

  // 1. Finance State
  const [finType, setFinType] = useState<TransactionType>("expense");
  const [finAmount, setFinAmount] = useState("");
  const [finCurrency, setFinCurrency] = useState<Currency>("PYG");
  const [finCategory, setFinCategory] = useState("");
  const [finDescription, setFinDescription] = useState("");
  const [finDate, setFinDate] = useState(new Date().toISOString().slice(0, 10));
  const [finMethod, setFinMethod] = useState<PaymentMethod>("Debit");

  function handleSaveFinance(e: FormEvent) {
    e.preventDefault();
    const amt = Number(finAmount);
    if (!amt || amt <= 0) {
      alert("Please enter an amount greater than 0.");
      return;
    }
    if (!finCategory) {
      alert("Please select a category.");
      return;
    }
    if (!finDescription.trim()) {
      alert("Please add a description.");
      return;
    }

    addTransaction({
      type: finType,
      amount: amt,
      currency: finCurrency,
      category: finCategory.trim(),
      description: finDescription.trim(),
      date: finDate,
      paymentMethod: finMethod,
    });

    xp.awardXP("finance-transaction", {
      amount: 10,
      label: `Logged ${finType}: ${finDescription}`,
    });

    setSuccessMessage("Finance transaction saved successfully! +10 XP");
    
    // Reset inputs
    setFinAmount("");
    setFinDescription("");
  }

  // 2. Gym State
  const [gymType, setGymType] = useState<WorkoutType>("Push");
  const [gymDuration, setGymDuration] = useState("");
  const [gymEnergy, setGymEnergy] = useState("7");
  const [gymIntensity, setGymIntensity] = useState("7");
  const [gymNotes, setGymNotes] = useState("");
  const [gymDate, setGymDate] = useState(new Date().toISOString().slice(0, 10));

  function handleSaveGym(e: FormEvent) {
    e.preventDefault();
    const duration = Number(gymDuration);
    if (!duration || duration <= 0) {
      alert("Please enter a duration in minutes.");
      return;
    }

    const logDraft = {
      workoutType: gymType,
      duration,
      energy: Number(gymEnergy),
      intensity: Number(gymIntensity),
      notes: gymNotes.trim(),
      date: gymDate,
    };

    addWorkout(logDraft);
    const xpReward = calculateWorkoutXP(logDraft);
    
    xp.awardXP("workout-log", {
      amount: xpReward.amount,
      label: xpReward.label,
    });

    setSuccessMessage(`Workout logged successfully! +${xpReward.amount} XP`);
    
    // Reset inputs
    setGymDuration("");
    setGymNotes("");
  }

  // 3. Task State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskArea, setTaskArea] = useState<TaskArea>("Personal");
  const [taskType, setTaskType] = useState<TaskType>("Quick Task");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskPlannedDate, setTaskPlannedDate] = useState(new Date().toISOString().slice(0, 10));
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskMinutes, setTaskMinutes] = useState("30");
  const [taskEnergy, setTaskEnergy] = useState<TaskEnergy>("medium");
  const [taskDesc, setTaskDesc] = useState("");

  function handleSaveTask(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) {
      alert("Please enter a task title.");
      return;
    }

    addTask({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      area: taskArea,
      taskType: taskType,
      status: "backlog",
      priority: taskPriority,
      plannedDate: taskPlannedDate,
      dueDate: taskDueDate,
      estimatedMinutes: Number(taskMinutes) || 30,
      energyRequired: taskEnergy,
    });

    setSuccessMessage("Task created successfully!");
    
    // Reset inputs
    setTaskTitle("");
    setTaskDesc("");
  }

  // 4. Note State
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteArea, setNoteArea] = useState("Personal");
  const [noteTags, setNoteTags] = useState("");

  function handleSaveNote(e: FormEvent) {
    e.preventDefault();
    if (!noteTitle.trim()) {
      alert("Please enter a note title.");
      return;
    }

    const tagsArray = noteTags.split(",").map((t) => t.trim()).filter(Boolean);

    addNote({
      title: noteTitle.trim(),
      content: noteContent.trim(),
      area: noteArea.trim(),
      tags: tagsArray,
    });

    xp.awardXP("note-created", {
      amount: 10,
      label: `Captured note: ${noteTitle}`,
    });

    setSuccessMessage("Note saved successfully! +10 XP");
    
    // Reset inputs
    setNoteTitle("");
    setNoteContent("");
    setNoteTags("");
  }

  // 5. Goal State
  const [goalTitle, setGoalTitle] = useState("");
  const [goalArea, setGoalArea] = useState("Personal");
  const [goalCurrent, setGoalCurrent] = useState("0");
  const [goalTarget, setGoalTarget] = useState("100");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalNotes, setGoalNotes] = useState("");
  const [goalLink, setGoalLink] = useState<"none" | "savings">("none");
  const [goalCurrency, setGoalCurrency] = useState<Currency>("PYG");
  const [goalUnit, setGoalUnit] = useState("");

  function handleSaveGoal(e: FormEvent) {
    e.preventDefault();
    if (!goalTitle.trim()) {
      alert("Please enter a goal title.");
      return;
    }

    addGoal({
      title: goalTitle.trim(),
      area: goalArea.trim(),
      status: "active",
      currentValue: goalLink === "savings" ? 0 : Number(goalCurrent) || 0,
      targetValue: Number(goalTarget) || 100,
      deadline: goalDeadline,
      notes: goalNotes.trim(),
      linkedFinanceMetric: goalLink,
      currency: goalCurrency,
      unit: goalUnit.trim(),
    });

    xp.awardXP("goal-updated", {
      amount: 25,
      label: `Created goal: ${goalTitle}`,
    });

    setSuccessMessage("Goal created successfully! +25 XP");
    
    // Reset inputs
    setGoalTitle("");
    setGoalNotes("");
    setGoalTarget("100");
    setGoalCurrent("0");
    setGoalUnit("");
  }

  // 6. Work Item State
  const [workClient, setWorkClient] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [workType, setWorkType] = useState<WorkItemType>("Video");
  const [workStatus, setWorkStatus] = useState<WorkItemStatus>("planned");
  const [workPriority, setWorkPriority] = useState<TaskPriority>("medium");
  const [workDiff, setWorkDiff] = useState<Difficulty>("medium");
  const [workPlannedDate, setWorkPlannedDate] = useState(new Date().toISOString().slice(0, 10));
  const [workDeadline, setWorkDeadline] = useState("");
  const [workMins, setWorkMins] = useState("60");
  const [workValue, setWorkValue] = useState("");
  const [workCurrency, setWorkCurrency] = useState<Currency>("USD");
  const [workDesc, setWorkDesc] = useState("");
  const [workReferenceUrl, setWorkReferenceUrl] = useState("");

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === workClient);
  }, [clients, workClient]);

  function handleSaveWorkItem(e: FormEvent) {
    e.preventDefault();
    if (!workClient) {
      alert("Please select a client.");
      return;
    }
    if (!workTitle.trim()) {
      alert("Please enter an item title.");
      return;
    }

    addWorkItem({
      clientId: workClient,
      title: workTitle.trim(),
      type: workType,
      status: workStatus,
      priority: workPriority,
      difficulty: workDiff,
      plannedDate: workPlannedDate || undefined,
      deadline: workDeadline || undefined,
      estimatedMinutes: Number(workMins) || undefined,
      value: (selectedClient?.billingType === "per_item" || !selectedClient?.billingType) ? (Number(workValue) || undefined) : undefined,
      currency: (selectedClient?.billingType === "per_item" || !selectedClient?.billingType) ? workCurrency : undefined,
      description: workDesc.trim(),
      referenceUrl: workReferenceUrl.trim() || undefined,
    });

    xp.awardXP("task-completed", {
      amount: 10,
      label: `Created work deliverable: ${workTitle}`,
    });

    setSuccessMessage("Work deliverable created successfully! +10 XP");
    
    // Reset inputs
    setWorkTitle("");
    setWorkDesc("");
    setWorkValue("");
    setWorkReferenceUrl("");
  }

  // 7. Academic Task State
  const [acadSubject, setAcadSubject] = useState("");
  const [acadTitle, setAcadTitle] = useState("");
  const [acadType, setAcadType] = useState<AcademicTaskType>("Assignment");
  const [acadPriority, setAcadPriority] = useState<TaskPriority>("medium");
  const [acadPlannedDate, setAcadPlannedDate] = useState(new Date().toISOString().slice(0, 10));
  const [acadDueDate, setAcadDueDate] = useState("");
  const [acadMins, setAcadMins] = useState("60");
  const [acadEnergy, setAcadEnergy] = useState<TaskEnergy>("medium");
  const [acadNotes, setAcadNotes] = useState("");

  function handleSaveAcademic(e: FormEvent) {
    e.preventDefault();
    if (!acadSubject) {
      alert("Please select an academic course/subject.");
      return;
    }
    if (!acadTitle.trim()) {
      alert("Please enter a task title.");
      return;
    }

    const taskDraft = mapAcademicTaskToTask({
      title: acadTitle.trim(),
      subjectId: acadSubject,
      academicType: acadType,
      priority: acadPriority,
      dueDate: acadDueDate,
      plannedDate: acadPlannedDate,
      estimatedMinutes: Number(acadMins) || 60,
      energyRequired: acadEnergy,
      notes: acadNotes.trim(),
    });

    addTask(taskDraft);

    setSuccessMessage("Academic task created successfully!");
    
    // Reset inputs
    setAcadTitle("");
    setAcadNotes("");
  }

  return (
    <>
      {/* 1. Persistent Subtle Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2 rounded-full border border-amber-500/20 bg-amber-500 px-5 py-3 text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-lg shadow-amber-500/10 hover:bg-amber-400 hover:border-amber-500/30 active:scale-95 transition-all duration-300 cursor-pointer"
        title="Open Quick Capture panel"
        aria-label="Global Quick Capture"
      >
        <span className="text-lg font-extrabold leading-none">+</span>
        <span>Capture</span>
      </button>

      {/* 2. Glassmorphic Premium Modal Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-fade-in-up duration-200">
          <div
            className="w-full max-w-xl rounded-xl border border-[#27272a] bg-[#18181b]/95 backdrop-blur-md p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-zinc-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-capture-title"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#27272a]/60 pb-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Global Action
                </p>
                <h2 id="quick-capture-title" className="text-xl font-bold text-zinc-100 mt-0.5">
                  Quick Capture OS
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-lg font-bold p-1 hover:bg-zinc-800 rounded transition"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Notification/Success Feedback */}
            {successMessage && (
              <div className="mb-4 rounded border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                <span>✓</span> {successMessage}
              </div>
            )}

            {/* Tabs selector */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-[#27272a]/60 mb-4 text-xs select-none">
              {(
                [
                  { id: "task", label: "📋 Task" },
                  { id: "finance", label: "💰 Finance" },
                  { id: "gym", label: "🏋️ Gym" },
                  { id: "note", label: "📝 Note" },
                  { id: "goal", label: "🎯 Goal" },
                  { id: "work", label: "💼 Work" },
                  { id: "academic", label: "🎓 Academic" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSuccessMessage("");
                  }}
                  className={`px-3 py-1.5 rounded-md font-semibold border transition shrink-0 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-500"
                      : "bg-[#121214] border-[#27272a] text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Scroll Container */}
            <div className="flex-1 overflow-y-auto pr-1">
              
              {/* FINANCE CAPTURE FORM */}
              {activeTab === "finance" && (
                <form onSubmit={handleSaveFinance} className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Type
                      <select
                        value={finType}
                        onChange={(e) => setFinType(e.target.value as TransactionType)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-sm text-zinc-200 cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Currency
                      <select
                        value={finCurrency}
                        onChange={(e) => setFinCurrency(e.target.value as Currency)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-sm text-zinc-200 cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="PYG">PYG</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Amount *
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 15000"
                        value={finAmount}
                        onChange={(e) => setFinAmount(e.target.value)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-sm text-zinc-100 font-bold focus:border-amber-500 focus:outline-none transition-colors duration-200 hover:border-zinc-750"
                        required
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Category *
                      <select
                        value={finCategory}
                        onChange={(e) => setFinCategory(e.target.value)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-sm text-zinc-200 cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750 focus:border-amber-500 focus:outline-none"
                        required
                      >
                        <option value="" disabled>Select category</option>
                        {FINANCE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Description *
                    <input
                      placeholder="e.g. Organic Groceries"
                      value={finDescription}
                      onChange={(e) => setFinDescription(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-semibold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Date
                      <input
                        type="date"
                        value={finDate}
                        onChange={(e) => setFinDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Payment Method
                      <select
                        value={finMethod}
                        onChange={(e) => setFinMethod(e.target.value as PaymentMethod)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    Save Transaction
                  </button>
                </form>
              )}

              {/* GYM CAPTURE FORM */}
              {activeTab === "gym" && (
                <form onSubmit={handleSaveGym} className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Workout Type
                      <select
                        value={gymType}
                        onChange={(e) => setGymType(e.target.value as WorkoutType)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {WORKOUT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Duration (Minutes) *
                      <input
                        type="number"
                        placeholder="e.g. 45"
                        value={gymDuration}
                        onChange={(e) => setGymDuration(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                        required
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Energy (1 - 10): {gymEnergy}
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={gymEnergy}
                        onChange={(e) => setGymEnergy(e.target.value)}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Intensity (1 - 10): {gymIntensity}
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={gymIntensity}
                        onChange={(e) => setGymIntensity(e.target.value)}
                        className="w-full accent-red-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Date
                    <input
                      type="date"
                      value={gymDate}
                      onChange={(e) => setGymDate(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-200"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Notes
                    <textarea
                      placeholder="e.g. Focus on squat form, felt strong"
                      rows={2}
                      value={gymNotes}
                      onChange={(e) => setGymNotes(e.target.value)}
                      className="resize-none focus:outline-none focus:border-amber-500/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    Log Workout
                  </button>
                </form>
              )}

              {/* TASK CAPTURE FORM */}
              {activeTab === "task" && (
                <form onSubmit={handleSaveTask} className="flex flex-col gap-3.5">
                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Task Title *
                    <input
                      placeholder="e.g. Finalize quarterly brief"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Area
                      <select
                        value={taskArea}
                        onChange={(e) => setTaskArea(e.target.value as TaskArea)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {TASK_AREAS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Task Type
                      <select
                        value={taskType}
                        onChange={(e) => setTaskType(e.target.value as TaskType)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {TASK_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Priority
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {TASK_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Energy Required
                      <select
                        value={taskEnergy}
                        onChange={(e) => setTaskEnergy(e.target.value as TaskEnergy)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {TASK_ENERGY_LEVELS.map((el) => (
                          <option key={el} value={el}>
                            {el}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Planned Date
                      <input
                        type="date"
                        value={taskPlannedDate}
                        onChange={(e) => setTaskPlannedDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Due Date (Optional)
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-200"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Est. Minutes
                    <input
                      type="number"
                      placeholder="30"
                      value={taskMinutes}
                      onChange={(e) => setTaskMinutes(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-200"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Description
                    <textarea
                      placeholder="Add descriptions or links..."
                      rows={2}
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      className="resize-none focus:outline-none focus:border-amber-500/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    Create Task
                  </button>
                </form>
              )}

              {/* NOTE CAPTURE FORM */}
              {activeTab === "note" && (
                <form onSubmit={handleSaveNote} className="flex flex-col gap-3.5">
                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Note Title *
                    <input
                      placeholder="e.g. Design meeting retrospectives"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Area
                      <input
                        placeholder="e.g. Personal, Work"
                        value={noteArea}
                        onChange={(e) => setNoteArea(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Tags (comma-separated)
                      <input
                        placeholder="e.g. ideas, references"
                        value={noteTags}
                        onChange={(e) => setNoteTags(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Notes / Content
                    <textarea
                      placeholder="Write your note thoughts here..."
                      rows={5}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="resize-none focus:outline-none focus:border-amber-500/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    Save Note
                  </button>
                </form>
              )}

              {/* GOAL CAPTURE FORM */}
              {activeTab === "goal" && (
                <form onSubmit={handleSaveGoal} className="flex flex-col gap-3.5">
                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Goal Title *
                    <input
                      placeholder="e.g. Buy Outfit Design Course"
                      value={goalTitle}
                      onChange={(e) => setGoalTitle(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Area
                      <input
                        placeholder="e.g. Personal"
                        value={goalArea}
                        onChange={(e) => setGoalArea(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Financial link
                      <select
                        value={goalLink}
                        onChange={(e) => setGoalLink(e.target.value as "none" | "savings")}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        <option value="none">None</option>
                        <option value="savings">Savings</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Currency
                      <select
                        value={goalCurrency}
                        onChange={(e) => setGoalCurrency(e.target.value as Currency)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-xs text-zinc-200 font-semibold"
                      >
                        <option value="PYG">PYG</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Unit
                      <input
                        placeholder="e.g. USD, kg, books"
                        value={goalUnit}
                        onChange={(e) => setGoalUnit(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-xs text-zinc-100"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-stone-750">
                      Current Value
                      <input
                        type="number"
                        disabled={goalLink === "savings"}
                        placeholder={goalLink === "savings" ? "Auto" : "0"}
                        value={goalLink === "savings" ? "" : goalCurrent}
                        onChange={(e) => setGoalCurrent(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200 disabled:opacity-50"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-stone-750">
                      Target Value *
                      <input
                        type="number"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100 font-bold"
                        required
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Deadline (Optional)
                    <input
                      type="date"
                      value={goalDeadline}
                      onChange={(e) => setGoalDeadline(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Private Notes
                    <textarea
                      placeholder="Guidelines, motivations..."
                      rows={2}
                      value={goalNotes}
                      onChange={(e) => setGoalNotes(e.target.value)}
                      className="resize-none focus:outline-none focus:border-amber-500/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    Save Goal
                  </button>
                </form>
              )}

              {/* WORK ITEM CAPTURE FORM */}
              {activeTab === "work" && (
                <form onSubmit={handleSaveWorkItem} className="flex flex-col gap-3.5">
                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Client *
                    <select
                      value={workClient}
                      onChange={(e) => setWorkClient(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-semibold"
                      required
                    >
                      <option value="">Select a client</option>
                      {activeClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Item Title *
                    <input
                      placeholder="e.g. 3 Custom Thumbnails"
                      value={workTitle}
                      onChange={(e) => setWorkTitle(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Type
                      <select
                        value={workType}
                        onChange={(e) => setWorkType(e.target.value as WorkItemType)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {WORK_ITEM_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Status
                      <select
                        value={workStatus}
                        onChange={(e) => setWorkStatus(e.target.value as WorkItemStatus)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {WORK_ITEM_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {getStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Priority
                      <select
                        value={workPriority}
                        onChange={(e) => setWorkPriority(e.target.value as TaskPriority)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Difficulty
                      <select
                        value={workDiff}
                        onChange={(e) => setWorkDiff(e.target.value as Difficulty)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {DIFFICULTIES.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Conditional Billing Value based on client billingType */}
                  {workClient && (
                    <div className="border-t border-[#27272a]/60 pt-3">
                      {(!selectedClient || selectedClient.billingType === "per_item" || !selectedClient.billingType) ? (
                        <div className="grid grid-cols-2 gap-3 w-full">
                          <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                            Value ($)
                            <input
                              type="number"
                              placeholder="Amount"
                              value={workValue}
                              onChange={(e) => setWorkValue(e.target.value)}
                              className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100 w-full"
                            />
                          </label>
                          <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                            Currency
                            <select
                              value={workCurrency}
                              onChange={(e) => setWorkCurrency(e.target.value as Currency)}
                              className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100 w-full"
                            >
                              <option value="USD">USD</option>
                              <option value="PYG">PYG</option>
                            </select>
                          </label>
                        </div>
                      ) : selectedClient.billingType === "fixed_monthly" ? (
                        <div className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 p-2.5 text-xs leading-snug w-full">
                          <span className="font-bold text-amber-300">Fixed Retainer:</span> Individual items do not need a value. Billed flat at {formatMoney(selectedClient.monthlyRate ?? 0, selectedClient.currency ?? "USD")}/mo.
                        </div>
                      ) : selectedClient.billingType === "hourly" ? (
                        <div className="rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 p-2.5 text-xs leading-snug w-full">
                          <span className="font-bold text-blue-300">Hourly Billing:</span> Billed hourly at {formatMoney(selectedClient.hourlyRate ?? 0, selectedClient.currency ?? "USD")}/hr. Estimated value will be calculated from work minutes.
                        </div>
                      ) : (
                        <div className="rounded bg-zinc-800/40 text-zinc-400 border border-zinc-700/30 p-2.5 text-xs leading-snug italic w-full">
                          This item is non-billable.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Work Minutes
                      <input
                        type="number"
                        placeholder="e.g. 60"
                        value={workMins}
                        onChange={(e) => setWorkMins(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Planned Date
                      <input
                        type="date"
                        value={workPlannedDate}
                        onChange={(e) => setWorkPlannedDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-0.5 text-xs text-zinc-200"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Deadline (Optional)
                    <input
                      type="date"
                      value={workDeadline}
                      onChange={(e) => setWorkDeadline(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-0.5 text-xs text-zinc-200"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Reference Link
                    <input
                      type="url"
                      placeholder="e.g. Google Drive, notion, brief brief..."
                      value={workReferenceUrl}
                      onChange={(e) => setWorkReferenceUrl(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Private Guidelines
                    <textarea
                      placeholder="Add deliverables spec..."
                      rows={2}
                      value={workDesc}
                      onChange={(e) => setWorkDesc(e.target.value)}
                      className="resize-none focus:outline-none focus:border-amber-500/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    Create Deliverable
                  </button>
                </form>
              )}

              {/* ACADEMIC TASK CAPTURE FORM */}
              {activeTab === "academic" && (
                <form onSubmit={handleSaveAcademic} className="flex flex-col gap-3.5">
                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Subject / Course *
                    <select
                      value={acadSubject}
                      onChange={(e) => setAcadSubject(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-semibold"
                      required
                    >
                      <option value="">Select a subject</option>
                      {activeSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Task Title *
                    <input
                      placeholder="e.g. Read Chapter 5 Retroactive Study"
                      value={acadTitle}
                      onChange={(e) => setAcadTitle(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Task Type
                      <select
                        value={acadType}
                        onChange={(e) => setAcadType(e.target.value as AcademicTaskType)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {ACADEMIC_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Priority
                      <select
                        value={acadPriority}
                        onChange={(e) => setAcadPriority(e.target.value as TaskPriority)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {TASK_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Planned Date
                      <input
                        type="date"
                        value={acadPlannedDate}
                        onChange={(e) => setAcadPlannedDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-0.5 text-xs text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Due Date *
                      <input
                        type="date"
                        value={acadDueDate}
                        onChange={(e) => setAcadDueDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-0.5 text-xs text-zinc-100 font-bold"
                        required
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Est. Minutes
                      <input
                        type="number"
                        placeholder="e.g. 60"
                        value={acadMins}
                        onChange={(e) => setAcadMins(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      Energy Required
                      <select
                        value={acadEnergy}
                        onChange={(e) => setAcadEnergy(e.target.value as TaskEnergy)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {TASK_ENERGY_LEVELS.map((el) => (
                          <option key={el} value={el}>
                            {el}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    Study Notes
                    <textarea
                      placeholder="Add guidelines or references..."
                      rows={2}
                      value={acadNotes}
                      onChange={(e) => setAcadNotes(e.target.value)}
                      className="resize-none focus:outline-none focus:border-amber-500/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    Save Academic Task
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}

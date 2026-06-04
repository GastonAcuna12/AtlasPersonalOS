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
import { t } from "@/lib/i18n";
import { isModuleEnabled } from "@/lib/modules";
import { useAtlasSettings } from "@/lib/settings";
import { useXP } from "@/lib/xp";
import type { AtlasModule, Currency, TransactionType, WorkoutType, TaskArea, TaskType, TaskPriority, TaskEnergy, WorkItemType, WorkItemStatus, Difficulty, PaymentMethod, AcademicTaskType } from "@/types/atlas";

type CaptureTab = "finance" | "gym" | "task" | "note" | "goal" | "work" | "academic";

const CAPTURE_TAB_MODULES: Record<CaptureTab, AtlasModule> = {
  task: "today",
  finance: "finances",
  gym: "gym",
  note: "notes",
  goal: "goals",
  work: "work",
  academic: "academics",
};

export function QuickCaptureModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CaptureTab>("task");
  const [successMessage, setSuccessMessage] = useState("");

  const { settings } = useAtlasSettings();
  const language = settings.language;
  const xp = useXP();
  const { addTransaction } = useTransactions();
  const { addWorkout } = useWorkoutLogs();
  const { addTask } = useTasks();
  const { addNote } = useNotes();
  const { addGoal } = useGoals();
  const { clients, activeClients } = useClients();
  const { addWorkItem } = useWorkItems();
  const { activeSubjects } = useAcademicSubjects();

  const captureTabs: { id: CaptureTab; label: string }[] = useMemo(
    () => [
      { id: "task", label: `📋 ${t(language, "quick.tab.task")}` },
      { id: "finance", label: `💰 ${t(language, "quick.tab.finance")}` },
      { id: "gym", label: `🏋️ ${t(language, "quick.tab.gym")}` },
      { id: "note", label: `📝 ${t(language, "quick.tab.note")}` },
      { id: "goal", label: `🎯 ${t(language, "quick.tab.goal")}` },
      { id: "work", label: `💼 ${t(language, "quick.tab.work")}` },
      { id: "academic", label: `🎓 ${t(language, "quick.tab.academic")}` },
    ],
    [language],
  );

  const availableCaptureTabs = useMemo(
    () =>
      captureTabs.filter((tab) =>
        isModuleEnabled(settings, CAPTURE_TAB_MODULES[tab.id]),
      ),
    [captureTabs, settings],
  );

  const activeTabAvailable = availableCaptureTabs.some((tab) => tab.id === activeTab);
  const visibleActiveTab = activeTabAvailable
    ? activeTab
    : availableCaptureTabs[0]?.id;

  const workStatusLabel = (status: WorkItemStatus) =>
    t(language, `work.status.${status}`, getStatusLabel(status));

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
      alert(t(language, "quick.validation.amount"));
      return;
    }
    if (!finCategory) {
      alert(t(language, "quick.validation.category"));
      return;
    }
    if (!finDescription.trim()) {
      alert(t(language, "quick.validation.description"));
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

    setSuccessMessage(t(language, "quick.success.finance"));
    
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
      alert(t(language, "quick.validation.duration"));
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

    setSuccessMessage(`${t(language, "quick.success.gym")} +${xpReward.amount} XP`);
    
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
      alert(t(language, "quick.validation.taskTitle"));
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

    setSuccessMessage(t(language, "quick.success.task"));
    
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
      alert(t(language, "quick.validation.noteTitle"));
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

    setSuccessMessage(t(language, "quick.success.note"));
    
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
      alert(t(language, "quick.validation.goalTitle"));
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

    setSuccessMessage(t(language, "quick.success.goal"));
    
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
      alert(t(language, "quick.validation.client"));
      return;
    }
    if (!workTitle.trim()) {
      alert(t(language, "quick.validation.itemTitle"));
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

    setSuccessMessage(t(language, "quick.success.work"));
    
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
      alert(t(language, "quick.validation.academicSubject"));
      return;
    }
    if (!acadTitle.trim()) {
      alert(t(language, "quick.validation.taskTitle"));
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

    setSuccessMessage(t(language, "quick.success.academic"));
    
    // Reset inputs
    setAcadTitle("");
    setAcadNotes("");
  }

  return (
    <>
      {/* 1. Persistent Subtle Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2 rounded-full border border-[#C8A96A]/20 bg-[#C8A96A] px-5 py-3 text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-lg shadow-[#C8A96A]/10 hover:bg-[#D4B87A] hover:border-[#C8A96A]/30 active:scale-95 transition-all duration-300 cursor-pointer"
        title={t(language, "quick.openPanel")}
        aria-label={t(language, "quick.aria")}
      >
        <span className="text-lg font-extrabold leading-none">+</span>
        <span>{t(language, "quick.button")}</span>
      </button>

      {/* 2. Glassmorphic Premium Modal Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-fade-in-up duration-200">
          <div
            className="w-full max-w-xl rounded-xl border border-[#27272a] bg-[#18181b]/95 backdrop-blur-md p-6 shadow-xl flex flex-col max-h-[85vh] overflow-hidden text-zinc-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-capture-title"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#27272a]/60 pb-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {t(language, "quick.eyebrow")}
                </p>
                <h2 id="quick-capture-title" className="text-xl font-bold text-zinc-100 mt-0.5">
                  {t(language, "quick.title")}
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-lg font-bold p-1 hover:bg-zinc-800 rounded transition"
                aria-label={t(language, "quick.close")}
              >
                ✕
              </button>
            </div>

            {/* Notification/Success Feedback */}
            {successMessage && (
              <div className="mb-4 rounded border border-[#8A9A5B]/30 bg-[#8A9A5B]/5 px-4 py-2.5 text-xs font-semibold text-[#9AAB6B] flex items-center gap-2">
                <span>✓</span> {successMessage}
              </div>
            )}

            {/* Tabs selector */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2 border-b border-[#27272a]/60 mb-4 text-xs select-none">
              {availableCaptureTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSuccessMessage("");
                  }}
                  className={`px-3 py-1.5 rounded-md font-semibold border transition shrink-0 whitespace-nowrap ${
                    visibleActiveTab === tab.id
                      ? "bg-[#C8A96A]/10 border-[#C8A96A]/25 text-[#C8A96A]"
                      : "bg-[#121214] border-[#27272a] text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Scroll Container */}
            <div className="flex-1 overflow-y-auto pr-1">
              {availableCaptureTabs.length === 0 ? (
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-5 text-sm text-zinc-400">
                  {t(language, "modules.quickCapture.empty")}
                </div>
              ) : (
                <>
              {/* FINANCE CAPTURE FORM */}
              {visibleActiveTab === "finance" && (
                <form onSubmit={handleSaveFinance} className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "common.type")}
                      <select
                        value={finType}
                        onChange={(e) => setFinType(e.target.value as TransactionType)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-sm text-zinc-200 cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750 focus:border-[#C8A96A] focus:outline-none"
                      >
                        <option value="expense">{t(language, "common.expense")}</option>
                        <option value="income">{t(language, "common.income")}</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.currency")}
                      <select
                        value={finCurrency}
                        onChange={(e) => setFinCurrency(e.target.value as Currency)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-sm text-zinc-200 cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750 focus:border-[#C8A96A] focus:outline-none"
                      >
                        <option value="PYG">PYG</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.amountRequired")}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t(language, "quick.placeholder.amount15000")}
                        value={finAmount}
                        onChange={(e) => setFinAmount(e.target.value)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-sm text-zinc-100 font-bold focus:border-[#C8A96A] focus:outline-none transition-colors duration-200 hover:border-zinc-750"
                        required
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.categoryRequired")}
                      <select
                        value={finCategory}
                        onChange={(e) => setFinCategory(e.target.value)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-sm text-zinc-200 cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750 focus:border-[#C8A96A] focus:outline-none"
                        required
                      >
                        <option value="" disabled>{t(language, "quick.selectCategory")}</option>
                        {FINANCE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {t(language, `enum.financeCategory.${c}`, c)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "quick.descriptionRequired")}
                    <input
                      placeholder={t(language, "quick.placeholder.organicGroceries")}
                      value={finDescription}
                      onChange={(e) => setFinDescription(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-semibold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "common.date")}
                      <input
                        type="date"
                        value={finDate}
                        onChange={(e) => setFinDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.paymentMethod")}
                      <select
                        value={finMethod}
                        onChange={(e) => setFinMethod(e.target.value as PaymentMethod)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {t(language, `enum.paymentMethod.${m}`, m)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-[#C8A96A] hover:bg-[#D4B87A] py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    {t(language, "quick.saveTransaction")}
                  </button>
                </form>
              )}

              {/* GYM CAPTURE FORM */}
              {visibleActiveTab === "gym" && (
                <form onSubmit={handleSaveGym} className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.workoutType")}
                      <select
                        value={gymType}
                        onChange={(e) => setGymType(e.target.value as WorkoutType)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {WORKOUT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {t(language, `enum.workoutType.${type}`, type)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.durationRequired")}
                      <input
                        type="number"
                        placeholder={t(language, "quick.placeholder.minutes45")}
                        value={gymDuration}
                        onChange={(e) => setGymDuration(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                        required
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.energyScale")}: {gymEnergy}
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={gymEnergy}
                        onChange={(e) => setGymEnergy(e.target.value)}
                        className="w-full accent-[#C8A96A] cursor-pointer"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.intensityScale")}: {gymIntensity}
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={gymIntensity}
                        onChange={(e) => setGymIntensity(e.target.value)}
                        className="w-full accent-[#B26A5B] cursor-pointer"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "common.date")}
                    <input
                      type="date"
                      value={gymDate}
                      onChange={(e) => setGymDate(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-200"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "common.notes")}
                    <textarea
                      placeholder={t(language, "quick.placeholder.gymNotes")}
                      rows={2}
                      value={gymNotes}
                      onChange={(e) => setGymNotes(e.target.value)}
                      className="resize-none focus:outline-none focus:border-[#C8A96A]/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-[#C8A96A] hover:bg-[#D4B87A] py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    {t(language, "quick.logWorkout")}
                  </button>
                </form>
              )}

              {/* TASK CAPTURE FORM */}
              {visibleActiveTab === "task" && (
                <form onSubmit={handleSaveTask} className="flex flex-col gap-3.5">
                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "task.title")}
                    <input
                      placeholder={t(language, "quick.placeholder.taskTitle")}
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "common.area")}
                      <select
                        value={taskArea}
                        onChange={(e) => setTaskArea(e.target.value as TaskArea)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {TASK_AREAS.map((area) => (
                          <option key={area} value={area}>
                            {t(language, `enum.taskArea.${area}`, area)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "task.taskType")}
                      <select
                        value={taskType}
                        onChange={(e) => setTaskType(e.target.value as TaskType)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {TASK_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {t(language, `enum.taskType.${type}`, type)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "common.priority")}
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {TASK_PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {t(language, `enum.priority.${priority}`, priority)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.energyRequired")}
                      <select
                        value={taskEnergy}
                        onChange={(e) => setTaskEnergy(e.target.value as TaskEnergy)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-200"
                      >
                        {TASK_ENERGY_LEVELS.map((energy) => (
                          <option key={energy} value={energy}>
                            {t(language, `enum.energy.${energy}`, energy)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "task.plannedDate")}
                      <input
                        type="date"
                        value={taskPlannedDate}
                        onChange={(e) => setTaskPlannedDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "task.dueDateOptional")}
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-200"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "quick.estimatedMinutes")}
                    <input
                      type="number"
                      placeholder="30"
                      value={taskMinutes}
                      onChange={(e) => setTaskMinutes(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-200"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "common.description")}
                    <textarea
                      placeholder={t(language, "task.notesPlaceholder")}
                      rows={2}
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      className="resize-none focus:outline-none focus:border-[#C8A96A]/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-[#C8A96A] hover:bg-[#D4B87A] py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    {t(language, "quick.createTask")}
                  </button>
                </form>
              )}

              {/* NOTE CAPTURE FORM */}
              {visibleActiveTab === "note" && (
                <form onSubmit={handleSaveNote} className="flex flex-col gap-3.5">
                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "notes.noteTitle")}
                    <input
                      placeholder={t(language, "quick.placeholder.noteTitle")}
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "common.area")}
                      <input
                        placeholder={t(language, "notes.areaPlaceholder")}
                        value={noteArea}
                        onChange={(e) => setNoteArea(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "notes.tags")}
                      <input
                        placeholder={t(language, "quick.placeholder.tags")}
                        value={noteTags}
                        onChange={(e) => setNoteTags(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "quick.notesContent")}
                    <textarea
                      placeholder={t(language, "quick.placeholder.noteContent")}
                      rows={5}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="resize-none focus:outline-none focus:border-[#C8A96A]/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-sm text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-[#C8A96A] hover:bg-[#D4B87A] py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    {t(language, "notes.save")}
                  </button>
                </form>
              )}

              {/* GOAL CAPTURE FORM */}
              {visibleActiveTab === "goal" && (
                <form onSubmit={handleSaveGoal} className="flex flex-col gap-3.5">
                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "quick.goalTitleRequired")}
                    <input
                      placeholder={t(language, "quick.placeholder.goalTitle")}
                      value={goalTitle}
                      onChange={(e) => setGoalTitle(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "common.area")}
                      <input
                        placeholder={t(language, "quick.placeholder.personal")}
                        value={goalArea}
                        onChange={(e) => setGoalArea(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.financialLink")}
                      <select
                        value={goalLink}
                        onChange={(e) => setGoalLink(e.target.value as "none" | "savings")}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        <option value="none">{t(language, "common.none")}</option>
                        <option value="savings">{t(language, "quick.savings")}</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.currency")}
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
                      {t(language, "quick.unit")}
                      <input
                        placeholder={t(language, "quick.placeholder.unit")}
                        value={goalUnit}
                        onChange={(e) => setGoalUnit(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-xs text-zinc-100"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-stone-750">
                      {t(language, "quick.currentValue")}
                      <input
                        type="number"
                        disabled={goalLink === "savings"}
                        placeholder={goalLink === "savings" ? t(language, "quick.auto") : "0"}
                        value={goalLink === "savings" ? "" : goalCurrent}
                        onChange={(e) => setGoalCurrent(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200 disabled:opacity-50"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-stone-750">
                      {t(language, "quick.targetValueRequired")}
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
                    {t(language, "task.dueDateOptional")}
                    <input
                      type="date"
                      value={goalDeadline}
                      onChange={(e) => setGoalDeadline(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "quick.privateNotes")}
                    <textarea
                      placeholder={t(language, "quick.placeholder.privateNotes")}
                      rows={2}
                      value={goalNotes}
                      onChange={(e) => setGoalNotes(e.target.value)}
                      className="resize-none focus:outline-none focus:border-[#C8A96A]/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-[#C8A96A] hover:bg-[#D4B87A] py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    {t(language, "quick.saveGoal")}
                  </button>
                </form>
              )}

              {/* WORK ITEM CAPTURE FORM */}
              {visibleActiveTab === "work" && (
                <form onSubmit={handleSaveWorkItem} className="flex flex-col gap-3.5">
                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "work.clientRequired", "Client *")}
                    <select
                      value={workClient}
                      onChange={(e) => setWorkClient(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-semibold"
                      required
                    >
                      <option value="">{t(language, "work.selectClient", "Select a client")}</option>
                      {activeClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "work.itemTitle", "Item Title *")}
                    <input
                      placeholder={t(language, "quick.placeholder.workTitle")}
                      value={workTitle}
                      onChange={(e) => setWorkTitle(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "common.type")}
                      <select
                        value={workType}
                        onChange={(e) => setWorkType(e.target.value as WorkItemType)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {WORK_ITEM_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {t(language, `work.type.${type}`, type)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "common.status")}
                      <select
                        value={workStatus}
                        onChange={(e) => setWorkStatus(e.target.value as WorkItemStatus)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {WORK_ITEM_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {workStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "common.priority")}
                      <select
                        value={workPriority}
                        onChange={(e) => setWorkPriority(e.target.value as TaskPriority)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {t(language, `enum.priority.${priority}`, priority)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "work.taskDifficulty", "Task Difficulty")}
                      <select
                        value={workDiff}
                        onChange={(e) => setWorkDiff(e.target.value as Difficulty)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {DIFFICULTIES.map((difficulty) => (
                          <option key={difficulty} value={difficulty}>
                            {t(language, `work.difficulty.${difficulty}`, difficulty)}
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
                            {t(language, "work.billingValue", "Billing Value")}
                            <input
                              type="number"
                              placeholder={t(language, "work.amount", "Amount")}
                              value={workValue}
                              onChange={(e) => setWorkValue(e.target.value)}
                              className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100 w-full"
                            />
                          </label>
                          <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                            {t(language, "quick.currency")}
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
                        <div className="rounded bg-[#C8A96A]/10 text-[#C8A96A] border border-[#C8A96A]/20 p-2.5 text-xs leading-snug w-full">
                          <span className="font-bold text-[#D4B87A]">{t(language, "quick.work.fixedRetainer")}:</span> {t(language, "quick.work.fixedRetainerDescription")} {formatMoney(selectedClient.monthlyRate ?? 0, selectedClient.currency ?? "USD")}/mo.
                        </div>
                      ) : selectedClient.billingType === "hourly" ? (
                        <div className="rounded bg-[#6F8799]/10 text-[#6F8799] border border-[#6F8799]/20 p-2.5 text-xs leading-snug w-full">
                          <span className="font-bold text-[#A8A29E]">{t(language, "quick.work.hourlyBilling")}:</span> {t(language, "quick.work.hourlyBillingDescription")} {formatMoney(selectedClient.hourlyRate ?? 0, selectedClient.currency ?? "USD")}/hr. {t(language, "quick.work.hourlyEstimate")}
                        </div>
                      ) : (
                        <div className="rounded bg-zinc-800/40 text-zinc-400 border border-zinc-700/30 p-2.5 text-xs leading-snug italic w-full">
                          {t(language, "quick.work.nonBillable")}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.workMinutes")}
                      <input
                        type="number"
                        placeholder={t(language, "quick.placeholder.minutes60")}
                        value={workMins}
                        onChange={(e) => setWorkMins(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "task.plannedDate")}
                      <input
                        type="date"
                        value={workPlannedDate}
                        onChange={(e) => setWorkPlannedDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-0.5 text-xs text-zinc-200"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "task.dueDateOptional")}
                    <input
                      type="date"
                      value={workDeadline}
                      onChange={(e) => setWorkDeadline(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-0.5 text-xs text-zinc-200"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "work.referenceLink", "Reference Link")}
                    <input
                      type="url"
                      placeholder={t(language, "work.referencePlaceholder", "Google Drive, Notion, brief, folder, etc.")}
                      value={workReferenceUrl}
                      onChange={(e) => setWorkReferenceUrl(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-[#C8A96A]/50"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "quick.privateGuidelines")}
                    <textarea
                      placeholder={t(language, "quick.placeholder.deliverables")}
                      rows={2}
                      value={workDesc}
                      onChange={(e) => setWorkDesc(e.target.value)}
                      className="resize-none focus:outline-none focus:border-[#C8A96A]/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-[#C8A96A] hover:bg-[#D4B87A] py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    {t(language, "quick.createDeliverable")}
                  </button>
                </form>
              )}

              {/* ACADEMIC TASK CAPTURE FORM */}
              {visibleActiveTab === "academic" && (
                <form onSubmit={handleSaveAcademic} className="flex flex-col gap-3.5">
                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "quick.subjectCourseRequired")}
                    <select
                      value={acadSubject}
                      onChange={(e) => setAcadSubject(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-semibold"
                      required
                    >
                      <option value="">{t(language, "quick.selectSubject")}</option>
                      {activeSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "task.title")}
                    <input
                      placeholder={t(language, "quick.placeholder.academicTitle")}
                      value={acadTitle}
                      onChange={(e) => setAcadTitle(e.target.value)}
                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1.5 text-sm text-zinc-100 font-bold"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "task.taskType")}
                      <select
                        value={acadType}
                        onChange={(e) => setAcadType(e.target.value as AcademicTaskType)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {ACADEMIC_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {t(language, `academic.type.${type}`, type)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "common.priority")}
                      <select
                        value={acadPriority}
                        onChange={(e) => setAcadPriority(e.target.value as TaskPriority)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {TASK_PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {t(language, `enum.priority.${priority}`, priority)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "task.plannedDate")}
                      <input
                        type="date"
                        value={acadPlannedDate}
                        onChange={(e) => setAcadPlannedDate(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-0.5 text-xs text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.dueDateRequired")}
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
                      {t(language, "quick.estimatedMinutes")}
                      <input
                        type="number"
                        placeholder={t(language, "quick.placeholder.minutes60")}
                        value={acadMins}
                        onChange={(e) => setAcadMins(e.target.value)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                      {t(language, "quick.energyRequired")}
                      <select
                        value={acadEnergy}
                        onChange={(e) => setAcadEnergy(e.target.value as TaskEnergy)}
                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-200"
                      >
                        {TASK_ENERGY_LEVELS.map((energy) => (
                          <option key={energy} value={energy}>
                            {t(language, `enum.energy.${energy}`, energy)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-semibold text-zinc-400">
                    {t(language, "quick.studyNotes")}
                    <textarea
                      placeholder={t(language, "quick.placeholder.studyNotes")}
                      rows={2}
                      value={acadNotes}
                      onChange={(e) => setAcadNotes(e.target.value)}
                      className="resize-none focus:outline-none focus:border-[#C8A96A]/50 rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs text-zinc-100"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-2 rounded bg-[#C8A96A] hover:bg-[#D4B87A] py-2.5 text-xs font-bold text-zinc-950 transition tracking-wider uppercase"
                  >
                    {t(language, "quick.saveAcademicTask")}
                  </button>
                </form>
              )}

                </>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}

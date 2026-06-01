"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  useClients,
  useWorkItems,
  CLIENT_TYPES,
  WORK_ITEM_TYPES,
  WORK_ITEM_STATUSES,
  DIFFICULTIES,
  PRIORITIES,
  getWorkItemsDueToday,
  getWorkItemsDueThisWeek,
  getWorkloadThisWeek,
  getItemsWaitingFeedback,
  getStatusLabel,
  getDifficultyColor,
  getPriorityColor,
  calculateWorkXP,
  type BillingType,
  type Client,
  type ClientDraft,
  type ClientType,
  type Difficulty,
  type WorkItem,
  type WorkItemDraft,
  type WorkItemStatus,
  type WorkItemType,
} from "@/lib/work";
import { useXP } from "@/lib/xp";
import { formatMoney } from "@/lib/finances";
import { useAtlasSettings } from "@/lib/settings";
import { t } from "@/lib/i18n";
import { WorkCloudPanel } from "@/components/WorkCloudPanel";
import type { TaskPriority, Currency } from "@/types/atlas";

const initialClientDraft: ClientDraft = {
  name: "",
  type: "Direct Client",
  status: "active",
  difficulty: "medium",
  defaultRate: undefined,
  notes: "",
  billingType: "per_item",
  monthlyRate: undefined,
  hourlyRate: undefined,
  currency: "USD",
};

const initialWorkItemDraft: WorkItemDraft = {
  clientId: "",
  title: "",
  description: "",
  type: "Video",
  status: "backlog",
  priority: "medium",
  difficulty: "medium",
  estimatedMinutes: undefined,
  deadline: "",
  plannedDate: "",
  value: undefined,
  currency: "USD",
  notes: "",
  referenceUrl: "",
};

export function WorkPage() {
  const xp = useXP();
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const workStatusLabel = (status: WorkItemStatus) =>
    t(language, `work.status.${status}`, getStatusLabel(status));
  const workTypeLabel = (type: WorkItemType) =>
    t(language, `work.type.${type}`, type);
  const difficultyLabel = (difficulty: Difficulty) =>
    t(language, `work.difficulty.${difficulty}`, difficulty);
  const clientTypeLabel = (type: ClientType) =>
    t(language, `work.clientType.${type}`, type);
  const { clients, activeClients, addClient, updateClient } = useClients();
  const { workItems, addWorkItem, updateWorkItem, completeWorkItem, deleteWorkItem } =
    useWorkItems();

  const [clientDraft, setClientDraft] = useState(initialClientDraft);
  const [workItemDraft, setWorkItemDraft] = useState(initialWorkItemDraft);
  const [errorClient, setErrorClient] = useState("");
  const [errorWorkItem, setErrorWorkItem] = useState("");

  // Tab & Form Collapsibility UI state
  const [activeTab, setActiveTab] = useState<"board" | "clients">("board");
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  // Client Editing state
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editClientType, setEditClientType] = useState<ClientType>("Direct Client");
  const [editClientDifficulty, setEditClientDifficulty] = useState<Difficulty>("medium");
  const [editClientNotes, setEditClientNotes] = useState("");
  const [editClientRate, setEditClientRate] = useState<number | undefined>(undefined);
  const [editClientBillingType, setEditClientBillingType] = useState<BillingType>("per_item");
  const [editClientMonthlyRate, setEditClientMonthlyRate] = useState<number | undefined>(undefined);
  const [editClientHourlyRate, setEditClientHourlyRate] = useState<number | undefined>(undefined);
  const [editClientCurrency, setEditClientCurrency] = useState<Currency>("USD");

  // WorkItem Editing state
  const [editingWorkItemId, setEditingWorkItemId] = useState<string | null>(null);
  const [editWorkTitle, setEditWorkTitle] = useState("");
  const [editWorkDescription, setEditWorkDescription] = useState("");
  const [editWorkType, setEditWorkType] = useState<WorkItemType>("Video");
  const [editWorkStatus, setEditWorkStatus] = useState<WorkItemStatus>("planned");
  const [editWorkPriority, setEditWorkPriority] = useState<TaskPriority>("medium");
  const [editWorkDifficulty, setEditWorkDifficulty] = useState<Difficulty>("medium");
  const [editWorkEstimatedMinutes, setEditWorkEstimatedMinutes] = useState<number | undefined>(undefined);
  const [editWorkDeadline, setEditWorkDeadline] = useState("");
  const [editWorkPlannedDate, setEditWorkPlannedDate] = useState("");
  const [editWorkValue, setEditWorkValue] = useState<number | undefined>(undefined);
  const [editWorkCurrency, setEditWorkCurrency] = useState<Currency>("USD");
  const [editWorkNotes, setEditWorkNotes] = useState("");
  const [editWorkReferenceUrl, setEditWorkReferenceUrl] = useState("");

  // Statistics
  const dueToday = useMemo(() => getWorkItemsDueToday(workItems), [workItems]);
  const dueThisWeek = useMemo(() => getWorkItemsDueThisWeek(workItems), [workItems]);
  const workloadMinutesThisWeek = useMemo(() => getWorkloadThisWeek(workItems), [workItems]);
  const waitingFeedback = useMemo(() => getItemsWaitingFeedback(workItems), [workItems]);

  const workloadHoursThisWeek = useMemo(() => {
    return Math.round((workloadMinutesThisWeek / 60) * 10) / 10;
  }, [workloadMinutesThisWeek]);

  // Clients mapping for easy lookup
  const clientsMap = useMemo(() => {
    return new Map(clients.map((c) => [c.id, c]));
  }, [clients]);

  // Selected client for conditional value field in new item form
  const selectedClientForNewItem = useMemo(() => {
    return clients.find((c) => c.id === workItemDraft.clientId);
  }, [clients, workItemDraft.clientId]);

  // Group work items by status
  const groupedWorkItems = useMemo(() => {
    const groups: Record<WorkItemStatus, WorkItem[]> = {
      backlog: [],
      planned: [],
      in_progress: [],
      waiting_feedback: [],
      completed: [],
      archived: [],
    };
    workItems.forEach((item) => {
      if (groups[item.status]) {
        groups[item.status].push(item);
      }
    });
    return groups;
  }, [workItems]);

  function handleAddClient(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clientDraft.name.trim()) {
      setErrorClient(t(language, "work.errorClientName", "Client name is required."));
      return;
    }
    const client = addClient(clientDraft);
    xp.awardXP("note-created", {
      amount: 10,
      label: `Added client: ${client.name}`,
    });
    setClientDraft(initialClientDraft);
    setErrorClient("");
    setShowNewClientForm(false);
  }

  function handleAddWorkItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!workItemDraft.title.trim()) {
      setErrorWorkItem(t(language, "work.errorItemTitle", "Work item title is required."));
      return;
    }
    if (!workItemDraft.clientId) {
      setErrorWorkItem(t(language, "work.errorSelectClient", "Please select a client."));
      return;
    }
    const item = addWorkItem(workItemDraft);
    xp.awardXP("task-completed", {
      amount: 10,
      label: `Created work item: ${item.title}`,
    });
    setWorkItemDraft(initialWorkItemDraft);
    setErrorWorkItem("");
    setShowNewItemForm(false);
  }

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<WorkItemStatus | null>(null);

  function handleMoveWorkItemStatus(item: WorkItem, targetStatus: WorkItemStatus) {
    if (item.status === targetStatus) return;

    if (targetStatus === "completed") {
      const isAlreadyAwarded = item.xpAwarded;
      completeWorkItem(item.id);
      
      if (!isAlreadyAwarded) {
        const xpReward = calculateWorkXP(item);
        xp.awardXP("work-item-completed", {
          amount: xpReward.amount,
          label: xpReward.label,
        });
      }
    } else {
      updateWorkItem(item.id, {
        status: targetStatus,
        completedAt: undefined,
      });
    }
  }

  function handleCompleteWorkItem(item: WorkItem) {
    handleMoveWorkItemStatus(item, "completed");
  }

  function handleDragStart(e: React.DragEvent, itemId: string) {
    const targetElement = e.target as HTMLElement;
    if (
      targetElement.tagName === "SELECT" ||
      targetElement.tagName === "BUTTON" ||
      targetElement.tagName === "A" ||
      targetElement.tagName === "INPUT" ||
      targetElement.tagName === "TEXTAREA" ||
      targetElement.closest("button") ||
      targetElement.closest("select") ||
      targetElement.closest("a")
    ) {
      e.preventDefault();
      return;
    }

    setDraggingItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
  }

  function handleDragEnd() {
    setDraggingItemId(null);
    setDragOverColumn(null);
  }

  function handleDragOver(e: React.DragEvent, status: WorkItemStatus) {
    e.preventDefault();
    setDragOverColumn(status);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  function handleDrop(e: React.DragEvent, targetStatus: WorkItemStatus) {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain") || draggingItemId;
    if (!itemId) return;

    const item = workItems.find((w) => w.id === itemId);
    if (item) {
      handleMoveWorkItemStatus(item, targetStatus);
    }
    handleDragEnd();
  }

  function handleStartEditingClient(client: Client) {
    setEditingClientId(client.id);
    setEditClientName(client.name);
    setEditClientType(client.type);
    setEditClientDifficulty(client.difficulty);
    setEditClientNotes(client.notes ?? "");
    setEditClientRate(client.defaultRate);
    setEditClientBillingType(client.billingType ?? "per_item");
    setEditClientMonthlyRate(client.monthlyRate);
    setEditClientHourlyRate(client.hourlyRate);
    setEditClientCurrency(client.currency ?? "USD");
  }

  function handleSaveClientEdit(id: string) {
    if (!editClientName.trim()) {
      alert(t(language, "work.errorClientName", "Client name is required."));
      return;
    }
    updateClient(id, {
      name: editClientName.trim(),
      type: editClientType,
      difficulty: editClientDifficulty,
      notes: editClientNotes.trim(),
      defaultRate: editClientBillingType === "per_item" ? editClientRate : undefined,
      billingType: editClientBillingType,
      monthlyRate: editClientBillingType === "fixed_monthly" ? editClientMonthlyRate : undefined,
      hourlyRate: editClientBillingType === "hourly" ? editClientHourlyRate : undefined,
      currency: editClientCurrency,
    });
    setEditingClientId(null);
  }

  function handleStartEditingWorkItem(item: WorkItem) {
    setEditingWorkItemId(item.id);
    setEditWorkTitle(item.title);
    setEditWorkDescription(item.description ?? "");
    setEditWorkType(item.type);
    setEditWorkStatus(item.status);
    setEditWorkPriority(item.priority);
    setEditWorkDifficulty(item.difficulty);
    setEditWorkEstimatedMinutes(item.estimatedMinutes);
    setEditWorkDeadline(item.deadline ?? "");
    setEditWorkPlannedDate(item.plannedDate ?? "");
    setEditWorkValue(item.value);
    setEditWorkCurrency(item.currency ?? "USD");
    setEditWorkNotes(item.notes ?? "");
    setEditWorkReferenceUrl(item.referenceUrl ?? "");
  }

  function handleSaveWorkItemEdit(id: string) {
    if (!editWorkTitle.trim()) {
      alert(t(language, "work.errorItemTitle", "Work item title is required."));
      return;
    }
    updateWorkItem(id, {
      title: editWorkTitle.trim(),
      description: editWorkDescription.trim(),
      type: editWorkType,
      status: editWorkStatus,
      priority: editWorkPriority,
      difficulty: editWorkDifficulty,
      estimatedMinutes: editWorkEstimatedMinutes,
      deadline: editWorkDeadline || undefined,
      plannedDate: editWorkPlannedDate || undefined,
      value: editWorkValue,
      currency: editWorkCurrency,
      notes: editWorkNotes.trim(),
      referenceUrl: editWorkReferenceUrl.trim(),
    });
    setEditingWorkItemId(null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            {t(language, "work.eyebrow", "Operations & Delivery")}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            {t(language, "work.title", "Work Board")}
          </h1>
        </div>
        <Link
          href="/"
          className="w-fit rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          {t(language, "common.dashboard")}
        </Link>
      </header>

      <WorkCloudPanel localClients={clients} localWorkItems={workItems} />

      {/* Overview Statistics Cards */}
      <section className="grid gap-4 mt-6 grid-cols-2 lg:grid-cols-5">
        {[
          [t(language, "work.activeClients", "Active Clients"), activeClients.length],
          [t(language, "work.dueToday", "Due Today"), dueToday.length],
          [t(language, "work.dueThisWeek", "Due This Week"), dueThisWeek.length],
          [t(language, "work.weeklyLoad", "Weekly Load"), `${workloadHoursThisWeek}h`],
          [t(language, "work.pendingFeedback", "Pending Feedback"), waitingFeedback.length],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl border border-[#27272a] bg-[#18181b] p-4 shadow-lg text-center">
            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">{val}</p>
          </div>
        ))}
      </section>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#27272a] mt-8 gap-6">
        <button
          onClick={() => setActiveTab("board")}
          className={`pb-3 font-bold text-sm border-b-2 transition duration-200 uppercase tracking-wider ${
            activeTab === "board"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t(language, "work.itemsBoard", "Work Items Board")}
        </button>
        <button
          onClick={() => setActiveTab("clients")}
          className={`pb-3 font-bold text-sm border-b-2 transition duration-200 uppercase tracking-wider ${
            activeTab === "clients"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t(language, "work.clientDirectory", "Client Directory")}
        </button>
      </div>

      {/* Board View */}
      {activeTab === "board" ? (
        <section className="mt-8 flex flex-col gap-6">
          {/* Collapse Form Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-zinc-200 uppercase tracking-wide">{t(language, "work.kanbanPipeline", "Kanban Pipeline")}</h2>
            <button
              onClick={() => setShowNewItemForm(!showNewItemForm)}
              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md"
            >
              {showNewItemForm ? t(language, "work.cancelNewItem", "Cancel New Item") : t(language, "work.newWorkItem", "+ New Work Item")}
            </button>
          </div>

          {/* New Work Item Form */}
          {showNewItemForm && (
            <form
              onSubmit={handleAddWorkItem}
              className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-fade-in-up"
            >
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "work.clientRequired", "Client *")}
                <select
                  value={workItemDraft.clientId}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({ ...c, clientId: e.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="">{t(language, "work.selectClient", "Select a client")}</option>
                  {activeClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "work.itemTitle", "Item Title *")}
                <input
                  placeholder={t(language, "work.itemTitlePlaceholder", "e.g. 60s Shorts Reel")}
                  value={workItemDraft.title}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({ ...c, title: e.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none font-semibold"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "work.deliverableType", "Deliverable Type")}
                <select
                  value={workItemDraft.type}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({
                      ...c,
                      type: e.target.value as WorkItemType,
                    }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                >
                  {WORK_ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {workTypeLabel(t)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "common.status")}
                <select
                  value={workItemDraft.status}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({
                      ...c,
                      status: e.target.value as WorkItemStatus,
                    }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                >
                  {WORK_ITEM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {workStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "work.priorityLabel", "Priority Label")}
                <select
                  value={workItemDraft.priority}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({
                      ...c,
                      priority: e.target.value as TaskPriority,
                    }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {t(language, `enum.priority.${p}`, p)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "work.taskDifficulty", "Task Difficulty")}
                <select
                  value={workItemDraft.difficulty}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({
                      ...c,
                      difficulty: e.target.value as Difficulty,
                    }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {difficultyLabel(d)}
                    </option>
                  ))}
                </select>
              </label>

              {/* Conditional Billing Value based on client billingType */}
              {(!selectedClientForNewItem || selectedClientForNewItem.billingType === "per_item" || !selectedClientForNewItem.billingType) ? (
                <>
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t(language, "work.billingValue", "Billing Value")}
                    <input
                      type="number"
                      placeholder={t(language, "work.amount", "Amount")}
                      value={workItemDraft.value ?? ""}
                      onChange={(e) =>
                        setWorkItemDraft((c) => ({
                          ...c,
                          value: Number(e.target.value) || undefined,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t(language, "quick.currency", "Currency")}
                    <select
                      value={workItemDraft.currency ?? "USD"}
                      onChange={(e) =>
                        setWorkItemDraft((c) => ({
                          ...c,
                          currency: e.target.value as Currency,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    >
                      <option value="USD">USD</option>
                      <option value="PYG">PYG</option>
                    </select>
                  </label>
                </>
              ) : (
                <div className="rounded-lg bg-[#121214] border border-[#27272a] p-3 text-xs text-zinc-400 flex flex-col justify-center sm:col-span-2">
                  <span className="font-bold text-amber-500 uppercase text-[9px] tracking-widest leading-none mb-1">{t(language, "work.billingPolicy", "Billing Policy")}</span>
                  {selectedClientForNewItem.billingType === "fixed_monthly"
                    ? `${t(language, "work.fixedRetainer", "Fixed Retainer")}: ${t(language, "work.billedAt", "Billed at")} ${formatMoney(selectedClientForNewItem.monthlyRate ?? 0, selectedClientForNewItem.currency ?? "USD")}/mo.`
                    : selectedClientForNewItem.billingType === "hourly"
                    ? `${t(language, "work.hourlyRetainer", "Hourly Retainer")}: ${t(language, "work.billedAt", "Billed at")} ${formatMoney(selectedClientForNewItem.hourlyRate ?? 0, selectedClientForNewItem.currency ?? "USD")}/hr.`
                    : t(language, "work.nonBillableProfile", "Non-billable personal profile.")}
                </div>
              )}

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "work.minutesEstimate", "Work Minutes Est.")}
                <input
                  type="number"
                  placeholder="e.g. 60"
                  value={workItemDraft.estimatedMinutes ?? ""}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({
                      ...c,
                      estimatedMinutes: Number(e.target.value) || undefined,
                    }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "task.plannedDate")}
                <input
                  type="date"
                  value={workItemDraft.plannedDate}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({ ...c, plannedDate: e.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "work.deliverableDeadline", "Deliverable Deadline")}
                <input
                  type="date"
                  value={workItemDraft.deadline}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({ ...c, deadline: e.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "work.referenceLink", "Reference Link")}
                <input
                  placeholder={t(language, "work.referencePlaceholder", "Google Drive, Notion, brief, folder, etc.")}
                  value={workItemDraft.referenceUrl ?? ""}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({ ...c, referenceUrl: e.target.value }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider sm:col-span-2 md:col-span-3 lg:col-span-4">
                {t(language, "work.scopeGuidelines", "Description / Scope Guidelines")}
                <textarea
                  placeholder={t(language, "work.scopePlaceholder", "Add guidelines or notes...")}
                  rows={2}
                  value={workItemDraft.description}
                  onChange={(e) =>
                    setWorkItemDraft((c) => ({ ...c, description: e.target.value }))
                  }
                  className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none placeholder:text-zinc-650"
                />
              </label>

              {errorWorkItem && (
                <p className="text-red-400 text-xs font-semibold sm:col-span-2 md:col-span-3 lg:col-span-4">
                  {errorWorkItem}
                </p>
              )}

              <button
                type="submit"
                className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition sm:col-span-2 md:col-span-1"
              >
                {t(language, "work.createItem", "Create Item")}
              </button>
            </form>
          )}

          {/* Kanban Columns Scrollable Grid */}
          <div className="flex gap-4 overflow-x-auto pb-4 w-full min-w-0">
            {(["backlog", "planned", "in_progress", "waiting_feedback"] as WorkItemStatus[]).map(
              (colStatus) => {
                const colItems = groupedWorkItems[colStatus];
                return (
                  <div
                    key={colStatus}
                    onDragOver={(e) => handleDragOver(e, colStatus)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, colStatus)}
                    className={`rounded-xl border p-4 min-w-[290px] max-w-[330px] w-full shrink-0 flex flex-col gap-3 h-fit transition-all duration-200 ${
                      dragOverColumn === colStatus
                        ? "ring-2 ring-amber-500/20 border-amber-500/30 bg-[#121214]/80 shadow-md"
                        : "border-[#27272a] bg-[#121214]/50"
                    }`}
                  >
                    <div className="flex justify-between items-center border-b border-[#27272a] pb-2">
                      <span className="font-bold text-xs text-zinc-400 uppercase tracking-widest">
                        {workStatusLabel(colStatus)}
                      </span>
                      <span className="rounded-full bg-[#18181b] border border-[#27272a] px-2.5 py-0.5 text-xs font-bold text-amber-500">
                        {colItems.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                      {colItems.length > 0 ? (
                        colItems.map((item) => {
                          const client = clientsMap.get(item.clientId);
                          return (
                            <article
                              key={item.id}
                              draggable={editingWorkItemId !== item.id}
                              onDragStart={(e) => handleDragStart(e, item.id)}
                              onDragEnd={handleDragEnd}
                              className={`rounded-lg border bg-[#18181b] p-4.5 shadow-md flex flex-col gap-3 relative group transition duration-200 hover:border-zinc-500 cursor-grab active:cursor-grabbing ${
                                draggingItemId === item.id ? "opacity-40 border-dashed border-amber-500/40" : "border-[#27272a]"
                              }`}
                            >
                              {editingWorkItemId === item.id ? (
                                <div className="grid gap-3 text-xs text-left">
                                  <div className="flex justify-between items-center border-b border-[#27272a] pb-1.5">
                                    <span className="font-bold text-amber-500 uppercase tracking-widest text-[9px]">{t(language, "work.editItem", "Edit Work Item")}</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingWorkItemId(null)}
                                      className="text-zinc-400 hover:text-white text-[10px] font-bold"
                                    >
                                      {t(language, "work.discard", "Discard")}
                                    </button>
                                  </div>

                                  <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                    {t(language, "common.title")}
                                    <input
                                      value={editWorkTitle}
                                      onChange={(e) => setEditWorkTitle(e.target.value)}
                                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-xs font-semibold text-zinc-150 focus:outline-none focus:border-amber-500 w-full"
                                    />
                                  </label>

                                  <div className="grid grid-cols-2 gap-2">
                                    <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                      {t(language, "common.type")}
                                      <select
                                        value={editWorkType}
                                        onChange={(e) => setEditWorkType(e.target.value as WorkItemType)}
                                        className="rounded border border-[#27272a] bg-[#121214] px-1.5 py-1 text-zinc-150 focus:outline-none w-full"
                                      >
                                        {WORK_ITEM_TYPES.map((t) => (
                                          <option key={t} value={t}>
                                            {workTypeLabel(t)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                      {t(language, "common.priority")}
                                      <select
                                        value={editWorkPriority}
                                        onChange={(e) => setEditWorkPriority(e.target.value as TaskPriority)}
                                        className="rounded border border-[#27272a] bg-[#121214] px-1.5 py-1 text-zinc-150 focus:outline-none w-full"
                                      >
                                        {PRIORITIES.map((p) => (
                                          <option key={p} value={p}>
                                            {t(language, `enum.priority.${p}`, p)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                      {t(language, "work.taskDifficulty", "Task Difficulty")}
                                      <select
                                        value={editWorkDifficulty}
                                        onChange={(e) => setEditWorkDifficulty(e.target.value as Difficulty)}
                                        className="rounded border border-[#27272a] bg-[#121214] px-1.5 py-1 text-zinc-150 focus:outline-none w-full"
                                      >
                                        {DIFFICULTIES.map((d) => (
                                          <option key={d} value={d}>
                                            {difficultyLabel(d)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                      {t(language, "common.minutes")}
                                      <input
                                        type="number"
                                        value={editWorkEstimatedMinutes ?? ""}
                                        onChange={(e) => setEditWorkEstimatedMinutes(Number(e.target.value) || undefined)}
                                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-zinc-150 focus:outline-none w-full"
                                      />
                                    </label>
                                  </div>

                                  {(!client || !client.billingType || client.billingType === "per_item") && (
                                    <div className="grid grid-cols-2 gap-2">
                                      <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                        {t(language, "work.billingValue", "Billing Value")}
                                        <input
                                          type="number"
                                          value={editWorkValue ?? ""}
                                          onChange={(e) => setEditWorkValue(Number(e.target.value) || undefined)}
                                          className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-zinc-150 focus:outline-none w-full"
                                        />
                                      </label>

                                      <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                      {t(language, "quick.currency", "Currency")}
                                        <select
                                          value={editWorkCurrency}
                                          onChange={(e) => setEditWorkCurrency(e.target.value as Currency)}
                                          className="rounded border border-[#27272a] bg-[#121214] px-1.5 py-1 text-zinc-150 focus:outline-none w-full"
                                        >
                                          <option value="USD">USD</option>
                                          <option value="PYG">PYG</option>
                                        </select>
                                      </label>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-2">
                                    <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                      {t(language, "task.plannedDate")}
                                      <input
                                        type="date"
                                        value={editWorkPlannedDate}
                                        onChange={(e) => setEditWorkPlannedDate(e.target.value)}
                                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-zinc-150 focus:outline-none w-full"
                                      />
                                    </label>

                                    <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                      {t(language, "work.deadline", "Deadline")}
                                      <input
                                        type="date"
                                        value={editWorkDeadline}
                                        onChange={(e) => setEditWorkDeadline(e.target.value)}
                                        className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-zinc-150 focus:outline-none w-full"
                                      />
                                    </label>
                                  </div>

                                  <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                    {t(language, "work.referenceUrl", "Reference URL")}
                                    <input
                                      value={editWorkReferenceUrl}
                                      onChange={(e) => setEditWorkReferenceUrl(e.target.value)}
                                      placeholder={t(language, "work.referenceUrlPlaceholder", "e.g. Drive link")}
                                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-zinc-150 focus:outline-none w-full"
                                    />
                                  </label>

                                  <label className="grid gap-1 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                                    {t(language, "common.notes")}
                                    <textarea
                                      rows={2}
                                      value={editWorkNotes}
                                      onChange={(e) => setEditWorkNotes(e.target.value)}
                                      className="rounded border border-[#27272a] bg-[#121214] px-2 py-1 text-zinc-150 focus:outline-none resize-none w-full"
                                    />
                                  </label>

                                  <div className="flex gap-2 justify-end border-t border-[#27272a] pt-2 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveWorkItemEdit(item.id)}
                                      className="rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3 py-1.5 font-bold uppercase tracking-wider transition text-[10px]"
                                    >
                                      {t(language, "common.save")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingWorkItemId(null)}
                                      className="rounded border border-[#27272a] bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 font-bold uppercase tracking-wider text-zinc-300 transition text-[10px]"
                                    >
                                      {t(language, "common.cancel")}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className="text-zinc-650 hover:text-zinc-400 cursor-grab active:cursor-grabbing text-xs select-none p-0.5 shrink-0"
                                        title={t(language, "work.dragItem", "Drag work item")}
                                        aria-label={t(language, "work.dragItem", "Drag work item")}
                                      >
                                        ⠿
                                      </span>
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 truncate max-w-[140px]" title={client?.name}>
                                        {client?.name ?? t(language, "work.noClient", "No client")}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditingWorkItem(item)}
                                        className="text-zinc-500 hover:text-amber-500 text-[10px] uppercase font-bold transition duration-150"
                                        title={t(language, "work.editItemTitle", "Edit item")}
                                      >
                                        {t(language, "work.edit", "Edit")}
                                      </button>
                                      <button
                                        onClick={() => deleteWorkItem(item.id)}
                                        className="text-zinc-600 hover:text-red-400 text-xs transition duration-150 shrink-0"
                                        title={t(language, "work.deleteItemTitle", "Delete item")}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>

                                  <h4 className="font-bold text-sm text-zinc-100 leading-snug break-words">
                                    {item.title}
                                  </h4>

                                  {item.description && (
                                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 break-words">
                                      {item.description}
                                    </p>
                                  )}

                                  {item.referenceUrl && (
                                    <div className="text-left mt-0.5">
                                      <a
                                        href={item.referenceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 hover:text-amber-400 transition hover:underline cursor-pointer"
                                      >
                                        🔗 {t(language, "work.openReference", "Open reference")}
                                      </a>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                                    <span className="rounded bg-zinc-900 px-1.5 py-0.5 border border-[#27272a] text-zinc-400">
                                      {workTypeLabel(item.type)}
                                    </span>
                                    <span
                                      className={`rounded bg-zinc-900 px-1.5 py-0.5 border border-[#27272a] ${getDifficultyColor(
                                        item.difficulty
                                      )}`}
                                    >
                                      {difficultyLabel(item.difficulty)}
                                    </span>
                                    <span
                                      className={`rounded bg-zinc-900 px-1.5 py-0.5 border border-[#27272a] ${getPriorityColor(
                                        item.priority
                                      )}`}
                                    >
                                      {t(language, `enum.priority.${item.priority}`, item.priority)}
                                    </span>
                                    {item.estimatedMinutes && (
                                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-500 border border-[#27272a]">
                                        {item.estimatedMinutes}m
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-2 border-t border-[#27272a]/60 pt-3 mt-1">
                                    <div className="flex justify-between items-center text-[10px] gap-2">
                                      <span className="text-zinc-500 font-semibold">
                                        {item.deadline
                                          ? `${t(language, "work.dueLabel", "Due")}: ${item.deadline}`
                                          : item.plannedDate
                                          ? `${t(language, "work.planLabel", "Plan")}: ${item.plannedDate}`
                                          : t(language, "work.noDate", "No Date")}
                                      </span>
                                      {(!client || !client.billingType || client.billingType === "per_item") ? (
                                        item.value && item.value > 0 ? (
                                          <span className="font-bold text-zinc-200">
                                            {formatMoney(item.value, item.currency ?? "USD")}
                                          </span>
                                        ) : null
                                      ) : client.billingType === "fixed_monthly" ? (
                                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-500 border border-amber-500/25 whitespace-nowrap">
                                          {t(language, "work.billing.fixedShort", "Fixed")}
                                        </span>
                                      ) : client.billingType === "hourly" ? (
                                        <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-500 border border-blue-500/25 whitespace-nowrap">
                                          {t(language, "work.billing.hourlyShort", "Hourly")}
                                        </span>
                                      ) : (
                                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500 border border-[#27272a] whitespace-nowrap">
                                          {t(language, "work.billing.freeShort", "Free")}
                                        </span>
                                      )}
                                    </div>

                                    {/* Status Shift Controls Dropdown and Button */}
                                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                                      <select
                                        value={item.status}
                                        onChange={(e) =>
                                          handleMoveWorkItemStatus(item, e.target.value as WorkItemStatus)
                                        }
                                        className="rounded-lg border border-[#27272a] bg-[#121214] px-1.5 py-1 text-[10px] text-zinc-300 font-bold focus:outline-none"
                                      >
                                        {WORK_ITEM_STATUSES.map((s) => (
                                          <option key={s} value={s}>
                                            {workStatusLabel(s)}
                                          </option>
                                        ))}
                                      </select>

                                      <button
                                        onClick={() => handleCompleteWorkItem(item)}
                                        className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-[10px] font-bold text-zinc-200 transition text-center uppercase tracking-wide border border-[#27272a]"
                                      >
                                        ✓ {t(language, "work.done", "Done")}
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </article>
                          );
                        })
                      ) : (
                        <p className="text-xs text-zinc-600 italic text-center py-6 bg-[#121214]/20 rounded-lg border border-dashed border-[#27272a]">
                          {t(language, "work.columnEmpty", "Column Empty")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
            )}

            {/* Done Completed Column */}
            <div
              onDragOver={(e) => handleDragOver(e, "completed")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "completed")}
              className={`rounded-xl border p-4 min-w-[290px] max-w-[330px] w-full shrink-0 flex flex-col gap-3 h-fit col-span-1 transition-all duration-200 ${
                dragOverColumn === "completed"
                  ? "ring-2 ring-amber-500/20 border-amber-500/30 bg-[#121214]/80 shadow-md"
                  : "border-[#27272a] bg-[#121214]/50"
              }`}
            >
              <div className="flex justify-between items-center border-b border-[#27272a] pb-2">
                <span className="font-bold text-xs text-zinc-400 uppercase tracking-widest">
                  {t(language, "common.completed")}
                </span>
                <span className="rounded-full bg-[#18181b] border border-[#27272a] px-2.5 py-0.5 text-xs font-bold text-emerald-500">
                  {groupedWorkItems.completed.length}
                </span>
              </div>
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {groupedWorkItems.completed.length > 0 ? (
                  (showAllCompleted
                    ? groupedWorkItems.completed
                    : groupedWorkItems.completed.slice(0, 5)
                  ).map((item) => (
                    <article
                      key={item.id}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragEnd={handleDragEnd}
                      className={`rounded-lg border bg-[#18181b]/55 p-3.5 shadow-md flex flex-col gap-1.5 transition duration-200 hover:border-zinc-500 cursor-grab active:cursor-grabbing ${
                        draggingItemId === item.id ? "opacity-40 border-dashed border-amber-500/40" : "border-[#27272a]"
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                          {clientsMap.get(item.clientId)?.name ?? t(language, "work.noClient", "No client")}
                        </span>
                        <span
                          className="text-zinc-650 hover:text-zinc-450 select-none text-[10px]"
                          title={t(language, "work.dragItem", "Drag work item")}
                          aria-label={t(language, "work.dragItem", "Drag work item")}
                        >
                          ⠿
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-zinc-500 line-through break-words mt-1">
                        {item.title}
                      </h4>
                      {item.referenceUrl && (
                        <div className="text-left mt-0.5">
                          <a
                            href={item.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500/80 hover:text-amber-400 transition hover:underline cursor-pointer"
                          >
                            🔗 {t(language, "work.openReference", "Open reference")}
                          </a>
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-[#27272a]/30">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                          {t(language, "work.doneLabel", "Done")}: {item.completedAt ? item.completedAt.slice(0, 10) : ""}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleMoveWorkItemStatus(item, "in_progress")}
                          className="text-[9px] font-bold text-amber-500 hover:underline uppercase tracking-wide cursor-pointer"
                        >
                          {t(language, "work.reopen", "Reopen")}
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-xs text-zinc-600 italic text-center py-6 bg-[#121214]/20 rounded-lg border border-dashed border-[#27272a]">
                    {t(language, "work.noItemsFinished", "No items finished")}
                  </p>
                )}

                {groupedWorkItems.completed.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCompleted(!showAllCompleted)}
                    className="mt-1 text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline uppercase tracking-wider cursor-pointer w-full text-center py-1.5 bg-[#18181b]/30 rounded border border-[#27272a] transition"
                  >
                    {showAllCompleted ? t(language, "work.showLess", "Show Less") : `${t(language, "work.showAllCompleted", "Show All Completed")} (${groupedWorkItems.completed.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Clients View Tab */
        <section className="grid gap-8 py-8 lg:grid-cols-[360px_1fr] items-start">
          {/* Toggle form button */}
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setShowNewClientForm(!showNewClientForm)}
              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center"
            >
              {showNewClientForm ? t(language, "work.closeForm", "Close Form") : t(language, "work.addNewClient", "+ Add New Client")}
            </button>

            {/* Add Client Form */}
            {showNewClientForm && (
              <form
                onSubmit={handleAddClient}
                className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-xl flex flex-col gap-4 animate-fade-in-up"
              >
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-[#27272a] pb-2 mb-1">
                  {t(language, "work.newClientProfile", "New Client Profile")}
                </p>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "work.clientName", "Client Name *")}
                  <input
                    placeholder={t(language, "work.clientNamePlaceholder", "e.g. Media Agency X")}
                    value={clientDraft.name}
                    onChange={(e) => setClientDraft((c) => ({ ...c, name: e.target.value }))}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm font-semibold focus:border-amber-500 focus:outline-none"
                  />
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "work.businessType", "Business Type")}
                  <select
                    value={clientDraft.type}
                    onChange={(e) =>
                      setClientDraft((c) => ({ ...c, type: e.target.value as ClientType }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    {CLIENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {clientTypeLabel(t)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "work.difficultyLevel", "Difficulty Level")}
                  <select
                    value={clientDraft.difficulty}
                    onChange={(e) =>
                      setClientDraft((c) => ({
                        ...c,
                        difficulty: e.target.value as Difficulty,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {difficultyLabel(d)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "work.billingArrangement", "Billing Arrangement")}
                  <select
                    value={clientDraft.billingType}
                    onChange={(e) =>
                      setClientDraft((c) => ({
                        ...c,
                        billingType: e.target.value as BillingType,
                      }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="per_item">{t(language, "work.billing.perItem", "Per deliverable value")}</option>
                    <option value="fixed_monthly">{t(language, "work.billing.fixedMonthly", "Fixed monthly retainer")}</option>
                    <option value="hourly">{t(language, "work.billing.hourly", "Hourly rate billed")}</option>
                    <option value="non_billable">{t(language, "work.billing.nonBillable", "Non-billable (internal project)")}</option>
                  </select>
                </label>

                {clientDraft.billingType === "per_item" && (
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t(language, "work.defaultRate", "Default Rate per item (Optional)")}
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={clientDraft.defaultRate ?? ""}
                      onChange={(e) =>
                        setClientDraft((c) => ({
                          ...c,
                          defaultRate: Number(e.target.value) || undefined,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </label>
                )}

                {clientDraft.billingType === "fixed_monthly" && (
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t(language, "work.monthlyRate", "Monthly Retainer Rate ($)")}
                    <input
                      type="number"
                      placeholder="e.g. 1200"
                      value={clientDraft.monthlyRate ?? ""}
                      onChange={(e) =>
                        setClientDraft((c) => ({
                          ...c,
                          monthlyRate: Number(e.target.value) || undefined,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </label>
                )}

                {clientDraft.billingType === "hourly" && (
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t(language, "work.hourlyRate", "Hourly Rate Arrangement ($/hr)")}
                    <input
                      type="number"
                      placeholder="e.g. 45"
                      value={clientDraft.hourlyRate ?? ""}
                      onChange={(e) =>
                        setClientDraft((c) => ({
                          ...c,
                          hourlyRate: Number(e.target.value) || undefined,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </label>
                )}

                {clientDraft.billingType !== "non_billable" && (
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t(language, "work.billingCurrency", "Billing Currency")}
                    <select
                      value={clientDraft.currency}
                      onChange={(e) =>
                        setClientDraft((c) => ({
                          ...c,
                          currency: e.target.value as Currency,
                        }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="PYG">PYG (Gs)</option>
                    </select>
                  </label>
                )}

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "work.internalNotes", "Internal Notes")}
                  <textarea
                    placeholder={t(language, "work.internalNotesPlaceholder", "Contacts, requirements, links...")}
                    rows={3}
                    value={clientDraft.notes}
                    onChange={(e) => setClientDraft((c) => ({ ...c, notes: e.target.value }))}
                    className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none placeholder:text-zinc-650"
                  />
                </label>

                {errorClient && (
                  <p className="text-red-400 text-xs font-semibold">
                    {errorClient}
                  </p>
                )}

                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition w-full"
                >
                  {t(language, "work.saveProfile", "Save Profile")}
                </button>
              </form>
            )}
          </div>

          {/* Client Directory Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {clients.length > 0 ? (
              clients.map((client) => {
                const isEditing = editingClientId === client.id;
                const clientRateFormatted =
                  client.billingType === "fixed_monthly"
                    ? `${formatMoney(client.monthlyRate ?? 0, client.currency ?? "USD")}/mo`
                    : client.billingType === "hourly"
                      ? `${formatMoney(client.hourlyRate ?? 0, client.currency ?? "USD")}/hr`
                    : client.defaultRate
                      ? `${formatMoney(client.defaultRate, client.currency ?? "USD")} ${t(language, "work.perItemSuffix", "per item")}`
                      : t(language, "work.customItemValue", "Custom item value");

                return (
                  <article
                    key={client.id}
                    className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg flex flex-col gap-4.5"
                  >
                    {isEditing ? (
                      <div className="grid gap-4.5 text-xs">
                        <div className="flex justify-between items-center border-b border-[#27272a] pb-2">
                          <span className="font-bold text-amber-500 uppercase tracking-widest text-[10px]">{t(language, "work.editingProfile", "Editing Profile")}</span>
                          <button
                            onClick={() => setEditingClientId(null)}
                            className="text-zinc-400 hover:text-white"
                          >
                            {t(language, "work.discard", "Discard")}
                          </button>
                        </div>

                        <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                          {t(language, "work.name", "Name")}
                          <input
                            value={editClientName}
                            onChange={(e) => setEditClientName(e.target.value)}
                            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-1.5 text-sm font-semibold text-zinc-100 focus:outline-none focus:border-amber-500"
                          />
                        </label>

                        <div className="grid grid-cols-2 gap-3.5">
                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "common.type")}
                            <select
                              value={editClientType}
                              onChange={(e) => setEditClientType(e.target.value as ClientType)}
                              className="rounded-lg border border-[#27272a] bg-[#121214] px-2.5 py-1.5 text-zinc-100 focus:outline-none"
                            >
                              {CLIENT_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {clientTypeLabel(t)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "work.difficultyLevel", "Difficulty Level")}
                            <select
                              value={editClientDifficulty}
                              onChange={(e) =>
                                setEditClientDifficulty(e.target.value as Difficulty)
                              }
                              className="rounded-lg border border-[#27272a] bg-[#121214] px-2.5 py-1.5 text-zinc-100 focus:outline-none"
                            >
                              {DIFFICULTIES.map((d) => (
                                <option key={d} value={d}>
                                  {difficultyLabel(d)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                          {t(language, "work.billingMode", "Billing Mode")}
                          <select
                            value={editClientBillingType}
                            onChange={(e) =>
                              setEditClientBillingType(e.target.value as BillingType)
                            }
                            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-1.5 text-zinc-100 focus:outline-none"
                          >
                            <option value="per_item">{t(language, "work.billing.perItem", "Per deliverable value")}</option>
                            <option value="fixed_monthly">{t(language, "work.billing.fixedMonthly", "Fixed monthly retainer")}</option>
                            <option value="hourly">{t(language, "work.billing.hourly", "Hourly rate billed")}</option>
                            <option value="non_billable">{t(language, "work.billing.nonBillable", "Non-billable (internal project)")}</option>
                          </select>
                        </label>

                        {editClientBillingType === "per_item" && (
                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "work.defaultRatePerItem", "Default Rate per item ($)")}
                            <input
                              type="number"
                              value={editClientRate ?? ""}
                              onChange={(e) => setEditClientRate(Number(e.target.value) || undefined)}
                              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-1.5 text-zinc-100 focus:outline-none"
                            />
                          </label>
                        )}

                        {editClientBillingType === "fixed_monthly" && (
                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "work.monthlyRateRetainer", "Monthly Rate Retainer ($)")}
                            <input
                              type="number"
                              value={editClientMonthlyRate ?? ""}
                              onChange={(e) => setEditClientMonthlyRate(Number(e.target.value) || undefined)}
                              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-1.5 text-zinc-100 focus:outline-none"
                            />
                          </label>
                        )}

                        {editClientBillingType === "hourly" && (
                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "work.hourlyRateRetainer", "Hourly Rate Retainer ($/hr)")}
                            <input
                              type="number"
                              value={editClientHourlyRate ?? ""}
                              onChange={(e) => setEditClientHourlyRate(Number(e.target.value) || undefined)}
                              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-1.5 text-zinc-100 focus:outline-none"
                            />
                          </label>
                        )}

                        {editClientBillingType !== "non_billable" && (
                          <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                            {t(language, "work.billingCurrency", "Billing Currency")}
                            <select
                              value={editClientCurrency}
                              onChange={(e) => setEditClientCurrency(e.target.value as Currency)}
                              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-1.5 text-zinc-100 focus:outline-none"
                            >
                              <option value="USD">USD</option>
                              <option value="PYG">PYG</option>
                            </select>
                          </label>
                        )}

                        <label className="grid gap-2 font-semibold text-zinc-400 uppercase tracking-wider">
                          {t(language, "work.internalNotes", "Internal Notes")}
                          <textarea
                            rows={2}
                            value={editClientNotes}
                            onChange={(e) => setEditClientNotes(e.target.value)}
                            className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-100 focus:outline-none"
                          />
                        </label>

                        <div className="flex gap-2 justify-end border-t border-[#27272a] pt-3">
                          <button
                            type="button"
                            onClick={() => handleSaveClientEdit(client.id)}
                            className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2 font-bold uppercase tracking-wider transition"
                          >
                            {t(language, "work.saveChanges", "Save changes")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingClientId(null)}
                            className="rounded-lg border border-[#27272a] bg-zinc-800 hover:bg-zinc-700 px-4 py-2 font-bold uppercase tracking-wider text-zinc-300 transition"
                          >
                            {t(language, "common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-zinc-100 text-lg leading-snug">
                                {client.name}
                              </h3>
                              <span className="rounded bg-zinc-900 border border-[#27272a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-400">
                                {clientTypeLabel(client.type)}
                              </span>
                              <span className="rounded bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-500 capitalize">
                                {t(language, `work.clientStatus.${client.status}`, client.status)}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">
                              {t(language, "work.difficultyPrefix", "Difficulty")}:{" "}
                              <span className={getDifficultyColor(client.difficulty)}>
                                {difficultyLabel(client.difficulty)}
                              </span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartEditingClient(client)}
                            className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                          >
                            {t(language, "work.edit", "Edit")}
                          </button>
                        </div>

                        <div className="rounded-lg bg-[#121214] border border-[#27272a]/80 p-3 text-xs leading-5">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-none mb-1">
                            {t(language, "work.arrangementDetails", "Arrangement details")}
                          </p>
                          <p className="font-semibold text-zinc-200">
                            {client.billingType === "non_billable" ? t(language, "work.nonBillableProfile", "Non-billable personal profile") : `${t(language, "work.retainerRate", "Retainer Rate")}: ${clientRateFormatted}`}
                          </p>
                        </div>

                        {client.notes && (
                          <div className="text-xs text-zinc-400 bg-[#121214]/40 border border-[#27272a]/60 p-3 rounded-lg leading-relaxed">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">{t(language, "work.internalNotes", "Internal Notes")}</span>
                            {client.notes}
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-8 text-xs text-zinc-500 italic text-center col-span-2">
                {t(language, "work.emptyClients", "No clients added yet. Complete form to build client base.")}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

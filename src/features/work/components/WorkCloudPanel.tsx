"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAtlasAuth } from "@/lib/auth";
import { todayISO } from "@/lib/tasks";
import { useAtlasSettings } from "@/lib/settings";
import {
  createCloudClient,
  createCloudWorkItem,
  listCloudClients,
  listCloudWorkItems,
} from "@/lib/supabase/work";
import { t } from "@/lib/i18n";
import type { Client, ClientDraft, WorkItem, WorkItemDraft } from "@/types/atlas";

type CloudAction =
  | "load"
  | "create-client"
  | "create-item"
  | "upload-client"
  | "upload-item"
  | null;

type WorkCloudPanelProps = {
  localClients: Client[];
  localWorkItems: WorkItem[];
};

function getSelectedItem<T extends { id: string }>(
  items: T[],
  selectedId: string,
) {
  const fallbackId = selectedId || items[0]?.id || "";
  return items.find((item) => item.id === fallbackId) ?? null;
}

function getClientName(clients: Client[], clientId: string | undefined, fallback: string) {
  return clients.find((client) => client.id === clientId)?.name ?? fallback;
}

export function WorkCloudPanel({
  localClients,
  localWorkItems,
}: WorkCloudPanelProps) {
  const auth = useAtlasAuth();
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const [cloudClients, setCloudClients] = useState<Client[]>([]);
  const [cloudWorkItems, setCloudWorkItems] = useState<WorkItem[]>([]);
  const [hasLoadedCloudWork, setHasLoadedCloudWork] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedWorkItemId, setSelectedWorkItemId] = useState("");
  const [activeAction, setActiveAction] = useState<CloudAction>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedClient = getSelectedItem(localClients, selectedClientId);
  const selectedWorkItem = getSelectedItem(localWorkItems, selectedWorkItemId);
  const selectedClientValue = selectedClient?.id ?? "";
  const selectedWorkItemValue = selectedWorkItem?.id ?? "";

  const cloudClientMap = useMemo(
    () => new Map(cloudClients.map((client) => [client.id, client.name])),
    [cloudClients],
  );

  async function handleLoadCloudWork() {
    setActiveAction("load");
    setMessage("");
    setError("");

    try {
      const [clientsResult, itemsResult] = await Promise.all([
        listCloudClients(),
        listCloudWorkItems(),
      ]);

      if (clientsResult.ok) {
        setCloudClients(clientsResult.data);
      }

      if (itemsResult.ok) {
        setCloudWorkItems(itemsResult.data);
      }

      if (clientsResult.ok || itemsResult.ok) {
        setHasLoadedCloudWork(true);
      }

      if (!clientsResult.ok) {
        setError(clientsResult.error);
      } else if (!itemsResult.ok) {
        setError(itemsResult.error);
      } else {
        setMessage(t(language, "cloud.work.loadedMessage"));
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateTestCloudClient() {
    setActiveAction("create-client");
    setMessage("");
    setError("");

    const testClient: ClientDraft = {
      name: "Atlas Cloud Work POC",
      type: "Personal Project",
      status: "active",
      difficulty: "medium",
      defaultRate: 25,
      notes: t(language, "cloud.work.testClientNotes"),
      billingType: "per_item",
      monthlyRate: undefined,
      hourlyRate: undefined,
      currency: "USD",
    };

    try {
      const result = await createCloudClient(testClient);

      if (result.ok && result.data) {
        setCloudClients((current) => [result.data as Client, ...current]);
        setHasLoadedCloudWork(true);
        setMessage(t(language, "cloud.work.createdClientMessage"));
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateTestCloudWorkItem() {
    setActiveAction("create-item");
    setMessage("");
    setError("");

    const testWorkItem: WorkItemDraft = {
      clientId: cloudClients[0]?.id ?? "",
      title: "Atlas Cloud Work Item POC",
      description: t(language, "cloud.work.testItemDescription"),
      type: "Video",
      status: "planned",
      priority: "medium",
      difficulty: "medium",
      estimatedMinutes: 45,
      deadline: todayISO(),
      plannedDate: todayISO(),
      value: 25,
      currency: "USD",
      notes: "Manual cloud work item created for Supabase Work testing only.",
      referenceUrl: "",
    };

    try {
      const result = await createCloudWorkItem(testWorkItem);

      if (result.ok && result.data) {
        setCloudWorkItems((current) => [result.data as WorkItem, ...current]);
        setHasLoadedCloudWork(true);
        setMessage(t(language, "cloud.work.createdItemMessage"));
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleUploadSelectedClient() {
    if (!selectedClient) {
      setError(t(language, "cloud.chooseLocalWorkClient"));
      return;
    }

    const confirmed = window.confirm(
      t(
        language,
        "cloud.work.confirmClient",
        "Upload this selected local client copy to Supabase Cloud Work? This sends client name, type, billing mode, rates, currency, difficulty, and notes. The local client will remain unchanged.",
      ),
    );

    if (!confirmed) {
      return;
    }

    setActiveAction("upload-client");
    setMessage("");
    setError("");

    try {
      const result = await createCloudClient(selectedClient);

      if (result.ok && result.data) {
        setCloudClients((current) => [result.data as Client, ...current]);
        setHasLoadedCloudWork(true);
        setMessage(t(language, "cloud.uploadedWorkClient"));
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleUploadSelectedWorkItem() {
    if (!selectedWorkItem) {
      setError(t(language, "cloud.chooseLocalWorkItem"));
      return;
    }

    const confirmed = window.confirm(
      t(
        language,
        "cloud.work.confirmItem",
        "Upload this selected local work item copy to Supabase Cloud Work? This sends title, description, type, status, priority, difficulty, dates, value, reference link, and notes. Local client links are not preserved unless already cloud UUIDs. The local work item will remain unchanged.",
      ),
    );

    if (!confirmed) {
      return;
    }

    setActiveAction("upload-item");
    setMessage("");
    setError("");

    try {
      const result = await createCloudWorkItem(selectedWorkItem);

      if (result.ok && result.data) {
        setCloudWorkItems((current) => [result.data as WorkItem, ...current]);
        setHasLoadedCloudWork(true);
        setMessage(t(language, "cloud.uploadedWorkItem"));
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
              {t(language, "cloud.work.title")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localWork")}
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F97A9]">
              {t(language, "cloud.work.title")}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localWork")}
            </p>
            <p className="mt-1 text-xs leading-6 text-zinc-500">
              {t(language, "cloud.work.signIn")}
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
    <section className="mt-6 rounded-xl border border-[#6F8799]/25 bg-[#18181b] p-6 shadow-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F97A9]">
            {t(language, "cloud.work.title")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {t(language, "cloud.work.available")}
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">
            {t(language, "common.manualCloudPreview")}.{" "}
            {t(language, "common.cloudDataSeparate")}
          </p>
        </div>
        <span className="w-fit rounded-full border border-[#8A9A5B]/25 bg-[#8A9A5B]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9AAB6B]">
          {t(language, "settings.accountSync.signedIn")}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleLoadCloudWork}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "load"
              ? t(language, "common.loading")
              : t(language, "cloud.loadWork")}
          </button>
          <button
            type="button"
            onClick={handleCreateTestCloudClient}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#6F8799]/25 bg-[#6F8799]/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-sky-300 transition hover:bg-[#6F8799]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create-client"
              ? t(language, "common.creating")
              : t(language, "cloud.createWorkClient")}
          </button>
          <button
            type="button"
            onClick={handleCreateTestCloudWorkItem}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#6F8799]/25 bg-[#6F8799]/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-sky-300 transition hover:bg-[#6F8799]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create-item"
              ? t(language, "common.creating")
              : t(language, "cloud.createWorkItem")}
          </button>
        </div>

        <button
          type="button"
          disabled
          className="rounded-lg border border-[#27272a] bg-[#121214]/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 opacity-60"
        >
          {t(language, "cloud.uploadAllWork")}
          <span className="ml-2 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400">
            {t(language, "common.comingSoon")}
          </span>
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            {t(language, "cloud.uploadWorkClient")}
            <select
              value={selectedClientValue}
              onChange={(event) => setSelectedClientId(event.target.value)}
              disabled={localClients.length === 0 || activeAction !== null}
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-[#6F8799]/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {localClients.length === 0 ? (
                <option value="">{t(language, "cloud.noLocalWorkClients")}</option>
              ) : (
                localClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {t(language, `work.billing.${client.billingType ?? "per_item"}`, client.billingType ?? "per_item")}
                  </option>
                ))
              )}
            </select>
          </label>
          <button
            type="button"
            onClick={handleUploadSelectedClient}
            disabled={!selectedClient || activeAction !== null}
            className="self-end rounded-lg border border-[#C8A96A]/25 bg-[#C8A96A]/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#D4B87A] transition hover:bg-[#C8A96A]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "upload-client"
              ? t(language, "common.uploading")
              : t(language, "cloud.uploadWorkClient")}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            {t(language, "cloud.uploadWorkItem")}
            <select
              value={selectedWorkItemValue}
              onChange={(event) => setSelectedWorkItemId(event.target.value)}
              disabled={localWorkItems.length === 0 || activeAction !== null}
              className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-[#6F8799]/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {localWorkItems.length === 0 ? (
                <option value="">{t(language, "cloud.noLocalWorkItems")}</option>
              ) : (
                localWorkItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} - {getClientName(localClients, item.clientId, t(language, "work.noClient", "No client"))}
                  </option>
                ))
              )}
            </select>
          </label>
          <button
            type="button"
            onClick={handleUploadSelectedWorkItem}
            disabled={!selectedWorkItem || activeAction !== null}
            className="self-end rounded-lg border border-[#C8A96A]/25 bg-[#C8A96A]/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#D4B87A] transition hover:bg-[#C8A96A]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "upload-item"
              ? t(language, "common.uploading")
              : t(language, "cloud.uploadWorkItem")}
          </button>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg border border-[#8A9A5B]/30 bg-[#8A9A5B]/5 px-4 py-3 text-xs font-semibold text-[#9AAB6B]">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-[#B26A5B]/30 bg-[#B26A5B]/5 px-4 py-3 text-xs font-semibold text-[#E8E4DD]">
          {error}
        </p>
      ) : null}

      {hasLoadedCloudWork ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[#27272a] bg-[#121214] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {t(language, "cloud.work.clients")}
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-100">
                  {t(language, "common.manualCloudPreview")}
                </p>
              </div>
              <span className="rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {cloudClients.length} {t(language, "cloud.loaded", "loaded")}
              </span>
            </div>

            {cloudClients.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {cloudClients.map((client) => (
                  <article
                    key={client.id}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] p-4"
                  >
                    <h3 className="text-sm font-bold text-zinc-100">
                      {client.name}
                    </h3>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {t(language, `work.clientType.${client.type}`, client.type)} -{" "}
                      {t(language, `work.billing.${client.billingType ?? "per_item"}`, client.billingType ?? "per_item")}
                    </p>
                    {client.notes ? (
                      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-6 text-zinc-400">
                        {client.notes}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-[#27272a] bg-[#18181b] p-4 text-xs leading-6 text-zinc-500">
                {t(language, "cloud.work.emptyClients")}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#27272a] bg-[#121214] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {t(language, "cloud.work.items")}
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-100">
                  {t(language, "cloud.work.title")}
                </p>
              </div>
              <span className="rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {cloudWorkItems.length} {t(language, "cloud.loaded", "loaded")}
              </span>
            </div>

            {cloudWorkItems.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {cloudWorkItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          {cloudClientMap.get(item.clientId) ?? t(language, "work.noClient", "No client")} -{" "}
                          {t(language, `work.status.${item.status}`, item.status)}
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                        {t(language, `work.type.${item.type}`, item.type)}
                      </span>
                    </div>

                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {item.plannedDate || item.deadline || t(language, "calendar.noDate", "No date")} -{" "}
                      {item.estimatedMinutes ?? 0} {t(language, "common.minutes").toLowerCase()}
                    </p>

                    {item.description ? (
                      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-6 text-zinc-400">
                        {item.description}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-[#27272a] bg-[#18181b] p-4 text-xs leading-6 text-zinc-500">
                {t(language, "cloud.work.emptyItems")}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

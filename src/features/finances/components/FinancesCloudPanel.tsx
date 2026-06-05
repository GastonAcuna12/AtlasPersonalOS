"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAtlasAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/finances";
import { useAtlasSettings } from "@/lib/settings";
import {
  createCloudTransaction,
  listCloudTransactions,
} from "@/lib/supabase/finances";
import { t } from "@/lib/i18n";
import type { Currency, Transaction, TransactionDraft } from "@/types/atlas";

type CloudAction = "load" | "create-income" | "create-expense" | "upload" | null;

type FinancesCloudPanelProps = {
  localTransactions: Transaction[];
};

type CurrencyTotals = Record<Currency, { income: number; expense: number }>;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getSelectedTransaction(
  localTransactions: Transaction[],
  selectedTransactionId: string,
) {
  const selectedId = selectedTransactionId || localTransactions[0]?.id || "";
  return (
    localTransactions.find((transaction) => transaction.id === selectedId) ??
    null
  );
}

function getTotalsByOriginalCurrency(transactions: Transaction[]): CurrencyTotals {
  return transactions.reduce<CurrencyTotals>(
    (totals, transaction) => {
      totals[transaction.currency][transaction.type] += transaction.amount;
      return totals;
    },
    {
      PYG: { income: 0, expense: 0 },
      USD: { income: 0, expense: 0 },
    },
  );
}

export function FinancesCloudPanel({
  localTransactions,
}: FinancesCloudPanelProps) {
  const auth = useAtlasAuth();
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const [cloudTransactions, setCloudTransactions] = useState<Transaction[]>([]);
  const [hasLoadedCloudTransactions, setHasLoadedCloudTransactions] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [activeAction, setActiveAction] = useState<CloudAction>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedTransaction = getSelectedTransaction(
    localTransactions,
    selectedTransactionId,
  );
  const selectedTransactionValue = selectedTransaction?.id ?? "";
  const totals = useMemo(
    () => getTotalsByOriginalCurrency(cloudTransactions),
    [cloudTransactions],
  );

  async function handleLoadCloudTransactions() {
    setActiveAction("load");
    setMessage("");
    setError("");

    try {
      const result = await listCloudTransactions();

      if (result.ok) {
        setCloudTransactions(result.data);
        setHasLoadedCloudTransactions(true);
        setMessage(t(language, "cloud.finances.loadedMessage"));
      } else {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateTestCloudTransaction(type: "income" | "expense") {
    setActiveAction(type === "income" ? "create-income" : "create-expense");
    setMessage("");
    setError("");

    const testTransaction: TransactionDraft =
      type === "income"
        ? {
            type: "income",
            amount: 250000,
            currency: "PYG",
            category: "Salary",
            description: t(language, "cloud.finances.testIncomeDescription"),
            date: todayISO(),
            paymentMethod: "Bank Transfer",
            tag: "cloud-poc",
          }
        : {
            type: "expense",
            amount: 12,
            currency: "USD",
            category: "Food",
            description: t(language, "cloud.finances.testExpenseDescription"),
            date: todayISO(),
            paymentMethod: "Credit",
            tag: "cloud-poc",
          };

    try {
      const result = await createCloudTransaction(testTransaction);

      if (result.ok && result.data) {
        setCloudTransactions((current) => [
          result.data as Transaction,
          ...current,
        ]);
        setHasLoadedCloudTransactions(true);
        setMessage(
          type === "income"
            ? t(language, "cloud.finances.createdIncomeMessage")
            : t(language, "cloud.finances.createdExpenseMessage"),
        );
      } else if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleUploadSelectedTransaction() {
    if (!selectedTransaction) {
      setError(t(language, "cloud.chooseLocalFinanceTransaction"));
      return;
    }

    const confirmed = window.confirm(
      t(
        language,
        "cloud.finances.confirmUpload",
        "Upload this selected local transaction copy to Supabase Cloud Finances? This sends original amount, original currency, type, category, date, method, description, and tag. The local transaction will remain unchanged.",
      ),
    );

    if (!confirmed) {
      return;
    }

    setActiveAction("upload");
    setMessage("");
    setError("");

    try {
      const result = await createCloudTransaction(selectedTransaction);

      if (result.ok && result.data) {
        setCloudTransactions((current) => [
          result.data as Transaction,
          ...current,
        ]);
        setHasLoadedCloudTransactions(true);
        setMessage(t(language, "cloud.uploadedFinanceTransaction"));
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
              {t(language, "cloud.finances.title")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localFinances")}
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
              {t(language, "cloud.finances.title")}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              {t(language, "cloud.localFinances")}
            </p>
            <p className="mt-1 text-xs leading-6 text-zinc-500">
              {t(language, "cloud.finances.signIn")}
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
            {t(language, "cloud.finances.title")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {t(language, "cloud.finances.available")}
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">
            {t(language, "common.manualCloudPreview")}.{" "}
            {t(language, "common.cloudDataSeparate")}{" "}
            {t(language, "cloud.finances.noMixedSummary")}
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
            onClick={handleLoadCloudTransactions}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "load"
              ? t(language, "common.loading")
              : t(language, "cloud.loadFinanceTransactions")}
          </button>
          <button
            type="button"
            onClick={() => handleCreateTestCloudTransaction("income")}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#8A9A5B]/25 bg-[#8A9A5B]/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#A8B582] transition hover:bg-[#8A9A5B]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create-income"
              ? t(language, "common.creating")
              : t(language, "cloud.createFinanceIncome")}
          </button>
          <button
            type="button"
            onClick={() => handleCreateTestCloudTransaction("expense")}
            disabled={activeAction !== null}
            className="rounded-lg border border-[#B26A5B]/25 bg-[#B26A5B]/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#E8E4DD] transition hover:bg-[#B26A5B]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "create-expense"
              ? t(language, "common.creating")
              : t(language, "cloud.createFinanceExpense")}
          </button>
        </div>

        <button
          type="button"
          disabled
          className="rounded-lg border border-[#27272a] bg-[#121214]/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 opacity-60"
        >
          {t(language, "cloud.uploadAllFinanceTransactions")}
          <span className="ml-2 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400">
            {t(language, "common.comingSoon")}
          </span>
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          {t(language, "cloud.uploadFinanceTransaction")}
          <select
            value={selectedTransactionValue}
            onChange={(event) => setSelectedTransactionId(event.target.value)}
            disabled={localTransactions.length === 0 || activeAction !== null}
            className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-[#6F8799]/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {localTransactions.length === 0 ? (
              <option value="">
                {t(language, "cloud.noLocalFinanceTransactions")}
              </option>
            ) : (
              localTransactions.map((transaction) => (
                <option key={transaction.id} value={transaction.id}>
                  {transaction.date} - {transaction.description} -{" "}
                  {formatMoney(transaction.amount, transaction.currency)}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          onClick={handleUploadSelectedTransaction}
          disabled={!selectedTransaction || activeAction !== null}
          className="self-end rounded-lg border border-[#C8A96A]/25 bg-[#C8A96A]/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#D4B87A] transition hover:bg-[#C8A96A]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {activeAction === "upload"
            ? t(language, "common.uploading")
            : t(language, "cloud.uploadFinanceTransaction")}
        </button>
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

      {hasLoadedCloudTransactions ? (
        <div className="mt-6 rounded-xl border border-[#27272a] bg-[#121214] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "cloud.finances.title")}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {t(language, "common.manualCloudPreview")}
              </p>
            </div>
            <span className="w-fit rounded-full border border-[#27272a] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {cloudTransactions.length} {t(language, "cloud.loaded", "loaded")}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(["PYG", "USD"] as Currency[]).flatMap((currency) => [
              <div
                key={`${currency}-income`}
                className="rounded-lg border border-[#8A9A5B]/20 bg-[#8A9A5B]/5 p-3"
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#9AAB6B]">
                  {t(language, "cloud.finances.incomeOriginal")} {currency}
                </p>
                <p className="mt-1 text-sm font-bold text-zinc-100">
                  {formatMoney(totals[currency].income, currency)}
                </p>
              </div>,
              <div
                key={`${currency}-expense`}
                className="rounded-lg border border-[#B26A5B]/20 bg-[#B26A5B]/5 p-3"
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#E8E4DD]">
                  {t(language, "cloud.finances.expenseOriginal")} {currency}
                </p>
                <p className="mt-1 text-sm font-bold text-zinc-100">
                  {formatMoney(totals[currency].expense, currency)}
                </p>
              </div>,
            ])}
          </div>

          {cloudTransactions.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {cloudTransactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="rounded-lg border border-[#27272a] bg-[#18181b] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            transaction.type === "income"
                              ? "border-[#8A9A5B]/25 bg-[#8A9A5B]/10 text-[#9AAB6B]"
                              : "border-[#B26A5B]/25 bg-[#B26A5B]/10 text-[#E8E4DD]"
                          }`}
                        >
                          {transaction.type === "income"
                            ? t(language, "common.income")
                            : t(language, "common.expense")}
                        </span>
                        <span className="rounded-full border border-[#27272a] bg-[#121214] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                          {transaction.category}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-zinc-100">
                        {transaction.description}
                      </h3>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {transaction.date} - {transaction.paymentMethod}
                        {transaction.tag ? ` - #${transaction.tag}` : ""}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-black ${
                        transaction.type === "income"
                          ? "text-[#9AAB6B]"
                          : "text-zinc-100"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatMoney(transaction.amount, transaction.currency)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-[#27272a] bg-[#18181b] p-4 text-xs leading-6 text-zinc-500">
              {t(language, "cloud.finances.empty")}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

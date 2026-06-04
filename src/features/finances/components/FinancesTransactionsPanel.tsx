"use client";

import React, { useState, FormEvent, useMemo } from "react";
import { t } from "@/lib/i18n";
import { useXP } from "@/lib/xp";
import { formatMoney, PAYMENT_METHODS, useFinanceAccounts } from "@/lib/finances";
import { useAtlasSettings } from "@/lib/settings";
import type { Currency, PaymentMethod, TransactionDraft, Transaction, TransactionType } from "@/types/atlas";
import { generateFinanceCsv, downloadCSV } from "@/lib/exports/financeCsv";

interface FinancesTransactionsPanelProps {
  language: "en" | "es";
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  categories: string[];
  addTransaction: (draft: TransactionDraft) => Transaction;
  deleteTransaction: (id: string) => void;
  filters: {
    month: string;
    type: "all" | TransactionType;
    category: string;
    currency: "all" | Currency;
  };
  setFilters: React.Dispatch<
    React.SetStateAction<{
      month: string;
      type: "all" | TransactionType;
      category: string;
      currency: "all" | Currency;
    }>
  >;
}

const initialDraft: TransactionDraft = {
  type: "expense",
  amount: 0,
  currency: "PYG",
  category: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "Debit",
  tag: "",
};

const quickExamples: TransactionDraft[] = [
  {
    type: "expense",
    amount: 65000,
    currency: "PYG",
    category: "Food",
    description: "Lunch and groceries",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "Debit",
    tag: "daily",
  },
  {
    type: "expense",
    amount: 12,
    currency: "USD",
    category: "Entertainment",
    description: "Streaming subscription",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "Credit",
    tag: "subscription",
  },
  {
    type: "income",
    amount: 4500000,
    currency: "PYG",
    category: "Salary",
    description: "Monthly salary",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "Bank Transfer",
    tag: "work",
  },
];

export function FinancesTransactionsPanel({
  language,
  transactions,
  filteredTransactions,
  categories,
  addTransaction,
  deleteTransaction,
  filters,
  setFilters,
}: FinancesTransactionsPanelProps) {
  const xp = useXP();
  const { accounts } = useFinanceAccounts();
  const { settings } = useAtlasSettings();

  const activeAccounts = useMemo(() => accounts.filter((acc) => acc.isActive), [accounts]);
  const defaultAccount = useMemo(() => {
    if (!settings.defaultFinanceAccountId) return undefined;
    return activeAccounts.find((acc) => acc.id === settings.defaultFinanceAccountId);
  }, [activeAccounts, settings.defaultFinanceAccountId]);

  function getInitialAccountId() {
    if (activeAccounts.length === 1) return activeAccounts[0].id;
    if (activeAccounts.length > 1 && defaultAccount) return defaultAccount.id;
    return undefined;
  }

  const [draft, setDraft] = useState<TransactionDraft>(() => ({
    ...initialDraft,
    accountId: activeAccounts.length === 1
      ? activeAccounts[0].id
      : (activeAccounts.length > 1 && settings.defaultFinanceAccountId && activeAccounts.some(a => a.id === settings.defaultFinanceAccountId)
        ? settings.defaultFinanceAccountId
        : undefined),
  }));

  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");

  const canUseQuickTemplates = useMemo(() => {
    if (activeAccounts.length === 0) return true;
    if (activeAccounts.length === 1) return true;
    if (activeAccounts.length > 1 && defaultAccount) return true;
    if (draft.accountId) return true;
    return false;
  }, [activeAccounts, defaultAccount, draft.accountId]);

  function updateDraft<Value extends keyof TransactionDraft>(key: Value, value: TransactionDraft[Value]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validateTransaction(transaction: TransactionDraft) {
    if (!transaction.amount || transaction.amount <= 0) {
      return t(language, "finances.errorAmount", "Enter an amount greater than 0.");
    }
    if (!transaction.category.trim()) {
      return t(language, "finances.errorCategory", "Choose or enter a category.");
    }
    if (!transaction.description.trim()) {
      return t(language, "finances.errorDescription", "Add a short description.");
    }
    if (!transaction.date) {
      return t(language, "finances.errorDate", "Choose a transaction date.");
    }
    if (activeAccounts.length > 0 && !transaction.accountId) {
      return t(language, "finances.accounts.errorSelectRequired", "Please select an account.");
    }
    return "";
  }

  function saveTransaction(transaction: TransactionDraft) {
    const validationMessage = validateTransaction(transaction);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    addTransaction({
      ...transaction,
      category: transaction.category.trim(),
      description: transaction.description.trim(),
      tag: transaction.tag?.trim(),
    });

    xp.awardXP("finance-transaction", {
      amount: 10,
      label: "Added finance transaction",
    });
    setDraft({
      ...initialDraft,
      date: new Date().toISOString().slice(0, 10),
      accountId: getInitialAccountId(),
    });
    setError("");
    setShowAddForm(false);
  }

  function handleQuickExampleClick(ex: TransactionDraft) {
    if (!canUseQuickTemplates) {
      setError(t(language, "finances.accounts.errorSelectRequired", "Please select an account."));
      return;
    }

    const targetAccountId = draft.accountId || (activeAccounts.length === 1 ? activeAccounts[0].id : (defaultAccount ? defaultAccount.id : undefined));

    saveTransaction({
      ...ex,
      accountId: targetAccountId,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveTransaction(draft);
  }

  function handleExportCurrentView() {
    if (filteredTransactions.length === 0) {
      alert(t(language, "finances.transactions.exportNoData", "No transactions to export"));
      return;
    }
    try {
      const csv = generateFinanceCsv(filteredTransactions, accounts, language);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `atlas-finances-transactions-filtered-${date}.csv`);
    } catch (e) {
      console.error(e);
      alert(t(language, "finances.transactions.exportFailed", "Export failed"));
    }
  }

  function handleExportAll() {
    if (transactions.length === 0) {
      alert(t(language, "finances.transactions.exportNoData", "No transactions to export"));
      return;
    }
    try {
      const csv = generateFinanceCsv(transactions, accounts, language);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `atlas-finances-transactions-${date}.csv`);
    } catch (e) {
      console.error(e);
      alert(t(language, "finances.transactions.exportFailed", "Export failed"));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr] items-start animate-fade-in-up">
      {/* Left Column: Form Toggle and Collapsible Form */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => {
            if (!showAddForm) {
              setDraft((curr) => ({
                ...curr,
                accountId: getInitialAccountId(),
              }));
            }
            setShowAddForm(!showAddForm);
          }}
          className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center"
        >
          {showAddForm ? t(language, "goals.closeForm", "Close Form") : t(language, "finances.addTransaction", "+ Add Transaction")}
        </button>

        {showAddForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl flex flex-col gap-4.5 animate-fade-in-up"
          >
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-[#27272a] pb-2 mb-1">
              {t(language, "finances.newTransaction", "New Transaction")}
            </p>

            <div className="grid grid-cols-2 gap-3.5">
              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "common.type")}
                <select
                  value={draft.type}
                  onChange={(event) => updateDraft("type", event.target.value as TransactionType)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                >
                  <option value="expense">{t(language, "common.expense")}</option>
                  <option value="income">{t(language, "common.income")}</option>
                </select>
              </label>

              <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "goals.currency", "Currency")}
                <select
                  value={draft.currency}
                  onChange={(event) => updateDraft("currency", event.target.value as Currency)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                >
                  <option value="PYG">PYG</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            {/* Account Selector */}
            {activeAccounts.length > 0 && (
              <div className="grid gap-2 animate-fade-in-up">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{t(language, "finances.accounts.single", "Account")} *</span>
                  {activeAccounts.length === 1 && (
                    <span className="text-[10px] text-zinc-550 lowercase italic">
                      ({t(language, "finances.accounts.autoSelected", "auto-selected")})
                    </span>
                  )}
                </label>
                
                {activeAccounts.length === 1 ? (
                  <div className="rounded-lg border border-[#27272a] bg-[#121214]/60 px-3.5 py-2.5 text-zinc-350 text-sm font-medium">
                    {activeAccounts[0].name} ({activeAccounts[0].currency})
                  </div>
                ) : (
                  <select
                    value={draft.accountId || ""}
                    onChange={(event) => updateDraft("accountId", event.target.value || undefined)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                    required
                  >
                    <option value="" disabled>
                      -- {t(language, "finances.accounts.select", "Select account")} --
                    </option>
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({t(language, `finances.accounts.type.${acc.type}`, acc.type)}) [{acc.currency}] {acc.institution ? `· ${acc.institution}` : ""}
                      </option>
                    ))}
                  </select>
                )}

                {/* Currency mismatch warning */}
                {(() => {
                  if (!draft.accountId) return null;
                  const selectedAcc = activeAccounts.find((a) => a.id === draft.accountId);
                  if (selectedAcc && selectedAcc.currency !== draft.currency) {
                    return (
                      <p className="text-[10px] font-semibold text-[#C8A96A] bg-[#C8A96A]/5 border-[#C8A96A]/10 p-2 rounded leading-normal mt-0.5 animate-fade-in-up">
                        ⚠️ {t(language, "finances.accounts.currencyMismatch", "Transaction currency differs from account currency.")}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {activeAccounts.length === 0 && (
              <p className="text-[10px] font-medium text-zinc-550 italic leading-normal">
                ℹ️ {t(language, "finances.accounts.saveWithoutAccount", "This transaction will be saved without an account.")}{" "}
                {t(language, "finances.accounts.createPrompt", "Create an account to organize transactions.")}
              </p>
            )}

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "goals.amount", "Amount *")}
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.amount || ""}
                onChange={(event) => updateDraft("amount", Number(event.target.value))}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-[#C8A96A] focus:outline-none"
                required
              />
            </label>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.categoryRequired", "Category *")}
              <input
                type="text"
                list="categories-list"
                value={draft.category}
                onChange={(event) => updateDraft("category", event.target.value)}
                placeholder={t(language, "finances.selectCategory", "Select category")}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-[#C8A96A] focus:outline-none cursor-pointer w-full block transition-colors duration-200 hover:border-zinc-750"
                required
              />
              <datalist id="categories-list">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.descriptionMemo", "Description / memo")}
              <input
                type="text"
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-[#C8A96A] focus:outline-none"
                required
              />
            </label>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "common.date")}
              <input
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft("date", event.target.value)}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.method", "Method")}
              <select
                value={draft.paymentMethod}
                onChange={(event) => updateDraft("paymentMethod", event.target.value as PaymentMethod)}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.optionalTag", "Optional tag")}
              <input
                type="text"
                placeholder="e.g. rent, groceries"
                value={draft.tag || ""}
                onChange={(event) => updateDraft("tag", event.target.value)}
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-[#C8A96A] focus:outline-none"
              />
            </label>

            {error && <p className="text-[#C27A6B] text-xs font-semibold">{error}</p>}

            <button
              type="submit"
              className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full"
            >
              {t(language, "finances.saveTransaction", "Save Transaction")}
            </button>

            <div className="border-t border-[#27272a] pt-4 mt-1.5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5">
                {t(language, "finances.quickExamples", "Quick examples")}
              </p>
              <div className="flex flex-col gap-2">
                {activeAccounts.length > 1 && !defaultAccount && !draft.accountId && (
                  <p className="text-[10px] text-[#C8A96A] font-semibold mb-2.5 italic">
                    ⚠️ {t(language, "finances.accounts.errorSelectRequired", "Select an account to enable quick examples.")}
                  </p>
                )}
                {quickExamples.map((ex, index) => {
                  const isDisabled = activeAccounts.length > 1 && !defaultAccount && !draft.accountId;
                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleQuickExampleClick(ex)}
                      className={`flex items-center justify-between text-left rounded-lg border border-[#27272a] bg-[#121214] p-2.5 transition ${
                        isDisabled ? "opacity-45 cursor-not-allowed border-dashed" : "hover:bg-[#121214]/80"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-zinc-300 leading-snug">{ex.description}</p>
                        <p className="text-[9px] text-zinc-500 font-semibold uppercase mt-0.5 tracking-wider">
                          {ex.category} &middot; {ex.paymentMethod}
                        </p>
                      </div>
                      <span className={`text-xs font-bold ${ex.type === "income" ? "text-[#8A9A5B]" : "text-zinc-400"}`}>
                        {ex.type === "income" ? "+" : "-"}
                        {formatMoney(ex.amount, ex.currency)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Right Column: Filters and List */}
      <div className="grid gap-6">
        {/* Filtering Ledgers */}
        <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-450 border-b border-[#27272a] pb-2 mb-4">
            {t(language, "finances.filterRecords", "Filter Transaction Records")}
          </h3>
          <div className="grid gap-4.5 md:grid-cols-3">
            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "common.type")}
              <select
                value={filters.type}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    type: event.target.value as "all" | TransactionType,
                  }))
                }
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:outline-none"
              >
                <option value="all">{t(language, "common.all")}</option>
                <option value="income">{t(language, "common.income")}</option>
                <option value="expense">{t(language, "common.expense")}</option>
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "finances.category", "Category")}
              <select
                value={filters.category}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:outline-none"
              >
                <option value="all">{t(language, "common.all")}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t(language, "goals.currency", "Currency")}
              <select
                value={filters.currency}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    currency: event.target.value as "all" | Currency,
                  }))
                }
                className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:outline-none"
              >
                <option value="all">{t(language, "common.all")}</option>
                <option value="PYG">PYG</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>

          {/* Local-only CSV Export */}
          <div className="border-t border-[#27272a] mt-6 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleExportCurrentView}
                className="rounded-lg border border-[#27272a] bg-[#121214] hover:bg-[#18181b] hover:border-zinc-700 text-zinc-200 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition flex items-center gap-2"
              >
                📥 {t(language, "finances.transactions.exportCurrent", "Export current view")}
              </button>
              <button
                type="button"
                onClick={handleExportAll}
                className="rounded-lg border border-[#27272a] bg-[#121214] hover:bg-[#18181b] hover:border-zinc-700 text-zinc-300 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition flex items-center gap-2"
              >
                🗂️ {t(language, "finances.transactions.exportAll", "Export all transactions")}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed">
              🔒 {t(language, "finances.transactions.exportPrivacyNote", "CSV exports are generated locally in your browser.")}
            </p>
          </div>
        </section>

        {/* Transactions list history */}
        <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-450 border-b border-[#27272a] pb-2 mb-4">
            {t(language, "finances.ledgerTransactions", "Ledger Transactions")}
          </h3>
          <div className="grid gap-3.5 max-h-[400px] overflow-y-auto pr-1">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="grid gap-4 rounded-lg border border-[#27272a] bg-[#121214]/60 p-4 md:grid-cols-[1fr_auto] items-center hover:bg-[#121214] transition"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-zinc-150 text-sm leading-snug">{transaction.description}</p>
                      <span className="rounded bg-zinc-900 border border-[#27272a] px-2 py-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {transaction.category}
                      </span>
                      {transaction.tag && (
                        <span className="text-[10px] text-[#C8A96A] font-bold uppercase tracking-wider">
                          #{transaction.tag}
                        </span>
                      )}
                      
                      {/* Account Link Badge */}
                      {(() => {
                        if (!transaction.accountId) {
                          return (
                            <span className="rounded bg-zinc-900/60 border border-[#27272a]/60 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                              {t(language, "finances.accounts.legacy", "Legacy")}
                            </span>
                          );
                        }
                        const acc = accounts.find((a) => a.id === transaction.accountId);
                        if (!acc) {
                          return (
                            <span className="rounded bg-zinc-900/60 border border-[#B26A5B]/25 px-1.5 py-0.5 text-[9px] font-bold text-[#C27A6B] uppercase tracking-wider">
                              {t(language, "finances.accounts.unlinked", "Unlinked")}
                            </span>
                          );
                        }
                        return (
                          <span 
                            className="rounded px-1.5 py-0.5 text-[9px] font-bold text-zinc-350 border border-zinc-700/60 bg-zinc-800/20 uppercase tracking-wider"
                            title={`${acc.name} (${acc.currency})`}
                          >
                            💼 {acc.name}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {transaction.date} &middot; {t(language, "finances.paidVia", "Paid via")} {transaction.paymentMethod}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 md:justify-end">
                    <p
                      className={`font-bold text-sm tracking-tight ${
                        transaction.type === "income" ? "text-[#8A9A5B]" : "text-zinc-200"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatMoney(transaction.amount, transaction.currency)}
                    </p>
                    <button
                      type="button"
                      onClick={() => deleteTransaction(transaction.id)}
                      className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#C27A6B] transition hover:bg-[#B26A5B]/10 hover:border-[#B26A5B]/20"
                    >
                      {t(language, "common.delete")}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-6 text-xs text-zinc-500 italic text-center">
                {t(language, "finances.empty", "No transaction records found matching active filter.")}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

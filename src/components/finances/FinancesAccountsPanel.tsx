"use client";

import React, { useState, useMemo, FormEvent } from "react";
import { t } from "@/lib/i18n";
import {
  formatMoney,
  useFinanceAccounts,
  FINANCE_ACCOUNT_TYPES,
  useTransactions,
  calculateFinanceAccountSummaries,
  isSpendableFinanceAccount,
  convertToBase,
  getSavingsInBaseCurrency,
  useSavings,
} from "@/lib/finances";
import type { Currency, FinanceAccount, FinanceAccountType } from "@/types/atlas";
import { useAtlasSettings } from "@/lib/settings";

interface FinancesAccountsPanelProps {
  language: "en" | "es";
}

const initialDraft = {
  name: "",
  type: "bank" as FinanceAccountType,
  currency: "PYG" as Currency,
  initialBalance: 0,
  institution: "",
  notes: "",
};

export function FinancesAccountsPanel({ language }: FinancesAccountsPanelProps) {
  const {
    accounts,
    createFinanceAccount,
    updateFinanceAccount,
    archiveFinanceAccount,
  } = useFinanceAccounts();

  const { settings, updateSettings } = useAtlasSettings();
  const defaultAccountId = settings.defaultFinanceAccountId;

  const { transactions } = useTransactions();
  const { savings } = useSavings();

  const [showPreview, setShowPreview] = useState(false);

  const handleArchive = (id: string) => {
    archiveFinanceAccount(id, true);
    if (defaultAccountId === id) {
      updateSettings({ defaultFinanceAccountId: undefined });
    }
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");

  // Memoized filters and stats
  const activeAccounts = useMemo(() => accounts.filter((acc) => acc.isActive), [accounts]);
  const inactiveAccounts = useMemo(() => accounts.filter((acc) => !acc.isActive), [accounts]);

  // Compute derived balance summaries for all accounts using settings.usdToPygRate
  const summaries = useMemo(() => {
    const exchangeRate = settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150;
    return calculateFinanceAccountSummaries(accounts, transactions, exchangeRate);
  }, [accounts, transactions, settings.usdToPygRate, settings.exchangeRateUsdToPyg]);

  // Compute inactive accounts linked transactions diagnostic
  const hasInactiveLinkedTransactions = useMemo(() => {
    const inactiveIds = new Set(inactiveAccounts.map((acc) => acc.id));
    return transactions.some((t) => t.accountId && inactiveIds.has(t.accountId));
  }, [transactions, inactiveAccounts]);

  // Preview data for opt-in switch comparison
  const previewData = useMemo(() => {
    const exchangeRate = settings.usdToPygRate || settings.exchangeRateUsdToPyg || 6150;
    const baseCurrency = settings.baseCurrency || "PYG";
    
    // 1. Legacy Available Money
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, baseCurrency, exchangeRate), 0);
    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, baseCurrency, exchangeRate), 0);
    const legacyAvailableMoney = totalIncome - totalExpenses - (savings ? getSavingsInBaseCurrency(savings, baseCurrency, exchangeRate) : 0);

    // 2. Spendable Accounts Total
    const activeSpendable = activeAccounts.filter(isSpendableFinanceAccount);
    const spendableAccountsTotal = activeSpendable.reduce((sum, acc) => {
      const summary = summaries.find((s) => s.accountId === acc.id);
      const balance = summary ? summary.derivedBalance : acc.initialBalance;
      return sum + convertToBase(balance, acc.currency, baseCurrency, exchangeRate);
    }, 0);

    // 3. Legacy/Unlinked Transactions Total
    const legacyTransactions = transactions.filter(
      (t) => !t.accountId || !accounts.some((acc) => acc.id === t.accountId)
    );
    const legacyIncome = legacyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, baseCurrency, exchangeRate), 0);
    const legacyExpense = legacyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, baseCurrency, exchangeRate), 0);
    const legacyUnlinkedTotal = legacyIncome - legacyExpense;

    // 4. Savings
    const reservedSavings = savings ? getSavingsInBaseCurrency(savings, baseCurrency, exchangeRate) : 0;

    // 5. Account-aware Available Money
    const accountAwareAvailableMoney = spendableAccountsTotal + legacyUnlinkedTotal - reservedSavings;

    return {
      legacyAvailableMoney,
      accountAwareAvailableMoney,
      difference: accountAwareAvailableMoney - legacyAvailableMoney,
      spendableAccountsTotal,
      legacyUnlinkedTotal,
      reservedSavings,
      baseCurrency,
    };
  }, [accounts, activeAccounts, summaries, transactions, settings.baseCurrency, settings.usdToPygRate, settings.exchangeRateUsdToPyg, savings]);

  // Summarize derived balances grouped by currency for active accounts
  const currencyTotals = useMemo(() => {
    const totals: Record<Currency, number> = { PYG: 0, USD: 0 };
    activeAccounts.forEach((acc) => {
      const summary = summaries.find((s) => s.accountId === acc.id);
      if (summary) {
        totals[acc.currency] += summary.derivedBalance;
      }
    });
    return totals;
  }, [activeAccounts, summaries]);

  // Count unlinked transactions
  const unlinkedCount = useMemo(() => {
    return transactions.filter((t) => !t.accountId).length;
  }, [transactions]);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError(t(language, "finances.accounts.errorNameEmpty", "Enter an account name."));
      return;
    }

    createFinanceAccount({
      name: draft.name.trim(),
      type: draft.type,
      currency: draft.currency,
      initialBalance: draft.initialBalance,
      institution: draft.institution.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    });

    setDraft(initialDraft);
    setError("");
    setShowAddForm(false);
  };

  const handleUpdate = (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    if (!draft.name.trim()) {
      setError(t(language, "finances.accounts.errorNameEmpty", "Enter an account name."));
      return;
    }

    updateFinanceAccount(editingId, {
      name: draft.name.trim(),
      type: draft.type,
      currency: draft.currency,
      initialBalance: draft.initialBalance,
      institution: draft.institution.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    });

    setDraft(initialDraft);
    setError("");
    setEditingId(null);
  };

  const startEdit = (acc: FinanceAccount) => {
    setEditingId(acc.id);
    setDraft({
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      initialBalance: acc.initialBalance,
      institution: acc.institution || "",
      notes: acc.notes || "",
    });
    setShowAddForm(false);
  };

  const cancelAction = () => {
    setDraft(initialDraft);
    setError("");
    setShowAddForm(false);
    setEditingId(null);
  };

  const getAccountTypeLabel = (type: FinanceAccountType): string => {
    return t(language, `finances.accounts.type.${type}`, type);
  };

  const getAccountIcon = (type: FinanceAccountType): string => {
    switch (type) {
      case "cash":
        return "💵";
      case "bank":
        return "🏦";
      case "wallet":
        return "📱";
      case "credit_card":
        return "💳";
      case "savings":
        return "🐷";
      case "investment":
        return "📈";
      default:
        return "📁";
    }
  };

  return (
    <div className="grid gap-6 animate-fade-in-up">
      {/* Foundation Explanation Banner */}
      <div className="rounded-xl border border-[#C8A96A]/10 bg-[#C8A96A]/[0.02] p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">ℹ️</span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A96A]">
              {t(language, "finances.accounts.title", "Accounts")} Foundation
            </h4>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              {t(language, "finances.accounts.helpNote", "Accounts help you organize where your money is stored. Transaction linking comes next.")}
            </p>
            <p className="text-[10px] text-zinc-550 mt-0.5 leading-relaxed font-semibold">
              ⚠️ {t(language, "finances.accounts.foundationNotice", "This is an organizational foundation; transactions are not linked to accounts yet.")}
            </p>
          </div>
        </div>
      </div>

      {/* Account Aware Available Money Opt-In Switch */}
      {accounts.length > 0 && (
        <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <label className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-zinc-350 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.availableMoneyMode === "account_aware"}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setShowPreview(true);
                    } else {
                      updateSettings({ availableMoneyMode: "legacy" });
                      setShowPreview(false);
                    }
                  }}
                  className="rounded border-[#27272a] bg-[#121214] text-[#C8A96A] focus:ring-[#C8A96A] w-4 h-4 cursor-pointer"
                />
                {t(language, "finances.accounts.availableMoneyModeLabel", "Use account-based Available Money")}
              </label>
              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                {t(language, "finances.accounts.availableMoneyModeWarning", "Activate this only after your account initial balances are correct. Legacy transactions without accounts will still be counted separately.")}
              </p>
            </div>
          </div>

          {/* Preview Overlay / Comparison */}
          {showPreview && settings.availableMoneyMode !== "account_aware" && (
            <div className="rounded-lg border border-[#C8A96A]/20 bg-[#C8A96A]/[0.01] p-4.5 flex flex-col gap-3.5 animate-fade-in-up">
              <h4 className="text-xs font-bold text-[#C8A96A] uppercase tracking-widest border-b border-[#27272a]/60 pb-1.5">
                {t(language, "finances.accounts.previewTitle", "Preview Available Money Switch")}
              </h4>
              
              <div className="grid gap-3.5 sm:grid-cols-3 text-xs">
                <div className="rounded border border-[#27272a] bg-[#121214] p-3 text-zinc-400">
                  <p className="text-[9px] font-semibold text-zinc-550 uppercase tracking-wider">
                    {t(language, "finances.accounts.previewLegacy", "Legacy Available Money")}
                  </p>
                  <p className="text-sm font-bold text-zinc-300 mt-1">
                    {formatMoney(previewData.legacyAvailableMoney, previewData.baseCurrency)}
                  </p>
                </div>
                
                <div className="rounded border border-[#27272a] bg-[#121214] p-3 text-zinc-400">
                  <p className="text-[9px] font-semibold text-zinc-550 uppercase tracking-wider">
                    {t(language, "finances.accounts.previewAccountAware", "Account-Aware Available Money")}
                  </p>
                  <p className="text-sm font-bold text-zinc-100 mt-1">
                    {formatMoney(previewData.accountAwareAvailableMoney, previewData.baseCurrency)}
                  </p>
                </div>

                <div className="rounded border border-[#27272a] bg-[#121214] p-3 text-zinc-450">
                  <p className="text-[9px] font-semibold text-zinc-550 uppercase tracking-wider">
                    {t(language, "finances.accounts.previewDifference", "Difference")}
                  </p>
                  <p className={`text-sm font-bold mt-1 ${previewData.difference >= 0 ? "text-[#8A9A5B]" : "text-[#B26A5B]"}`}>
                    {previewData.difference >= 0 ? "+" : ""}
                    {formatMoney(previewData.difference, previewData.baseCurrency)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-[10px] text-zinc-400 border-t border-[#27272a]/45 pt-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-semibold uppercase">{t(language, "finances.accounts.previewSpendableTotal", "Spendable Accounts Total")}:</span>
                  <span className="font-bold text-zinc-300">{formatMoney(previewData.spendableAccountsTotal, previewData.baseCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-semibold uppercase">{t(language, "finances.accounts.previewLegacyTotal", "Legacy/Unlinked Transactions Total")}:</span>
                  <span className="font-bold text-zinc-300">{formatMoney(previewData.legacyUnlinkedTotal, previewData.baseCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-semibold uppercase">{t(language, "finances.tabs.savings", "Savings")}:</span>
                  <span className="font-bold text-zinc-300">-{formatMoney(previewData.reservedSavings, previewData.baseCurrency)}</span>
                </div>
              </div>

              <div className="flex gap-2.5 mt-2 border-t border-[#27272a]/30 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    const confirmSwitch = window.confirm(
                      `${t(language, "finances.accounts.switchConfirmTitle", "Switch to account-based Available Money?")}\n\n${t(
                        language,
                        "finances.accounts.switchConfirmDesc",
                        "This changes how your available money is calculated. It will use spendable account balances plus legacy unlinked transactions, minus reserved savings."
                      )}`
                    );
                    if (confirmSwitch) {
                      updateSettings({ availableMoneyMode: "account_aware" });
                      setShowPreview(false);
                    }
                  }}
                  className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  {t(language, "common.save", "Save")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] hover:bg-zinc-800 text-zinc-300 px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  {t(language, "common.cancel", "Cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback warning if account_aware is enabled but there are no spendable accounts */}
      {settings.availableMoneyMode === "account_aware" && activeAccounts.filter(isSpendableFinanceAccount).length === 0 && (
        <div className="rounded-xl border border-[#B26A5B]/25 bg-[#B26A5B]/5 p-4.5 text-[11px] text-[#C27A6B] flex items-start gap-3 shadow-md">
          <span className="text-base mt-0.5">⚠️</span>
          <p className="leading-relaxed font-semibold">
            {t(
              language,
              "finances.accounts.fallbackWarning",
              "Account-aware mode is enabled, but no spendable accounts exist yet."
            )}
          </p>
        </div>
      )}

      {/* Inactive accounts warning if active and has transactions */}
      {hasInactiveLinkedTransactions && (
        <div className="rounded-xl border border-[#C8A96A]/20 bg-[#C8A96A]/[0.02] p-4.5 text-[11px] text-[#C8A96A] flex items-start gap-3 shadow-md">
          <span className="text-base mt-0.5">⚠️</span>
          <p className="leading-relaxed font-semibold">
            {t(
              language,
              "finances.accounts.inactiveLinkedWarning",
              "Some linked transactions belong to inactive accounts and are not counted in spendable money."
            )}
          </p>
        </div>
      )}

      {/* Legacy bucket banner if unlinked transactions exist */}
      {unlinkedCount > 0 && (
        <div className="rounded-xl border border-[#27272a] bg-[#18181b]/45 p-4.5 text-[11px] text-zinc-400 flex items-start gap-3 shadow-md">
          <span className="text-base mt-0.5">📁</span>
          <div>
            <p className="leading-relaxed">
              {t(
                language,
                "finances.accounts.legacyFootnote",
                "Legacy transactions without an account are still counted in global finance totals, but not in account balances."
              )}
            </p>
            <p className="mt-1 font-bold text-[9px] text-zinc-500 uppercase tracking-wider">
              {t(language, "finances.accounts.unlinkedCount", "Unlinked transactions")}: {unlinkedCount}
            </p>
          </div>
        </div>
      )}

      {/* Currency Summaries Row */}
      {activeAccounts.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2">
          {Object.entries(currencyTotals).map(([currency, total]) => (
            <div
              key={currency}
              className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-md flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {t(language, "finances.accounts.currentBalance", "Current balance")} ({currency})
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-zinc-100">
                  {formatMoney(total, currency as Currency)}
                </p>
              </div>
              <span className="text-3xl opacity-20">💰</span>
            </div>
          ))}
        </section>
      )}

      {/* Create / Edit Form and List split */}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr] items-start">
        {/* Left Column: CTA and Form */}
        <div className="flex flex-col gap-4">
          {!showAddForm && !editingId && (
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center cursor-pointer"
            >
              + {t(language, "finances.accounts.new", "New Account")}
            </button>
          )}

          {(showAddForm || editingId) && (
            <form
              onSubmit={editingId ? handleUpdate : handleCreate}
              className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl flex flex-col gap-4 animate-fade-in-up"
            >
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-[#27272a] pb-2">
                {editingId
                  ? t(language, "finances.accounts.edit", "Edit Account")
                  : t(language, "finances.accounts.new", "New Account")}
              </p>

              {/* Name */}
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "common.title", "Name")} *
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Banco Atlas, Cash Wallet"
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                  required
                />
              </label>

              {/* Institution */}
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.accounts.institution", "Institution")}
                <input
                  type="text"
                  value={draft.institution}
                  onChange={(e) => setDraft({ ...draft, institution: e.target.value })}
                  placeholder="e.g. Banco Familiar, Personal Wallet"
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-[#C8A96A] focus:outline-none"
                />
              </label>

              {/* Grid: Type and Currency */}
              <div className="grid grid-cols-2 gap-3.5">
                <label className="grid gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "finances.accounts.type", "Account Type")}
                  <select
                    value={draft.type}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as FinanceAccountType })}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                  >
                    {FINANCE_ACCOUNT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {getAccountTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "goals.currency", "Currency")}
                  <select
                    value={draft.currency}
                    onChange={(e) => setDraft({ ...draft, currency: e.target.value as Currency })}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-[#C8A96A] focus:outline-none"
                  >
                    <option value="PYG">PYG</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              {/* Initial Balance */}
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "finances.accounts.initialBalance", "Initial Balance")}
                <input
                  type="number"
                  step="0.01"
                  value={draft.initialBalance || ""}
                  onChange={(e) => setDraft({ ...draft, initialBalance: Number(e.target.value) })}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-[#C8A96A] focus:outline-none"
                />
              </label>

              {/* Notes */}
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "common.notes", "Notes")}
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder={t(language, "finances.accounts.notesPlaceholder", "Additional details...")}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-[#C8A96A] focus:outline-none resize-none h-16"
                />
              </label>

              {error && <p className="text-[#C27A6B] text-xs font-semibold">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition flex-1 cursor-pointer"
                >
                  {t(language, "common.save", "Save")}
                </button>
                <button
                  type="button"
                  onClick={cancelAction}
                  className="rounded-lg border border-[#27272a] bg-[#121214] hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition flex-1 cursor-pointer"
                >
                  {t(language, "common.cancel", "Cancel")}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Account Cards Lists */}
        <div className="grid gap-6">
          {/* Active Accounts Grid */}
          <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-450 border-b border-[#27272a] pb-2 mb-4">
              {t(language, "finances.accounts.active", "Active Accounts")}
            </h3>
            {activeAccounts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {activeAccounts.map((acc) => {
                  const summary = summaries.find((s) => s.accountId === acc.id);
                  return (
                    <div
                      key={acc.id}
                      className="rounded-lg border border-[#27272a] bg-[#121214] p-4.5 flex flex-col justify-between shadow-sm transition hover:border-zinc-700 hover:shadow-md"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 border-b border-[#27272a]/45 pb-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg">{getAccountIcon(acc.type)}</span>
                            <div className="min-w-0">
                              <h4 className="font-bold text-zinc-200 text-sm truncate flex items-center gap-1.5 flex-wrap">
                                {acc.name}
                                {defaultAccountId === acc.id && (
                                  <span className="text-[9px] font-bold text-[#C8A96A] bg-[#C8A96A]/10 border border-[#C8A96A]/25 px-1 rounded flex items-center gap-0.5 shrink-0">
                                    ⭐ {t(language, "finances.accounts.default", "Default")}
                                  </span>
                                )}
                              </h4>
                              {acc.institution && (
                                <p className="text-[10px] text-zinc-555 font-medium truncate mt-0.5">
                                  {acc.institution}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 rounded bg-[#C8A96A]/10 border border-[#C8A96A]/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#C8A96A]">
                            {getAccountTypeLabel(acc.type)}
                          </span>
                        </div>

                        {/* Display Derived Balance */}
                        <div className="mb-3">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                            {t(language, "finances.accounts.currentBalance", "Current balance")}
                          </p>
                          <p className="mt-0.5 text-xl font-black text-zinc-100 tracking-tight">
                            {formatMoney(summary?.derivedBalance ?? acc.initialBalance, acc.currency)}
                          </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2.5 text-[10px] text-zinc-400 border-t border-[#27272a]/30 pt-2.5 mb-3">
                          <div>
                            <p className="text-[8px] font-semibold text-zinc-550 uppercase tracking-wider">
                              {t(language, "finances.accounts.initialBalance", "Initial balance")}
                            </p>
                            <p className="font-semibold text-zinc-250 mt-0.5">
                              {formatMoney(acc.initialBalance, acc.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-semibold text-zinc-550 uppercase tracking-wider">
                              {t(language, "finances.accounts.linkedTransactions", "Linked transactions")}
                            </p>
                            <p className="font-semibold text-zinc-250 mt-0.5">
                              {summary?.transactionCount ?? 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-semibold text-zinc-550 uppercase tracking-wider">
                              {t(language, "finances.accounts.linkedIncome", "Linked income")}
                            </p>
                            <p className="font-bold text-[#8A9A5B] mt-0.5">
                              +{formatMoney(summary?.linkedIncomeTotal ?? 0, acc.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-semibold text-zinc-550 uppercase tracking-wider">
                              {t(language, "finances.accounts.linkedExpenses", "Linked expenses")}
                            </p>
                            <p className="font-bold text-zinc-350 mt-0.5">
                              -{formatMoney(summary?.linkedExpenseTotal ?? 0, acc.currency)}
                            </p>
                          </div>
                        </div>

                        {/* Currency Mismatch Warning */}
                        {summary?.hasCurrencyMismatch && (
                          <p className="text-[9px] font-semibold text-[#C8A96A] bg-[#C8A96A]/5 border border-[#C8A96A]/10 p-1.5 rounded leading-normal mb-3">
                            ⚠️ {t(language, "finances.accounts.currencyMismatch", "Transaction currency differs from account currency.")}
                          </p>
                        )}

                        {/* Notes if present */}
                        {acc.notes && (
                          <p className="text-[10px] text-zinc-450 bg-[#18181b]/55 p-2 rounded border border-[#27272a]/30 mt-2 italic leading-relaxed truncate-2-lines">
                            {acc.notes}
                          </p>
                        )}

                        <p className="text-[8px] font-bold text-zinc-650 uppercase tracking-wider italic mt-2.5 mb-1.5">
                          * {t(language, "finances.accounts.derivedNotice", "Derived from linked transactions")}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex gap-3.5 border-t border-[#27272a]/45 pt-3 justify-end items-center">
                        {defaultAccountId !== acc.id && (
                          <button
                            onClick={() => updateSettings({ defaultFinanceAccountId: acc.id })}
                            className="text-[10px] font-bold uppercase tracking-wider text-[#C8A96A] hover:text-[#D4B87A] transition cursor-pointer"
                          >
                            {t(language, "finances.accounts.setDefault", "Set Default")}
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(acc)}
                          className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 hover:text-zinc-200 transition cursor-pointer"
                        >
                          {t(language, "common.edit", "Edit")}
                        </button>
                        <button
                          onClick={() => handleArchive(acc.id)}
                          className="text-[10px] font-bold uppercase tracking-wider text-[#B26A5B]/80 hover:text-[#C27A6B] transition cursor-pointer"
                        >
                          {t(language, "finances.accounts.archive", "Deactivate")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic py-4 text-center">
                {language === "es"
                  ? "Aún no hay cuentas activas registradas."
                  : "No active accounts registered yet."}
              </p>
            )}
          </section>

          {/* Inactive Accounts Panel */}
          {inactiveAccounts.length > 0 && (
            <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl opacity-60 hover:opacity-90 transition-opacity duration-200">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-[#27272a] pb-2 mb-4">
                {t(language, "finances.accounts.inactive", "Inactive Accounts")}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {inactiveAccounts.map((acc) => {
                  const summary = summaries.find((s) => s.accountId === acc.id);
                  return (
                    <div
                      key={acc.id}
                      className="rounded-lg border border-[#27272a]/70 bg-[#121214]/65 p-4.5 flex flex-col justify-between shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-[#27272a]/40 pb-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm opacity-50">{getAccountIcon(acc.type)}</span>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-zinc-400 text-sm truncate">{acc.name}</h4>
                              {acc.institution && (
                                <p className="text-[10px] text-zinc-555 truncate mt-0.5">
                                  {acc.institution}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 rounded bg-zinc-500/10 border border-zinc-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                            {getAccountTypeLabel(acc.type)}
                          </span>
                        </div>

                        {/* Display Derived Balance */}
                        <div className="mb-3">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                            {t(language, "finances.accounts.currentBalance", "Current balance")}
                          </p>
                          <p className="mt-0.5 text-base font-bold text-zinc-400 tracking-tight">
                            {formatMoney(summary?.derivedBalance ?? acc.initialBalance, acc.currency)}
                          </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[9px] text-zinc-500 border-t border-[#27272a]/20 pt-2 mb-3 opacity-80">
                          <div>
                            <p className="font-semibold text-zinc-650 uppercase tracking-wider">
                              {t(language, "finances.accounts.initialBalance", "Initial balance")}
                            </p>
                            <p className="font-semibold text-zinc-350 mt-0.5">
                              {formatMoney(acc.initialBalance, acc.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-650 uppercase tracking-wider">
                              {t(language, "finances.accounts.linkedTransactions", "Linked transactions")}
                            </p>
                            <p className="font-semibold text-zinc-350 mt-0.5">
                              {summary?.transactionCount ?? 0}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-650 uppercase tracking-wider">
                              {t(language, "finances.accounts.linkedIncome", "Linked income")}
                            </p>
                            <p className="font-semibold text-[#8A9A5B]/90 mt-0.5">
                              +{formatMoney(summary?.linkedIncomeTotal ?? 0, acc.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-650 uppercase tracking-wider">
                              {t(language, "finances.accounts.linkedExpenses", "Linked expenses")}
                            </p>
                            <p className="font-semibold text-zinc-400 mt-0.5">
                              -{formatMoney(summary?.linkedExpenseTotal ?? 0, acc.currency)}
                            </p>
                          </div>
                        </div>

                        {/* Currency Mismatch Warning */}
                        {summary?.hasCurrencyMismatch && (
                          <p className="text-[9px] font-semibold text-[#C8A96A]/70 bg-[#C8A96A]/5 border border-[#C8A96A]/10 p-1.5 rounded leading-normal mb-3">
                            ⚠️ {t(language, "finances.accounts.currencyMismatch", "Transaction currency differs from account currency.")}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex gap-2 border-t border-[#27272a]/40 pt-2.5 justify-end">
                        <button
                          onClick={() => archiveFinanceAccount(acc.id, false)}
                          className="text-[10px] font-bold uppercase tracking-wider text-[#C8A96A] hover:text-[#D4B87A] transition cursor-pointer"
                        >
                          {t(language, "finances.accounts.reactivate", "Reactivate")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

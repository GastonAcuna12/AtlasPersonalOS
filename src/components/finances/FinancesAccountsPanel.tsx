"use client";

import React, { useState, useMemo, FormEvent } from "react";
import { t } from "@/lib/i18n";
import { formatMoney, useFinanceAccounts, FINANCE_ACCOUNT_TYPES } from "@/lib/finances";
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

  // Summarize initial balance grouped by currency
  const currencyTotals = useMemo(() => {
    const totals: Record<Currency, number> = { PYG: 0, USD: 0 };
    activeAccounts.forEach((acc) => {
      totals[acc.currency] += acc.initialBalance;
    });
    return totals;
  }, [activeAccounts]);

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
      <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.02] p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">ℹ️</span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
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
                  {t(language, "finances.accounts.initialBalance", "Initial Balance")} ({currency})
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
              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition w-full shadow-md text-center cursor-pointer"
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
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
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
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>

              {/* Grid: Type and Currency */}
              <div className="grid grid-cols-2 gap-3.5">
                <label className="grid gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t(language, "finances.accounts.type", "Account Type")}
                  <select
                    value={draft.type}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as FinanceAccountType })}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
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
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
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
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm font-semibold focus:border-amber-500 focus:outline-none"
                />
              </label>

              {/* Notes */}
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t(language, "common.notes", "Notes")}
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder={t(language, "finances.accounts.notesPlaceholder", "Additional details...")}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-200 text-sm focus:border-amber-500 focus:outline-none resize-none h-16"
                />
              </label>

              {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition flex-1 cursor-pointer"
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
                {activeAccounts.map((acc) => (
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
                                <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/25 px-1 rounded flex items-center gap-0.5 shrink-0">
                                  ⭐ {t(language, "finances.accounts.default", "Default")}
                                </span>
                              )}
                            </h4>
                            {acc.institution && (
                              <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                                {acc.institution}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 rounded bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
                          {getAccountTypeLabel(acc.type)}
                        </span>
                      </div>

                      {/* Display Balance */}
                      <div className="mb-3">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                          {t(language, "finances.accounts.initialBalance", "Initial Balance")}
                        </p>
                        <p className="mt-0.5 text-lg font-black text-zinc-100 tracking-tight">
                          {formatMoney(acc.initialBalance, acc.currency)}
                        </p>
                      </div>

                      {/* Notes if present */}
                      {acc.notes && (
                        <p className="text-[10px] text-zinc-450 bg-[#18181b]/55 p-2 rounded border border-[#27272a]/30 mt-2 italic leading-relaxed truncate-2-lines">
                          {acc.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-3.5 border-t border-[#27272a]/45 pt-3 justify-end items-center">
                      {defaultAccountId !== acc.id && (
                        <button
                          onClick={() => updateSettings({ defaultFinanceAccountId: acc.id })}
                          className="text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 transition cursor-pointer"
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
                        className="text-[10px] font-bold uppercase tracking-wider text-rose-500/80 hover:text-rose-400 transition cursor-pointer"
                      >
                        {t(language, "finances.accounts.archive", "Deactivate")}
                      </button>
                    </div>
                  </div>
                ))}
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
                {inactiveAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="rounded-lg border border-[#27272a]/70 bg-[#121214]/65 p-4 flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 border-b border-[#27272a]/40 pb-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm opacity-50">{getAccountIcon(acc.type)}</span>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-zinc-400 text-sm truncate">{acc.name}</h4>
                            {acc.institution && (
                              <p className="text-[10px] text-zinc-550 truncate mt-0.5">
                                {acc.institution}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 rounded bg-zinc-500/10 border border-zinc-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                          {getAccountTypeLabel(acc.type)}
                        </span>
                      </div>

                      <div className="mb-2">
                        <p className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider">
                          {t(language, "finances.accounts.initialBalance", "Initial Balance")}
                        </p>
                        <p className="mt-0.5 text-base font-bold text-zinc-450 tracking-tight">
                          {formatMoney(acc.initialBalance, acc.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2 border-t border-[#27272a]/40 pt-2.5 justify-end">
                      <button
                        onClick={() => archiveFinanceAccount(acc.id, false)}
                        className="text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 transition cursor-pointer"
                      >
                        {t(language, "finances.accounts.reactivate", "Reactivate")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

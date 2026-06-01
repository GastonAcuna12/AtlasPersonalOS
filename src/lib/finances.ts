"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import type {
  Currency,
  FinanceFilters,
  PaymentMethod,
  SavingsState,
  Transaction,
  TransactionDraft,
} from "@/types/atlas";

export type {
  Currency,
  FinanceFilters,
  PaymentMethod,
  SavingsState,
  Transaction,
  TransactionDraft,
  TransactionType,
} from "@/types/atlas";

const INITIAL_TRANSACTIONS: Transaction[] = [];

const INITIAL_SAVINGS: SavingsState = {
  currentAmount: 0,
  currency: "PYG",
  updatedAt: "",
};

export const FINANCE_CATEGORIES = [
  "Salary",
  "Food",
  "Transport",
  "Housing",
  "Health",
  "Education",
  "Entertainment",
  "Savings",
  "Other",
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "Debit",
  "Credit",
  "Bank Transfer",
  "Other",
];

export function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeTransactions(value: unknown): Transaction[] {
  if (!Array.isArray(value)) {
    return INITIAL_TRANSACTIONS;
  }

  return value.map((transaction) => {
    const candidate =
      transaction && typeof transaction === "object"
        ? (transaction as Partial<Transaction>)
        : {};
    const now = new Date().toISOString();

    return {
      id:
        typeof candidate.id === "string"
          ? candidate.id
          : `${Date.now()}-transaction`,
      type: candidate.type === "income" ? "income" : "expense",
      amount:
        typeof candidate.amount === "number" && Number.isFinite(candidate.amount)
          ? candidate.amount
          : 0,
      currency: candidate.currency === "USD" ? "USD" : "PYG",
      category: candidate.category ?? "Other",
      description: candidate.description ?? "",
      date: candidate.date ?? now.slice(0, 10),
      paymentMethod: PAYMENT_METHODS.includes(
          candidate.paymentMethod as PaymentMethod,
        )
        ? (candidate.paymentMethod as PaymentMethod)
        : "Other",
      tag: candidate.tag ?? "",
      createdAt: candidate.createdAt ?? now,
    };
  });
}

function normalizeSavings(value: unknown): SavingsState {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<SavingsState>)
      : {};

  return {
    currentAmount:
      typeof candidate.currentAmount === "number" &&
      Number.isFinite(candidate.currentAmount)
        ? candidate.currentAmount
        : 0,
    currency: candidate.currency === "USD" ? "USD" : "PYG",
    updatedAt: candidate.updatedAt ?? INITIAL_SAVINGS.updatedAt,
  };
}

function readTransactions() {
  return readFromStorage(
    ATLAS_STORAGE_KEYS.transactions,
    INITIAL_TRANSACTIONS,
    normalizeTransactions,
  );
}

function saveTransactions(transactions: Transaction[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.transactions, transactions);
}

export function formatMoney(amount: number, currency: Currency) {
  const formattedNumber = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency === "PYG" ? 0 : 2,
    maximumFractionDigits: currency === "PYG" ? 0 : 2,
  }).format(amount);
  return `${currency} ${formattedNumber}`;
}

export function formatMoneyCompact(amount: number, currency: Currency) {
  const formattedNumber = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(amount);
  return `${currency} ${formattedNumber}`;
}

/**
 * Formats a date deterministically into 'en-US' locale using 'America/Asuncion' timezone
 * to prevent server-client hydration mismatch errors.
 */
export function formatDateStable(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Asuncion",
    }).format(d);
  } catch {
    // Fallback if environment timezone is not supported
    return d.toISOString().replace("T", " ").slice(0, 16);
  }
}

/**
 * Convert an amount to the base currency.
 * If the amount's currency already matches baseCurrency, returns as-is.
 */
export function convertToBase(
  amount: number,
  fromCurrency: Currency,
  baseCurrency: Currency,
  exchangeRateUsdToPyg: number,
): number {
  if (fromCurrency === baseCurrency) return amount;

  if (fromCurrency === "USD" && baseCurrency === "PYG") {
    return Math.round(amount * exchangeRateUsdToPyg);
  }

  if (fromCurrency === "PYG" && baseCurrency === "USD") {
    return Math.round((amount / exchangeRateUsdToPyg) * 100) / 100;
  }

  return amount;
}

export function filterTransactions(
  transactions: Transaction[],
  filters: FinanceFilters,
) {
  return transactions.filter((transaction) => {
    const matchesMonth = transaction.date.startsWith(filters.month);
    const matchesType =
      filters.type === "all" || transaction.type === filters.type;
    const matchesCategory =
      filters.category === "all" || transaction.category === filters.category;
    const matchesCurrency =
      filters.currency === "all" || transaction.currency === filters.currency;

    return matchesMonth && matchesType && matchesCategory && matchesCurrency;
  });
}

/**
 * Calculates finance overview by converting all transactions to the base currency,
 * isolating savings, and computing available money (totalBalance - savingsInBaseCurrency).
 */
export function calculateFinanceOverview(
  allTransactions: Transaction[],
  baseCurrency: Currency = "PYG",
  exchangeRateUsdToPyg: number = 6150,
  savings?: SavingsState,
  currentMonth?: string,
) {
  // 1. All-time ledger sum (Total Balance)
  const totalIncome = allTransactions
    .filter((t) => t.type === "income")
    .reduce(
      (sum, t) =>
        sum + convertToBase(t.amount, t.currency, baseCurrency, exchangeRateUsdToPyg),
      0,
    );
  const totalExpenses = allTransactions
    .filter((t) => t.type === "expense")
    .reduce(
      (sum, t) =>
        sum + convertToBase(t.amount, t.currency, baseCurrency, exchangeRateUsdToPyg),
      0,
    );
  const totalBalance = totalIncome - totalExpenses;

  // 2. Monthly transactions
  const activeMonth = currentMonth ?? getCurrentMonth();
  const monthlyTransactions = allTransactions.filter((t) => t.date.startsWith(activeMonth));

  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce(
      (sum, t) =>
        sum + convertToBase(t.amount, t.currency, baseCurrency, exchangeRateUsdToPyg),
      0,
    );
  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce(
      (sum, t) =>
        sum + convertToBase(t.amount, t.currency, baseCurrency, exchangeRateUsdToPyg),
      0,
    );
  const monthlyNet = monthlyIncome - monthlyExpenses;

  // 3. Savings
  const savingsAmount = savings ? savings.currentAmount : 0;
  const savingsInBaseCurrency = savings
    ? getSavingsInBaseCurrency(savings, baseCurrency, exchangeRateUsdToPyg)
    : 0;

  // 4. Available money
  const availableMoney = totalBalance - savingsInBaseCurrency;

  // 5. Category totals (monthly)
  const categoryTotals = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((totals, t) => {
      totals[t.category] =
        (totals[t.category] ?? 0) +
        convertToBase(t.amount, t.currency, baseCurrency, exchangeRateUsdToPyg);
      return totals;
    }, {});
  const biggestCategory = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const daysWithExpenses = new Set(
    monthlyTransactions
      .filter((t) => t.type === "expense")
      .map((t) => t.date),
  ).size;

  return {
    income: monthlyIncome, // backwards compatibility
    expenses: monthlyExpenses, // backwards compatibility
    balance: monthlyNet, // backwards compatibility
    savingsRate: monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0,
    biggestExpenseCategory: biggestCategory?.[0] ?? "None yet",
    dailyAverageSpending:
      daysWithExpenses > 0 ? Math.round((monthlyExpenses / daysWithExpenses) * 100) / 100 : 0,
    categoryTotals,
    baseCurrency,
    // Unified report properties:
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    monthlyNet,
    savingsAmount,
    savingsInBaseCurrency,
    availableMoney,
  };
}

/**
 * Returns a monthly finance summary in base currency.
 */
export function getMonthlyFinanceSummary(
  transactions: Transaction[],
  month: string,
  baseCurrency: Currency = "PYG",
  exchangeRateUsdToPyg: number = 6150,
) {
  const overview = calculateFinanceOverview(
    transactions,
    baseCurrency,
    exchangeRateUsdToPyg,
    undefined,
    month,
  );
  return {
    month,
    income: overview.monthlyIncome,
    expenses: overview.monthlyExpenses,
    net: overview.monthlyNet,
    savingsRate: overview.savingsRate,
    baseCurrency,
  };
}

export function buildFinanceInsights(
  transactions: Transaction[],
  baseCurrency: Currency = "PYG",
  exchangeRateUsdToPyg: number = 6150,
) {
  const overview = calculateFinanceOverview(
    transactions,
    baseCurrency,
    exchangeRateUsdToPyg,
  );
  const insights: string[] = [];

  if (overview.expenses > 0) {
    insights.push(
      `${overview.biggestExpenseCategory} is your biggest expense category this month.`,
    );
    insights.push(
      `You spend ${formatMoney(overview.dailyAverageSpending, baseCurrency)} on average on spending days.`,
    );
  }

  if (overview.income > 0) {
    insights.push(`Your savings rate is currently ${overview.savingsRate}%.`);
  }

  return insights.slice(0, 3);
}

/**
 * Returns savings amount converted to the given base currency.
 */
export function getSavingsInBaseCurrency(
  savings: SavingsState,
  baseCurrency: Currency,
  exchangeRateUsdToPyg: number,
): number {
  return convertToBase(
    savings.currentAmount,
    savings.currency,
    baseCurrency,
    exchangeRateUsdToPyg,
  );
}

export function useTransactions() {
  const transactions = useStoredValue(
    ATLAS_STORAGE_KEYS.transactions,
    INITIAL_TRANSACTIONS,
    normalizeTransactions,
  );

  const categories = useMemo(
    () =>
      Array.from(new Set([...FINANCE_CATEGORIES, ...transactions.map((t) => t.category)])).sort(),
    [transactions],
  );

  function addTransaction(draft: TransactionDraft) {
    const transaction: Transaction = {
      ...draft,
      id: `${Date.now()}-transaction`,
      createdAt: new Date().toISOString(),
    };

    saveTransactions([transaction, ...readTransactions()]);
    return transaction;
  }

  function deleteTransaction(id: string) {
    saveTransactions(
      readTransactions().filter((transaction) => transaction.id !== id),
    );
  }

  return {
    transactions,
    categories,
    addTransaction,
    deleteTransaction,
  };
}

export function useSavings() {
  const savings = useStoredValue(
    ATLAS_STORAGE_KEYS.savings,
    INITIAL_SAVINGS,
    normalizeSavings,
  );

  function updateSavings(amount: number, currency: Currency) {
    writeToStorage(ATLAS_STORAGE_KEYS.savings, {
      currentAmount: amount,
      currency,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    savings,
    updateSavings,
  };
}

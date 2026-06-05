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
  PlannedExpense,
  PlannedExpenseDraft,
  PlannedExpenseRecurrence,
  PlannedExpenseStatus,
  SavingsState,
  Transaction,
  TransactionDraft,
  FinanceBudget,
  FinanceBudgetDraft,
  FinanceAccount,
  FinanceAccountType,
} from "@/types/atlas";

export type {
  Currency,
  FinanceFilters,
  PaymentMethod,
  PlannedExpense,
  PlannedExpenseDraft,
  PlannedExpenseRecurrence,
  PlannedExpenseStatus,
  SavingsState,
  Transaction,
  TransactionDraft,
  TransactionType,
  FinanceBudget,
  FinanceBudgetDraft,
  FinanceAccount,
  FinanceAccountType,
} from "@/types/atlas";

const INITIAL_TRANSACTIONS: Transaction[] = [];
const INITIAL_PLANNED_EXPENSES: PlannedExpense[] = [];

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

export const PLANNED_EXPENSE_STATUSES: PlannedExpenseStatus[] = [
  "pending",
  "paid",
  "skipped",
  "cancelled",
];

export const PLANNED_EXPENSE_RECURRENCES: PlannedExpenseRecurrence[] = [
  "none",
  "monthly",
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
      accountId:
        typeof candidate.accountId === "string" && candidate.accountId.trim()
          ? candidate.accountId.trim()
          : undefined,
    };
  });
}

function normalizeDayOfMonth(value: unknown, dueDate: string) {
  const fallbackDay = Number(dueDate.slice(8, 10)) || 1;
  const candidate = typeof value === "number" ? value : fallbackDay;

  if (!Number.isFinite(candidate)) {
    return fallbackDay;
  }

  return Math.min(31, Math.max(1, Math.round(candidate)));
}

function normalizePlannedExpenses(value: unknown): PlannedExpense[] {
  if (!Array.isArray(value)) {
    return INITIAL_PLANNED_EXPENSES;
  }

  return value.map((expense) => {
    const candidate =
      expense && typeof expense === "object"
        ? (expense as Partial<PlannedExpense>)
        : {};
    const now = new Date().toISOString();
    const dueDate =
      typeof candidate.dueDate === "string" && candidate.dueDate
        ? candidate.dueDate
        : now.slice(0, 10);
    const recurrence: PlannedExpenseRecurrence =
      candidate.recurrence === "monthly" ? "monthly" : "none";
    const cashflowType = candidate.cashflowType === "income" ? "income" : "expense";
    const accountId =
      typeof candidate.accountId === "string" && candidate.accountId.trim()
        ? candidate.accountId.trim()
        : undefined;

    return {
      id:
        typeof candidate.id === "string"
          ? candidate.id
          : `${Date.now()}-planned-expense`,
      title:
        typeof candidate.title === "string" && candidate.title.trim()
          ? candidate.title
          : "Planned expense",
      amount:
        typeof candidate.amount === "number" &&
        Number.isFinite(candidate.amount) &&
        candidate.amount > 0
          ? candidate.amount
          : 0,
      currency: candidate.currency === "USD" ? "USD" : "PYG",
      category:
        typeof candidate.category === "string" && candidate.category.trim()
          ? candidate.category
          : "Other",
      dueDate,
      paymentMethod: PAYMENT_METHODS.includes(candidate.paymentMethod as PaymentMethod)
        ? (candidate.paymentMethod as PaymentMethod)
        : undefined,
      notes: typeof candidate.notes === "string" ? candidate.notes : "",
      status: PLANNED_EXPENSE_STATUSES.includes(candidate.status as PlannedExpenseStatus)
        ? (candidate.status as PlannedExpenseStatus)
        : "pending",
      recurrence,
      dayOfMonth:
        recurrence === "monthly"
          ? normalizeDayOfMonth(candidate.dayOfMonth, dueDate)
          : undefined,
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
      paidTransactionId:
        typeof candidate.paidTransactionId === "string"
          ? candidate.paidTransactionId
          : undefined,
      lastGeneratedForMonth:
        typeof candidate.lastGeneratedForMonth === "string"
          ? candidate.lastGeneratedForMonth
          : undefined,
      cashflowType,
      accountId,
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

export function readPlannedExpenses() {
  return readFromStorage(
    ATLAS_STORAGE_KEYS.plannedExpenses,
    INITIAL_PLANNED_EXPENSES,
    normalizePlannedExpenses,
  );
}

export function writePlannedExpenses(plannedExpenses: PlannedExpense[]) {
  writeToStorage(
    ATLAS_STORAGE_KEYS.plannedExpenses,
    normalizePlannedExpenses(plannedExpenses),
  );
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

function parseISODate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(Date.UTC(1970, 0, 1));
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetweenISO(startDate: string, endDate: string) {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);

  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function addMonthsToMonthKey(monthKey: string, monthsToAdd: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + monthsToAdd, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getDateForMonth(monthKey: string, dayOfMonth: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(lastDay, Math.max(1, Math.round(dayOfMonth)));

  return `${monthKey}-${String(safeDay).padStart(2, "0")}`;
}

function getMonthlyOccurrenceStatus(
  expense: PlannedExpense,
  occurrenceMonth: string,
): PlannedExpenseStatus {
  if (expense.status === "cancelled") {
    return "cancelled";
  }

  if (
    expense.lastGeneratedForMonth === occurrenceMonth &&
    (expense.status === "paid" || expense.status === "skipped")
  ) {
    return expense.status;
  }

  return "pending";
}

function getOccurrenceStatus(
  expense: PlannedExpense,
  occurrenceMonth: string,
): PlannedExpenseStatus {
  if (expense.recurrence === "monthly") {
    return getMonthlyOccurrenceStatus(expense, occurrenceMonth);
  }

  return expense.status;
}

export type PlannedExpenseOccurrence = PlannedExpense & {
  sourceExpenseId: string;
  occurrenceDueDate: string;
  occurrenceMonth: string;
  effectiveStatus: PlannedExpenseStatus;
  daysUntilDue: number;
  isOverdue: boolean;
  isDueSoon: boolean;
};

function buildPlannedExpenseOccurrence(
  expense: PlannedExpense,
  occurrenceDueDate: string,
  today: string,
  effectiveStatus: PlannedExpenseStatus,
): PlannedExpenseOccurrence {
  const daysUntilDue = daysBetweenISO(today, occurrenceDueDate);

  return {
    ...expense,
    sourceExpenseId: expense.id,
    occurrenceDueDate,
    occurrenceMonth: getMonthKey(occurrenceDueDate),
    effectiveStatus,
    daysUntilDue,
    isOverdue: daysUntilDue < 0,
    isDueSoon: daysUntilDue >= 0 && daysUntilDue <= 3,
  };
}

export function getUpcomingPlannedExpenses(
  plannedExpenses: PlannedExpense[],
  date = new Date().toISOString().slice(0, 10),
  horizonDays = 30,
) {
  const currentMonth = getMonthKey(date);
  const occurrences: PlannedExpenseOccurrence[] = [];

  plannedExpenses.forEach((expense) => {
    if (expense.status === "cancelled") {
      return;
    }

    if (expense.recurrence !== "monthly") {
      const daysUntilDue = daysBetweenISO(date, expense.dueDate);

      if (expense.status === "pending" && (daysUntilDue <= horizonDays || daysUntilDue < 0)) {
        occurrences.push(
          buildPlannedExpenseOccurrence(expense, expense.dueDate, date, "pending"),
        );
      }
      return;
    }

    for (let offset = 0; offset <= 2; offset += 1) {
      const occurrenceMonth = addMonthsToMonthKey(currentMonth, offset);
      const occurrenceDueDate = getDateForMonth(
        occurrenceMonth,
        expense.dayOfMonth ?? normalizeDayOfMonth(undefined, expense.dueDate),
      );
      const effectiveStatus = getOccurrenceStatus(expense, occurrenceMonth);
      const daysUntilDue = daysBetweenISO(date, occurrenceDueDate);

      if (effectiveStatus !== "pending") {
        continue;
      }

      if (daysUntilDue <= horizonDays || daysUntilDue < 0) {
        occurrences.push(
          buildPlannedExpenseOccurrence(
            expense,
            occurrenceDueDate,
            date,
            effectiveStatus,
          ),
        );
      }

      break;
    }
  });

  return occurrences.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.occurrenceDueDate.localeCompare(b.occurrenceDueDate);
  });
}

export function getPlannedExpenseOccurrencesForMonth(
  plannedExpenses: PlannedExpense[],
  year: number,
  monthIndex: number,
  today = new Date().toISOString().slice(0, 10),
) {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const occurrences: PlannedExpenseOccurrence[] = [];

  plannedExpenses.forEach((expense) => {
    if (expense.status === "cancelled") {
      return;
    }

    if (expense.recurrence === "monthly") {
      const occurrenceDueDate = getDateForMonth(
        monthKey,
        expense.dayOfMonth ?? normalizeDayOfMonth(undefined, expense.dueDate),
      );
      const effectiveStatus = getOccurrenceStatus(expense, monthKey);
      occurrences.push(
        buildPlannedExpenseOccurrence(
          expense,
          occurrenceDueDate,
          today,
          effectiveStatus,
        ),
      );
      return;
    }

    if (getMonthKey(expense.dueDate) === monthKey) {
      occurrences.push(
        buildPlannedExpenseOccurrence(
          expense,
          expense.dueDate,
          today,
          expense.status,
        ),
      );
    }
  });

  return occurrences.sort((a, b) =>
    a.occurrenceDueDate.localeCompare(b.occurrenceDueDate),
  );
}

export function calculateUpcomingCommitments(
  plannedExpenses: PlannedExpense[],
  availableMoney: number,
  baseCurrency: Currency = "PYG",
  exchangeRateUsdToPyg: number = 6150,
  date = new Date().toISOString().slice(0, 10),
) {
  const upcoming7Days = getUpcomingPlannedExpenses(plannedExpenses, date, 7);
  const upcoming30Days = getUpcomingPlannedExpenses(plannedExpenses, date, 30);
  
  const upcomingCommitments7Days = upcoming7Days
    .filter((expense) => expense.cashflowType !== "income")
    .reduce(
      (total, expense) =>
        total +
        convertToBase(
          expense.amount,
          expense.currency,
          baseCurrency,
          exchangeRateUsdToPyg,
        ),
      0,
    );
  const upcomingCommitments30Days = upcoming30Days
    .filter((expense) => expense.cashflowType !== "income")
    .reduce(
      (total, expense) =>
        total +
        convertToBase(
          expense.amount,
          expense.currency,
          baseCurrency,
          exchangeRateUsdToPyg,
        ),
      0,
    );

  const upcomingInflows7Days = upcoming7Days
    .filter((expense) => expense.cashflowType === "income")
    .reduce(
      (total, expense) =>
        total +
        convertToBase(
          expense.amount,
          expense.currency,
          baseCurrency,
          exchangeRateUsdToPyg,
        ),
      0,
    );
  const upcomingInflows30Days = upcoming30Days
    .filter((expense) => expense.cashflowType === "income")
    .reduce(
      (total, expense) =>
        total +
        convertToBase(
          expense.amount,
          expense.currency,
          baseCurrency,
          exchangeRateUsdToPyg,
        ),
      0,
    );

  return {
    upcomingCommitments7Days,
    upcomingCommitments30Days,
    upcomingInflows7Days,
    upcomingInflows30Days,
    safeToSpend7Days: availableMoney - upcomingCommitments7Days,
    safeToSpend30Days: availableMoney - upcomingCommitments30Days,
    upcoming7Days,
    upcoming30Days,
    nextPayment: upcoming30Days.find((expense) => expense.cashflowType !== "income") ?? null,
    overdueCount: upcoming30Days.filter((expense) => expense.isOverdue && expense.cashflowType !== "income").length,
  };
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

export function isSpendableFinanceAccount(account: FinanceAccount): boolean {
  // cash, bank, wallet, other are spendable daily funds
  // savings is excluded because it overlaps with reserved goals savings vault
  // investment is not daily spendable cash
  // credit_card is future liability / credit limit line
  return (
    account.type === "cash" ||
    account.type === "bank" ||
    account.type === "wallet" ||
    account.type === "other"
  );
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
  accounts?: FinanceAccount[],
  availableMoneyMode: "legacy" | "account_aware" = "legacy",
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

  // 4. Available money calculation
  let availableMoney = totalBalance - savingsInBaseCurrency;
  let isAccountAware = false;

  const activeSpendableAccounts = accounts
    ? accounts.filter((acc) => acc.isActive && isSpendableFinanceAccount(acc))
    : [];

  if (availableMoneyMode === "account_aware" && activeSpendableAccounts.length > 0) {
    isAccountAware = true;

    // Sum active spendable derived balances converted to base
    const spendableAccountBalanceBase = activeSpendableAccounts.reduce((sum, account) => {
      const derivedBalance = calculateFinanceAccountBalance(account, allTransactions, exchangeRateUsdToPyg);
      const converted = convertToBase(derivedBalance, account.currency, baseCurrency, exchangeRateUsdToPyg);
      return sum + converted;
    }, 0);

    // Legacy unlinked balance: transactions where accountId is missing, OR it points to an invalid/non-existent account ID
    const legacyTransactions = allTransactions.filter(
      (t) => !t.accountId || !accounts!.some((acc) => acc.id === t.accountId)
    );

    const legacyIncome = legacyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, baseCurrency, exchangeRateUsdToPyg), 0);

    const legacyExpense = legacyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, baseCurrency, exchangeRateUsdToPyg), 0);

    const legacyBalanceBase = legacyIncome - legacyExpense;

    availableMoney = spendableAccountBalanceBase + legacyBalanceBase - savingsInBaseCurrency;
  }

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
    isAccountAware,
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

function buildPlannedExpenseRecord(draft: PlannedExpenseDraft): PlannedExpense {
  const now = new Date().toISOString();
  const recurrence = draft.recurrence === "monthly" ? "monthly" : "none";
  const dueDate = draft.dueDate || now.slice(0, 10);

  return {
    id: `${Date.now()}-planned-expense`,
    title: draft.title.trim(),
    amount: draft.amount,
    currency: draft.currency,
    category: draft.category.trim(),
    dueDate,
    paymentMethod: draft.paymentMethod,
    notes: draft.notes?.trim() ?? "",
    status: "pending",
    recurrence,
    dayOfMonth:
      recurrence === "monthly"
        ? normalizeDayOfMonth(draft.dayOfMonth, dueDate)
        : undefined,
    createdAt: now,
    updatedAt: now,
    cashflowType: draft.cashflowType ?? "expense",
    accountId: draft.accountId,
  };
}

export function createPlannedExpense(draft: PlannedExpenseDraft) {
  const plannedExpense = buildPlannedExpenseRecord(draft);
  writePlannedExpenses([plannedExpense, ...readPlannedExpenses()]);

  return plannedExpense;
}

export function updatePlannedExpense(
  id: string,
  changes: Partial<PlannedExpenseDraft & Pick<PlannedExpense, "status">>,
) {
  const plannedExpenses = readPlannedExpenses();
  const updated = plannedExpenses.map((expense) => {
    if (expense.id !== id) {
      return expense;
    }

    const nextDueDate = changes.dueDate ?? expense.dueDate;
    const nextRecurrence =
      changes.recurrence ?? expense.recurrence;

    return {
      ...expense,
      ...changes,
      title: changes.title !== undefined ? changes.title.trim() : expense.title,
      category:
        changes.category !== undefined
          ? changes.category.trim()
          : expense.category,
      notes: changes.notes !== undefined ? changes.notes.trim() : expense.notes,
      recurrence: nextRecurrence,
      dayOfMonth:
        nextRecurrence === "monthly"
          ? normalizeDayOfMonth(changes.dayOfMonth ?? expense.dayOfMonth, nextDueDate)
          : undefined,
      updatedAt: new Date().toISOString(),
    };
  });

  writePlannedExpenses(updated);
}

export function deletePlannedExpense(id: string) {
  writePlannedExpenses(
    readPlannedExpenses().filter((expense) => expense.id !== id),
  );
}

export function skipPlannedExpense(id: string, occurrenceDueDate?: string) {
  const plannedExpenses = readPlannedExpenses();
  const updated = plannedExpenses.map((expense) => {
    if (expense.id !== id) {
      return expense;
    }

    const occurrenceMonth = getMonthKey(occurrenceDueDate ?? expense.dueDate);

    return {
      ...expense,
      status: "skipped" as PlannedExpenseStatus,
      lastGeneratedForMonth:
        expense.recurrence === "monthly"
          ? occurrenceMonth
          : expense.lastGeneratedForMonth,
      updatedAt: new Date().toISOString(),
    };
  });

  writePlannedExpenses(updated);
}

export function markPlannedExpensePaid(id: string, occurrenceDueDate?: string) {
  const plannedExpenses = readPlannedExpenses();
  const expense = plannedExpenses.find((item) => item.id === id);

  if (!expense || expense.status === "cancelled") {
    return null;
  }

  const paidDate = occurrenceDueDate ?? expense.dueDate;
  const occurrenceMonth = getMonthKey(paidDate);
  const alreadyPaid =
    expense.recurrence === "monthly"
      ? expense.lastGeneratedForMonth === occurrenceMonth &&
        expense.status === "paid" &&
        Boolean(expense.paidTransactionId)
      : expense.status === "paid" && Boolean(expense.paidTransactionId);

  if (alreadyPaid) {
    return null;
  }

  const transaction: Transaction = {
    id: `${Date.now()}-planned-expense-transaction`,
    type: expense.cashflowType === "income" ? "income" : "expense",
    amount: expense.amount,
    currency: expense.currency,
    category: expense.category,
    description: expense.title,
    date: paidDate,
    paymentMethod: expense.paymentMethod ?? "Other",
    tag: "planned",
    accountId: expense.accountId,
    createdAt: new Date().toISOString(),
  };

  saveTransactions([transaction, ...readTransactions()]);
  writePlannedExpenses(
    plannedExpenses.map((item) =>
      item.id === id
        ? {
            ...item,
            status: "paid",
            paidTransactionId: transaction.id,
            lastGeneratedForMonth:
              item.recurrence === "monthly"
                ? occurrenceMonth
                : item.lastGeneratedForMonth,
            updatedAt: new Date().toISOString(),
          }
        : item,
    ),
  );

  return transaction;
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

export function usePlannedExpenses() {
  const plannedExpenses = useStoredValue(
    ATLAS_STORAGE_KEYS.plannedExpenses,
    INITIAL_PLANNED_EXPENSES,
    normalizePlannedExpenses,
  );

  return {
    plannedExpenses,
    createPlannedExpense,
    updatePlannedExpense,
    deletePlannedExpense,
    markPlannedExpensePaid,
    skipPlannedExpense,
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

// --- Finance Budgets Logic ---

const INITIAL_BUDGETS: FinanceBudget[] = [];

function normalizeFinanceBudgets(value: unknown): FinanceBudget[] {
  if (!Array.isArray(value)) {
    return INITIAL_BUDGETS;
  }

  return value.map((budget, index) => {
    const candidate =
      budget && typeof budget === "object"
        ? (budget as Partial<FinanceBudget>)
        : {};
    const now = new Date().toISOString();

    return {
      id: typeof candidate.id === "string" ? candidate.id : `${Date.now()}-${index}-budget`,
      name: typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : "Budget",
      category: typeof candidate.category === "string" ? candidate.category : "Other",
      amount: typeof candidate.amount === "number" && Number.isFinite(candidate.amount) && candidate.amount > 0 ? candidate.amount : 0,
      currency: candidate.currency === "USD" ? "USD" : "PYG",
      period: "monthly",
      isActive: typeof candidate.isActive === "boolean" ? candidate.isActive : true,
      notes: typeof candidate.notes === "string" ? candidate.notes.trim() : "",
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
      warningThresholdPercent: typeof candidate.warningThresholdPercent === "number" && Number.isFinite(candidate.warningThresholdPercent) ? candidate.warningThresholdPercent : 80,
      rolloverEnabled: typeof candidate.rolloverEnabled === "boolean" ? candidate.rolloverEnabled : false,
      startMonth: typeof candidate.startMonth === "string" ? candidate.startMonth : "",
      endMonth: typeof candidate.endMonth === "string" ? candidate.endMonth : "",
    };
  });
}

export function readFinanceBudgets(): FinanceBudget[] {
  return readFromStorage(
    ATLAS_STORAGE_KEYS.financeBudgets,
    INITIAL_BUDGETS,
    normalizeFinanceBudgets,
  );
}

export function writeFinanceBudgets(budgets: FinanceBudget[]) {
  writeToStorage(
    ATLAS_STORAGE_KEYS.financeBudgets,
    normalizeFinanceBudgets(budgets),
  );
}

export function createFinanceBudget(draft: FinanceBudgetDraft) {
  const now = new Date().toISOString();
  const budget: FinanceBudget = {
    ...draft,
    id: `${Date.now()}-budget`,
    createdAt: now,
    updatedAt: now,
  };
  writeFinanceBudgets([budget, ...readFinanceBudgets()]);
  return budget;
}

export function updateFinanceBudget(
  id: string,
  changes: Partial<FinanceBudgetDraft & Pick<FinanceBudget, "isActive">>,
) {
  const budgets = readFinanceBudgets();
  const updated = budgets.map((budget) => {
    if (budget.id !== id) {
      return budget;
    }
    return {
      ...budget,
      ...changes,
      name: changes.name !== undefined ? changes.name.trim() : budget.name,
      category: changes.category !== undefined ? changes.category : budget.category,
      notes: changes.notes !== undefined ? changes.notes.trim() : budget.notes,
      updatedAt: new Date().toISOString(),
    };
  });
  writeFinanceBudgets(updated);
}

export function deleteFinanceBudget(id: string) {
  writeFinanceBudgets(
    readFinanceBudgets().filter((budget) => budget.id !== id),
  );
}

export function useFinanceBudgets() {
  const budgets = useStoredValue(
    ATLAS_STORAGE_KEYS.financeBudgets,
    INITIAL_BUDGETS,
    normalizeFinanceBudgets,
  );

  return {
    budgets,
    createFinanceBudget,
    updateFinanceBudget,
    deleteFinanceBudget,
  };
}

export function calculateBudgetUsage(
  budget: FinanceBudget,
  transactions: Transaction[],
  exchangeRateUsdToPyg: number,
  selectedMonth: string,
) {
  const matchingTransactions = transactions.filter(
    (t) =>
      t.type === "expense" &&
      t.category === budget.category &&
      t.date.startsWith(selectedMonth),
  );

  const spent = matchingTransactions.reduce((total, t) => {
    const convertedAmount = convertToBase(
      t.amount,
      t.currency,
      budget.currency,
      exchangeRateUsdToPyg,
    );
    return total + convertedAmount;
  }, 0);

  const remaining = budget.amount - spent;
  const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

  let status: "healthy" | "near_limit" | "over_budget" = "healthy";
  if (percentUsed >= 100) {
    status = "over_budget";
  } else if (percentUsed >= (budget.warningThresholdPercent ?? 80)) {
    status = "near_limit";
  }

  return {
    spent,
    remaining,
    percentUsed,
    status,
    matchingTransactions,
  };
}

export function calculateBudgetSummaryForMonth(
  budgets: FinanceBudget[],
  transactions: Transaction[],
  baseCurrency: Currency,
  exchangeRateUsdToPyg: number,
  selectedMonth: string,
) {
  const activeBudgets = budgets.filter((b) => b.isActive);
  let totalBudgetedInBase = 0;
  let totalSpentInBase = 0;
  let overBudgetCount = 0;
  let nearLimitCount = 0;

  activeBudgets.forEach((budget) => {
    const { spent, status } = calculateBudgetUsage(
      budget,
      transactions,
      exchangeRateUsdToPyg,
      selectedMonth,
    );

    totalBudgetedInBase += convertToBase(
      budget.amount,
      budget.currency,
      baseCurrency,
      exchangeRateUsdToPyg,
    );
    totalSpentInBase += convertToBase(
      spent,
      budget.currency,
      baseCurrency,
      exchangeRateUsdToPyg,
    );

    if (status === "over_budget") {
      overBudgetCount++;
    } else if (status === "near_limit") {
      nearLimitCount++;
    }
  });

  return {
    totalBudgetedInBase,
    totalSpentInBase,
    overBudgetCount,
    nearLimitCount,
    activeBudgetCount: activeBudgets.length,
  };
}

const INITIAL_ACCOUNTS: FinanceAccount[] = [];

export const FINANCE_ACCOUNT_TYPES: FinanceAccountType[] = [
  "cash",
  "bank",
  "wallet",
  "credit_card",
  "savings",
  "investment",
  "other",
];

export function normalizeFinanceAccounts(value: unknown): FinanceAccount[] {
  if (!Array.isArray(value)) {
    return INITIAL_ACCOUNTS;
  }

  return value.map((account) => {
    const candidate =
      account && typeof account === "object" ? (account as Partial<FinanceAccount>) : {};
    const now = new Date().toISOString();

    const accountType: FinanceAccountType = FINANCE_ACCOUNT_TYPES.includes(
      candidate.type as FinanceAccountType
    )
      ? (candidate.type as FinanceAccountType)
      : "other";

    return {
      id: typeof candidate.id === "string" ? candidate.id : `${Date.now()}-account-${Math.random().toString(36).substring(2, 9)}`,
      name: typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : "Unnamed Account",
      type: accountType,
      currency: candidate.currency === "USD" ? "USD" : "PYG",
      initialBalance: typeof candidate.initialBalance === "number" && Number.isFinite(candidate.initialBalance) ? candidate.initialBalance : 0,
      isActive: candidate.isActive !== false,
      color: typeof candidate.color === "string" ? candidate.color : undefined,
      icon: typeof candidate.icon === "string" ? candidate.icon : undefined,
      institution: typeof candidate.institution === "string" && candidate.institution.trim() ? candidate.institution.trim() : undefined,
      notes: typeof candidate.notes === "string" ? candidate.notes : undefined,
      createdAt: candidate.createdAt ?? now,
      updatedAt: candidate.updatedAt ?? now,
    };
  });
}

export function readFinanceAccounts(): FinanceAccount[] {
  return readFromStorage(
    ATLAS_STORAGE_KEYS.financeAccounts,
    INITIAL_ACCOUNTS,
    normalizeFinanceAccounts,
  );
}

export function writeFinanceAccounts(accounts: FinanceAccount[]) {
  writeToStorage(
    ATLAS_STORAGE_KEYS.financeAccounts,
    normalizeFinanceAccounts(accounts),
  );
}

export function createFinanceAccount(
  draft: Omit<FinanceAccount, "id" | "createdAt" | "updatedAt" | "isActive">
) {
  const now = new Date().toISOString();
  const account: FinanceAccount = {
    ...draft,
    id: `${Date.now()}-account-${Math.random().toString(36).substring(2, 9)}`,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  writeFinanceAccounts([account, ...readFinanceAccounts()]);
  return account;
}

export function updateFinanceAccount(
  id: string,
  changes: Partial<Omit<FinanceAccount, "id" | "createdAt">>
) {
  const accounts = readFinanceAccounts();
  const updated = accounts.map((acc) => {
    if (acc.id !== id) {
      return acc;
    }
    return {
      ...acc,
      ...changes,
      name: changes.name !== undefined ? changes.name.trim() : acc.name,
      institution: changes.institution !== undefined ? changes.institution.trim() : acc.institution,
      notes: changes.notes !== undefined ? changes.notes : acc.notes,
      updatedAt: new Date().toISOString(),
    };
  });
  writeFinanceAccounts(updated);
}

export function archiveFinanceAccount(id: string, archive = true) {
  const accounts = readFinanceAccounts();
  const updated = accounts.map((acc) => {
    if (acc.id !== id) {
      return acc;
    }
    return {
      ...acc,
      isActive: !archive,
      updatedAt: new Date().toISOString(),
    };
  });
  writeFinanceAccounts(updated);
}

export function deleteFinanceAccount(id: string) {
  const accounts = readFinanceAccounts();
  writeFinanceAccounts(accounts.filter((acc) => acc.id !== id));
}

export function useFinanceAccounts() {
  const accounts = useStoredValue(
    ATLAS_STORAGE_KEYS.financeAccounts,
    INITIAL_ACCOUNTS,
    normalizeFinanceAccounts,
  );

  return {
    accounts,
    createFinanceAccount,
    updateFinanceAccount,
    archiveFinanceAccount,
    deleteFinanceAccount,
  };
}

export function calculateFinanceAccountBalance(
  account: FinanceAccount,
  transactions: Transaction[],
  exchangeRateUsdToPyg: number,
): number {
  let balance = account.initialBalance;

  transactions.forEach((t) => {
    if (t.accountId !== account.id) {
      return;
    }

    const convertedAmount = convertToBase(
      t.amount,
      t.currency,
      account.currency,
      exchangeRateUsdToPyg,
    );

    if (t.type === "income") {
      balance += convertedAmount;
    } else {
      balance -= convertedAmount;
    }
  });

  return balance;
}

export function calculateFinanceAccountSummaries(
  accounts: FinanceAccount[],
  transactions: Transaction[],
  exchangeRateUsdToPyg: number,
) {
  return accounts.map((account) => {
    let derivedBalance = account.initialBalance;
    let linkedIncomeTotal = 0;
    let linkedExpenseTotal = 0;
    let transactionCount = 0;
    let hasCurrencyMismatch = false;

    transactions.forEach((t) => {
      if (t.accountId !== account.id) {
        return;
      }

      transactionCount++;
      if (t.currency !== account.currency) {
        hasCurrencyMismatch = true;
      }

      const convertedAmount = convertToBase(
        t.amount,
        t.currency,
        account.currency,
        exchangeRateUsdToPyg,
      );

      if (t.type === "income") {
        derivedBalance += convertedAmount;
        linkedIncomeTotal += convertedAmount;
      } else {
        derivedBalance -= convertedAmount;
        linkedExpenseTotal += convertedAmount;
      }
    });

    return {
      accountId: account.id,
      initialBalance: account.initialBalance,
      derivedBalance,
      linkedIncomeTotal,
      linkedExpenseTotal,
      transactionCount,
      currency: account.currency,
      hasCurrencyMismatch,
    };
  });
}


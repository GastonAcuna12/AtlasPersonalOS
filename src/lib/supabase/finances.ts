"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { readSyncState } from "@/lib/sync/state";
import type {
  Currency,
  PaymentMethod,
  Transaction,
  TransactionDraft,
  TransactionType,
} from "@/types/atlas";

const CLOUD_TRANSACTION_COLUMNS =
  "id,user_id,transaction_type,amount,currency,category,description,transaction_date,payment_method,tag,created_at,updated_at,deleted_at";

const TRANSACTION_TYPES: TransactionType[] = ["income", "expense"];
const CURRENCIES: Currency[] = ["PYG", "USD"];
const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "Debit",
  "Credit",
  "Bank Transfer",
  "Other",
];

export type CloudFinanceTransactionRow = {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  transaction_date: string;
  payment_method: string;
  tag: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudFinanceTransactionInsert = {
  user_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  transaction_date: string;
  payment_method: string;
  tag: string | null;
};

export type CloudFinanceTransactionUpdate = Partial<
  Pick<
    CloudFinanceTransactionRow,
    | "transaction_type"
    | "amount"
    | "currency"
    | "category"
    | "description"
    | "transaction_date"
    | "payment_method"
    | "tag"
    | "deleted_at"
  >
>;

export type CloudFinanceResult<T> =
  | {
      ok: true;
      data: T;
      message: string;
    }
  | {
      ok: false;
      data: T;
      error: string;
    };

type CloudFinanceContext =
  | {
      ok: true;
      client: SupabaseClient;
      userId: string;
    }
  | {
      ok: false;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function sanitizeCloudFinanceError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("relation") ||
    lowerMessage.includes("schema cache") ||
    lowerMessage.includes("could not find")
  ) {
    return "Cloud finance transaction table is not available yet. Run supabase/sql/007_finances.sql manually in Supabase.";
  }

  if (
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("permission denied") ||
    lowerMessage.includes("policy")
  ) {
    return "Cloud finance request was blocked by Supabase security policies.";
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return "Cloud finance request failed because the network or Supabase connection is unavailable.";
  }

  if (lowerMessage.includes("check constraint")) {
    return "Cloud finance action failed because one field does not match the approved transaction schema.";
  }

  return "Cloud finance action failed. Check Supabase configuration and RLS policies.";
}

function isTransactionType(value: unknown): value is TransactionType {
  return (
    typeof value === "string" &&
    TRANSACTION_TYPES.includes(value as TransactionType)
  );
}

function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && CURRENCIES.includes(value as Currency);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    PAYMENT_METHODS.includes(value as PaymentMethod)
  );
}

function normalizeCloudTransactionRow(
  value: unknown,
): CloudFinanceTransactionRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const userId = value.user_id;
  const transactionType = value.transaction_type;
  const currency = value.currency;
  const category = value.category;
  const description = value.description;
  const transactionDate = value.transaction_date;
  const paymentMethod = value.payment_method;
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;

  if (
    typeof id !== "string" ||
    typeof userId !== "string" ||
    typeof transactionType !== "string" ||
    typeof currency !== "string" ||
    typeof category !== "string" ||
    typeof description !== "string" ||
    typeof transactionDate !== "string" ||
    typeof paymentMethod !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id,
    user_id: userId,
    transaction_type: transactionType,
    amount: toNumber(value.amount),
    currency,
    category,
    description,
    transaction_date: transactionDate,
    payment_method: paymentMethod,
    tag: typeof value.tag === "string" ? value.tag : null,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : null,
  };
}

async function getCloudFinanceContext(): Promise<CloudFinanceContext> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      ok: false,
      error:
        "Cloud finance transactions are unavailable because Supabase is not configured.",
    };
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    return {
      ok: false,
      error: sanitizeCloudFinanceError(error.message),
    };
  }

  const userId = data.session?.user.id;

  if (!userId) {
    return {
      ok: false,
      error: "Sign in before using cloud finance transactions.",
    };
  }

  return {
    ok: true,
    client,
    userId,
  };
}

export function mapCloudTransactionToAtlasTransaction(
  row: CloudFinanceTransactionRow,
): Transaction {
  return {
    id: row.id,
    type: isTransactionType(row.transaction_type)
      ? row.transaction_type
      : "expense",
    amount: row.amount,
    currency: isCurrency(row.currency) ? row.currency : "PYG",
    category: row.category || "Other",
    description: row.description,
    date: row.transaction_date,
    paymentMethod: isPaymentMethod(row.payment_method)
      ? row.payment_method
      : "Other",
    tag: row.tag ?? "",
    createdAt: row.created_at,
  };
}

export function mapAtlasTransactionToCloudInsert(
  transaction: Transaction | TransactionDraft,
  userId: string,
): CloudFinanceTransactionInsert {
  return {
    user_id: userId,
    transaction_type: isTransactionType(transaction.type)
      ? transaction.type
      : "expense",
    amount:
      typeof transaction.amount === "number" &&
      Number.isFinite(transaction.amount)
        ? transaction.amount
        : 0,
    currency: isCurrency(transaction.currency) ? transaction.currency : "PYG",
    category: transaction.category.trim() || "Other",
    description: transaction.description.trim(),
    transaction_date:
      transaction.date || new Date().toISOString().slice(0, 10),
    payment_method: isPaymentMethod(transaction.paymentMethod)
      ? transaction.paymentMethod
      : "Other",
    tag: transaction.tag?.trim() || null,
  };
}

export async function listCloudTransactions(): Promise<
  CloudFinanceResult<Transaction[]>
> {
  const context = await getCloudFinanceContext();

  if (!context.ok) {
    return {
      ok: false,
      data: [],
      error: context.error,
    };
  }

  const { data, error } = await context.client
    .from("finance_transactions")
    .select(CLOUD_TRANSACTION_COLUMNS)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      data: [],
      error: sanitizeCloudFinanceError(error.message),
    };
  }

  const transactions = Array.isArray(data)
    ? data
        .map(normalizeCloudTransactionRow)
        .filter(
          (transaction): transaction is CloudFinanceTransactionRow =>
            transaction !== null,
        )
        .map(mapCloudTransactionToAtlasTransaction)
    : [];

  return {
    ok: true,
    data: transactions,
    message: `Loaded ${transactions.length} cloud finance ${transactions.length === 1 ? "transaction" : "transactions"}.`,
  };
}

export async function createCloudTransaction(
  transaction: Transaction | TransactionDraft,
): Promise<CloudFinanceResult<Transaction | null>> {
  const syncState = readSyncState();
  if (syncState.modules.finances.status !== "synced") {
    return {
      ok: false,
      data: null,
      error: "Cloud finance operations are disabled because finance sync is not enabled.",
    };
  }

  const context = await getCloudFinanceContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const insert = mapAtlasTransactionToCloudInsert(
    transaction,
    context.userId,
  );

  const { data, error } = await context.client
    .from("finance_transactions")
    .insert(insert)
    .select(CLOUD_TRANSACTION_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudFinanceError(error.message),
    };
  }

  const row = normalizeCloudTransactionRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud finance transaction was created, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudTransactionToAtlasTransaction(row),
    message:
      "Created cloud finance transaction. Local transactions were not changed.",
  };
}

export async function updateCloudTransaction(
  id: string,
  updates: Partial<TransactionDraft>,
): Promise<CloudFinanceResult<Transaction | null>> {
  const syncState = readSyncState();
  if (syncState.modules.finances.status !== "synced") {
    return {
      ok: false,
      data: null,
      error: "Cloud finance operations are disabled because finance sync is not enabled.",
    };
  }

  const context = await getCloudFinanceContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const update: CloudFinanceTransactionUpdate = {};

  if (typeof updates.type === "string") {
    update.transaction_type = updates.type;
  }

  if (typeof updates.amount === "number") {
    update.amount = updates.amount;
  }

  if (typeof updates.currency === "string") {
    update.currency = updates.currency;
  }

  if (typeof updates.category === "string") {
    update.category = updates.category.trim() || "Other";
  }

  if (typeof updates.description === "string") {
    update.description = updates.description.trim();
  }

  if (typeof updates.date === "string") {
    update.transaction_date = updates.date;
  }

  if (typeof updates.paymentMethod === "string") {
    update.payment_method = updates.paymentMethod;
  }

  if ("tag" in updates) {
    update.tag = updates.tag?.trim() || null;
  }

  const { data, error } = await context.client
    .from("finance_transactions")
    .update(update)
    .eq("id", id)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .select(CLOUD_TRANSACTION_COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudFinanceError(error.message),
    };
  }

  const row = normalizeCloudTransactionRow(data);

  if (!row) {
    return {
      ok: false,
      data: null,
      error:
        "Cloud finance transaction updated, but Atlas could not read the returned row.",
    };
  }

  return {
    ok: true,
    data: mapCloudTransactionToAtlasTransaction(row),
    message:
      "Updated cloud finance transaction. Local transactions were not changed.",
  };
}

export async function deleteCloudTransaction(
  id: string,
): Promise<CloudFinanceResult<null>> {
  const syncState = readSyncState();
  if (syncState.modules.finances.status !== "synced") {
    return {
      ok: false,
      data: null,
      error: "Cloud finance operations are disabled because finance sync is not enabled.",
    };
  }

  const context = await getCloudFinanceContext();

  if (!context.ok) {
    return {
      ok: false,
      data: null,
      error: context.error,
    };
  }

  const { error } = await context.client
    .from("finance_transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    return {
      ok: false,
      data: null,
      error: sanitizeCloudFinanceError(error.message),
    };
  }

  return {
    ok: true,
    data: null,
    message:
      "Deleted cloud finance transaction. Local transactions were not changed.",
  };
}

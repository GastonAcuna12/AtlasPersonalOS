# Finances Accounts / Wallets Foundation

This document describes the design, storage schema, operations, and safety guarantees of the Accounts / Wallets foundation in Atlas Finances.

## Overview

The Accounts foundation allows users to organize where their money is stored (e.g., cash, credit cards, bank accounts, digital wallets). 

In this initial phase, the Accounts feature is **organizational only**. It establishes the storage layout and user interface tab, preparing the system for a future phase where transaction records will connect directly to specific accounts.

---

## Data Schema & Storage

The accounts are stored locally in `localStorage` under the key:
`atlas.financeAccounts`

### Data Model

Each account is defined by the `FinanceAccount` type in [atlas.ts](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/types/atlas.ts):

```typescript
export type FinanceAccountType =
  | "cash"
  | "bank"
  | "wallet"
  | "credit_card"
  | "savings"
  | "investment"
  | "other";

export type FinanceAccount = {
  id: string;
  name: string;
  type: FinanceAccountType;
  currency: Currency; // "PYG" | "USD"
  initialBalance: number;
  isActive: boolean; // For deactivation/reactivation
  color?: string;
  icon?: string;
  institution?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Safety & Normalization

Data loaded from storage is parsed and sanitized through `normalizeFinanceAccounts` to guarantee that missing or corrupt fields never crash the application.
* Missing fields default to safe fallbacks.
* Deletion is designed around a soft-archive pattern (`isActive: false`) to ensure database references remain intact once transactions are linked in a future phase.

---

## Safety Safeguards & Constraints

To prevent regressions in core finance logic, Phase 2 implements strict safety boundaries:

1. **No Authoritative Balance Adjustments**: Account balances do not reflect real-time changes based on transaction inflows/outflows yet. The account summary displays the total sum of `initialBalance` for active accounts grouped by currency.
2. **Core Formulas Unchanged**: Accounts do **NOT** affect the computation of:
   * **Total Balance** (all-time ledger sum of transactions)
   * **Available Money** (ledger sum minus reserved savings vault balance)
   * **Safe-to-Spend** (available balance minus planned commitments)
3. **No Transaction Changes**:
   * Old transaction schemas are untouched.
   * Creating a transaction does not require or mutate an account ID.
   * `paymentMethod` behaviors and lists are kept separate and unmodified.
4. **No Automated Seeding**: The system does not automatically generate mock accounts. The list is empty by default, allowing users to define their ledger containers.
5. **No Cloud/Sync triggers**: Accounts remain fully local-first.

---

## Completed Phases

### Phase 3A: Account Linking Types & Config Only
* Extended the `Transaction` schema (and `TransactionDraft`) with an optional `accountId?: string` field.
* Extended the `FinanceSettings` schema with an optional `defaultFinanceAccountId?: string` field.
* Normalizers for transactions and finance settings preserve these optional fields.
* No UI selectors, calculation changes, or transaction mutations were introduced in this phase to guarantee safety.

### Phase 3B: Account Selector for Transactions Only
* Added account selection UI (dropdown selector) to the transaction creation/edit forms.
* Implemented selection and pre-selection logic based on active accounts count:
  - If 0 active accounts: hide account selector, transaction saved without accountId.
  - If 1 active account: auto-select that account and disable/hide selection with clear copy.
  - If multiple active accounts: pre-populate with the default account if active, or require explicit user selection.
* Added support for default accounts: updated default setting badge, action to set as default, and automatic setting removal when deactivating an account.
* Configured safe quick templates behavior: quick entry template buttons are disabled when explicit account selection is required and no default account is configured.
* Enabled currency mismatch warning: alerts users if transaction currency does not match the selected account currency.
* Integrated history badges: transaction list shows account names/badges for linked entries, and "Legacy" or "Unlinked" labels for older/untagged transactions.
* Available Money formula and calculations remain unchanged.

### Phase 3C: Derived Current Balances Display
* Added pure helper functions `calculateFinanceAccountBalance` and `calculateFinanceAccountSummaries` in `src/lib/finances.ts` to derive balances dynamically at runtime.
* Derived balance formula:
  $$\text{accountBalance} = \text{initialBalance} + \sum \text{linkedIncomes} - \sum \text{linkedExpenses}$$
* Handles currency conversion safely based on the active rate specified in user settings (avoids raw default values).
* Inactive accounts display their derived balance details independently, but are excluded from active currency summaries totals.
* Added a legacy unlinked transaction notice showing the count of legacy entries.
* Available Money calculations remain 100% unchanged (ledger-based) in this phase.

### Phase 3D: Opt-In Account-Based Available Money (Hybrid Legacy Model)
* **User-controlled Opt-in setting**: Added `availableMoneyMode: "legacy" | "account_aware"` to `FinanceSettings` (default is `"legacy"`). Existing users are unaffected; activation requires explicit user confirmation.
* **Spendable Account helper**: Implemented `isSpendableFinanceAccount(account)` returning:
  - `true` for: `cash`, `bank`, `wallet`, `other` (spendable daily funds).
  - `false` for: `savings` (overlaps with Goals Savings Vault), `investment` (not daily spendable cash), `credit_card` (liability/future net-worth logic).
* **Hybrid Account-Aware formula**: When opt-in is enabled and at least one active spendable account exists:
  $$\text{Available Money} = \text{Spendable Accounts Balance} + \text{Legacy Balance} - \text{Reserved Savings}$$
  - *Spendable Accounts Balance*: Sum of active spendable account derived balances converted to base currency.
  - *Legacy Balance*: Net sum (income - expense) of legacy transactions with missing or unrecognized `accountId`.
  - *Reserved Savings*: Reserved goals savings balance converted to base currency.
  - If no spendable accounts exist, it falls back to the legacy global ledger formula and shows a fallback status warning.
* **Opt-in Comparison Preview UI**: Built into the Accounts panel, allowing users to toggle the mode, view a live side-by-side comparison of Legacy vs. Account-Aware balances, difference, and category breakdown before committing.
* **Status Warnings**: Added UI banners alerting when transaction records link to archived/inactive accounts or when unlinked legacy entries are present.
* **No migrations or mutations**: The system does not mutate historic transaction amounts/currencies, migrate transactions, or auto-link entries. Supabase sync logic is completely untouched.

---

## Completed Phases (Continued)

### Phase 3E: Planned Income / Salary Support
* Extended planned cashflow items to support expected salaries and client payments (`cashflowType: "expense" | "income"`).
* Expected income is handled conservatively: it does NOT affect Available Money or Safe-to-Spend calculations until explicitly marked received.
* Dynamic account binding: when marked received, the system creates exactly one real income transaction, crediting the selected/default account and storing the occurrence identifier for duplicate prevention.
* Calendar and Overview dashboards display planned incomes separately with distinct cyan visuals.





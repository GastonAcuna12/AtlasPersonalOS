# Finances Planned Cashflows (Planned Expenses & Incomes)

Atlas planned cashflows are local-first commitments representing upcoming financial transactions that are expected but not yet executed. This extends the existing Planned Expenses module to support planned income (such as salaries, client invoices, and recurring retainers) while preserving backward compatibility.

## Planned Cashflow vs. Transaction

- **Transaction**: A real, historical ledger entry that mutates account balances, Available Money, and monthly analytics.
- **Planned Cashflow**: A future expectation (expense or income) that **does not affect** current balances, Available Money, or Safe-to-Spend.
- **Planned Cashflows Store**: Stored in `localStorage` under the legacy key `atlas.plannedExpenses` to ensure full backward compatibility.
- **Transactions Store**: Stored in `localStorage` under `atlas.transactions`.

No transaction is created until the user explicitly marks a planned commitment as **paid** (for expenses) or **received** (for income).

---

## Data Schema & Compatibility

The data model preserves the existing `PlannedExpense` structure, adding optional fields to define income behaviors:

```typescript
export type PlannedExpenseStatus =
  | "pending"
  | "paid"
  | "skipped"
  | "cancelled";

export type PlannedExpenseRecurrence = "none" | "monthly";

export type PlannedExpense = {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  category: string;
  dueDate: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  status: PlannedExpenseStatus;
  recurrence: PlannedExpenseRecurrence;
  dayOfMonth?: number;
  createdAt: string;
  updatedAt: string;
  paidTransactionId?: string;
  lastGeneratedForMonth?: string;
  
  // Extensions:
  cashflowType?: "expense" | "income"; // Defaults to "expense"
  accountId?: string;                  // Optional target/source account ID
};
```

### Backward Compatibility Guarantees

1. **Null/Missing type normalization**: Any existing planned expense lacking the `cashflowType` field is parsed as `"expense"` at runtime.
2. **Untagged Accounts**: Legacy planned expenses without an `accountId` bypass account linking safety rules, allowing unlinked ledger operations exactly as before.
3. **No destructive migrations**: Existing local storage items are preserved exactly as they are without renaming the schema keys or fields.

---

## Conservative Expected Income Constraints

To maintain strict financial prudence, upcoming planned income is treated conservatively:

1. **No balance inflation**: Planned income **does not increase** Available Money until it is explicitly received and converted into a real transaction.
2. **Safe-to-Spend exclusion**: Upcoming expected income **does not increase** Safe-to-Spend. 
   $$\text{Safe-to-Spend} = \text{Available Money} - \text{Upcoming Planned Expenses}$$
3. **Dedicated Overview Section**: Planned inflows are isolated in the Overview panel under a dedicated `"Upcoming inflows / Expected income"` section (split into 7-day and 30-day horizons) to prevent any false sense of budget liquidity.

---

## Account Selection & Binding

When marking a planned commitment as paid or received:

1. **0 active accounts**: The system allows execution without an account (`accountId = undefined`).
2. **1 active account**: The account is automatically selected.
3. **Multiple active accounts**:
   - If a default account exists and is valid, it is automatically selected.
   - Otherwise, the user is required to explicitly select an account before executing the payment/receipt.
4. **Currency Mismatch Warning**: If the selected account's currency differs from the planned commitment currency, a warning banner is shown. The system does not mutate or auto-convert the amount during transaction creation, preserving the user's raw ledger intent.

---

## Mark Received Behavior & Duplicate Prevention

When a planned income is marked as **received**:

1. **Transaction Creation**: Creates exactly one transaction with `type = "income"`.
2. **Metadata Integrity**: Amount, currency, category, and date are preserved. The selected `accountId` is attached if available.
3. **Receipt State**: The occurrence is marked as `"paid"` in the local history tracking patterns. For monthly recurring incomes, the current month is appended to `lastGeneratedForMonth` (preventing future generation for the same period).
4. **Duplicate Prevention**:
   - The generated transaction ID is bound to the planned income occurrence.
   - A single occurrence cannot be marked received twice.
   - Double-clicks or concurrent executions block duplicate transaction creation by caching the paid state immediately.

---

## UI Wording & Polish

To prevent user confusion, clear visual distinctions are established:

| Action / Entity | Expense context | Income context |
| :--- | :--- | :--- |
| **Commitment Type** | Expense / Pago previsto | Income / Ingreso previsto |
| **Primary Action** | Mark paid / Marcar pagado | Mark received / Marcar recibido |
| **Pending State** | Pending payment / Pago pendiente | Pending income / Ingreso pendiente |
| **Completed State** | Paid / Pagado | Received / Recibido |

### Colors and Theme

- **Expenses**: Classic warm Amber/Emerald accents (`text-emerald-400`, `border-emerald-500/25` for completed).
- **Incomes**: Distinct cool Cyan/Blue accents (`text-cyan-400`, `border-cyan-500/25` for pending, `bg-cyan-950/10` card highlights).

---

## Calendar Integration

Planned income events are integrated into the `/calendar` view:

- **Visual Separation**: Income events are rendered inside the collapsible Finances detail list with distinct cyan border styles (`border-cyan-500/20`), text (`text-cyan-400`), and background (`bg-cyan-950/10`).
- **Read-Only Context**: The calendar displays expected dates and status but remains read-only.
- **Handoff Redirection**: Users are provided with a `"Mark Received in Finances"` link that redirects them to `/finances` to perform the action safely.

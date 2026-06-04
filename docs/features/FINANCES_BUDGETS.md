# Atlas Finances Module — Expense Budgets

Atlas supports optional expense budgets to help you monitor and direct your outgoing cash flow by category. Budgets in Atlas are strictly analytical expectations—they are designed for tracking and warning guidance, and they operate independently from your account ledger balances or payment schedules.

---

## 1. Core Principles

### Budgets are NOT Transactions
Creating, editing, or deleting a budget will never mutate your transaction log. A budget represents a ceiling/target, whereas a transaction is a historical financial record of actual money moving in or out.

### Budgets are NOT Planned Expenses
Planned expenses (`PlannedExpense`) are chronological financial commitments (like rent or subscriptions) that represent upcoming outgoing payments. They directly subtract from your Available Money to compute your **Safe-to-Spend** indicator. Budgets, on the other hand, are soft targets for category spending (like "Food" or "Entertainment") and do not represent a single bill or a committed cash outflow.

### Budgets Do NOT Affect Balance Figures
Since budgets are targets rather than actual or scheduled transactions, they:
- Do **not** subtract from **Available Money**.
- Do **not** affect **Safe-to-Spend** projections.
- Do **not** change **Savings Vault** reserves.
- Do **not** alter the **Monthly Net Balance** (Cash Flow).

---

## 2. Calculation Rules

### Only Expenses Count
Only transactions of type `expense` count against a budget. Transaction types of `income` are completely excluded and will never offset or increase your remaining budget.

### Category Matching
Transactions are mapped to budgets based on exact category equivalence (`transaction.category === budget.category`). Budgets support both core system categories and custom user-created transaction categories.

### Monthly Partitioning
Budgets are tracked on a monthly basis. Realized expenses count against a budget only if the transaction date matches the active month selected in the interface (e.g. `YYYY-MM`).

### Multi-Currency Conversion
Budgets can be configured in either **PYG** or **USD**.
- If a transaction currency matches the budget currency, it is counted as-is.
- If they differ, the transaction amount is converted to the budget's currency using the manual exchange rate configured in your settings (`usdToPygRate`).
- This prevents raw numeric errors (e.g., adding raw USD amounts to a PYG budget).
- Original transaction records remain unmodified.

---

## 3. Status Thresholds & UI Signals

The dashboard and finances panel calculate your budget consumption percentage (`(Spent / Budget) * 100`) and assign one of three health states:

| Spent Percentage | Health Status | UI Display |
| :--- | :--- | :--- |
| **Below 80%** | `healthy` | Calm green theme with a checkmark. |
| **80% to 99%** | `near_limit` | Warning amber theme with a warning triangle. |
| **100% or Above** | `over_budget` | Critical red theme with a warning triangle. |

---

## 4. Local-First Data Safety
- **centralized Registry**: Budgets are saved under the `atlas.financeBudgets` local storage key.
- **Normalization**: Missing or corrupted local storage records resolve safely to an empty array on boot, preventing interface crashes.
- **Sync/Supabase Isolation**: Budgets remain 100% local-first. They do not trigger cloud sync or require database migrations in this pass.

---

## 5. Future Work Roadmap
- **Rollover Budgets**: Carry over unused remaining budget amounts to the subsequent month.
- **Weekly Budgets**: Support shorter intervals for high-frequency categories like food or transport.
- **Budget Templates**: Quickly pre-populate budgets using historical averages or monthly targets.
- **Push Notifications**: Trigger native alert warnings when a category exceeds 80% consumption.
- **Cloud Sync**: Expand the Supabase sync engine to support relational backing for `finance_budgets`.

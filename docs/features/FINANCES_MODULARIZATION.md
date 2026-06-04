# Atlas Finances Modularization Plan

This document tracks the progress of modularizing the Atlas Finances module.

## Status: Phase 2 Completed (Accounts / Wallets Foundation)

The monolithic Finances component ([FinancesPage.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/FinancesPage.tsx)) has been split into isolated panels, the global month selector is integrated in the header, and the local-first **Accounts / Wallets Foundation** has been established.

### Extracted Components

1. **[FinanceStatCard.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/finances/FinanceStatCard.tsx)**:
   * **Purpose**: Reusable, customizable metric card for financial balances.
   * **Features**: Supports four levels of warnings (`none`, `low`, `warning`, `danger`) to alert the user of negative available balance, low balance, or reserved funds exceeding limits.
2. **[FinancesOverviewPanel.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/finances/FinancesOverviewPanel.tsx)**:
   * **Purpose**: Monthly finance overview, safe-to-spend cards, category distribution graphs, and automated financial insights.
3. **[FinancesTransactionsPanel.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/finances/FinancesTransactionsPanel.tsx)**:
   * **Purpose**: Transaction creation form, quick entry triggers, filters, and transaction history log.
4. **[FinancesPlannedPaymentsPanel.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/finances/FinancesPlannedPaymentsPanel.tsx)**:
   * **Purpose**: Recurring bills, subscriptions, and future obligations list. Provides inline skip, delete, edit, and mark-paid actions.
5. **[FinancesBudgetsPanel.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/finances/FinancesBudgetsPanel.tsx)**:
   * **Purpose**: Expense budgets list, category usage progress bars, limits alerts, and budget configuration forms.
6. **[FinancesSavingsPanel.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/finances/FinancesSavingsPanel.tsx)**:
   * **Purpose**: Explains how reserved goals funds are locked and displays the vault balance. Links to the Goals system for editing.

### Shell Architecture

[FinancesPage.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/FinancesPage.tsx) remains the shell container and owns:
* Mounted / client safety states to prevent hydration mismatches.
* Shared react hooks (`useTransactions`, `usePlannedExpenses`, `useSavings`, `useFinanceBudgets`, `useAtlasSettings`).
* State values for current month and ledger filter selections.
* Tab state (`activeTab`) to show and hide corresponding panels dynamically.
* Manual currency conversion rates configuration block in the header.

### Behaviors & Formulas Preserved (100% Intact)

* **Available Money Formula**: Income minus expenses minus reserved savings.
* **Safe-to-Spend (7/30 days)**: Available Money minus upcoming planned payments in the specified horizons.
* **Exchange Rate Calculations**: Converted dynamically at runtime; PYG/USD values are preserved as entered.
* **Storage Keys**: No changes to `localStorage` keys or types.
* **Budgets**: Analytical alerts only, no impact on Available Money or transaction records.
* **Calendar Integration**: Planned payments due dates and recurrence patterns remain visible and functional in [CalendarPage.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/components/CalendarPage.tsx).
* **Dashboard widgets**: Dashboard metrics are loaded via standard hooks and are completely unaffected.

---

## Next Steps: Phase 3 Plan (Transaction Linking & Real Balances)

### Completed
* **Phase 3A: Account Linking Types & Config Only**
  - Optional `accountId?: string` added to `Transaction` and `TransactionDraft`.
  - Optional `defaultFinanceAccountId?: string` added to `FinanceSettings`.
  - Storage normalizers updated to safely parse and preserve these optional config/linking fields.
  - Core balances, Safe-to-Spend, budgets, UI, and transactions remain 100% unchanged.
* **Phase 3B: Transaction Form Account Selection**
  - Added account selection UI dropdown to create/edit forms.
  - Built smart auto-selection / pre-selection logic based on active accounts count and defaults.
  - Form displays warning on currency mismatch (PYG transaction on USD account or vice versa).
  - Quick example template buttons are safely handled and disabled if manual selection is required and no default is set.
  - Transaction history displays account badges (linked name/icon) or fallback badges ("Legacy" or "Unlinked").
* **Phase 3C: Derived Current Balances**
  - Dynamically derive account balances in `src/lib/finances.ts` and show them in the Accounts panel card list.
  - Compute active summaries grouped by currency using derived balances.
  - Display detail breakdown (initial balance, linked income, linked expenses, transaction count).
  - Provide a warning if currency mismatches occur.
  - Show a banner showing the count of legacy/unlinked transactions.
  - Available Money and Safe-to-Spend calculations remain 100% unchanged.
* **Phase 3D: Hybrid Available Money Transition (Opt-In)**
  - Integrated `availableMoneyMode` in `FinanceSettings` and normalizers (default is `"legacy"`).
  - Implemented `isSpendableFinanceAccount` helper mapping spendable types (`cash`, `bank`, `wallet`, `other`) and excluding savings, investment, and credit cards.
  - Updated `calculateFinanceOverview` to use the hybrid formula when opt-in mode is active.
  - Added a preview comparison card, switch toggle, and confirmation modal in `FinancesAccountsPanel.tsx`.
  - Displayed warning alerts when transactions are linked to archived/inactive accounts or when zero spendable accounts are present in active mode.
  - Refactored Dashboard/Overview card header texts based on the active calculation state.

* **Phase 3E: Planned Income / Salary Support**
  - Extended the planned payments framework into general cashflows, enabling expected incomes alongside expected expenses.
  - Implemented conservative treatment of planned incomes (do not affect Available Money or Safe-to-Spend calculations until marked received).
  - Developed duplicate prevention checks and multi-account linking routines during receipt execution.
  - Refactored `FinancesPlannedPaymentsPanel` form, list item components, `FinancesOverviewPanel` upcoming inflows metrics, and `CalendarPage` visual entries.
* **Phase 3F: Private CSV Export**
  - Integrated browser-local CSV exports in `FinancesTransactionsPanel` for both the current filtered view and all ledger transactions.
  - Implemented automatic RFC 4180 escaping for commas, quotes, and newlines in text fields.
  - Included a UTF-8 BOM prefix to prevent accent corruption in spreadsheet applications like Microsoft Excel.
  - Added localized (EN/ES) helper text describing the privacy guarantee (local generation in the browser).

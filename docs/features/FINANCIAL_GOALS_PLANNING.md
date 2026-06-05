# Financial Goal Planning Integration

This document describes the design, math, and safety safeguards of the financial goal planning feature in Atlas.

## Overview

The financial goal planner bridges the **Goals** and **Finances** modules by calculating the required pace of savings (per day, week, and month) needed to hit a goal's target value by its deadline. 

This calculation updates dynamically in real-time as the user's Savings Vault balances adjust or as goals are edited.

## Integration Points

Financial goal planning elements appear in the following locations within Atlas:

1. **Goals Page (`GoalsPage.tsx`)**:
   * Shows a comprehensive **Financial Plan** card for savings-linked goals.
   * Displays remaining amount, needed pace per day, week, and month, target date, and a pacing status tag.
   * Prompts the user to set a target date if none is specified.

2. **Finances Overview Tab (`FinancesOverviewPanel.tsx`)**:
   * Displays a compact **Savings Pace / Financial Goals Pace** card row.
   * Lists the top 3 active goals with deadlines, displaying their remaining amount and required monthly savings pace, alongside a deep link to the Goals tab.

3. **Finances Savings Tab (`FinancesSavingsPanel.tsx`)**:
   * Shows a highly compact horizontal summary bar at the top representing total **Reserved Savings** (displaying the reserved balance, optional base currency conversion, and a small secondary CTA button to "Manage in Goals") to prevent layout clutter.
   * Promotes the detailed, read-only **Financial Goals / Savings Pace** checklist/card list as the primary page content.
   * Displays all active savings-linked goals, showing progress bars (current vs target), remaining amounts, required pacing broken down by day, week, and month, target dates, and statuses.
   * Provides a fallback empty state inviting users to create savings-linked goals if none are active.

4. **Dashboard (`AtlasDashboard.tsx`)**:
   * Displays a compact inline monthly pace note (e.g., `· PYG 350,000/mo` or `· USD 50/mes`) within the active goals checklist under the Strategic Focus briefing.

## Calculations & Formulas

For any active goal where:
1. `goalType !== "daily_habit"` (i.e. standard goals)
2. `linkedFinanceMetric === "savings"`
3. `targetValue > 0`
4. A `deadline` is configured

The application computes the pacing using the following rules:

$$remaining = \max(targetValue - currentAmount, 0)$$
$$daysRemaining = \max(deadlineDate - todayDate, 0)$$

If $daysRemaining > 0$:
* **Needed per day**: $perDay = remaining / daysRemaining$
* **Needed per week**: $perWeek = perDay \times 7$
* **Needed per month**: $perMonth = perDay \times 30.44$

If $daysRemaining = 0$ or deadline is in the past:
* If $remaining > 0$: Status flags as **"Behind target / Deadline reached"** or **"Fecha límite alcanzada / Por detrás del objetivo"**.
* If $remaining = 0$: Status flags as **"Goal reached"** or **"Objetivo alcanzado"**.

### Currency Behavior
The calculator preserves the goal's original currency. If the goal is in `USD`, the required rates are displayed in `USD`. If the goal is in `PYG`, they are displayed in `PYG`.

---

## Relation to Savings Vault

If a goal is linked to the Savings Vault (`linkedFinanceMetric === "savings"`), the current progress is derived directly from the Savings Vault's total balance. If the vault currency differs from the goal's currency, the amount is dynamically converted using the exchange rate settings:

* **From Savings Vault to Goal Currency**:
  $$savingsInGoalCurrency = \text{convertToBase}(vaultAmount, vaultCurrency, goalCurrency, exchangeRate)$$

---

## Safety Safeguards & Constraints

To maintain local-first data integrity and strict accounting:
1. **No Mutations**: The planner is purely informational. Opening the panels or checking the pace does not write, update, or delete any local storage notes or sync state.
2. **Available Money Unchanged**: The core formula for Available Money is untouched:
   $$\text{Available Money} = \text{Total Ledger Balance} - \text{Savings Vault Balance}$$
   The planner does not alter how the Savings Vault behaves.
3. **No Automatic Transactions**: The system will **never** generate a ledger transaction or plan a payment automatically. Pacing recommendations are read-only tips for the user.
4. **No Cloud/Sync changes**: This integration is fully local-first. It does not communicate with Supabase or upload goals/savings data to any cloud service.

---

## Future Work

* **Automatic Monthly Budget Suggestions**: Guide users to link goal pacing requirements directly to category budgets in the Finances module.
* **Smart Reminders**: Alert users when they fall behind their required saving pace.
* **Link Planned Deposits**: Visualize how recurring deposits to the Savings Vault align with active goals.
* **Visual Charts**: Display progress trajectory graphs showing target pacing vs actual vault increases over time.
* **Cloud Sync Integration**: Safely enable goals and finances sync using similar offline-first queue patterns established for notes.

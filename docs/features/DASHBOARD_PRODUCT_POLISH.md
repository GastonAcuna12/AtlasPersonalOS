# Dashboard Product Polish - Daily Command Center

This document details the changes, constraints, and architecture of the polished Atlas Personal OS Dashboard, transforming it into a cohesive daily command center.

## Overview of Changes

1. **Today Command Center**: A new top-level widget that aggregates active local-first signals for the current day, displaying general tasks, upcoming payments, pending habits, work deadlines, and university assignments/exams.
2. **Finance Dashboard Summary**: Restructured Finances card showcasing Available Money, Safe-to-Spend (7-day projection), Upcoming Payments (7-day commitments), Next Planned Payment detail, and Reserved Savings (clearly separated).
3. **Daily Habits Tracker**: Restructured Goals card highlighting daily habits consistency, streak stats, and the first habit needing attention with motivational relative indicators.
4. **Upcoming Agenda Snapshot**: Chronological list of the next 3 important upcoming items (tasks, work deliverables, goal milestones, planned payments), with clean Spanish translations for relative days (Today, Tomorrow, In X days, Overdue).
5. **Module Settings Integration**: Empty state banishing and workspace customizer banner when active dashboard modules are disabled.
6. **Hydration & Mount Safety**: Ensured complete hydration safety via standard mounting state checks to avoid server-client timezone or date discrepancies.

---

## Technical Constraints & Safety Guarantees

### 1. Strictly Read-Only Guarantee
* The Dashboard acts purely as an information display and navigation hub.
* There are no check-in checkboxes, checkmarks, completion buttons, or payment toggle inputs.
* Direct operations (completing a task, completing a habit, checking off a payment, or adding a transaction) **must** be performed inside their respective module pages.
* Direct links are provided inside each card (e.g. `/today`, `/finances`, `/goals`, `/work`, `/academics`) to guide the user to perform mutations in the proper context.
* Under no circumstances does the dashboard award XP, modify local-first records, or write to local/sync repositories.

### 2. Module Preference Integrity
* If a module is disabled in System Settings, all visual elements, metrics, and snapshots relating to that module are completely hidden from the Dashboard.
* Disabling a module does not delete or alter its underlying data.
* If all dashboard modules are disabled, a clean prompt is displayed:
  * English: `"Enable modules in Settings to customize your workspace."`
  * Spanish: `"Activá módulos en Ajustes para personalizar tu espacio."`

### 3. Finance Safety & Formula Rules
* **Excluding Savings**: Available Money is strictly computed as `totalBalance - savingsInBaseCurrency`. Savings are displayed in a muted state and are never shown as spendable balance.
* **Safe-to-Spend Projection**: Upcoming commitments affect only the projected "Safe after upcoming payments" value. The actual "Available Money" balance remains unchanged until a real local transaction is created on the `/finances` page.
* **Exchange Rate Conversion**: Base currency exchange rates are handled statically from settings (`settings.usdToPygRate` or `settings.exchangeRateUsdToPyg`). No online conversion APIs are queried.

### 4. Hydration & Mount Security
* Initial state reads of `localStorage` or initial renders of timezone-sensitive date objects (`new Date()`, `Date.now()`, `todayISO()`) are deferred until after the component has mounted on the client (`hasMounted === true`).
* This eliminates initial SSR markup mismatch warnings in NextJS.

---

## Behavior Details

### Today Command Center
* Displays up to 5 compact links:
  * **Today's Tasks**: Remaining tasks planned for today (excluding Academic). Shows count or "All tasks completed! 🎉".
  * **Upcoming Payments**: Warns if a planned payment is overdue or due within 3 days. Shows count or "No payments due soon".
  * **Daily Habits**: Remaining habit check-ins today. Shows count or "All habits done! 🔥".
  * **Freelance Due Today**: Pending work deliverables due today or overdue. Shows count or "No work due today".
  * **University Due Today**: Remaining university tasks/exams due today. Shows count or "No university tasks due".

### Habits Needing Attention
* If there are active habits pending today, the dashboard highlights the first pending habit, indicating its current streak.
* If all active daily habits are completed, it shows a celebratory banner:
  * English: `"All habits completed today! 🔥"`
  * Spanish: `"¡Todos los hábitos completados hoy! 🔥"`

### Upcoming Agenda Snapshot
* Displays up to 3 upcoming deadlines/milestones/payments sorted chronologically (overdue items first).
* Focuses on next actions, mapping type indicators (General Task, Work Deliverable, University Task, Goal Milestone, Finance Commitment) with matching HSL theme borders.

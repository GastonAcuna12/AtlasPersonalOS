# Atlas Personal OS — Product Checkpoint

This document summarizes the major product changes, architectural advancements, and current state of Atlas Personal OS following our global product QA and onboarding upgrades.

## Summary
Atlas Personal OS is a private, local-first personal operating system designed to manage daily agendas, tasks, habits, academic schedules, notes, goals, and multi-currency finances. All data is stored locally in the browser's `localStorage` vault, with optional end-to-end cloud synchronization for the Notes library. 

With this checkpoint, Atlas transitions from a feature-heavy tool into a modular, responsive dashboard that adapts to different user profiles via a guided workspace quiz, offering deep financial account management and an integrated calendar views.

---

## What’s New

### 1. Workspace Onboarding & Presets
* **Guided Quiz Wizard**: Introduces a first-run full-screen guided setup that asks 5 questions in English or Spanish, calculates user preferences, and recommends a workspace layout preset.
* **Layout Presets**: Pre-configured profiles include **Student**, **Freelancer**, **Personal Finance**, and **Full Atlas**. Users can also customize visible modules manually, which automatically shifts their layout profile to **Custom**.
* **Zero Data Loss Visibility**: Disabling a workspace module hides its navigation items and widgets but preserves all stored records.
* **Onboarding Rerun**: A safe "Run onboarding again" trigger in Settings allows reconfiguration of layout presets at any time.

### 2. Notes
* **Cloud Sync (Phases 1-7)**: Optional integration with Supabase. Supports local-first cached reads and optional cloud write-through on note changes.
* **Conflict Resolution**: Implements controlled merging, local-to-cloud metadata previews, and selective importing to handle local and remote state differences cleanly.
* **Write-through Sync**: Notes is the only module equipped with full cloud write-through capabilities.

### 3. Finances
* **Account-Aware System**: Opt-in ledger accounting supporting multiple wallets and bank accounts. Allows derived account balances computed on-the-fly from transaction history.
* **Available Money Modes**: Offers "Legacy" (unlinked budget pool) and "Account-Aware" (calculates spending money based on linked liquid accounts).
* **Planned Cashflow**: Full support for planned expenses and planned income/salary structures. Planned income is displayed on the agenda but is excluded from net balances until explicitly marked as received.
* **Financial Goals**: Integrated savings goals, vaults, and target contribution tracking.
* **CSV Export**: Fully local browser-only data export for transactions. Supports filtered views or full history using RFC 4180 escaping and UTF-8 BOM encoding for Excel/Sheets compatibility.

### 4. Calendar
* **Integrated Timeline Trackers**: Displays schedule tasks, habits, planned cashflow transactions, and academic milestones in a unified agenda.
* **Agenda Sidebar**: Collapsible mobile-friendly timeline filters and category chips for fast filtering.

### 5. Goals & Habits
* **Goal Types**: Custom-defined goals (Standard Goals, Savings Goals) mapped to specific timelines.
* **Daily Habits**: Goal-aware habit tracking cards.

### 6. Dashboard
* **Unified Command Center**: Displays widgets for enabled modules (e.g. today's tasks, active budgets, habits, next class) with full fallback support.

---

## Privacy & Local-first
* **Local-First Vault**: 100% of user data remains on the client device inside secure web storage. Data is never shared or transmitted without explicit opt-in auth configurations.
* **Supabase Integration**: Supabase is strictly optional. Active users are not required to configure cloud settings.
* **Local CSV Export**: Exporting transactions runs entirely in memory on the client browser. No data leaves the client machine.

---

## Sync Status
* **Notes**: Full write-through cloud synchronization (requires Supabase configuration).
* **All Other Modules**: Purely local-first. There is no automated cloud backup, server-side persistence, or background synchronization for Tasks, Finances, Goals, Gym, or Academics yet.

---

## Known Limitations
* **No Background Sync**: There is no background worker syncing data when the app is closed.
* **Finances Opt-in**: Multi-account tracking must be enabled in Settings; default structures utilize a single legacy account.
* **Supabase Preview**: Outside of Notes, Supabase tables exist in database schemas but are not integrated into UI operations.

---

## Recommended Next Steps
1. **Extend Cloud Sync**: Build corresponding write-through sync handlers for Tasks, Goals, and Finances.
2. **Setup XP Rewards**: Integrate +50 XP completion badges for finishing onboarding setup, with local duplicate protection.
3. **Optional Sample Data**: Allow loading role-specific sample data (e.g. mock classes for Students, mock clients for Freelancers) on onboarding completion.
4. **Local Database Migrations**: Transition from standard `localStorage` to IndexedDB for improved query performance and larger data limits.

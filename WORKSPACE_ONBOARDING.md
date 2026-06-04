# Workspace Onboarding & Presets

This document details the layout presets and onboarding flows designed to provide a tailored, user-friendly workspace configuration in Atlas Personal OS.

## Workspace Layout Presets

To prevent new users from feeling overwhelmed by Atlas's comprehensive feature set, they can choose one of the following pre-configured workspace layout profiles:

| Preset | Role Icon | Key Focus Area / Enabled Modules | Default Active Modules |
| :--- | :---: | :--- | :--- |
| **Student** | 🎓 | Academics, schedules, class tracking, and notes. | `today`, `calendar`, `notes`, `goals`, `academics` |
| **Freelancer** | 💼 | Client management, hourly billing tracker, work list, and bookkeeping. | `today`, `calendar`, `notes`, `goals`, `finances`, `work` |
| **Personal Finance** | 💳 | Ledger tracking, multi-currency accounts, budgets, and savings goals. | `today`, `calendar`, `finances`, `goals` |
| **Full Atlas** | 🌌 | Complete personal operating system experience. | All 9 modules active |
| **Custom** | ⚙️ | Manually select which modules appear in the navigation menu. | Configured by user |

---

## Onboarding Architecture & State

Workspace configurations are stored locally inside the application settings block:
1. **`onboardingCompleted` (boolean)**: Tracks whether onboarding setup has been finalized.
2. **`workspacePreset` (string enum)**: Identifies the active profile preset (`student`, `freelancer`, `personal_finance`, `full`, or `custom`).

### First-Run Safety
To check if the application is running for the first time without disturbing existing users:
* If settings do not exist in local storage (`atlas.appSettings` is null), `onboardingCompleted` initializes to `false`.
* If settings are already present in local storage, `onboardingCompleted` automatically normalizes to `true` on load. Existing users are never prompted or locked.

---

## Data Safety Guarantee

> [!IMPORTANT]
> **Visibility Toggles Only**: Disabling a workspace module in Atlas strictly affects its UI visibility (nav link visibility in the sidebar and widget visibility on the dashboard).
> **No Data Loss**: Modifying layout preferences or resetting presets **never** deletes, resets, or overrides any local database records (such as transactions, workout logs, class lists, notes, or tasks). Disabling a module is fully non-destructive; re-enabling it immediately restores all user data intact.

---

## Implementation Roadmap

* **Phase 1 (Completed)**: Added settings data model variables, preset constants, settings UI badges, and system documentation.
* **Phase 1B (Completed)**: Implemented `applyWorkspacePreset` settings helper and added the interactive preset selection UI cards to the Settings page. Users can manually choose any preset with clean warning alerts and success banners. Manual toggling of checkboxes automatically transitions the indicator to "Custom". No data is ever deleted, no route intercepts exist, and no XP is awarded yet.
* **Phase 2 (Completed)**: Implemented the visual onboarding wizard page layout (`WorkspaceOnboarding.tsx`) containing language selection, preset profiles cards grids, module toggling customization checks, and setup completion summaries.
* **Phase 3 (Completed)**: Mounted the global layout routing intercept wrapper (`WorkspaceOnboardingIntercept.tsx`) inside the root [layout.tsx](file:///C:/Users/Gast%C3%B3n/Documents/AppSeguimiento,Proyecto%20largo%20plazo/src/app/layout.tsx), providing client-side hydration-safe checks. When `onboardingCompleted` is false, it intercepts layout rendering to display the onboarding screen. Skip triggers exist, and manual "Run onboarding again" resets settings without data loss.

## Future Enhancements
1. **Optional Sample Data**: Allow loading role-specific sample data templates (e.g. classes for Student, billing invoice samples for Freelancer) on the setup completion step.
2. **Setup XP Award**: Award +50 XP on completion with local-first duplicate prevention flags to prevent XP abuse.
3. **Deeper Guided Walkthroughs**: Link custom tours to help users configure budgets, goals, or note templates during their first launch.

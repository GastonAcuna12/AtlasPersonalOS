# Atlas Calendar UX Upgrade Documentation

This file documents the implementation of the Calendar UX Upgrade Phase 1 and Phase 2 in Atlas. These improvements optimize event visibility based on user preferences and group multiple events into structured category tracks to prevent visual clutter in the month grid.

---

## Phase 1: Module Preferences Integration

Atlas Calendar now respects user enabled/disabled modules configured in Settings. When a module is turned off, its events are completely hidden from both the Monthly Grid and the Day Details/Agenda list. This prevents data leakage and ensures the Calendar matches the user's active workflow.

Aggregation checks inside `CalendarPage.tsx` use the `isModuleEnabled` helper:
- **Work (`work`)**: If disabled, freelance deadlines are hidden.
- **Gym (`gym`)**: If disabled, workouts and active recovery rest days are hidden.
- **Academics (`academics`)**: If disabled, school tasks and exams are filtered out (tasks where `task.area === "Academic"`).
- **Today (`today`)**: If disabled, general tasks are filtered out (tasks where `task.area !== "Academic"`).
- **Goals (`goals`)**: If disabled, milestone deadlines and daily habit goals are hidden.
- **Finances (`finances`)**: If disabled, planned expenses (overdue, paid, skipped, cancelled, pending) are hidden.
- **Review (`review`)**: If disabled, daily wraps and weekly reviews are hidden.

---

## Phase 2: 4-Track Categorization Model

To eliminate the "rainbow clutter" of having up to 9 separate colored dots per day cell, all local-first calendar sources are mapped into **4 unified visual tracks**:

### 1. Deadlines & Milestones (Amber Track)
- **General Tasks & Today Priorities**: Standard agenda items and daily priority focus checklists.
- **Work Deadlines**: Freelance client deliverables, project milestone dates, and billing deadlines.
- **Academic Deadlines**: Assignments, lectures, study checklists, and exam schedules.
- **Goal Deadlines**: Target dates for non-habit objectives and milestones.
- *Visual Indicator*: Amber horizontal track bar (`bg-amber-500`).

### 2. Planned Finances (Emerald Track)
- **Planned Expenses**: Recurring bills (monthly) and one-time planned payments.
- **Occurrence Statuses**: Visual status markers for pending, paid, overdue, skipped, or cancelled commitments.
- *Visual Indicator*: Emerald horizontal track bar (`bg-emerald-500`).

### 3. Gym & Habit Consistency (Lime Track)
- **Gym Workouts**: Routine logs (Push, Pull, Legs, etc.) and active recovery rest days.
- **Daily Habit Goals**: Checked-in behavior streaks (completed, missed, skipped, pending).
- *Visual Indicator*: Lime horizontal track bar (`bg-lime-500`).

### 4. Reflections & Audits (Violet Track)
- **Daily Wraps**: Deterministic summaries of logged day activities, mood, energy, productivity, and main takeaway reflections.
- **Weekly Reviews**: Weekly system summaries, wins, evaluations, and pattern audits.
- *Visual Indicator*: Violet horizontal track bar (`bg-violet-500`).

---

## Phase 3: Category Filter Chips

A persistent category filter row is added to the Calendar header. This gives users immediate, visual-only density control over what displays in their Calendar.

### Storage Persistence (`atlas.calendarFilters`)
* Filter choices are saved local-first to the browser's `localStorage` under the key `atlas.calendarFilters`.
* To maintain SSR safety and prevent hydration warnings, the filters state is loaded only on client-side mount, defaulting initially to all filters enabled.
* Storage writes only trigger when a user manually modifies their filters, preventing redundant default storage writes.

### Interaction with Module Preferences
* **Module Preferences Override Filters**: Filter chips are purely a local display layer. If a module is turned off in Settings (e.g. Finances), its events are completely suppressed and will remain hidden even if the corresponding filter chip is toggled on.
* Preferences act as the primary filter, and Category Filter Chips act as a secondary visual layout layer.

### Show All & Hide All Controls
* **Show all**: Turns on visibility for all 4 tracks.
* **Hide all**: Toggles all 4 tracks off. The month grid remains fully visible as a clean grid with blank cells.

### Empty Filtered Day State
* If a day contains events but all of them are hidden by the current active filter chips, the details sidebar renders a localized empty state:
  * English: `"No visible items with the current filters."`
  * Spanish: `"No hay elementos visibles con los filtros actuales."`

---

## Phase 4: Collapsible Agenda Sidebar

The selected day details drawer has been redesigned into collapsible accordion sections corresponding directly to the 4 categorization tracks from the month grid:

### Section Rules & Grouping
1. **Deadlines & Milestones** (Amber Track): Groups general tasks, Today tasks, freelance client deadlines, academic assignments/exams, and goal target milestones.
2. **Planned Finances** (Emerald Track): Groups monthly/one-time planned payments and occurrences (pending, paid, skipped, cancelled).
3. **Gym & Habit Consistency** (Lime Track): Groups gym routine logs, rest days, daily habits, and habit check-ins.
4. **Reflections & Audits** (Violet Track): Groups daily wrap summaries and weekly reviews.

### Default Section State (Auto-Expansion)
- **Deadlines & Milestones**: Opens by default if it contains any pending, overdue, or high/critical items.
- **Planned Finances**: Opens by default if there are pending or overdue payments due.
- **Gym & Habit Consistency**: Opens by default if there are habit tasks or workouts scheduled for the selected day.
- **Reflections & Audits**: Collapsed by default unless it is the only category on the selected day that contains content.

### Sorting Within Categories
- **Deadlines**: Overdue first, followed by due today, high/critical priority, and then low/medium priority.
- **Finances**: Overdue pending payments first, due today, upcoming pending, paid, and skipped/cancelled muted at the bottom.
- **Consistency**: Pending habits first, completed habits, missed/skipped habits, followed by gym logs and rest days.
- **Reflections**: Daily wraps first, then weekly reviews, and then older audits.

### Visual & Mobile Polish
- Source, status, and metadata badges make scanning easy.
- Planned finance items feature clear amounts and currency formatting, remaining strictly read-only and linking directly to `/finances` for state mutations.
- Cards wrap properly on mobile viewports to prevent horizontal overflow, keeping the layout responsive and accessible.

---

## Phase 5A: Chronological Agenda List View

A scrollable chronological Agenda List View is added to the Calendar, allowing users to switch between the traditional Month Grid and the Agenda List View to audit upcoming commitments.

### View Switcher (`atlas.calendarView`)
* A view switcher button in the calendar header allows toggling between **Month** and **Agenda** views.
* The selected view is persisted locally in `localStorage` under the key `atlas.calendarView`. To prevent SSR/hydration warnings, it is loaded only after client mount.

### Date Range Horizons
* Users can view upcoming items over three horizon ranges:
  - **7 days**: The next week of upcoming commitments.
  - **30 days** (Default): The next month.
  - **90 days**: The next quarter.
* Horizon states are completely client-safe and do not trigger hydration warnings.

### Grouping and Priority Sorting
* Agenda items are grouped by date chronologically.
* Date headers display full localized date strings along with relative date tags:
  - **Today** (`Hoy`)
  - **Tomorrow** (`Mañana`)
  - **Overdue** (`Vencido`)
  - **In X days** (`En X días`)
* Inside each date group, items are sorted by priority:
  1. Overdue/pending finance commitments (highest priority).
  2. Critical/high tasks and work deadlines.
  3. Pending tasks/work/academic items.
  4. Habit goals / Gym consistency items.
  5. Daily wraps / reviews (reflections).

### Compact Agenda Cards
* Agenda items are rendered inside compact, read-only cards containing:
  - Visual category color border matching the grid track system.
  - Category badge.
  - Source/module type badge.
  - Status badge (e.g. Completed, Pending, Overdue, Paid, Skipped, Cancelled, Missed).
  - Title (respects user-created content; never translated).
  - Amount and currency details for planned finance items.
  - Client/subject names if available.
  - Daily streaks and best streaks for habits.
  - Muted, line-through formatting for historical completed/skipped/cancelled items.

### Empty and Filtered States
* **No visible items in range**: Displays a localized empty message if no events exist in the selected date horizon range.
  - English: `"No visible agenda items in this range."`
  - Spanish: `"No hay elementos visibles en este rango."`
* **Filtered out state**: Displays a localized message if events exist in the range but are hidden by the user's active filter chips.
  - English: `"Agenda items are hidden by your current filters."`
  - Spanish: `"Los elementos de la agenda están ocultos por los filtros actuales."`

### Read-Only Safety
* Calendar is completely read-only.
* Direct actions (such as marking tasks complete or paying expenses) are not available.
* Planned finance items provide a direct link to the `/finances` page for state mutation. No automatic transactions are generated.

---

## Deferred Features (For Future Phases)

The following features remain deferred to maintain Calendar stability and grid clarity:
1. **Week View Layout**: A 7-day columns/timeline view to analyze daily hourly consistency.

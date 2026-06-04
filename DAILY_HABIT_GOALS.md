# Daily Habit Goals

Daily Habit Goals are local-first Atlas goals for repeated daily behaviors like reading, studying, training, hydration, meditation, or avoiding a bad habit.

## Data Model

- Habit goals are stored inside the existing `atlas.goals` localStorage key.
- A habit goal uses `goalType: "daily_habit"`.
- Daily check-ins are stored on the goal as `habitCheckIns`, keyed by `YYYY-MM-DD`.
- Existing standard goals and savings-linked goals stay in the same storage key and continue working.

## Check-Ins

Each daily check-in can be:

- `completed`: the habit was done for that date.
- `missed`: the habit was intentionally marked as missed.
- `skipped`: the habit was intentionally skipped.
- pending: no check-in has been recorded for today yet.

Atlas does not create tasks, transactions, work items, XP events, or cloud records when a habit is checked in.

## Streak Rules

- Completed days count toward streaks.
- Missed days break the current streak.
- Skipped days do not count as completed and break the current streak for this first version.
- A pending today does not break the streak yet; if yesterday was completed, the current streak continues to show from yesterday.
- Best streak is calculated from the longest sequence of completed `YYYY-MM-DD` check-ins.
- Completion rate is based only on tracked check-ins: completed divided by completed, missed, and skipped records.

## Calendar Integration

- Calendar habit items are derived locally from `atlas.goals`.
- Calendar does not store separate habit events.
- Habit check-ins appear on their check-in dates.
- Active habits also appear as pending on today if no check-in exists yet.
- If the Goals module is disabled, habit items are hidden from Calendar.

## Dashboard Integration

The Dashboard Goals card can show:

- Habits completed today.
- Habits pending today.
- Best active habit streak.

These are local-only derived values and do not affect XP, Atlas streaks, cloud sync, or financial calculations.

## Data Safety

- Existing goals still load as standard goals.
- Savings-linked goals are not converted or modified.
- Deleting a habit goal deletes only that goal record, not other goals.
- Habit check-ins do not touch Supabase POC panels, SQL, sync metadata, or cloud helpers.

## Future Work

- Weekly habits.
- Custom schedules.
- Reminder notifications.
- More nuanced skipped-day behavior.
- Negative habit tracking modes.
- Quick Capture habit check-ins.
- Cloud sync later, after Goals real sync has a separate safety plan.

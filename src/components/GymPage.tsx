"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  buildGymInsights,
  calculateGymOverview,
  calculateWeeklyConsistency,
  calculateWorkoutXP,
  todayISO,
  WORKOUT_TYPES,
  type WorkoutDraft,
  type WorkoutType,
  useWorkoutLogs,
} from "@/lib/gym";
import { useXP } from "@/lib/xp";
import { StreakBadge } from "@/components/StreakBadge";

const initialDraft: WorkoutDraft = {
  date: todayISO(),
  workoutType: "Push",
  duration: 45,
  energy: 6,
  intensity: 7,
  notes: "",
};

export function GymPage() {
  const xp = useXP();
  const { workouts, addWorkout, deleteWorkout } = useWorkoutLogs();
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const overview = useMemo(
    () => calculateGymOverview(workouts, new Date().toISOString().slice(0, 7)),
    [workouts]
  );
  const weekly = useMemo(() => calculateWeeklyConsistency(workouts), [workouts]);
  const insights = useMemo(() => buildGymInsights(workouts), [workouts]);

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const calendarYear = currentCalendarDate.getFullYear();
  const calendarMonthIndex = currentCalendarDate.getMonth();

  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonthIndex, 1).getDay();

  const blanks = Array(firstDayIndex).fill(null);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...dayNumbers];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(calendarYear, calendarMonthIndex - 1, 1));
  };

  const nextMonth = () => {
    setCurrentCalendarDate(new Date(calendarYear, calendarMonthIndex + 1, 1));
  };

  function updateDraft<Value extends keyof WorkoutDraft>(
    key: Value,
    value: WorkoutDraft[Value]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleQuickLog(type: WorkoutType) {
    const isRest = type === "Rest";
    const workout = addWorkout({
      date: todayISO(),
      workoutType: type,
      duration: isRest ? 0 : 45,
      energy: isRest ? 5 : 6,
      intensity: isRest ? 5 : 7,
      notes: isRest ? "Rest day checked in" : "Quick log check-in",
    });

    if (!isRest) {
      const workoutXP = calculateWorkoutXP(workout);
      xp.awardXP("workout-log", {
        amount: workoutXP.amount,
        label: `Logged quick ${type} session`,
      });
      setSuccessMessage(`Logged ${type} (+${workoutXP.amount} XP awarded!)`);
    } else {
      setSuccessMessage(`Logged Rest Day (Active recovery)`);
    }

    setTimeout(() => setSuccessMessage(""), 4000);
  }

  function validateWorkout(workout: WorkoutDraft) {
    if (!workout.date) {
      return "Choose a workout date.";
    }
    if (workout.workoutType !== "Rest" && workout.duration <= 0) {
      return "Enter a duration greater than 0.";
    }
    if (workout.energy < 1 || workout.energy > 10) {
      return "Energy must be between 1 and 10.";
    }
    if (workout.intensity < 1 || workout.intensity > 10) {
      return "Intensity must be between 1 and 10.";
    }
    return "";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateWorkout(draft);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const workout = addWorkout({
      ...draft,
      notes: draft.notes.trim(),
      duration: draft.workoutType === "Rest" ? 0 : draft.duration,
    });

    if (workout.workoutType !== "Rest") {
      const workoutXP = calculateWorkoutXP(workout);
      xp.awardXP("workout-log", {
        amount: workoutXP.amount,
        label: `Logged detailed ${workout.workoutType} workout`,
      });
      setSuccessMessage(`Workout logged successfully (+${workoutXP.amount} XP!)`);
    } else {
      setSuccessMessage(`Rest Day logged successfully.`);
    }

    setDraft(initialDraft);
    setError("");
    setShowDetailedForm(false);
    setTimeout(() => setSuccessMessage(""), 4000);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            Performance Engine
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            Gym Tracker
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={overview.currentStreak} label="Gym" size="lg" />
          <Link
            href="/"
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2 animate-pulse">
          <span>✓</span> {successMessage}
        </div>
      )}

      {/* Primary Section */}
      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] items-start">
        {/* Left Column: Quick Actions + Calendar */}
        <div className="grid gap-8">
          {/* Quick Check-in Module */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-base font-bold text-zinc-100">Quick Check-in</h3>
            <p className="text-xs text-zinc-400 mt-1">Tap today&apos;s workout type to record it instantly with standard targets.</p>
            
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {WORKOUT_TYPES.map((type) => {
                const isRest = type === "Rest";
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleQuickLog(type)}
                    className={`rounded-lg border py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      isRest
                        ? "border-[#27272a] bg-[#121214] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        : "border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30 hover:shadow-md"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-[#27272a]/60 pt-4 flex justify-between items-center">
              <span className="text-xs text-zinc-500">Need specific metrics?</span>
              <button
                type="button"
                onClick={() => setShowDetailedForm(!showDetailedForm)}
                className="text-xs text-amber-500 font-bold hover:underline"
              >
                {showDetailedForm ? "Hide Detailed Form" : "Open Detailed Form"} &rarr;
              </button>
            </div>

            {/* Collapsible Detailed Form */}
            {showDetailedForm && (
              <form onSubmit={handleSubmit} className="mt-6 border-t border-[#27272a] pt-6 grid gap-4 animate-fade-in-up">
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Workout Date
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(event) => updateDraft("date", event.target.value)}
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Workout Type
                    <select
                      value={draft.workoutType}
                      onChange={(event) =>
                        updateDraft("workoutType", event.target.value as WorkoutType)
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    >
                      {WORKOUT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Duration (Minutes)
                    <input
                      type="number"
                      min="0"
                      value={draft.duration}
                      onChange={(event) =>
                        updateDraft("duration", Number(event.target.value))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-[#121214] p-4 rounded-lg border border-[#27272a]">
                    <div className="flex justify-between">
                      <span>Energy Before</span>
                      <span className="text-amber-500 font-bold">{draft.energy}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={draft.energy}
                      onChange={(event) =>
                        updateDraft("energy", Number(event.target.value))
                      }
                      className="accent-amber-500 mt-2 cursor-pointer"
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-[#121214] p-4 rounded-lg border border-[#27272a]">
                    <div className="flex justify-between">
                      <span>Intensity Level</span>
                      <span className="text-amber-500 font-bold">{draft.intensity}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={draft.intensity}
                      onChange={(event) =>
                        updateDraft("intensity", Number(event.target.value))
                      }
                      className="accent-amber-500 mt-2 cursor-pointer"
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Workout Notes / Routine Details
                  <textarea
                    rows={3}
                    value={draft.notes}
                    onChange={(event) => updateDraft("notes", event.target.value)}
                    placeholder="E.g., Bench Press: 4x8 80kg, Squats: 3x10 100kg..."
                    className="resize-none rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none placeholder:text-zinc-600"
                  />
                </label>

                {error && (
                  <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200"
                >
                  Log Workout Session
                </button>
              </form>
            )}
          </div>

          {/* Interactive Gym Calendar */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-100">Workout Calendar</h3>
                <p className="text-xs text-zinc-400 mt-1">Visualize your consistency logs across months.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-lg border border-[#27272a] bg-[#121214] hover:bg-zinc-800 transition text-zinc-400 hover:text-white text-xs"
                >
                  &larr; Prev
                </button>
                <span className="text-xs font-bold uppercase tracking-wider px-3 text-zinc-200 min-w-[100px] text-center">
                  {monthNames[calendarMonthIndex]} {calendarYear}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-lg border border-[#27272a] bg-[#121214] hover:bg-zinc-800 transition text-zinc-400 hover:text-white text-xs"
                >
                  Next &rarr;
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="mt-6 grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-[#27272a] pb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mt-2.5">
              {calendarCells.map((dayNum, cellIndex) => {
                if (dayNum === null) {
                  return <div key={`blank-${cellIndex}`} className="aspect-square bg-transparent" />;
                }

                const cellDateStr = `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const dayLogs = workouts.filter((w) => w.date === cellDateStr);
                const activeWorkouts = dayLogs.filter((w) => w.workoutType !== "Rest");
                const restLogs = dayLogs.filter((w) => w.workoutType === "Rest");
                
                const hasActive = activeWorkouts.length > 0;
                const hasRest = restLogs.length > 0;

                let cellBg = "bg-[#121214] border border-[#27272a]/70 text-zinc-400";
                if (hasActive) {
                  cellBg = "bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-sm shadow-amber-950/20";
                } else if (hasRest) {
                  cellBg = "bg-zinc-800/60 border border-zinc-700/60 text-zinc-500";
                }

                const isToday = cellDateStr === todayISO();

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center relative p-1 transition-all duration-200 hover:border-zinc-500 cursor-pointer ${cellBg} ${
                      isToday ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-[#18181b]" : ""
                    }`}
                  >
                    <span className="text-[11px]">{dayNum}</span>
                    {hasActive && (
                      <span className="text-[8px] font-bold tracking-tight scale-90 opacity-80 mt-0.5 max-w-full truncate">
                        {activeWorkouts[0].workoutType}
                      </span>
                    )}
                    {hasRest && (
                      <span className="text-[8px] font-medium tracking-tight opacity-50 mt-0.5">
                        Rest
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Weekly Target, Insights & Logs */}
        <div className="grid gap-8">
          {/* Weekly Consistency & Insights */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-base font-bold text-zinc-100">Consistency Target</h3>
            <p className="text-xs text-zinc-400 mt-1">Status of current calendar week</p>

            <div className="mt-4 grid grid-cols-7 gap-1">
              {weekly.weekDays.map((day) => (
                <div
                  key={day.date}
                  className={`rounded-lg border py-2 text-center transition-all ${
                    day.completed
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-[#27272a] bg-[#121214] text-zinc-600"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider">{day.label.slice(0, 1)}</p>
                  <p className="mt-1 text-sm font-bold">{day.completed ? "✓" : "·"}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
              {weekly.completedCount} of 7 days logged &middot; {weekly.completionPercentage}% active
            </p>

            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mt-6 border-t border-[#27272a]/60 pt-4">
              Fitness Insights
            </h3>
            <div className="mt-3 grid gap-2">
              {insights.map((insight) => (
                <p
                  key={insight}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2.5 text-xs text-zinc-300 leading-relaxed"
                >
                  {insight}
                </p>
              ))}
              {insights.length === 0 && (
                <p className="text-xs text-zinc-500 italic">No fitness insights calculated. Log a few sessions first.</p>
              )}
            </div>
          </div>

          {/* Monthly Statistics Overview */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-base font-bold text-zinc-100">Performance Metrics</h3>
            <p className="text-xs text-zinc-400 mt-1">Highlights for this month</p>
            <div className="mt-4 grid grid-cols-2 gap-3.5">
              {[
                ["Sessions", overview.totalWorkouts],
                ["Current Streak", `${overview.currentStreak}d`],
                ["Longest Streak", `${overview.longestStreak}d`],
                ["Avg Intensity", `${overview.averageIntensity}/10`],
                ["Total Minutes", `${overview.totalMinutes}m`],
                ["Avg Energy", `${overview.averageEnergy}/10`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-center">
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{label}</p>
                  <p className="mt-1 text-base font-bold text-zinc-100">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section: Workout Log History */}
      <section className="mt-8 rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
        <h3 className="text-base font-bold text-zinc-100">Workout Log History</h3>
        <p className="text-xs text-zinc-400 mt-1">Review or delete past recorded workout signals.</p>

        <div className="mt-6 grid gap-4 max-h-[400px] overflow-y-auto pr-2">
          {workouts.length > 0 ? (
            workouts.map((workout) => {
              const isRest = workout.workoutType === "Rest";
              return (
                <article
                  key={workout.id}
                  className="rounded-lg border border-[#27272a] bg-[#121214]/60 p-4 transition hover:bg-[#121214] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isRest ? "bg-zinc-600" : "bg-amber-500"}`}></span>
                      <p className="font-bold text-zinc-100 text-sm">
                        {workout.workoutType} {isRest ? "(Rest Day)" : `(${workout.duration} Min)`}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      {workout.date} &middot; Energy: {workout.energy}/10 &middot; Intensity: {workout.intensity}/10
                    </p>
                    {workout.notes && (
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500 italic max-w-2xl">
                        &ldquo;{workout.notes}&rdquo;
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteWorkout(workout.id)}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500/10 hover:border-red-500/20"
                  >
                    Delete Log
                  </button>
                </article>
              );
            })
          ) : (
            <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-6 text-xs text-zinc-500 italic text-center">
              No workout logs found. Complete a session above to start logging.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useTasks, todayISO } from "@/lib/tasks";
import { useWorkItems } from "@/lib/work";
import { useGoals } from "@/lib/goals";
import { useWorkoutLogs } from "@/lib/gym";
import { generateDailyWrapSummary, useDailyWraps } from "@/lib/dailyWraps";
import { useWeeklyReviews } from "@/lib/reviews";
import { useAtlasSettings } from "@/lib/settings";
import { getLanguageLocale, t } from "@/lib/i18n";

export function CalendarPage() {
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const { tasks } = useTasks();
  const { workItems } = useWorkItems();
  const { goals } = useGoals();
  const { workouts } = useWorkoutLogs();
  const { dailyWraps } = useDailyWraps();
  const { reviews } = useWeeklyReviews();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayISO());

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayIndex = new Date(year, monthIndex, 1).getDay();

  const blanks = Array(firstDayIndex).fill(null);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...dayNumbers];

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(getLanguageLocale(language), {
      month: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, monthIndex, 1)));
  }, [language, monthIndex, year]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, monthIndex - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, monthIndex + 1, 1));
  };

  // Group all calendar items by date string (YYYY-MM-DD)
  const aggregatedItems = useMemo(() => {
    const dates: Record<string, {
      tasks: typeof tasks;
      workItems: typeof workItems;
      goals: typeof goals;
      workouts: typeof workouts;
      wraps: typeof dailyWraps;
      reviews: typeof reviews;
      count: number;
    }> = {};

    const getOrCreate = (dateStr: string) => {
      if (!dates[dateStr]) {
        dates[dateStr] = {
          tasks: [],
          workItems: [],
          goals: [],
          workouts: [],
          wraps: [],
          reviews: [],
          count: 0,
        };
      }
      return dates[dateStr];
    };

    // 1. General & Academic Tasks
    tasks.forEach((t) => {
      const date = t.plannedDate || t.dueDate;
      if (date) {
        const target = getOrCreate(date);
        target.tasks.push(t);
        target.count++;
      }
    });

    // 2. Freelance Work Items
    workItems.forEach((w) => {
      const date = w.plannedDate || w.deadline;
      if (date) {
        const target = getOrCreate(date);
        target.workItems.push(w);
        target.count++;
      }
    });

    // 3. Goal Deadlines
    goals.forEach((g) => {
      if (g.deadline) {
        const target = getOrCreate(g.deadline);
        target.goals.push(g);
        target.count++;
      }
    });

    // 4. Gym Workouts
    workouts.forEach((w) => {
      if (w.date) {
        const target = getOrCreate(w.date);
        target.workouts.push(w);
        target.count++;
      }
    });

    // 5. Daily Wraps
    dailyWraps.forEach((dw) => {
      if (dw.date) {
        const target = getOrCreate(dw.date);
        target.wraps.push(dw);
        target.count++;
      }
    });

    // 6. Weekly Reviews
    reviews.forEach((r) => {
      const date = r.createdAt?.slice(0, 10) || r.weekStart;
      if (date) {
        const target = getOrCreate(date);
        target.reviews.push(r);
        target.count++;
      }
    });

    return dates;
  }, [tasks, workItems, goals, workouts, dailyWraps, reviews]);

  const selectedDayItems = useMemo(() => {
    return aggregatedItems[selectedDateStr] || {
      tasks: [],
      workItems: [],
      goals: [],
      workouts: [],
      wraps: [],
      reviews: [],
      count: 0,
    };
  }, [aggregatedItems, selectedDateStr]);

  const selectedDateLabel = useMemo(() => {
    const [y, m, d] = selectedDateStr.split("-").map(Number);
    if (!y || !m || !d) return selectedDateStr;
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12));
    return new Intl.DateTimeFormat(getLanguageLocale(language), {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(dateObj);
  }, [language, selectedDateStr]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            {t(language, "calendar.eyebrow", "Unified Time Engine")}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            {t(language, "calendar.title", "Atlas Calendar")}
          </h1>
        </div>
        <Link
          href="/"
          className="w-fit rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          {t(language, "common.dashboard")}
        </Link>
      </header>

      {/* Two Column Layout: Calendar Month Grid and Day Details */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
        {/* Calendar Card */}
        <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl relative">
          {/* Sticky Navigation and Day-of-Week headers to keep orientation when scrolling */}
          <div className="sticky top-0 bg-[#18181b] z-20 pb-3 border-b border-[#27272a]/60 -mx-6 px-6 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-100">{t(language, "calendar.scheduleGrid", "Schedule Grid")}</h2>
                <p className="text-xs text-zinc-400 mt-1">{t(language, "calendar.scheduleDescription", "Select a date to audit logged events.")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-lg border border-[#27272a] bg-[#121214] hover:bg-zinc-800 transition text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  &larr; {t(language, "gym.prev", "Prev")}
                </button>
                <span className="text-xs font-bold uppercase tracking-wider px-3 text-zinc-200 min-w-[120px] text-center">
                  {monthLabel} {year}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-lg border border-[#27272a] bg-[#121214] hover:bg-zinc-800 transition text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  {t(language, "gym.next", "Next")} &rarr;
                </button>
              </div>
            </div>

            {/* Calendar Grid Header */}
            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wider text-zinc-500">
              <div>{t(language, "calendar.day.sun", "Sun")}</div>
              <div>{t(language, "calendar.day.mon", "Mon")}</div>
              <div>{t(language, "calendar.day.tue", "Tue")}</div>
              <div>{t(language, "calendar.day.wed", "Wed")}</div>
              <div>{t(language, "calendar.day.thu", "Thu")}</div>
              <div>{t(language, "calendar.day.fri", "Fri")}</div>
              <div>{t(language, "calendar.day.sat", "Sat")}</div>
            </div>
          </div>

          {/* Calendar Grid Body */}
          <div className="grid grid-cols-7 gap-2 mt-3">
            {calendarCells.map((dayNum, cellIndex) => {
              if (dayNum === null) {
                return <div key={`blank-${cellIndex}`} className="aspect-square bg-transparent" />;
              }

              const cellDateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayData = aggregatedItems[cellDateStr];
              
              const isSelected = selectedDateStr === cellDateStr;
              const isToday = cellDateStr === todayISO();

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDateStr(cellDateStr)}
                  className={`aspect-square rounded-lg flex flex-col items-start justify-between p-2 transition-all border text-left focus:outline-none ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 shadow-sm shadow-amber-950/20"
                      : isToday
                      ? "border-zinc-500 bg-zinc-800/40 text-zinc-100 ring-1 ring-zinc-600"
                      : "border-[#27272a]/60 bg-[#121214] hover:border-zinc-500 text-zinc-300"
                  }`}
                >
                  <span className="text-xs font-bold">{dayNum}</span>
                  
                  {/* Indicators / Colored dots for items */}
                  {dayData && dayData.count > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto w-full">
                      {dayData.tasks.some(t => t.area === "Academic") && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" title={t(language, "calendar.dot.academicDeadline")} />
                      )}
                      {dayData.tasks.some(t => t.area !== "Academic") && (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" title={t(language, "calendar.dot.generalTask")} />
                      )}
                      {dayData.workItems.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title={t(language, "calendar.dot.freelanceWork")} />
                      )}
                      {dayData.goals.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" title={t(language, "calendar.dot.goalDeadline")} />
                      )}
                      {dayData.workouts.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title={t(language, "calendar.dot.gymWorkout")} />
                      )}
                      {dayData.wraps.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title={t(language, "calendar.dot.dailyWrapCompleted")} />
                      )}
                      {dayData.reviews.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" title={t(language, "calendar.dot.weeklyReviewLogged")} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Details Drawer/Sidebar */}
        <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl min-h-[400px] flex flex-col">
          <div className="border-b border-[#27272a] pb-4 flex justify-between items-start">
            <div>
              <h3 className="text-base font-bold text-zinc-100">{t(language, "calendar.scheduleAgenda", "Schedule Agenda")}</h3>
              <p className="text-xs text-zinc-400 mt-1">{selectedDateLabel}</p>
            </div>
            {selectedDateStr === todayISO() && (
              <Link
                href="/today"
                className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition"
              >
                {t(language, "calendar.goToday", "Go to Today")}
              </Link>
            )}
          </div>

          <div className="mt-6 flex-1 overflow-y-auto space-y-4 pr-1">
            {selectedDayItems.count === 0 && (
              <p className="text-xs text-zinc-500 italic py-8 text-center">
                {t(language, "calendar.emptyDay", "No events, deadlines, wraps, or logs recorded for this day.")}
              </p>
            )}

            {/* Work items list */}
            {selectedDayItems.workItems.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 border-b border-[#27272a]/60 pb-1 mb-2">
                  {t(language, "calendar.freelanceItems", "Freelance Work Items")}
                </h4>
                <div className="space-y-2">
                  {selectedDayItems.workItems.map((wi) => (
                    <div key={wi.id} className="rounded-lg bg-[#121214] border border-[#27272a] p-3 text-xs flex flex-col gap-2">
                      <div className="flex justify-between items-center w-full">
                        <div>
                          <p className="font-bold text-zinc-100">{wi.title}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wide">
                            {t(language, `work.type.${wi.type}`, wi.type)} &middot; {t(language, "common.status")}: {t(language, `work.status.${wi.status}`, wi.status.replace("_", " "))}
                          </p>
                        </div>
                        {wi.value !== undefined && (
                          <span className="font-semibold text-amber-500 shrink-0">
                            {wi.value.toLocaleString()} {wi.currency || "USD"}
                          </span>
                        )}
                      </div>
                      {wi.referenceUrl && (
                        <div className="border-t border-[#27272a]/55 pt-1.5 flex justify-end">
                          <a
                            href={wi.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500 hover:text-amber-400 transition hover:underline cursor-pointer"
                          >
                            🔗 {t(language, "today.work.openReference")}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Academic tasks list */}
            {selectedDayItems.tasks.filter((task) => task.area === "Academic").length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 border-b border-[#27272a]/60 pb-1 mb-2">
                  {t(language, "calendar.academicTasks", "Academic Tasks & Exams")}
                </h4>
                <div className="space-y-2">
                  {selectedDayItems.tasks.filter((task) => task.area === "Academic").map((task) => (
                    <div key={task.id} className="rounded-lg bg-[#121214] border border-[#27272a] p-3 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-zinc-100">{task.title}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wide">
                          {t(language, `academics.type.${task.academicType ?? "Assignment"}`, task.academicType ?? "Assignment")} &middot; {t(language, `enum.priority.${task.priority}`, task.priority)} {t(language, "common.priority").toLowerCase()}
                        </p>
                      </div>
                      {task.status === "completed" ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">{t(language, "common.completed")}</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">{t(language, "common.pending")}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General tasks list */}
            {selectedDayItems.tasks.filter((task) => task.area !== "Academic").length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-[#27272a]/60 pb-1 mb-2">
                  {t(language, "calendar.agendaTasks", "Agenda Tasks")}
                </h4>
                <div className="space-y-2">
                  {selectedDayItems.tasks.filter((task) => task.area !== "Academic").map((task) => (
                    <div key={task.id} className="rounded-lg bg-[#121214] border border-[#27272a] p-3 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-zinc-100">{task.title}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wide">
                          {t(language, `enum.taskArea.${task.area}`, task.area)} &middot; {t(language, `enum.taskType.${task.taskType}`, task.taskType)} &middot; {t(language, `enum.priority.${task.priority}`, task.priority)}
                        </p>
                      </div>
                      {task.status === "completed" ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">{t(language, "common.completed")}</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">{t(language, "common.pending")}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gym workouts list */}
            {selectedDayItems.workouts.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-rose-500 border-b border-[#27272a]/60 pb-1 mb-2">
                  {t(language, "calendar.gymWorkouts", "Gym Workouts")}
                </h4>
                <div className="space-y-2">
                  {selectedDayItems.workouts.map((w) => {
                    const isRest = w.workoutType === "Rest";
                    return (
                      <div key={w.id} className="rounded-lg bg-[#121214] border border-[#27272a] p-3 text-xs">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-zinc-100">{t(language, `gym.workoutType.${w.workoutType}`, w.workoutType)} {t(language, "calendar.session", "Session")}</p>
                          <span className="text-[10px] text-zinc-400">{isRest ? t(language, "gym.restDay", "Rest day") : `${w.duration} ${t(language, "common.minutes").toLowerCase()}`}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          {t(language, "common.energy")}: {w.energy}/10 &middot; {t(language, "common.intensity")}: {w.intensity}/10
                        </p>
                        {w.notes && <p className="text-[11px] text-zinc-400 mt-1 italic">&ldquo;{w.notes}&rdquo;</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Goal deadlines list */}
            {selectedDayItems.goals.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 border-b border-[#27272a]/60 pb-1 mb-2">
                  {t(language, "calendar.goalMilestones", "Goal Target Milestones")}
                </h4>
                <div className="space-y-2">
                  {selectedDayItems.goals.map((g) => (
                    <div key={g.id} className="rounded-lg bg-[#121214] border border-[#27272a] p-3 text-xs">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-zinc-100">{g.title}</p>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500">{g.area}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        {t(language, "dashboard.target")}: {g.targetValue.toLocaleString()} {g.unit || ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily wrap details */}
            {selectedDayItems.wraps.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 border-b border-[#27272a]/60 pb-1 mb-2">
                  {t(language, "calendar.dailyWrapReflection", "Daily Wrap Reflection")}
                </h4>
                <div className="space-y-2">
                  {selectedDayItems.wraps.map((dw) => (
                    <div key={dw.id} className="rounded-lg bg-[#121214] border border-[#27272a] p-3.5 text-xs">
                      <p className="font-bold text-zinc-200">{t(language, "calendar.summarizedDay", "Deterministically Summarized Day")}</p>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        {dw.generatedSummary
                          ? generateDailyWrapSummary(dw.statsSnapshot, language)
                          : t(language, "review.noSummaryCaptured")}
                      </p>
                      
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {dw.mood !== undefined && (
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">{t(language, "dashboard.mood")} {dw.mood}/10</span>
                        )}
                        {dw.energy !== undefined && (
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">{t(language, "common.energy")} {dw.energy}/10</span>
                        )}
                        {dw.productivity !== undefined && (
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">{t(language, "dashboard.productivity")} {dw.productivity}/10</span>
                        )}
                      </div>

                      {dw.mainTakeaway && (
                        <p className="text-[11px] text-amber-500/90 font-medium mt-2 leading-relaxed">
                          {t(language, "calendar.takeaway", "Takeaway")}: &ldquo;{dw.mainTakeaway}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly reviews list */}
            {selectedDayItems.reviews.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-violet-500 border-b border-[#27272a]/60 pb-1 mb-2">
                  {t(language, "calendar.weeklyReviews", "Weekly Reviews Logged")}
                </h4>
                <div className="space-y-2">
                  {selectedDayItems.reviews.map((r) => (
                    <div key={r.id} className="rounded-lg bg-[#121214] border border-[#27272a] p-3 text-xs">
                      <p className="font-bold text-zinc-200">{t(language, "calendar.systemReview", "System Review")}: {t(language, "common.week")} {r.weekStart} {t(language, "calendar.to", "to")} {r.weekEnd}</p>
                      {r.wins && (
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed truncate">
                          {t(language, "review.wins", "Wins")}: {r.wins}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

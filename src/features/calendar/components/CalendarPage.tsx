/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useTasks, todayISO, calculateNextOccurrenceDate } from "@/lib/tasks";
import type { AtlasTask } from "@/types/atlas";
import { useWorkItems, useClients } from "@/lib/work";
import { useSubjects } from "@/lib/academics";
import {
  getHabitCalendarItemsForMonth,
  isDailyHabitGoal,
  useGoals,
} from "@/lib/goals";
import { useWorkoutLogs } from "@/lib/gym";
import { generateDailyWrapSummary, useDailyWraps } from "@/lib/dailyWraps";
import { useWeeklyReviews } from "@/lib/reviews";
import { useAtlasSettings } from "@/lib/settings";
import {
  formatMoney,
  getPlannedExpenseOccurrencesForMonth,
  usePlannedExpenses,
} from "@/lib/finances";
import { getLanguageLocale, t } from "@/lib/i18n";
import { isModuleEnabled } from "@/lib/modules";

interface AgendaItem {
  id: string;
  date: string;
  category: "deadlines" | "finances" | "consistency" | "reflections";
  priorityScore: number;
  isCompletedOrMuted: boolean;
  type: "task" | "work" | "goal" | "finance" | "habit" | "workout" | "wrap" | "review";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  isProjectedOccurrence?: boolean;
}

const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const daysBetween = (dateStr1: string, dateStr2: string): number => {
  const [y1, m1, d1] = dateStr1.split("-").map(Number);
  const [y2, m2, d2] = dateStr2.split("-").map(Number);
  const d1UTC = Date.UTC(y1, m1 - 1, d1);
  const d2UTC = Date.UTC(y2, m2 - 1, d2);
  const diffMs = d2UTC - d1UTC;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const getMonthsInRange = (startStr: string, endStr: string) => {
  const months: { year: number; monthIndex: number }[] = [];
  const [sY, sM] = startStr.split("-").map(Number);
  const [eY, eM] = endStr.split("-").map(Number);
  
  let curY = sY;
  let curM = sM - 1;
  
  const endY = eY;
  const endM = eM - 1;
  
  while (curY < endY || (curY === endY && curM <= endM)) {
    months.push({ year: curY, monthIndex: curM });
    curM++;
    if (curM > 11) {
      curM = 0;
      curY++;
    }
  }
  return months;
};

function getProjectedTasks(
  tasks: AtlasTask[],
  startStr: string,
  endStr: string,
  academicsEnabled: boolean,
  todayEnabled: boolean
): (AtlasTask & { isProjectedOccurrence?: boolean })[] {
  const projected: (AtlasTask & { isProjectedOccurrence?: boolean })[] = [];

  tasks.forEach((t) => {
    if (!t.recurrence) return;

    const isAcademic = t.area === "Academic";
    if ((isAcademic && !academicsEnabled) || (!isAcademic && !todayEnabled)) return;

    const currentPlanned = t.plannedDate;
    if (!currentPlanned || !/^\d{4}-\d{2}-\d{2}$/.test(currentPlanned)) return;

    let loopDate = calculateNextOccurrenceDate(currentPlanned, t.recurrence);
    const loopLimit = 120; // Hard cap
    let count = 0;

    while (loopDate && loopDate <= endStr && count < loopLimit) {
      if (loopDate >= startStr) {
        // Deduplication: check if any real task exists for this series on loopDate
        const hasRealTaskOnDate = tasks.some((existing) => {
          const tSeriesId = t.seriesId || t.id.split("-completed-")[0];
          const existingSeriesId = existing.seriesId || existing.id.split("-completed-")[0];
          const isSameSeries = tSeriesId === existingSeriesId;

          if (!isSameSeries) return false;

          return existing.plannedDate === loopDate || existing.dueDate === loopDate;
        });

        if (!hasRealTaskOnDate) {
          let nextDueDate = t.dueDate;
          if (t.dueDate && t.dueDate !== "" && t.dueDate === t.plannedDate) {
            nextDueDate = loopDate;
          }

          projected.push({
            ...t,
            id: `${t.id}-projected-${loopDate}`,
            plannedDate: loopDate,
            dueDate: nextDueDate,
            completedAt: null,
            completionNotes: "",
            isProjectedOccurrence: true,
          });
        }
      }
      loopDate = calculateNextOccurrenceDate(loopDate, t.recurrence);
      count++;
    }
  });

  return projected;
}

export function CalendarPage() {
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const { tasks } = useTasks();
  const { workItems } = useWorkItems();
  const { goals } = useGoals();
  const { workouts } = useWorkoutLogs();
  const { dailyWraps } = useDailyWraps();
  const { reviews } = useWeeklyReviews();
  const { plannedExpenses } = usePlannedExpenses();
  const { clients } = useClients();
  const { subjects } = useSubjects();
  const financesEnabled = isModuleEnabled(settings, "finances");
  const goalsEnabled = isModuleEnabled(settings, "goals");
  const workEnabled = isModuleEnabled(settings, "work");
  const gymEnabled = isModuleEnabled(settings, "gym");
  const academicsEnabled = isModuleEnabled(settings, "academics");
  const todayEnabled = isModuleEnabled(settings, "today");
  const reviewEnabled = isModuleEnabled(settings, "review");

  const [hasMounted, setHasMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 5, 2));
  const [selectedDateStr, setSelectedDateStr] = useState<string>("2026-06-02");

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    deadlines: true,
    finances: true,
    consistency: true,
    reflections: false,
  });

  const [filters, setFilters] = useState({
    deadlines: true,
    finances: true,
    consistency: true,
    reflections: true,
  });

  const [view, setView] = useState<"month" | "agenda">("month");
  const [agendaRange, setAgendaRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    setHasMounted(true);
    setCurrentDate(new Date());
    setSelectedDateStr(todayISO());

    try {
      const storedView = localStorage.getItem("atlas.calendarView");
      if (storedView === "month" || storedView === "agenda") {
        setView(storedView);
      }
    } catch (e) {
      console.error("Failed to parse calendar view", e);
    }

    try {
      const stored = localStorage.getItem("atlas.calendarFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.deadlines === "boolean" &&
          typeof parsed.finances === "boolean" &&
          typeof parsed.consistency === "boolean" &&
          typeof parsed.reflections === "boolean"
        ) {
          setFilters(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse calendar filters", e);
    }
  }, []);

  const toggleFilter = (key: "deadlines" | "finances" | "consistency" | "reflections") => {
    setFilters(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("atlas.calendarFilters", JSON.stringify(next));
      return next;
    });
  };

  const showAllFilters = () => {
    const next = { deadlines: true, finances: true, consistency: true, reflections: true };
    setFilters(next);
    localStorage.setItem("atlas.calendarFilters", JSON.stringify(next));
  };

  const hideAllFilters = () => {
    const next = { deadlines: false, finances: false, consistency: false, reflections: false };
    setFilters(next);
    localStorage.setItem("atlas.calendarFilters", JSON.stringify(next));
  };

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayIndex = new Date(year, monthIndex, 1).getDay();

  const blanks = Array(firstDayIndex).fill(null);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...dayNumbers];

  const monthLabel = useMemo(() => {
    if (!hasMounted) return "";
    return new Intl.DateTimeFormat(getLanguageLocale(language), {
      month: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, monthIndex, 1)));
  }, [hasMounted, language, monthIndex, year]);

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
      plannedExpenses: ReturnType<typeof getPlannedExpenseOccurrencesForMonth>;
      habitGoals: ReturnType<typeof getHabitCalendarItemsForMonth>;
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
          plannedExpenses: [],
          habitGoals: [],
          count: 0,
        };
      }
      return dates[dateStr];
    };

    // 1. General & Academic Tasks
    tasks.forEach((t) => {
      const isAcademic = t.area === "Academic";
      if ((isAcademic && !academicsEnabled) || (!isAcademic && !todayEnabled)) {
        return;
      }
      const date = t.plannedDate || t.dueDate;
      if (date) {
        const target = getOrCreate(date);
        target.tasks.push(t);
        target.count++;
      }
    });

    // Generate and merge virtual task projections for the current visible month
    const startOfMonth = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const endOfMonth = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    const monthProjected = getProjectedTasks(
      tasks,
      startOfMonth,
      endOfMonth,
      academicsEnabled,
      todayEnabled
    );
    monthProjected.forEach((pt) => {
      const target = getOrCreate(pt.plannedDate);
      target.tasks.push(pt);
      target.count++;
    });

    // 2. Freelance Work Items
    if (workEnabled) {
      workItems.forEach((w) => {
        const date = w.plannedDate || w.deadline;
        if (date) {
          const target = getOrCreate(date);
          target.workItems.push(w);
          target.count++;
        }
      });
    }

    // 3. Goal Deadlines
    if (goalsEnabled) {
      goals.forEach((g) => {
        if (g.deadline && !isDailyHabitGoal(g)) {
          const target = getOrCreate(g.deadline);
          target.goals.push(g);
          target.count++;
        }
      });
    }

    // 4. Gym Workouts
    if (gymEnabled) {
      workouts.forEach((w) => {
        if (w.date) {
          const target = getOrCreate(w.date);
          target.workouts.push(w);
          target.count++;
        }
      });
    }

    // 5. Daily Wraps
    if (reviewEnabled) {
      dailyWraps.forEach((dw) => {
        if (dw.date) {
          const target = getOrCreate(dw.date);
          target.wraps.push(dw);
          target.count++;
        }
      });
    }

    // 6. Weekly Reviews
    if (reviewEnabled) {
      reviews.forEach((r) => {
        const date = r.createdAt?.slice(0, 10) || r.weekStart;
        if (date) {
          const target = getOrCreate(date);
          target.reviews.push(r);
          target.count++;
        }
      });
    }

    // 7. Planned finance commitments
    if (financesEnabled) {
      getPlannedExpenseOccurrencesForMonth(
        plannedExpenses,
        year,
        monthIndex,
        todayISO(),
      ).forEach((expense) => {
        const target = getOrCreate(expense.occurrenceDueDate);
        target.plannedExpenses.push(expense);
        target.count++;
      });
    }

    // 8. Daily habit goals
    if (goalsEnabled) {
      getHabitCalendarItemsForMonth(goals, year, monthIndex, todayISO()).forEach((habit) => {
        const target = getOrCreate(habit.date);
        target.habitGoals.push(habit);
        target.count++;
      });
    }

    return dates;
  }, [
    tasks,
    workItems,
    goals,
    workouts,
    dailyWraps,
    reviews,
    financesEnabled,
    goalsEnabled,
    workEnabled,
    gymEnabled,
    academicsEnabled,
    todayEnabled,
    reviewEnabled,
    plannedExpenses,
    year,
    monthIndex,
    daysInMonth,
  ]);

  const selectedDayItems = useMemo(() => {
    return aggregatedItems[selectedDateStr] || {
      tasks: [],
      workItems: [],
      goals: [],
      workouts: [],
      wraps: [],
      reviews: [],
      plannedExpenses: [],
      habitGoals: [],
      count: 0,
    };
  }, [aggregatedItems, selectedDateStr]);

  // Memoized unified list of all range agenda items
  const agendaItems = useMemo(() => {
    const getPlannedOccurrencesForRangeAndOverdue = (startStr: string, endStr: string) => {
      const pastStart = addDays(startStr, -90);
      const months = getMonthsInRange(pastStart, endStr);
      const results: ReturnType<typeof getPlannedExpenseOccurrencesForMonth> = [];
      months.forEach(({ year, monthIndex }) => {
        const occurrences = getPlannedExpenseOccurrencesForMonth(
          plannedExpenses,
          year,
          monthIndex,
          todayISO()
        );
        occurrences.forEach((occ) => {
          const date = occ.occurrenceDueDate;
          const isPaid = occ.effectiveStatus === "paid";
          const isMuted = occ.effectiveStatus === "skipped" || occ.effectiveStatus === "cancelled";
          
          if (date >= startStr && date <= endStr) {
            results.push(occ);
          } else if (date < startStr) {
            if (!isPaid && !isMuted) {
              results.push(occ);
            }
          }
        });
      });
      return results;
    };

    const getHabitsForRange = (startStr: string, endStr: string) => {
      const months = getMonthsInRange(startStr, endStr);
      const results: ReturnType<typeof getHabitCalendarItemsForMonth> = [];
      months.forEach(({ year, monthIndex }) => {
        const habits = getHabitCalendarItemsForMonth(
          goals,
          year,
          monthIndex,
          todayISO()
        );
        habits.forEach((hab) => {
          if (hab.date >= startStr && hab.date <= endStr) {
            if (!results.some(r => r.goal.id === hab.goal.id && r.date === hab.date)) {
              results.push(hab);
            }
          }
        });
      });
      return results;
    };

    const itemsList: AgendaItem[] = [];

    const todayStr = todayISO();
    const endDateStr = addDays(todayStr, agendaRange - 1);

    // 1. Tasks
    tasks.forEach((t) => {
      const isAcademic = t.area === "Academic";
      if ((isAcademic && !academicsEnabled) || (!isAcademic && !todayEnabled)) return;
      const date = t.plannedDate || t.dueDate;
      if (!date) return;

      const isOverdue = date < todayStr && t.status !== "completed";
      const inRange = date >= todayStr && date <= endDateStr;

      if (inRange || isOverdue) {
        const isCompleted = t.status === "completed";
        const isHigh = !isCompleted && (t.priority === "high" || t.priority === "critical");
        let priorityScore = 3;
        if (isOverdue) priorityScore = 10;
        else if (isHigh) priorityScore = 5;
        else if (isCompleted) priorityScore = 1;

        itemsList.push({
          id: `task-${t.id}-${date}`,
          date,
          category: "deadlines",
          priorityScore,
          isCompletedOrMuted: isCompleted,
          type: "task",
          payload: t,
        });
      }
    });

    // Generate and merge virtual task projections for the agenda range
    const agendaProjected = getProjectedTasks(
      tasks,
      todayStr,
      endDateStr,
      academicsEnabled,
      todayEnabled
    );
    agendaProjected.forEach((pt) => {
      const date = pt.plannedDate;
      itemsList.push({
        id: `task-${pt.id}-${date}`,
        date,
        category: "deadlines",
        priorityScore: 2,
        isCompletedOrMuted: false,
        type: "task",
        payload: pt,
        isProjectedOccurrence: true,
      });
    });

    // 2. Work Items
    if (workEnabled) {
      workItems.forEach((w) => {
        const date = w.plannedDate || w.deadline;
        if (!date) return;

        const isOverdue = date < todayStr && w.status !== "completed" && w.status !== "archived";
        const inRange = date >= todayStr && date <= endDateStr;

        if (inRange || isOverdue) {
          const isCompleted = w.status === "completed";
          const isHigh = !isCompleted && (w.priority === "high" || w.priority === "critical");
          let priorityScore = 3;
          if (isOverdue) priorityScore = 10;
          else if (isHigh) priorityScore = 5;
          else if (isCompleted) priorityScore = 1;

          itemsList.push({
            id: `work-${w.id}-${date}`,
            date,
            category: "deadlines",
            priorityScore,
            isCompletedOrMuted: isCompleted || w.status === "archived",
            type: "work",
            payload: w,
          });
        }
      });
    }

    // 3. Goals
    if (goalsEnabled) {
      goals.forEach((g) => {
        if (isDailyHabitGoal(g) || !g.deadline) return;

        const isOverdue = g.deadline < todayStr && g.status !== "completed" && g.status !== "paused";
        const inRange = g.deadline >= todayStr && g.deadline <= endDateStr;

        if (inRange || isOverdue) {
          const isCompleted = g.status === "completed";
          let priorityScore = 3;
          if (isOverdue) priorityScore = 10;
          else if (isCompleted) priorityScore = 1;

          itemsList.push({
            id: `goal-${g.id}`,
            date: g.deadline,
            category: "deadlines",
            priorityScore,
            isCompletedOrMuted: isCompleted || g.status === "paused",
            type: "goal",
            payload: g,
          });
        }
      });
    }

    // 4. Planned Finances
    if (financesEnabled) {
      const occurrences = getPlannedOccurrencesForRangeAndOverdue(todayStr, endDateStr);
      occurrences.forEach((occ) => {
        const date = occ.occurrenceDueDate;
        const isPaid = occ.effectiveStatus === "paid";
        const isMuted = occ.effectiveStatus === "skipped" || occ.effectiveStatus === "cancelled";
        const isOverdue = date < todayStr && !isPaid && !isMuted;

        let priorityScore = 3;
        if (isOverdue) priorityScore = 12;
        else if (isPaid || isMuted) priorityScore = 1;

        itemsList.push({
          id: `finance-${occ.sourceExpenseId}-${occ.occurrenceMonth}-${date}`,
          date,
          category: "finances",
          priorityScore,
          isCompletedOrMuted: isPaid || isMuted,
          type: "finance",
          payload: occ,
        });
      });
    }

    // 5. Daily Habits
    if (goalsEnabled) {
      const habits = getHabitsForRange(todayStr, endDateStr);
      habits.forEach((hab) => {
        const isCompleted = hab.status === "completed";
        const isMuted = hab.status === "skipped" || hab.status === "missed";
        let priorityScore = 2;
        if (isCompleted || isMuted) priorityScore = 1;

        itemsList.push({
          id: `habit-${hab.goal.id}-${hab.date}`,
          date: hab.date,
          category: "consistency",
          priorityScore,
          isCompletedOrMuted: isCompleted || isMuted,
          type: "habit",
          payload: hab,
        });
      });
    }

    // 6. Gym Workouts
    if (gymEnabled) {
      workouts.forEach((w) => {
        if (!w.date) return;
        if (w.date >= todayStr && w.date <= endDateStr) {
          itemsList.push({
            id: `workout-${w.id}`,
            date: w.date,
            category: "consistency",
            priorityScore: 2,
            isCompletedOrMuted: false,
            type: "workout",
            payload: w,
          });
        }
      });
    }

    // 7. Daily Wraps
    if (reviewEnabled) {
      dailyWraps.forEach((dw) => {
        if (!dw.date) return;
        if (dw.date >= todayStr && dw.date <= endDateStr) {
          itemsList.push({
            id: `wrap-${dw.id}`,
            date: dw.date,
            category: "reflections",
            priorityScore: 1.5,
            isCompletedOrMuted: false,
            type: "wrap",
            payload: dw,
          });
        }
      });
    }

    // 8. Weekly Reviews
    if (reviewEnabled) {
      reviews.forEach((r) => {
        const date = r.createdAt?.slice(0, 10) || r.weekStart;
        if (!date) return;
        if (date >= todayStr && date <= endDateStr) {
          itemsList.push({
            id: `review-${r.id}`,
            date,
            category: "reflections",
            priorityScore: 1.5,
            isCompletedOrMuted: false,
            type: "review",
            payload: r,
          });
        }
      });
    }

    return itemsList;
  }, [
    tasks,
    workItems,
    goals,
    workouts,
    dailyWraps,
    reviews,
    plannedExpenses,
    financesEnabled,
    goalsEnabled,
    workEnabled,
    gymEnabled,
    academicsEnabled,
    todayEnabled,
    reviewEnabled,
    agendaRange,
  ]);

  const filteredAgendaItems = useMemo(() => {
    return agendaItems.filter((item) => {
      if (item.category === "deadlines" && !filters.deadlines) return false;
      if (item.category === "finances" && !filters.finances) return false;
      if (item.category === "consistency" && !filters.consistency) return false;
      if (item.category === "reflections" && !filters.reflections) return false;
      return true;
    });
  }, [agendaItems, filters]);

  const agendaGroups = useMemo(() => {
    const groupsMap: Record<string, typeof filteredAgendaItems> = {};
    
    filteredAgendaItems.forEach((item) => {
      if (!groupsMap[item.date]) {
        groupsMap[item.date] = [];
      }
      groupsMap[item.date].push(item);
    });

    const sortedDates = Object.keys(groupsMap).sort((a, b) => a.localeCompare(b));

    return sortedDates.map((dateStr) => {
      const items = groupsMap[dateStr].sort((a, b) => b.priorityScore - a.priorityScore);
      
      const todayStr = todayISO();
      const diff = daysBetween(todayStr, dateStr);
      let relativeLabel = "";
      if (diff < 0) {
        relativeLabel = t(language, "calendar.filters.overdue", "Overdue");
      } else if (diff === 0) {
        relativeLabel = t(language, "calendar.filters.today", "Today");
      } else if (diff === 1) {
        relativeLabel = t(language, "calendar.filters.tomorrow", "Tomorrow");
      } else {
        relativeLabel = language === "es" ? `En ${diff} días` : `In ${diff} days`;
      }

      let dateLabel = dateStr;
      const [y, m, d] = dateStr.split("-").map(Number);
      if (y && m && d) {
        const dateObj = new Date(Date.UTC(y, m - 1, d, 12));
        dateLabel = new Intl.DateTimeFormat(getLanguageLocale(language), {
          timeZone: "UTC",
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(dateObj);
      }

      return {
        dateStr,
        dateLabel,
        relativeLabel,
        items,
      };
    });
  }, [filteredAgendaItems, language]);

  // Card Rendering helpers
  const renderSourceBadge = (item: AgendaItem) => {
    let text = "";
    if (item.type === "task") {
      const isAcademic = item.payload.area === "Academic";
      text = isAcademic 
        ? t(language, "calendar.agenda.academicSource", "Academic Task")
        : t(language, "calendar.agenda.deadlineSource", "Deadline");
    } else if (item.type === "work") {
      text = t(language, "calendar.agenda.workSource", "Work Deliverable");
    } else if (item.type === "goal") {
      text = t(language, "calendar.agenda.goalSource", "Goal Milestone");
    } else if (item.type === "finance") {
      text = t(language, "calendar.agenda.financeSource", "Finance Commitment");
    } else if (item.type === "habit") {
      text = t(language, "calendar.agenda.habitSource", "Habit Goal");
    } else if (item.type === "workout") {
      text = t(language, "calendar.agenda.workoutSource", "Gym Workout");
    } else if (item.type === "wrap") {
      text = t(language, "calendar.agenda.wrapSource", "Daily Wrap");
    } else if (item.type === "review") {
      text = t(language, "calendar.agenda.reviewSource", "Weekly Review");
    }
    return (
      <span className="rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
        {text}
      </span>
    );
  };

  const renderStatusBadge = (item: AgendaItem) => {
    let text = "";
    let styles = "bg-zinc-800 text-zinc-400 border border-zinc-700/40";
    
    if (item.type === "task") {
      if (item.isProjectedOccurrence || item.payload?.isProjectedOccurrence) {
        text = language === "es" ? "🔁 Proyectada" : "🔁 Projected";
        styles = "bg-[#6F8799]/15 text-[#7F97A9] border border-[#6F8799]/20";
      } else if (item.payload.status === "completed") {
        text = t(language, "calendar.agenda.completedBadge", "Completed");
        styles = "bg-[#6F9990]/10 text-[#7FA9A0] border border-[#6F9990]/20";
      } else if (item.date < todayISO()) {
        text = t(language, "calendar.agenda.overdueBadge", "Overdue");
        styles = "bg-[#B26A5B]/10 text-[#C27A6B] border border-[#B26A5B]/20";
      } else {
        text = t(language, "calendar.agenda.pendingBadge", "Pending");
      }
    } else if (item.type === "work") {
      if (item.payload.status === "completed") {
        text = t(language, "calendar.agenda.completedBadge", "Completed");
        styles = "bg-[#6F9990]/10 text-[#7FA9A0] border border-[#6F9990]/20";
      } else if (item.payload.status === "archived") {
        text = t(language, "common.archived", "Archived");
        styles = "bg-zinc-800 text-zinc-500 border border-zinc-700/20";
      } else if (item.date < todayISO()) {
        text = t(language, "calendar.agenda.overdueBadge", "Overdue");
        styles = "bg-[#B26A5B]/10 text-[#C27A6B] border border-[#B26A5B]/20";
      } else {
        text = t(language, "calendar.agenda.pendingBadge", "Pending");
      }
    } else if (item.type === "goal") {
      if (item.payload.status === "completed") {
        text = t(language, "calendar.agenda.completedBadge", "Completed");
        styles = "bg-[#6F9990]/10 text-[#7FA9A0] border border-[#6F9990]/20";
      } else if (item.payload.status === "paused") {
        text = t(language, "common.paused", "Paused");
        styles = "bg-zinc-800 text-zinc-500 border border-zinc-700/20";
      } else if (item.date < todayISO()) {
        text = t(language, "calendar.agenda.overdueBadge", "Overdue");
        styles = "bg-[#B26A5B]/10 text-[#C27A6B] border border-[#B26A5B]/20";
      } else {
        text = t(language, "calendar.agenda.pendingBadge", "Pending");
      }
    } else if (item.type === "finance") {
      const status = item.payload.effectiveStatus;
      if (status === "paid") {
        text = t(language, "calendar.agenda.paidBadge", "Paid");
        styles = "bg-[#6F9990]/10 text-[#7FA9A0] border border-[#6F9990]/20";
      } else if (status === "skipped") {
        text = t(language, "calendar.agenda.skippedBadge", "Skipped");
        styles = "bg-zinc-850 text-zinc-400 border border-zinc-700/30";
      } else if (status === "cancelled") {
        text = t(language, "calendar.agenda.cancelledBadge", "Cancelled");
        styles = "bg-zinc-850 text-zinc-500 border border-zinc-700/30";
      } else if (item.date < todayISO()) {
        text = t(language, "calendar.agenda.overdueBadge", "Overdue");
        styles = "bg-[#B26A5B]/10 text-[#C27A6B] border border-[#B26A5B]/20";
      } else {
        text = t(language, "calendar.agenda.pendingBadge", "Pending");
      }
    } else if (item.type === "habit") {
      const status = item.payload.status;
      if (status === "completed") {
        text = t(language, "calendar.agenda.completedBadge", "Completed");
        styles = "bg-[#6F9990]/10 text-[#7FA9A0] border border-[#6F9990]/20";
      } else if (status === "missed") {
        text = t(language, "calendar.agenda.missedBadge", "Missed");
        styles = "bg-[#B26A5B]/10 text-[#C27A6B] border border-[#B26A5B]/20";
      } else if (status === "skipped") {
        text = t(language, "calendar.agenda.skippedBadge", "Skipped");
      } else {
        text = t(language, "calendar.agenda.pendingBadge", "Pending");
      }
    } else {
      return null;
    }

    return (
      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles}`}>
        {text}
      </span>
    );
  };

  const renderClientOrSubject = (item: AgendaItem) => {
    if (item.type === "task" && item.payload.area === "Academic") {
      const s = subjects.find((sub) => sub.id === item.payload.subjectId);
      if (s) {
        return (
          <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">
            🎓 {s.name}
          </p>
        );
      }
    } else if (item.type === "work") {
      const c = clients.find((cl) => cl.id === item.payload.clientId);
      if (c) {
        return (
          <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">
            💼 {c.name}
          </p>
        );
      }
    }
    return null;
  };

  const renderItemDetails = (item: AgendaItem) => {
    if (item.type === "task") {
      return (
        <div>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {t(language, `enum.taskArea.${item.payload.area}`, item.payload.area)} &middot; {t(language, `enum.taskType.${item.payload.taskType}`, item.payload.taskType)} &middot; {t(language, `enum.priority.${item.payload.priority}`, item.payload.priority)}
          </p>
          {item.payload.description && (
            <p className="mt-1.5 text-[11px] text-zinc-400 italic leading-relaxed">
              &ldquo;{item.payload.description}&rdquo;
            </p>
          )}
        </div>
      );
    } else if (item.type === "work") {
      return (
        <div>
          <div className="flex justify-between items-center mt-0.5 gap-2">
            <p className="text-[10px] text-zinc-500">
              {t(language, `work.type.${item.payload.type}`, item.payload.type)} &middot; {t(language, "common.status")}: {t(language, `work.status.${item.payload.status}`, item.payload.status)}
            </p>
            {item.payload.value !== undefined && (
              <span className="text-[11px] font-bold text-[#C8A96A] shrink-0">
                {item.payload.value.toLocaleString()} {item.payload.currency || "USD"}
              </span>
            )}
          </div>
          {item.payload.notes && (
            <p className="mt-1.5 text-[11px] text-zinc-400 italic leading-relaxed">
              &ldquo;{item.payload.notes}&rdquo;
            </p>
          )}
        </div>
      );
    } else if (item.type === "goal") {
      return (
        <div>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {item.payload.area} &middot; {t(language, "dashboard.target")}: {item.payload.targetValue.toLocaleString()} {item.payload.unit || ""}
          </p>
          {item.payload.notes && (
            <p className="mt-1.5 text-[11px] text-zinc-400 italic leading-relaxed">
              &ldquo;{item.payload.notes}&rdquo;
            </p>
          )}
        </div>
      );
    } else if (item.type === "finance") {
      const typeLabel = item.payload.recurrence === "monthly"
        ? t(language, "calendar.finance.recurringMonthlyPayment", "Recurring")
        : t(language, "calendar.finance.plannedPayment", "One-time");
      const isOverdue = item.date < todayISO() && item.payload.effectiveStatus !== "paid" && item.payload.effectiveStatus !== "skipped" && item.payload.effectiveStatus !== "cancelled";
      return (
        <div className="flex justify-between items-start mt-0.5 gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
              {typeLabel}
            </p>
            <p className={`text-[10px] mt-0.5 ${isOverdue ? "text-[#C27A6B] font-semibold" : "text-zinc-500"}`}>
              {item.payload.category} &middot; {getPlannedExpenseDueLabel(item.payload.daysUntilDue)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              {t(language, "calendar.finance.amount", "Amount")}
            </p>
            <p className={`font-semibold text-xs ${item.payload.effectiveStatus === "paid" ? "text-[#7FA9A0]/70" : "text-[#8FB9B0]"}`}>
              {formatMoney(item.payload.amount, item.payload.currency)}
            </p>
          </div>
        </div>
      );
    } else if (item.type === "habit") {
      return (
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            {item.payload.goal.area}
          </p>
          <div className="mt-1.5 flex gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>
              {t(language, "goals.habit.currentStreak")}: {item.payload.stats.currentStreak}
            </span>
            <span>
              {t(language, "goals.habit.bestStreak")}: {item.payload.stats.bestStreak}
            </span>
          </div>
          {item.payload.checkIn?.note && (
            <p className="mt-1.5 text-[11px] text-zinc-400 italic leading-relaxed">
              &ldquo;{item.payload.checkIn.note}&rdquo;
            </p>
          )}
        </div>
      );
    } else if (item.type === "workout") {
      return (
        <div>
          <div className="flex justify-between items-center mt-0.5 gap-2">
            <p className="text-[10px] text-zinc-500">
              {t(language, "common.energy")}: {item.payload.energy}/10 &middot; {t(language, "common.intensity")}: {item.payload.intensity}/10
            </p>
            {item.payload.workoutType !== "Rest" && (
              <span className="text-[10px] text-zinc-400 font-medium">
                {item.payload.duration} {t(language, "common.minutes").toLowerCase()}
              </span>
            )}
          </div>
          {item.payload.notes && (
            <p className="mt-1.5 text-[11px] text-zinc-400 italic leading-relaxed">
              &ldquo;{item.payload.notes}&rdquo;
            </p>
          )}
        </div>
      );
    } else if (item.type === "wrap") {
      return (
        <div className="space-y-1.5">
          <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
            {item.payload.generatedSummary
              ? generateDailyWrapSummary(item.payload.statsSnapshot, language)
              : t(language, "review.noSummaryCaptured")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {item.payload.mood !== undefined && (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                {t(language, "dashboard.mood")} {item.payload.mood}/10
              </span>
            )}
            {item.payload.energy !== undefined && (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                {t(language, "common.energy")} {item.payload.energy}/10
              </span>
            )}
            {item.payload.productivity !== undefined && (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                {t(language, "dashboard.productivity")} {item.payload.productivity}/10
              </span>
            )}
          </div>
          {item.payload.mainTakeaway && (
            <p className="text-[11px] text-[#C8A96A]/90 font-medium mt-1 leading-relaxed">
              {t(language, "calendar.takeaway", "Takeaway")}: &ldquo;{item.payload.mainTakeaway}&rdquo;
            </p>
          )}
        </div>
      );
    } else if (item.type === "review") {
      return (
        <div>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            {t(language, "calendar.systemReview", "System Review")}: {t(language, "common.week")} {item.payload.weekStart} {t(language, "calendar.to")} {item.payload.weekEnd}
          </p>
          {item.payload.wins && (
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              {t(language, "review.wins")}: {item.payload.wins}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderActionLink = (item: AgendaItem) => {
    if (item.type === "finance") {
      const isPaid = item.payload.effectiveStatus === "paid";
      const isMuted = item.payload.effectiveStatus === "skipped" || item.payload.effectiveStatus === "cancelled";
      if (!isPaid && !isMuted) {
        return (
          <div className="mt-3 border-t border-[#27272a]/55 pt-2 flex justify-end">
            <Link
              href="/finances"
              className="text-[10px] font-bold uppercase tracking-wider text-[#8FB9B0] transition hover:text-emerald-200 hover:underline cursor-pointer"
            >
              {t(language, "calendar.finance.markPaidInFinances", "Mark Paid in Finances")}
            </Link>
          </div>
        );
      }
    } else if (item.type === "work" && item.payload.referenceUrl) {
      return (
        <div className="mt-3 border-t border-[#27272a]/55 pt-2 flex justify-end">
          <a
            href={item.payload.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[9px] font-bold text-[#C8A96A] hover:text-[#D4B87A] transition hover:underline cursor-pointer"
          >
            🔗 {t(language, "today.work.openReference", "Open reference")}
          </a>
        </div>
      );
    }
    return null;
  };

  const renderAgendaItemCard = (item: AgendaItem) => {
    const isCompleted = item.isCompletedOrMuted;
    const isProjected = item.isProjectedOccurrence || item.payload?.isProjectedOccurrence;
    
    let leftBorderColor = "border-l-[#27272a]";
    let categoryBadgeText = "";
    let badgeStyles = "";

    if (item.category === "deadlines") {
      if (isProjected) {
        leftBorderColor = "border-l-[#6F8799]/30";
        categoryBadgeText = t(language, "calendar.category.deadlines");
        badgeStyles = "bg-[#6F8799]/15 text-[#7F97A9] border border-[#6F8799]/20";
      } else {
        leftBorderColor = "border-l-[#C8A96A]";
        categoryBadgeText = t(language, "calendar.category.deadlines");
        badgeStyles = "bg-[#C8A96A]/10 text-[#D4B87A] border border-[#C8A96A]/20";
      }
    } else if (item.category === "finances") {
      leftBorderColor = "border-l-[#6F9990]";
      categoryBadgeText = t(language, "calendar.category.finances");
      badgeStyles = "bg-[#6F9990]/10 text-[#7FA9A0] border border-[#6F9990]/20";
    } else if (item.category === "consistency") {
      leftBorderColor = "border-l-[#8A9A5B]";
      categoryBadgeText = t(language, "calendar.category.consistency");
      badgeStyles = "bg-[#8A9A5B]/10 text-[#9AAB6B] border border-[#8A9A5B]/20";
    } else if (item.category === "reflections") {
      leftBorderColor = "border-l-[#8B7A99]";
      categoryBadgeText = t(language, "calendar.category.reflections");
      badgeStyles = "bg-[#8B7A99]/10 text-[#9B8AA9] border border-[#8B7A99]/20";
    }

    const cardClasses = isProjected
      ? `flex flex-col justify-between h-full rounded-lg border border-[#6F8799]/20 border-dashed bg-[#6F8799]/5 p-4 border-l-4 ${leftBorderColor} transition-all opacity-85`
      : `flex flex-col justify-between h-full rounded-lg border border-[#27272a]/60 bg-[#121214]/40 p-4 border-l-4 ${leftBorderColor} hover:border-[#27272a] transition-all ${
          isCompleted ? "opacity-60 text-zinc-500" : ""
        }`;

    const titleText = item.type === "finance" ? item.payload.title : 
      item.type === "habit" ? item.payload.goal.title : 
      item.type === "workout" ? t(language, `gym.workoutType.${item.payload.workoutType}`, item.payload.workoutType) :
      item.type === "wrap" ? t(language, "calendar.summarizedDay", "Summarized Day") :
      item.type === "review" ? `${t(language, "calendar.systemReview", "System Review")}: ${item.payload.weekStart}` :
      item.payload.title;

    return (
      <div className={cardClasses}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badgeStyles}`}>
              {categoryBadgeText}
            </span>
            {renderSourceBadge(item)}
            {renderStatusBadge(item)}
          </div>

          <p className={`font-bold mt-1 leading-snug break-words ${
            isProjected 
              ? "text-[#7F97A9]" 
              : isCompleted 
              ? "line-through text-zinc-500" 
              : "text-zinc-100"
          }`}>
            {titleText}
          </p>

          {renderClientOrSubject(item)}
          {renderItemDetails(item)}
        </div>

        {renderActionLink(item)}
      </div>
    );
  };

  // 1. Deadlines & Milestones sorting
  const sortedDeadlines = useMemo(() => {
    const items = [
      ...selectedDayItems.tasks.map(t => ({ ...t, itemType: "task" as const })),
      ...selectedDayItems.workItems.map(w => ({ ...w, itemType: "work" as const })),
      ...selectedDayItems.goals.map(g => ({ ...g, itemType: "goal" as const })),
    ];

    const todayStr = todayISO();

    const isOverdue = (item: typeof items[0]) => {
      if (item.itemType === "task") {
        return item.status !== "completed" && !!item.dueDate && item.dueDate < todayStr;
      }
      if (item.itemType === "work") {
        return item.status !== "completed" && item.status !== "archived" && !!item.deadline && item.deadline < todayStr;
      }
      if (item.itemType === "goal") {
        return item.status !== "completed" && item.status !== "paused" && !!item.deadline && item.deadline < todayStr;
      }
      return false;
    };

    const isHighPriority = (item: typeof items[0]) => {
      if (item.itemType === "task" || item.itemType === "work") {
        return item.priority === "high" || item.priority === "critical";
      }
      return false;
    };

    const getOrderScore = (item: typeof items[0]) => {
      if (isOverdue(item)) return 100;
      if (isHighPriority(item)) return 50;
      return 10;
    };

    return items.sort((a, b) => {
      const scoreA = getOrderScore(a);
      const scoreB = getOrderScore(b);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      const isDoneA = a.status === "completed";
      const isDoneB = b.status === "completed";
      if (isDoneA !== isDoneB) {
        return isDoneA ? 1 : -1;
      }
      return 0;
    });
  }, [selectedDayItems]);

  // 2. Planned Finances sorting
  const sortedFinances = useMemo(() => {
    const items = [...selectedDayItems.plannedExpenses];
    return items.sort((a, b) => {
      const isPaidA = a.effectiveStatus === "paid";
      const isPaidB = b.effectiveStatus === "paid";
      const isMutedA = a.effectiveStatus === "skipped" || a.effectiveStatus === "cancelled";
      const isMutedB = b.effectiveStatus === "skipped" || b.effectiveStatus === "cancelled";

      const isOverdueA = a.daysUntilDue < 0 && !isPaidA && !isMutedA;
      const isOverdueB = b.daysUntilDue < 0 && !isPaidB && !isMutedB;

      const isTodayA = a.daysUntilDue === 0 && !isPaidA && !isMutedA;
      const isTodayB = b.daysUntilDue === 0 && !isPaidB && !isMutedB;

      const getScore = (isOverdue: boolean, isToday: boolean, isPaid: boolean, isMuted: boolean) => {
        if (isOverdue) return 100;
        if (isToday) return 80;
        if (!isPaid && !isMuted) return 50;
        if (isPaid) return 20;
        return 10;
      };

      const scoreA = getScore(isOverdueA, isTodayA, isPaidA, isMutedA);
      const scoreB = getScore(isOverdueB, isTodayB, isPaidB, isMutedB);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return a.daysUntilDue - b.daysUntilDue;
    });
  }, [selectedDayItems.plannedExpenses]);

  // 3. Gym & Habits Consistency sorting
  const sortedConsistency = useMemo(() => {
    const items = [
      ...selectedDayItems.habitGoals.map(h => ({ ...h, itemType: "habit" as const })),
      ...selectedDayItems.workouts.map(w => ({ ...w, itemType: "gym" as const })),
    ];

    const getScore = (item: typeof items[0]) => {
      if (item.itemType === "habit") {
        if (item.status === "pending") return 100;
        if (item.status === "completed") return 80;
        return 50;
      }
      const isRest = item.workoutType === "Rest";
      if (isRest) return 30;
      return 40;
    };

    return items.sort((a, b) => {
      return getScore(b) - getScore(a);
    });
  }, [selectedDayItems.habitGoals, selectedDayItems.workouts]);

  // 4. Reflections sorting
  const sortedReflections = useMemo(() => {
    return [
      ...selectedDayItems.wraps.map(w => ({ ...w, itemType: "wrap" as const })),
      ...selectedDayItems.reviews.map(r => ({ ...r, itemType: "review" as const })),
    ];
  }, [selectedDayItems.wraps, selectedDayItems.reviews]);

  const visibleCount = useMemo(() => {
    let count = 0;
    if (filters.deadlines) count += sortedDeadlines.length;
    if (filters.finances) count += sortedFinances.length;
    if (filters.consistency) count += sortedConsistency.length;
    if (filters.reflections) count += sortedReflections.length;
    return count;
  }, [filters, sortedDeadlines, sortedFinances, sortedConsistency, sortedReflections]);

  // Dynamic open/collapsed default behaviors on selected date change
  useEffect(() => {
    const hasDeadlines =
      selectedDayItems.tasks.length > 0 ||
      selectedDayItems.workItems.length > 0 ||
      selectedDayItems.goals.length > 0;

    const hasUrgentDeadlines =
      selectedDayItems.tasks.some(t => t.status !== "completed") ||
      selectedDayItems.workItems.some(w => w.status !== "completed" && w.status !== "archived");

    const hasFinances = selectedDayItems.plannedExpenses.length > 0;
    const hasUrgentFinances = selectedDayItems.plannedExpenses.some(
      e => e.effectiveStatus !== "paid" && e.effectiveStatus !== "skipped" && e.effectiveStatus !== "cancelled"
    );

    const hasConsistency = selectedDayItems.workouts.length > 0 || selectedDayItems.habitGoals.length > 0;
    const hasReflections = selectedDayItems.wraps.length > 0 || selectedDayItems.reviews.length > 0;

    const reflectionsOnlyContent = hasReflections && !hasDeadlines && !hasFinances && !hasConsistency;

    setExpandedSections({
      deadlines: hasUrgentDeadlines || (hasDeadlines && !hasUrgentFinances && !hasConsistency),
      finances: hasUrgentFinances || (hasFinances && !hasUrgentDeadlines && !hasConsistency),
      consistency: hasConsistency,
      reflections: reflectionsOnlyContent,
    });
  }, [selectedDateStr, selectedDayItems]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };


  const selectedDateLabel = useMemo(() => {
    if (!hasMounted) return "";
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
  }, [hasMounted, language, selectedDateStr]);

  const getPlannedExpenseDueLabel = (daysUntilDue: number) => {
    if (daysUntilDue < 0) {
      return `${t(language, "calendar.finance.overdue")} ${Math.abs(daysUntilDue)} ${t(language, "finances.planned.days")}`;
    }

    if (daysUntilDue === 0) {
      return t(language, "calendar.finance.dueToday");
    }

    if (daysUntilDue === 1) {
      return t(language, "calendar.finance.dueTomorrow");
    }

    return `${t(language, "calendar.finance.dueIn")} ${daysUntilDue} ${t(language, "finances.planned.days")}`;
  };
  const handleViewChange = (v: "month" | "agenda") => {
    setView(v);
    try {
      localStorage.setItem("atlas.calendarView", v);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-100 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C8A96A]">
            {t(language, "calendar.eyebrow", "Unified Time Engine")}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            {t(language, "calendar.title", "Atlas Calendar")}
          </h1>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex rounded-lg bg-[#121214] p-0.5 border border-[#27272a]">
            <button
              onClick={() => handleViewChange("month")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all select-none cursor-pointer ${
                view === "month"
                  ? "bg-[#27272a] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t(language, "calendar.view.month", "Month")}
            </button>
            <button
              onClick={() => handleViewChange("agenda")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all select-none cursor-pointer ${
                view === "agenda"
                  ? "bg-[#27272a] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t(language, "calendar.view.agenda", "Agenda")}
            </button>
          </div>
          <Link
            href="/"
            className="w-fit rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {t(language, "common.dashboard")}
          </Link>
        </div>
      </header>

      {/* Category Filter Chips */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl border border-[#27272a]/60 bg-[#18181b]/60 p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Deadlines Chip */}
          <button
            onClick={() => toggleFilter("deadlines")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all select-none cursor-pointer ${
              filters.deadlines
                ? "border-[#C8A96A]/30 bg-[#C8A96A]/10 text-[#D4B87A] shadow-sm"
                : "border-[#27272a] bg-[#121214] text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/40"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${filters.deadlines ? "bg-[#C8A96A]" : "bg-zinc-500"}`} />
            {t(language, "calendar.category.deadlines")}
          </button>

          {/* Finances Chip */}
          <button
            onClick={() => toggleFilter("finances")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all select-none cursor-pointer ${
              filters.finances
                ? "border-[#6F9990]/30 bg-[#6F9990]/10 text-[#7FA9A0] shadow-sm"
                : "border-[#27272a] bg-[#121214] text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/40"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${filters.finances ? "bg-[#6F9990]" : "bg-zinc-500"}`} />
            {t(language, "calendar.category.finances")}
          </button>

          {/* Consistency Chip */}
          <button
            onClick={() => toggleFilter("consistency")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all select-none cursor-pointer ${
              filters.consistency
                ? "border-[#8A9A5B]/30 bg-[#8A9A5B]/10 text-[#9AAB6B] shadow-sm"
                : "border-[#27272a] bg-[#121214] text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/40"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${filters.consistency ? "bg-[#8A9A5B]" : "bg-zinc-500"}`} />
            {t(language, "calendar.category.consistency")}
          </button>

          {/* Reflections Chip */}
          <button
            onClick={() => toggleFilter("reflections")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all select-none cursor-pointer ${
              filters.reflections
                ? "border-[#8B7A99]/30 bg-[#8B7A99]/10 text-[#9B8AA9] shadow-sm"
                : "border-[#27272a] bg-[#121214] text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/40"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${filters.reflections ? "bg-[#8B7A99]" : "bg-zinc-500"}`} />
            {t(language, "calendar.category.reflections")}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={showAllFilters}
            className="rounded-lg border border-[#27272a] bg-[#121214] hover:bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:text-white transition select-none cursor-pointer"
          >
            {t(language, "calendar.filters.showAll")}
          </button>
          <button
            onClick={hideAllFilters}
            className="rounded-lg border border-[#27272a] bg-[#121214] hover:bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:text-white transition select-none cursor-pointer"
          >
            {t(language, "calendar.filters.hideAll")}
          </button>
        </div>
      </div>

      {/* View Rendering */}
      {view === "month" ? (
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

                const hasDeadlines = dayData && (
                  dayData.tasks.length > 0 ||
                  dayData.workItems.length > 0 ||
                  dayData.goals.length > 0
                );

                const hasFinances = dayData && dayData.plannedExpenses.length > 0;

                const hasConsistency = dayData && (
                  dayData.workouts.length > 0 ||
                  dayData.habitGoals.length > 0
                );

                const hasReflections = dayData && (
                  dayData.wraps.length > 0 ||
                  dayData.reviews.length > 0
                );

                const showDeadlinesIndicator = hasDeadlines && filters.deadlines;
                const showFinancesIndicator = hasFinances && filters.finances;
                const showConsistencyIndicator = hasConsistency && filters.consistency;
                const showReflectionsIndicator = hasReflections && filters.reflections;

                const hasAnyIndicators = showDeadlinesIndicator || showFinancesIndicator || showConsistencyIndicator || showReflectionsIndicator;

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDateStr(cellDateStr)}
                    className={`aspect-square rounded-lg flex flex-col items-start justify-between p-2 max-sm:p-1 transition-all border text-left focus:outline-none ${
                      isSelected
                        ? "border-[#C8A96A] bg-[#C8A96A]/10 shadow-sm shadow-[#2C2518]/20"
                        : isToday
                        ? "border-zinc-500 bg-zinc-800/40 text-zinc-100 ring-1 ring-zinc-600"
                        : "border-[#27272a]/60 bg-[#121214] hover:border-zinc-500 text-zinc-300"
                    }`}
                  >
                    <span className="text-xs max-sm:text-[10px] font-bold leading-none">{dayNum}</span>
                    
                    {/* Category Track Indicators (replacing 9-dot system) */}
                    {dayData && hasAnyIndicators && (
                      <div className="flex flex-col gap-[2px] max-sm:gap-[1px] mt-auto w-full">
                        {showDeadlinesIndicator && (
                          <div
                            className="h-1 max-sm:h-0.5 w-full rounded bg-[#C8A96A]"
                            title={t(language, "calendar.category.deadlines", "Deadlines")}
                          />
                        )}
                        {showFinancesIndicator && (
                          <div
                            className="h-1 max-sm:h-0.5 w-full rounded bg-[#6F9990]"
                            title={t(language, "calendar.category.finances", "Finances")}
                          />
                        )}
                        {showConsistencyIndicator && (
                          <div
                            className="h-1 max-sm:h-0.5 w-full rounded bg-[#8A9A5B]"
                            title={t(language, "calendar.category.consistency", "Consistency")}
                          />
                        )}
                        {showReflectionsIndicator && (
                          <div
                            className="h-1 max-sm:h-0.5 w-full rounded bg-[#8B7A99]"
                            title={t(language, "calendar.category.reflections", "Reflections")}
                          />
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
                  className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-zinc-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition"
                >
                  {t(language, "calendar.goToday", "Go to Today")}
                </Link>
              )}
            </div>

            <div className="mt-6 flex-1 overflow-y-auto space-y-4 pr-1">
              {selectedDayItems.count === 0 ? (
                <p className="text-xs text-zinc-500 italic py-8 text-center">
                  {t(language, "calendar.emptyDay", "No events, deadlines, wraps, or logs recorded for this day.")}
                </p>
              ) : visibleCount === 0 ? (
                <p className="text-xs text-zinc-500 italic py-8 text-center">
                  {t(language, "calendar.filters.noVisible", "No visible items with the current filters.")}
                </p>
              ) : null}

              {/* Category 1: Deadlines & Milestones Collapsible */}
              {sortedDeadlines.length > 0 && filters.deadlines && (
                <div className="border border-[#27272a]/60 bg-[#121214]/40 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection("deadlines")}
                    className="w-full flex items-center justify-between p-3 bg-[#1c1c1f]/40 hover:bg-[#27272a]/40 transition text-left cursor-pointer select-none"
                    title={t(language, "calendar.agenda.toggleExpand", "Toggle details")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[10px] min-w-[12px]">
                        {expandedSections.deadlines ? "▼" : "▶"}
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        {t(language, "calendar.category.deadlines", "Deadlines")}
                      </h4>
                      <span className="rounded-full bg-[#C8A96A]/10 text-[#C8A96A] px-2 py-0.5 text-[10px] font-bold">
                        {sortedDeadlines.length}
                      </span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-[#C8A96A]" />
                  </button>

                  {expandedSections.deadlines && (
                    <div className="p-3 space-y-2 border-t border-[#27272a]/40 bg-[#121214]/20">
                      {sortedDeadlines.map((item) => {
                        const isTask = item.itemType === "task";
                        const isWork = item.itemType === "work";
                        const isGoal = item.itemType === "goal";

                        const todayStr = todayISO();
                        let isOverdue = false;
                        if (isTask) {
                          isOverdue = item.status !== "completed" && !!item.dueDate && item.dueDate < todayStr;
                        } else if (isWork) {
                          isOverdue = item.status !== "completed" && item.status !== "archived" && !!item.deadline && item.deadline < todayStr;
                        } else if (isGoal) {
                          isOverdue = item.status !== "completed" && item.status !== "paused" && !!item.deadline && item.deadline < todayStr;
                        }

                        const isCompleted = item.status === "completed";
                        const isHigh = !isCompleted && (isTask || isWork) && (item.priority === "high" || item.priority === "critical");
                        const isProjected = isTask && !!(item as { isProjectedOccurrence?: boolean }).isProjectedOccurrence;

                        let cardBorder = "border-[#27272a]";
                        let cardBg = "bg-[#121214]/80";
                        if (isCompleted) {
                          cardBorder = "border-[#6F9990]/10";
                          cardBg = "bg-zinc-900/30 opacity-70 text-zinc-400";
                        } else if (isOverdue) {
                          cardBorder = "border-[#B26A5B]/30";
                          cardBg = "bg-[#2A1815]/5";
                        } else if (isProjected) {
                          cardBorder = "border-[#6F8799]/15 border-dashed";
                          cardBg = "bg-[#6F8799]/5 opacity-85 text-zinc-450";
                        } else if (isHigh) {
                          cardBorder = "border-[#C8A96A]/20";
                        }

                        return (
                          <div
                            key={`${item.itemType}-${item.id}`}
                            className={`rounded-lg border p-3 text-xs transition-all ${cardBorder} ${cardBg}`}
                          >
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="rounded bg-[#C8A96A]/10 text-[#D4B87A] border border-[#C8A96A]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                    {isTask
                                      ? t(language, "calendar.agenda.deadlineSource", "Task")
                                      : isWork
                                      ? t(language, "calendar.agenda.workSource", "Work")
                                      : t(language, "calendar.agenda.goalSource", "Goal")}
                                  </span>
                                  {isProjected && (
                                    <span className="rounded bg-[#6F8799]/15 text-[#7F97A9] border border-[#6F8799]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                      {language === "es" ? "🔁 Proyectada" : "🔁 Projected"}
                                    </span>
                                  )}
                                  {isCompleted && (
                                    <span className="rounded bg-[#6F9990]/10 text-[#7FA9A0] border border-[#6F9990]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                      {t(language, "calendar.agenda.completedBadge", "Completed")}
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span className="rounded bg-[#B26A5B]/10 text-[#C27A6B] border border-[#B26A5B]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                      {t(language, "calendar.agenda.overdueBadge", "Overdue")}
                                    </span>
                                  )}
                                  {!isCompleted && !isOverdue && !isProjected && (
                                    <span className="rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                      {t(language, "calendar.agenda.pendingBadge", "Pending")}
                                    </span>
                                  )}
                                </div>
                                
                                <p className={`font-bold text-zinc-100 ${isCompleted ? "line-through text-zinc-500" : ""}`}>
                                  {item.title}
                                </p>

                                {isTask && (
                                  <p className="mt-1 text-[10px] text-zinc-400">
                                    {t(language, `enum.taskArea.${item.area}`, item.area)} &middot; {t(language, `enum.taskType.${item.taskType}`, item.taskType)} &middot; {t(language, `enum.priority.${item.priority}`, item.priority)}
                                  </p>
                                )}

                                {isWork && (
                                  <p className="mt-1 text-[10px] text-zinc-400">
                                    {t(language, `work.type.${item.type}`, item.type)} &middot; {t(language, "common.status", "Status")}: {t(language, `work.status.${item.status}`, item.status)}
                                  </p>
                                )}

                                {isGoal && (
                                  <p className="mt-1 text-[10px] text-zinc-400">
                                    {item.area} &middot; {t(language, "dashboard.target", "Target")}: {item.targetValue.toLocaleString()} {item.unit || ""}
                                  </p>
                                )}

                                {item.itemType === "task" && item.description && (
                                  <p className="mt-1.5 text-[11px] leading-5 text-zinc-400 italic">
                                    &ldquo;{item.description}&rdquo;
                                  </p>
                                )}
                                {item.itemType === "work" && item.notes && (
                                  <p className="mt-1.5 text-[11px] leading-5 text-zinc-400 italic">
                                    &ldquo;{item.notes}&rdquo;
                                  </p>
                                )}
                                {item.itemType === "goal" && item.notes && (
                                  <p className="mt-1.5 text-[11px] leading-5 text-zinc-400 italic">
                                    &ldquo;{item.notes}&rdquo;
                                  </p>
                                )}
                              </div>
                              
                              {isWork && item.value !== undefined && (
                                <span className="font-semibold text-[#C8A96A] text-right">
                                  {item.value.toLocaleString()} {item.currency || "USD"}
                                </span>
                              )}
                            </div>

                            {isWork && item.referenceUrl && (
                              <div className="mt-2 border-t border-[#27272a]/55 pt-1.5 flex justify-end">
                                <a
                                  href={item.referenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#C8A96A] hover:text-[#D4B87A] transition hover:underline cursor-pointer"
                                >
                                  🔗 {t(language, "today.work.openReference", "Open reference")}
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Category 2: Planned Finances Collapsible */}
              {sortedFinances.length > 0 && filters.finances && (
                <div className="border border-[#27272a]/60 bg-[#121214]/40 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection("finances")}
                    className="w-full flex items-center justify-between p-3 bg-[#1c1c1f]/40 hover:bg-[#27272a]/40 transition text-left cursor-pointer select-none"
                    title={t(language, "calendar.agenda.toggleExpand", "Toggle details")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[10px] min-w-[12px]">
                        {expandedSections.finances ? "▼" : "▶"}
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        {t(language, "calendar.category.finances", "Finances")}
                      </h4>
                      <span className="rounded-full bg-[#6F9990]/10 text-[#6F9990] px-2 py-0.5 text-[10px] font-bold">
                        {sortedFinances.length}
                      </span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-[#6F9990]" />
                  </button>

                  {expandedSections.finances && (
                    <div className="p-3 space-y-2 border-t border-[#27272a]/40 bg-[#121214]/20">
                      {sortedFinances.map((expense) => {
                        const isIncome = expense.cashflowType === "income";
                        const isPaid = expense.effectiveStatus === "paid";
                        const isSkipped = expense.effectiveStatus === "skipped";
                        const isCancelled = expense.effectiveStatus === "cancelled";
                        const isOverdue = expense.daysUntilDue < 0 && !isPaid && !isSkipped && !isCancelled;
                        
                        const typeLabel = expense.recurrence === "monthly"
                          ? (isIncome 
                              ? t(language, "calendar.finance.recurringMonthlyIncome", "Recurring Income") 
                              : t(language, "calendar.finance.recurringMonthlyPayment", "Recurring"))
                          : (isIncome 
                              ? t(language, "calendar.finance.plannedIncome", "One-time Income") 
                              : t(language, "calendar.finance.plannedPayment", "One-time"));

                        let cardBorder = "border-[#27272a]";
                        let cardBg = "bg-[#121214]/80";
                        if (isPaid) {
                          if (isIncome) {
                            cardBorder = "border-[#6F8799]/20 opacity-75 text-zinc-400";
                            cardBg = "bg-[#161A1D]/10";
                          } else {
                            cardBorder = "border-[#6F9990]/20 opacity-75 text-zinc-400";
                            cardBg = "bg-[#172320]/10";
                          }
                        } else if (isSkipped || isCancelled) {
                          cardBorder = "border-zinc-700/40 text-zinc-500 opacity-60 line-through";
                          cardBg = "bg-zinc-800/20";
                        } else if (isOverdue) {
                          cardBorder = "border-[#B26A5B]/30";
                          cardBg = "bg-[#2A1815]/5";
                        } else if (isIncome) {
                          cardBorder = "border-[#6F8799]/20";
                          cardBg = "bg-[#161A1D]/10";
                        }

                        return (
                          <div
                            key={`${expense.sourceExpenseId}-${expense.occurrenceMonth}`}
                            className={`rounded-lg border p-3 text-xs transition-all ${cardBorder} ${cardBg}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                    isIncome
                                      ? "bg-[#6F8799]/10 text-[#7F97A9] border-[#6F8799]/20"
                                      : "bg-[#6F9990]/10 text-[#7FA9A0] border-[#6F9990]/20"
                                  }`}>
                                    {isIncome 
                                      ? t(language, "finances.planned.type.income", "Income") 
                                      : t(language, "calendar.agenda.financeSource", "Finance")}
                                  </span>
                                  {isPaid && (
                                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                      isIncome
                                        ? "bg-[#6F8799]/15 text-[#7F97A9] border-[#6F8799]/20"
                                        : "bg-[#6F9990]/15 text-[#7FA9A0] border-[#6F9990]/20"
                                    }`}>
                                      {isIncome 
                                        ? t(language, "finances.planned.status.received", "Received") 
                                        : t(language, "calendar.agenda.paidBadge", "Paid")}
                                    </span>
                                  )}
                                  {isSkipped && (
                                    <span className="rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                      {t(language, "calendar.agenda.skippedBadge", "Skipped")}
                                    </span>
                                  )}
                                  {isCancelled && (
                                    <span className="rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                      {t(language, "calendar.agenda.cancelledBadge", "Cancelled")}
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span className="rounded bg-[#B26A5B]/10 text-[#C27A6B] border border-[#B26A5B]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                      {t(language, "calendar.agenda.overdueBadge", "Overdue")}
                                    </span>
                                  )}
                                  {!isPaid && !isSkipped && !isCancelled && !isOverdue && (
                                    <span className="rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                      {isIncome 
                                        ? t(language, "finances.planned.pendingIncome", "Pending income") 
                                        : t(language, "calendar.agenda.pendingBadge", "Pending")}
                                    </span>
                                  )}
                                </div>
                                
                                <p className={`font-bold text-zinc-100 ${isPaid || isSkipped || isCancelled ? "line-through text-zinc-500" : ""}`}>
                                  {expense.title}
                                </p>
                                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                                  {typeLabel}
                                </p>
                                <p className={`mt-1 text-[11px] ${isOverdue ? "font-semibold text-[#C27A6B]" : "text-zinc-500"}`}>
                                  {expense.category} &middot; {getPlannedExpenseDueLabel(expense.daysUntilDue)}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                  {t(language, "calendar.finance.amount", "Amount")}
                                </p>
                                <p className={`font-semibold ${
                                  isPaid 
                                    ? (isIncome ? "text-[#7F97A9]/70" : "text-[#7FA9A0]/70") 
                                    : (isIncome ? "text-[#7F97A9]" : "text-[#8FB9B0]")
                                }`}>
                                  {isIncome ? "+" : ""}{formatMoney(expense.amount, expense.currency)}
                                </p>
                              </div>
                            </div>
                            {!isPaid && !isSkipped && !isCancelled && (
                              <div className="mt-2 border-t border-[#27272a]/55 pt-2">
                                {isIncome ? (
                                  <Link
                                    href="/finances"
                                    className="text-[10px] font-bold uppercase tracking-wider text-[#7F97A9] transition hover:text-[#6F9990] hover:underline cursor-pointer"
                                  >
                                    {t(language, "calendar.finance.markReceivedInFinances", "Mark Received in Finances")}
                                  </Link>
                                ) : (
                                  <Link
                                    href="/finances"
                                    className="text-[10px] font-bold uppercase tracking-wider text-[#8FB9B0] transition hover:text-emerald-200 hover:underline cursor-pointer"
                                  >
                                    {t(language, "calendar.finance.markPaidInFinances", "Mark Paid in Finances")}
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Category 3: Gym & Habit Consistency Collapsible */}
              {sortedConsistency.length > 0 && filters.consistency && (
                <div className="border border-[#27272a]/60 bg-[#121214]/40 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection("consistency")}
                    className="w-full flex items-center justify-between p-3 bg-[#1c1c1f]/40 hover:bg-[#27272a]/40 transition text-left cursor-pointer select-none"
                    title={t(language, "calendar.agenda.toggleExpand", "Toggle details")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[10px] min-w-[12px]">
                        {expandedSections.consistency ? "▼" : "▶"}
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        {t(language, "calendar.category.consistency", "Consistency")}
                      </h4>
                      <span className="rounded-full bg-[#8A9A5B]/10 text-[#8A9A5B] px-2 py-0.5 text-[10px] font-bold">
                        {sortedConsistency.length}
                      </span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-[#8A9A5B]" />
                  </button>

                  {expandedSections.consistency && (
                    <div className="p-3 space-y-2 border-t border-[#27272a]/40 bg-[#121214]/20">
                      {sortedConsistency.map((item) => {
                        const isHabit = item.itemType === "habit";
                        let cardBorder = "border-[#27272a]";
                        let cardBg = "bg-[#121214]/80";

                        if (isHabit) {
                          const isCompleted = item.status === "completed";
                          const isMissed = item.status === "missed";
                          const isSkipped = item.status === "skipped";

                          if (isCompleted) {
                            cardBorder = "border-[#6F9990]/10";
                            cardBg = "bg-zinc-900/30 opacity-75 text-zinc-400";
                          } else if (isSkipped) {
                            cardBorder = "border-zinc-700/40";
                            cardBg = "bg-zinc-900/30 opacity-60 text-zinc-500";
                          } else if (isMissed) {
                            cardBorder = "border-[#B26A5B]/10";
                          }
                        }

                        return (
                          <div
                            key={`${item.itemType}-${isHabit ? item.goal.id : item.id}`}
                            className={`rounded-lg border p-3 text-xs transition-all ${cardBorder} ${cardBg}`}
                          >
                            {isHabit ? (
                              <div>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                      <span className="rounded bg-[#8A9A5B]/10 text-[#9AAB6B] border border-[#8A9A5B]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                        {t(language, "calendar.agenda.habitSource", "Habit")}
                                      </span>
                                      {item.status === "completed" && (
                                        <span className="rounded bg-[#6F9990]/10 text-[#7FA9A0] border border-[#6F9990]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                          {t(language, "calendar.agenda.completedBadge", "Completed")}
                                        </span>
                                      )}
                                      {item.status === "missed" && (
                                        <span className="rounded bg-[#B26A5B]/10 text-[#C27A6B] border border-[#B26A5B]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                          {t(language, "calendar.agenda.missedBadge", "Missed")}
                                        </span>
                                      )}
                                      {item.status === "skipped" && (
                                        <span className="rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                          {t(language, "calendar.agenda.skippedBadge", "Skipped")}
                                        </span>
                                      )}
                                      {item.status === "pending" && (
                                        <span className="rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                          {t(language, "calendar.agenda.pendingBadge", "Pending")}
                                        </span>
                                      )}
                                    </div>
                                    <p className={`font-bold text-zinc-100 ${item.status === "completed" ? "line-through text-zinc-500" : ""}`}>
                                      {item.goal.title}
                                    </p>
                                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                                      {item.goal.area}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                  <span>
                                    {t(language, "goals.habit.currentStreak")}: {item.stats.currentStreak}
                                  </span>
                                  <span>
                                    {t(language, "goals.habit.bestStreak")}: {item.stats.bestStreak}
                                  </span>
                                </div>
                                {item.checkIn?.note && (
                                  <p className="mt-2 text-[11px] leading-5 text-zinc-400 italic">
                                    &ldquo;{item.checkIn.note}&rdquo;
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                      <span className="rounded bg-[#8A9A5B]/10 text-[#9AAB6B] border border-[#8A9A5B]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                        {t(language, "calendar.agenda.workoutSource", "Workout")}
                                      </span>
                                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${
                                        item.workoutType === "Rest"
                                          ? "bg-zinc-800 text-zinc-400 border-zinc-700/40"
                                          : "bg-[#B26A5B]/10 text-[#C27A6B] border-[#B26A5B]/20"
                                      }`}>
                                        {item.workoutType === "Rest" ? t(language, "gym.restDay", "Rest day") : t(language, "calendar.session", "Session")}
                                      </span>
                                    </div>
                                    <p className="font-bold text-zinc-100">
                                      {t(language, `gym.workoutType.${item.workoutType}`, item.workoutType)}
                                    </p>
                                  </div>
                                  <span className="text-[10px] text-zinc-400">
                                    {item.workoutType === "Rest" ? "" : `${item.duration} ${t(language, "common.minutes").toLowerCase()}`}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-1">
                                  {t(language, "common.energy")}: {item.energy}/10 &middot; {t(language, "common.intensity")}: {item.intensity}/10
                                </p>
                                {item.notes && (
                                  <p className="mt-2 text-[11px] leading-5 text-zinc-400 italic">
                                    &ldquo;{item.notes}&rdquo;
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Category 4: Reflections & Audits Collapsible */}
              {sortedReflections.length > 0 && filters.reflections && (
                <div className="border border-[#27272a]/60 bg-[#121214]/40 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection("reflections")}
                    className="w-full flex items-center justify-between p-3 bg-[#1c1c1f]/40 hover:bg-[#27272a]/40 transition text-left cursor-pointer select-none"
                    title={t(language, "calendar.agenda.toggleExpand", "Toggle details")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[10px] min-w-[12px]">
                        {expandedSections.reflections ? "▼" : "▶"}
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        {t(language, "calendar.category.reflections", "Reflections")}
                      </h4>
                      <span className="rounded-full bg-[#8B7A99]/10 text-[#8B7A99] px-2 py-0.5 text-[10px] font-bold">
                        {sortedReflections.length}
                      </span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-[#8B7A99]" />
                  </button>

                  {expandedSections.reflections && (
                    <div className="p-3 space-y-2 border-t border-[#27272a]/40 bg-[#121214]/20">
                      {sortedReflections.map((item) => {
                        const isWrap = item.itemType === "wrap";
                        return (
                          <div
                            key={`${item.itemType}-${item.id}`}
                            className="rounded-lg border border-[#27272a] bg-[#121214]/80 p-3.5 text-xs transition-all"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="rounded bg-[#8B7A99]/10 text-[#9B8AA9] border border-[#8B7A99]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                {isWrap
                                  ? t(language, "calendar.agenda.wrapSource", "Daily Wrap")
                                  : t(language, "calendar.agenda.reviewSource", "Weekly Review")}
                              </span>
                            </div>

                            {isWrap ? (
                              <div>
                                <p className="font-bold text-zinc-200">
                                  {t(language, "calendar.summarizedDay", "Deterministically Summarized Day")}
                                </p>
                                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                  {item.generatedSummary
                                    ? generateDailyWrapSummary(item.statsSnapshot, language)
                                    : t(language, "review.noSummaryCaptured")}
                                </p>
                                
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  {item.mood !== undefined && (
                                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                                      {t(language, "dashboard.mood")} {item.mood}/10
                                    </span>
                                  )}
                                  {item.energy !== undefined && (
                                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                                      {t(language, "common.energy")} {item.energy}/10
                                    </span>
                                  )}
                                  {item.productivity !== undefined && (
                                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                                      {t(language, "dashboard.productivity")} {item.productivity}/10
                                    </span>
                                  )}
                                </div>

                                {item.mainTakeaway && (
                                  <p className="text-[11px] text-[#C8A96A]/90 font-medium mt-2 leading-relaxed">
                                    {t(language, "calendar.takeaway", "Takeaway")}: &ldquo;{item.mainTakeaway}&rdquo;
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                <p className="font-bold text-zinc-200">
                                  {t(language, "calendar.systemReview", "System Review")}: {t(language, "common.week")} {item.weekStart} {t(language, "calendar.to", "to")} {item.weekEnd}
                                </p>
                                {item.wins && (
                                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                    {t(language, "review.wins", "Wins")}: {item.wins}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl relative">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 border-b border-[#27272a]/60 pb-4">
              <h2 className="text-base font-bold text-zinc-100">{t(language, "calendar.view.agenda", "Agenda View")}</h2>
              <p className="text-xs text-zinc-400">
                {language === "es" 
                  ? "Visualiza tus próximos compromisos de forma cronológica." 
                  : "View your upcoming commitments chronologically."}
              </p>
            </div>

            {/* Agenda View Range Options Switcher */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAgendaRange(7)}
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition select-none cursor-pointer ${
                  agendaRange === 7
                    ? "border-[#C8A96A] bg-[#C8A96A]/10 text-[#D4B87A]"
                    : "border-[#27272a] bg-[#121214] text-zinc-400 hover:border-[#27272a] hover:bg-zinc-800/40"
                }`}
              >
                {t(language, "calendar.range.7days", "Next 7 days")}
              </button>
              <button
                onClick={() => setAgendaRange(30)}
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition select-none cursor-pointer ${
                  agendaRange === 30
                    ? "border-[#C8A96A] bg-[#C8A96A]/10 text-[#D4B87A]"
                    : "border-[#27272a] bg-[#121214] text-zinc-400 hover:border-[#27272a] hover:bg-zinc-800/40"
                }`}
              >
                {t(language, "calendar.range.30days", "Next 30 days")}
              </button>
              <button
                onClick={() => setAgendaRange(90)}
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition select-none cursor-pointer ${
                  agendaRange === 90
                    ? "border-[#C8A96A] bg-[#C8A96A]/10 text-[#D4B87A]"
                    : "border-[#27272a] bg-[#121214] text-zinc-400 hover:border-[#27272a] hover:bg-zinc-800/40"
                }`}
              >
                {t(language, "calendar.range.90days", "Next 90 days")}
              </button>
            </div>

            {/* Agenda chronological groups */}
            <div className="mt-4 flex-1 space-y-6">
              {agendaItems.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-zinc-500 italic">
                    {t(language, "calendar.agenda.noItems", "No visible agenda items in this range.")}
                  </p>
                </div>
              ) : agendaGroups.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-zinc-500 italic">
                    {t(language, "calendar.agenda.filteredOut", "Agenda items are hidden by your current filters.")}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {agendaGroups.map((group) => (
                    <div key={group.dateStr} className="space-y-4">
                      {/* Date Group Header */}
                      <div className="flex items-baseline justify-between border-b border-[#27272a]/60 pb-2">
                        <h3 className="text-sm font-bold text-zinc-300 capitalize">{group.dateLabel}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          group.relativeLabel === t(language, "calendar.filters.overdue")
                            ? "bg-[#B26A5B]/10 text-[#C27A6B] border border-[#B26A5B]/20"
                            : group.relativeLabel === t(language, "calendar.filters.today")
                            ? "bg-[#C8A96A]/10 text-[#D4B87A] border border-[#C8A96A]/20"
                            : "text-zinc-500"
                        }`}>
                          {group.relativeLabel}
                        </span>
                      </div>

                      {/* Date Group Cards Grid */}
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        {group.items.map((item) => (
                          <div key={item.id}>
                            {renderAgendaItemCard(item)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

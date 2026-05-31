import { todayISO } from "@/lib/storage";

export function calculateStreak(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };
  
  // Deduplicate and sort in ascending order
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => a.localeCompare(b));
  
  // Calculate current streak
  let current = 0;
  const today = new Date(todayISO());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  
  // If the last activity was not today or yesterday, streak is broken
  const hasActivityRecently = uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr);
  
  if (hasActivityRecently) {
    const anchor = new Date(uniqueDates.includes(todayStr) ? todayStr : yesterdayStr);
    while (true) {
      const checkStr = anchor.toISOString().slice(0, 10);
      if (uniqueDates.includes(checkStr)) {
        current++;
        anchor.setDate(anchor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longest = 0;
  let currentAccumulator = 0;
  let lastDate: Date | null = null;
  
  for (const dateStr of uniqueDates) {
    const currentDate = new Date(dateStr);
    if (!lastDate) {
      currentAccumulator = 1;
    } else {
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentAccumulator++;
      } else if (diffDays > 1) {
        longest = Math.max(longest, currentAccumulator);
        currentAccumulator = 1;
      }
    }
    lastDate = currentDate;
  }
  longest = Math.max(longest, currentAccumulator);

  return { current, longest };
}

export function getStreakTier(streak: number): "none" | "spark" | "flame" | "blaze" | "inferno" {
  if (streak <= 0) return "none";
  if (streak <= 2) return "spark";
  if (streak <= 6) return "flame";
  if (streak <= 13) return "blaze";
  return "inferno";
}

export const calculateDailyStreak = calculateStreak;
export const calculateGymStreak = calculateStreak;
export const getStreakIntensity = getStreakTier;

export function calculateAtlasStreak(
  plans: { date: string; status: string }[],
  dailyWraps: { date: string }[],
  tasks: { completedAt: string | null }[],
  workItems: { completedAt?: string }[],
  workouts: { date: string }[],
  notes: { createdAt: string }[],
  transactions: { date: string }[],
  studySessions: { date: string }[]
): { current: number; longest: number } {
  const dates: string[] = [];

  plans.forEach((p) => {
    if (p.status === "completed" && p.date) {
      dates.push(p.date.slice(0, 10));
    }
  });

  dailyWraps.forEach((dw) => {
    if (dw.date) {
      dates.push(dw.date.slice(0, 10));
    }
  });

  tasks.forEach((t) => {
    if (t.completedAt) {
      dates.push(t.completedAt.slice(0, 10));
    }
  });

  workItems.forEach((w) => {
    if (w.completedAt) {
      dates.push(w.completedAt.slice(0, 10));
    }
  });

  workouts.forEach((w) => {
    if (w.date) {
      dates.push(w.date.slice(0, 10));
    }
  });

  notes.forEach((n) => {
    if (n.createdAt) {
      dates.push(n.createdAt.slice(0, 10));
    }
  });

  transactions.forEach((t) => {
    if (t.date) {
      dates.push(t.date.slice(0, 10));
    }
  });

  studySessions.forEach((s) => {
    if (s.date) {
      dates.push(s.date.slice(0, 10));
    }
  });

  return calculateStreak(dates);
}

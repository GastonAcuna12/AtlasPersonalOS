"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { downloadWeeklyReviewMarkdown } from "@/lib/markdownExport";
import { downloadDailyWrapMarkdown } from "@/lib/markdownExport";
import {
  DEFAULT_RATINGS,
  REVIEW_AREAS,
  formatReviewDate,
  formatWeekRange,
  getCurrentWeekRange,
  getReviewAreaLabel,
  getRatingStatusLabel,
  getReviewStatusLabel,
  getStrongestArea,
  getWeakestArea,
  getWeeklyReviewAverage,
  type ReviewArea,
  type ReviewDraft,
  useWeeklyReviews,
} from "@/lib/reviews";
import { useXP } from "@/lib/xp";
import { generateDailyWrapSummary, useDailyWraps } from "@/lib/dailyWraps";
import { useAtlasSettings } from "@/lib/settings";
import { t } from "@/lib/i18n";
import { useTasks } from "@/lib/tasks";

const reflectionFields = [
  ["wins", "What went well this week?"],
  ["problems", "What problems showed up?"],
  ["lessons", "What did I learn?"],
  ["whatFeltOff", "What felt off?"],
  ["whatToImprove", "What should improve?"],
  ["nextWeekFocus", "Main focus for next week"],
] as const;

const optionalFields = [
  ["moodSummary", "Mood summary"],
  ["biggestWin", "Biggest win"],
  ["biggestProblem", "Biggest problem"],
  ["oneThingToStop", "One thing to stop"],
  ["oneThingToContinue", "One thing to continue"],
  ["oneThingToStart", "One thing to start"],
] as const;

type DraftTextKey = Exclude<keyof ReviewDraft, "ratings">;

export function WeeklyReviewPage() {
  const xp = useXP();
  const { settings } = useAtlasSettings();
  const language = settings.language;
  const { reviews, saveReview, deleteReview } = useWeeklyReviews(language);

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }, [reviews]);

  const [openReviewIds, setOpenReviewIds] = useState<Record<string, boolean>>({});

  const toggleReview = (id: string, index: number) => {
    setOpenReviewIds((prev) => {
      const currentVal = prev[id] !== undefined ? prev[id] : index === 0;
      return {
        ...prev,
        [id]: !currentVal,
      };
    });
  };

  const [draft, setDraft] = useState<ReviewDraft>(() => {
    const currentWeek = getCurrentWeekRange(new Date(), language);
    const existing = reviews.find(
      (review) =>
        review.weekStart === currentWeek.weekStart &&
        review.weekEnd === currentWeek.weekEnd
    );

    return existing
      ? {
          weekStart: existing.weekStart,
          weekEnd: existing.weekEnd,
          wins: existing.wins,
          problems: existing.problems,
          lessons: existing.lessons,
          whatFeltOff: existing.whatFeltOff,
          whatToImprove: existing.whatToImprove,
          nextWeekFocus: existing.nextWeekFocus,
          ratings: existing.ratings,
          moodSummary: existing.moodSummary,
          biggestWin: existing.biggestWin,
          biggestProblem: existing.biggestProblem,
          oneThingToStop: existing.oneThingToStop,
          oneThingToContinue: existing.oneThingToContinue,
          oneThingToStart: existing.oneThingToStart,
        }
      : {
          weekStart: currentWeek.weekStart,
          weekEnd: currentWeek.weekEnd,
          wins: "",
          problems: "",
          lessons: "",
          whatFeltOff: "",
          whatToImprove: "",
          nextWeekFocus: "",
          ratings: DEFAULT_RATINGS,
          moodSummary: "",
          biggestWin: "",
          biggestProblem: "",
          oneThingToStop: "",
          oneThingToContinue: "",
          oneThingToStart: "",
        };
  });
  const [message, setMessage] = useState("");

  const { dailyWraps } = useDailyWraps();
  const weekWraps = useMemo(() => {
    return dailyWraps
      .filter((w) => w.date >= draft.weekStart && w.date <= draft.weekEnd)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyWraps, draft.weekStart, draft.weekEnd]);

  const { tasks } = useTasks();
  const weekCompletedTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status !== "completed" || !task.completedAt) return false;
      const completedDate = task.completedAt.slice(0, 10);
      return completedDate >= draft.weekStart && completedDate <= draft.weekEnd;
    });
  }, [tasks, draft.weekStart, draft.weekEnd]);

  const weekWrapAverages = useMemo(() => {
    if (weekWraps.length === 0) return null;
    const moods = weekWraps.filter((w) => w.mood !== undefined).map((w) => w.mood!);
    const energies = weekWraps.filter((w) => w.energy !== undefined).map((w) => w.energy!);
    const prods = weekWraps.filter((w) => w.productivity !== undefined).map((w) => w.productivity!);
    const avg = (arr: number[]) =>
      arr.length > 0
        ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10
        : null;
    return {
      avgMood: avg(moods),
      avgEnergy: avg(energies),
      avgProductivity: avg(prods),
      totalTasks: weekWraps.reduce((s, w) => s + w.statsSnapshot.completedTasks, 0),
      totalWorkItems: weekWraps.reduce((s, w) => s + w.statsSnapshot.completedWorkItems, 0),
      totalXP: weekWraps.reduce((s, w) => s + w.statsSnapshot.xpEarnedToday, 0),
      gymDays: weekWraps.filter((w) => w.statsSnapshot.gymLogged).length,
      wrapCount: weekWraps.length,
    };
  }, [weekWraps]);

  const dominantArea = useMemo(() => {
    if (weekCompletedTasks.length === 0) return null;
    const counts: Record<string, number> = {};
    weekCompletedTasks.forEach((t) => {
      if (t.area) {
        counts[t.area] = (counts[t.area] || 0) + 1;
      }
    });
    let maxArea = "";
    let maxCount = 0;
    Object.entries(counts).forEach(([area, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxArea = area;
      }
    });
    return maxArea ? { area: maxArea, count: maxCount } : null;
  }, [weekCompletedTasks]);

  const dominantType = useMemo(() => {
    if (weekCompletedTasks.length === 0) return null;
    const counts: Record<string, number> = {};
    weekCompletedTasks.forEach((t) => {
      if (t.taskType) {
        counts[t.taskType] = (counts[t.taskType] || 0) + 1;
      }
    });
    let maxType = "";
    let maxCount = 0;
    Object.entries(counts).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    });
    return maxType ? { type: maxType, count: maxCount } : null;
  }, [weekCompletedTasks]);

  const weekSignal = useMemo(() => {
    const completedTasks = weekCompletedTasks.length;
    if (completedTasks === 0) {
      return {
        key: "review.signal.empty",
        colorClass: "bg-[#27272a]/10 border-[#27272a]/25 text-zinc-500",
      };
    }

    if (completedTasks >= 8) {
      return {
        key: "review.signal.highVelocity",
        colorClass: "bg-[#C8A96A]/10 border-[#C8A96A]/25 text-[#C8A96A]",
      };
    }

    const tasksWithNotes = weekCompletedTasks.filter(t => t.completionNotes?.trim()).length;
    if (tasksWithNotes / completedTasks >= 0.5) {
      return {
        key: "review.signal.deeplyReflective",
        colorClass: "bg-[#8B7A99]/10 border-[#8B7A99]/25 text-[#9B8AA9]",
      };
    }

    const avgEnergy = weekWrapAverages?.avgEnergy || null;
    const avgProd = weekWrapAverages?.avgProductivity || null;
    if (avgEnergy !== null && avgEnergy < 5.0 && avgProd !== null && avgProd >= 6.0) {
      return {
        key: "review.signal.highDiscipline",
        colorClass: "bg-[#B26A5B]/10 border-[#B26A5B]/25 text-[#C27A6B]",
      };
    }

    return {
      key: "review.signal.steadyProgress",
      colorClass: "bg-[#6F8799]/10 border-[#6F8799]/25 text-[#7F97A9]",
    };
  }, [weekCompletedTasks, weekWrapAverages]);

  function getFieldHelperText(key: string) {
    if (key === "wins") {
      if (weekCompletedTasks.length > 0) {
        const sampleTitles = weekCompletedTasks.slice(0, 2).map(t => t.title).join(", ");
        return t(language, "review.helper.wins")
          .replace("{count}", weekCompletedTasks.length.toString())
          .replace("{sample}", sampleTitles);
      }
      return t(language, "review.helper.winsEmpty");
    }

    if (key === "problems") {
      if (weekWrapAverages?.avgEnergy && weekWrapAverages.avgEnergy < 6) {
        return t(language, "review.helper.problemsLowEnergy")
          .replace("{energy}", weekWrapAverages.avgEnergy.toString());
      }
      return t(language, "review.helper.problems");
    }

    if (key === "lessons") {
      const tasksWithNotes = weekCompletedTasks.filter(t => t.completionNotes?.trim());
      if (tasksWithNotes.length > 0) {
        return t(language, "review.helper.lessons")
          .replace("{count}", tasksWithNotes.length.toString());
      }
      return t(language, "review.helper.lessonsEmpty");
    }

    if (key === "whatFeltOff") {
      return t(language, "review.helper.whatFeltOff");
    }

    if (key === "whatToImprove") {
      return t(language, "review.helper.whatToImprove");
    }

    if (key === "nextWeekFocus") {
      return t(language, "review.helper.nextWeekFocus");
    }

    if (key === "biggestWin") {
      if (weekCompletedTasks.length > 0) {
        return t(language, "review.helper.biggestWin");
      }
    }

    if (key === "biggestProblem") {
      return t(language, "review.helper.biggestProblem");
    }

    if (key === "oneThingToStop") {
      return t(language, "review.helper.oneThingToStop");
    }

    if (key === "oneThingToContinue") {
      return t(language, "review.helper.oneThingToContinue");
    }

    if (key === "oneThingToStart") {
      return t(language, "review.helper.oneThingToStart");
    }

    if (key === "moodSummary") {
      if (weekWrapAverages?.avgMood) {
        return t(language, "review.helper.moodSummary")
          .replace("{mood}", weekWrapAverages.avgMood.toString());
      }
      return t(language, "review.helper.moodSummaryStatic");
    }

    return null;
  }

  const previewReview = {
    ...draft,
    id: "preview",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const average = getWeeklyReviewAverage(previewReview);
  const strongestArea = getStrongestArea(previewReview, language);
  const weakestArea = getWeakestArea(previewReview, language);
  const currentSavedReview = reviews.find(
    (review) =>
      review.weekStart === draft.weekStart && review.weekEnd === draft.weekEnd
  );
  const statusLabel = getReviewStatusLabel(currentSavedReview ?? previewReview, language);

  function updateText(key: DraftTextKey, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateRating(key: ReviewArea, value: string) {
    setDraft((current) => ({
      ...current,
      ratings: {
        ...current.ratings,
        [key]: Number(value),
      },
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = saveReview(draft);

    if (result.isFirstSave) {
      xp.awardXP("weekly-review-completed", {
        amount: 50,
        label: "Completed weekly review",
      });
      setMessage(t(language, "review.saved", "Review saved locally! +50 XP awarded."));
    } else {
      setMessage(t(language, "review.updated", "Review updated locally. XP was already awarded for this week."));
    }

    setTimeout(() => setMessage(""), 4000);
  }

  return (
    <main className="min-h-screen bg-[#0d0d0e] text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 animate-fade-in-up">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C8A96A]">
              {t(language, "review.eyebrow", "Workspace Reflection")}
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
              {t(language, "review.title", "Weekly Review")}
            </h1>
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-zinc-400">
              {t(language, "review.description", "Close the week, identify recurring signals, and plan next week's focus through a calm, journaling reflection page.")}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {t(language, "common.dashboard")}
          </Link>
        </header>

        {/* Global Feedback Notifications */}
        {message && (
          <div className="mt-4 rounded-lg border border-[#8A9A5B]/30 bg-[#8A9A5B]/5 px-4 py-3 text-xs font-semibold text-[#9AAB6B]">
            ✓ {message}
          </div>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr] items-start">
          
          {/* Left Column — Stats & Scores */}
          <aside className="grid gap-6 content-start">
            {/* Week Status */}
            <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A]">
                {t(language, "review.auditing", "Auditing")}
              </p>
              <h2 className="mt-2 text-xl font-bold text-zinc-100">
                {formatWeekRange(draft, language)}
              </h2>
              <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                {t(language, "review.saveHint", "Save once to finalize the review. Updates persist locally without double-awarding XP.")}
              </p>
              <button
                type="submit"
                form="weekly-review-form"
                className="mt-5 w-full rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] py-3 text-xs font-bold text-zinc-950 transition uppercase tracking-wider text-center"
              >
                {t(language, "review.saveWeekly", "Save Weekly Review")}
              </button>
            </section>

            {/* Scores Overview */}
            <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "review.performanceDashboard", "Performance Dashboard")}
              </p>
              <h3 className="mt-1 text-lg font-bold text-zinc-100 mb-4">{t(language, "review.weeklyScores", "Weekly Scores")}</h3>
              <div className="grid gap-3 text-xs font-semibold">
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5">
                  <p className="text-zinc-500">{t(language, "review.averageScore", "Average score")}</p>
                  <p className="mt-2 text-2xl font-bold text-zinc-100">
                    {average}/10
                  </p>
                </div>
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5">
                  <p className="text-zinc-500">{t(language, "review.strongestArea", "Strongest area")}</p>
                  <p className="mt-2 text-sm font-bold text-zinc-200">
                    {strongestArea?.label} &middot; <span className="text-[#9AAB6B]">{strongestArea?.rating}/10</span>
                  </p>
                </div>
                <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5">
                  <p className="text-zinc-500">{t(language, "review.weakestArea", "Weakest area")}</p>
                  <p className="mt-2 text-sm font-bold text-zinc-200">
                    {weakestArea?.label} &middot; <span className="text-[#C27A6B]">{weakestArea?.rating}/10</span>
                  </p>
                </div>
                <div className="rounded-lg border border-[#C8A96A]/25 bg-[#C8A96A]/5 p-3.5">
                  <p className="text-[#C8A96A]/80">{t(language, "common.status")}</p>
                  <p className="mt-2 text-sm font-bold text-zinc-100 uppercase tracking-wide">
                    {statusLabel}
                  </p>
                </div>
              </div>
            </section>
          </aside>

          {/* Right Column — Main Forms & Wraps */}
          <div className="grid gap-6">
            <form
              id="weekly-review-form"
              onSubmit={handleSubmit}
              className="grid gap-6"
            >
              {/* Range sliders */}
              <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A96A] mb-2">
                  {t(language, "review.evaluation", "Evaluation")}
                </p>
                <h3 className="text-lg font-bold text-zinc-100">{t(language, "review.areaRatings", "Area Ratings")}</h3>
                <div className="mt-5 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                  {REVIEW_AREAS.map((area) => (
                    <label
                      key={area.key}
                      className="grid gap-3.5 rounded-lg border border-[#27272a] bg-[#121214] p-4 text-xs font-semibold text-zinc-300"
                    >
                      <span className="flex items-center justify-between gap-3">
                        {getReviewAreaLabel(area.key, language)}
                        <span className="font-bold text-[#C8A96A] text-sm">
                          {draft.ratings[area.key]}/10
                        </span>
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={draft.ratings[area.key]}
                        onChange={(event) =>
                          updateRating(area.key, event.target.value)
                        }
                        className="accent-[#C8A96A] cursor-pointer w-full"
                      />
                      <span className="w-fit rounded bg-[#18181b] border border-[#27272a] px-2 py-0.5 text-[10px] text-zinc-400">
                        {getRatingStatusLabel(draft.ratings[area.key], language)}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Daily Wraps Summary for this Week */}
              <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between border-b border-[#27272a]/60 pb-3 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A9A5B]">
                      {t(language, "review.chronologySnapshot", "Chronology Snapshot")}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-zinc-100">
                      {t(language, "review.dailyWrapsThisWeek", "Daily Wraps this Week")}
                    </h3>
                  </div>
                  <span className="rounded-full bg-zinc-800 border border-[#27272a] px-2.5 py-0.5 text-[10px] font-bold text-zinc-400">
                    {weekWraps.length} {t(language, "review.ofSevenClosed", "of 7 days closed")}
                  </span>
                </div>
                
                {weekWrapAverages ? (
                  <div className="grid gap-4">
                    {/* Averages Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {weekWrapAverages.avgMood !== null && (
                        <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-center">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">{t(language, "review.metric.avgMood")}</p>
                          <p className="text-lg font-bold text-zinc-100 mt-1">{weekWrapAverages.avgMood}/10</p>
                        </div>
                      )}
                      {weekWrapAverages.avgEnergy !== null && (
                        <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-center">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">{t(language, "review.metric.avgEnergy")}</p>
                          <p className="text-lg font-bold text-zinc-100 mt-1">{weekWrapAverages.avgEnergy}/10</p>
                        </div>
                      )}
                      {weekWrapAverages.avgProductivity !== null && (
                        <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-center">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">{t(language, "review.metric.avgProductivity")}</p>
                          <p className="text-lg font-bold text-zinc-100 mt-1">{weekWrapAverages.avgProductivity}/10</p>
                        </div>
                      )}
                      <div className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-center">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">{t(language, "review.metric.tasksDone")}</p>
                        <p className="text-lg font-bold text-zinc-100 mt-1">{weekWrapAverages.totalTasks}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-[#27272a] bg-[#121214] p-2.5 text-center">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase">{t(language, "review.metric.workItems")}</p>
                        <p className="text-sm font-bold text-zinc-100 mt-0.5">{weekWrapAverages.totalWorkItems}</p>
                      </div>
                      <div className="rounded-lg border border-[#27272a] bg-[#121214] p-2.5 text-center">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase">{t(language, "review.metric.gymDays")}</p>
                        <p className="text-sm font-bold text-zinc-100 mt-0.5">{weekWrapAverages.gymDays}/7</p>
                      </div>
                      <div className="rounded-lg border border-[#27272a] bg-[#121214] p-2.5 text-center">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase">{t(language, "review.metric.xpEarned")}</p>
                        <p className="text-sm font-bold text-[#C8A96A] mt-0.5">+{weekWrapAverages.totalXP}</p>
                      </div>
                    </div>

                    {/* Individual Day Cards */}
                    <div className="grid gap-2.5 mt-2">
                      {weekWraps.map((wrap) => (
                        <div
                          key={wrap.id}
                          className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5 text-xs"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-bold text-zinc-200">
                                {formatReviewDate(wrap.date, language, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              <p className="text-zinc-400 mt-1.5 leading-relaxed">
                                {wrap.generatedSummary
                                  ? generateDailyWrapSummary(wrap.statsSnapshot, language)
                                  : t(language, "review.noSummaryCaptured")}
                              </p>
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {wrap.mood !== undefined && (
                                  <span className="rounded bg-[#18181b] border border-[#27272a] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">M: {wrap.mood}</span>
                                )}
                                {wrap.energy !== undefined && (
                                  <span className="rounded bg-[#18181b] border border-[#27272a] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">E: {wrap.energy}</span>
                                )}
                                {wrap.productivity !== undefined && (
                                  <span className="rounded bg-[#18181b] border border-[#27272a] px-2 py-0.5 text-[9px] font-semibold text-zinc-400">P: {wrap.productivity}</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadDailyWrapMarkdown(wrap)}
                              className="shrink-0 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800 transition uppercase tracking-wider"
                            >
                              {t(language, "common.exportMarkdown", "Export")}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-4 text-xs text-zinc-500 italic">
                    {t(language, "review.noDailyWraps", "No daily wraps completed this week. Complete daily wraps from the Today page to visualize snapshots here.")}
                  </p>
                )}
              </section>

              {/* Accomplishments Snapshot */}
              <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between border-b border-[#27272a]/60 pb-3 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A9A5B]">
                      {t(language, "review.accomplishmentsSnapshot", "Accomplishments Snapshot")}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-zinc-100">
                      {t(language, "review.tasksCompletedThisWeek", "Tasks Completed this Week")}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-[#8A9A5B]/10 border border-[#8A9A5B]/25 px-2.5 py-0.5 text-[10px] font-bold text-[#9AAB6B]">
                      {weekCompletedTasks.length} {t(language, "review.completedTasksCount", "completed")}
                    </span>
                    <span className="rounded-full bg-[#8B7A99]/10 border border-[#8B7A99]/25 px-2.5 py-0.5 text-[10px] font-bold text-[#9B8AA9]">
                      {weekCompletedTasks.filter(t => t.completionNotes?.trim()).length} {t(language, "review.reflectionsCount", "reflections")}
                    </span>
                  </div>
                </div>

                {weekCompletedTasks.length > 0 ? (
                  <div className="grid gap-3 max-h-[350px] overflow-y-auto pr-1">
                    {weekCompletedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-[#27272a] bg-[#121214] p-3.5 text-xs flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-bold text-zinc-200 break-words">{task.title}</h4>
                            <p className="text-[9px] text-zinc-500 mt-1 uppercase font-bold tracking-wider font-semibold">
                              {t(language, `enum.taskArea.${task.area}`, task.area)} &middot; {t(language, `enum.taskType.${task.taskType}`, task.taskType)} &middot; {task.estimatedMinutes} min
                            </p>
                          </div>
                          {task.completedAt && (
                            <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                              {formatReviewDate(task.completedAt.slice(0, 10), language)}
                            </span>
                          )}
                        </div>
                        {task.completionNotes?.trim() && (
                          <div className="mt-1.5 border-t border-[#27272a]/60 pt-2 text-zinc-400 italic">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#9AAB6B] block mb-1">
                              💡 {t(language, "review.reflectionsHighlight", "Reflection Note")}
                            </span>
                            &ldquo;{task.completionNotes.trim()}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-4 text-xs text-zinc-500 italic">
                    {t(language, "review.noCompletedTasks", "No tasks completed during this week range.")}
                  </p>
                )}
              </section>

              {/* Weekly Insights */}
              <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                <div className="border-b border-[#27272a]/60 pb-3 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B7A99]">
                    {t(language, "review.signal.eyebrow", "System Signals")}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-zinc-100">
                    {t(language, "review.signal.title", "Weekly Insights")}
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Signal Card */}
                  <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                        {t(language, "review.signal.momentumLabel", "Weekly Momentum")}
                      </p>
                      <span className={`inline-block mt-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${weekSignal.colorClass}`}>
                        {t(language, weekSignal.key)}
                      </span>
                    </div>
                    {weekSignal.key !== "review.signal.empty" && (
                      <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                        {t(language, `${weekSignal.key}Desc`)}
                      </p>
                    )}
                  </div>

                  {/* Category Card */}
                  <div className="rounded-lg border border-[#27272a] bg-[#121214] p-4 flex flex-col gap-3 justify-center">
                    <div className="text-xs">
                      <span className="font-bold text-zinc-500 block uppercase text-[9px] tracking-wider">
                        {t(language, "review.signal.dominantArea", "Dominant Area")}
                      </span>
                      {dominantArea ? (
                        <p className="text-zinc-200 mt-1 font-semibold">
                          {t(language, `enum.taskArea.${dominantArea.area}`, dominantArea.area)} &middot;{" "}
                          <span className="text-zinc-400 font-normal">
                            {dominantArea.count} {dominantArea.count === 1 ? t(language, "review.signal.task", "task") : t(language, "review.signal.tasks", "tasks")}
                          </span>
                        </p>
                      ) : (
                        <p className="text-zinc-500 mt-1 italic">
                          {t(language, "review.signal.noArea", "No dominant area")}
                        </p>
                      )}
                    </div>

                    <div className="text-xs border-t border-[#27272a]/60 pt-2.5">
                      <span className="font-bold text-zinc-500 block uppercase text-[9px] tracking-wider">
                        {t(language, "review.signal.dominantType", "Dominant Type")}
                      </span>
                      {dominantType ? (
                        <p className="text-zinc-200 mt-1 font-semibold">
                          {t(language, `enum.taskType.${dominantType.type}`, dominantType.type)} &middot;{" "}
                          <span className="text-zinc-400 font-normal">
                            {dominantType.count} {dominantType.count === 1 ? t(language, "review.signal.task", "task") : t(language, "review.signal.tasks", "tasks")}
                          </span>
                        </p>
                      ) : (
                        <p className="text-zinc-500 mt-1 italic">
                          {t(language, "review.signal.noType", "No dominant type")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Reflection Questions */}
              <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  {t(language, "review.selfReflection", "Self-Reflection")}
                </p>
                <h3 className="text-lg font-bold text-zinc-100">{t(language, "review.journalReflection", "Journal Reflection")}</h3>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  {reflectionFields.map(([key, label]) => (
                    <label
                      key={key}
                      className="grid gap-2 text-xs font-semibold text-zinc-400"
                    >
                      <span>{t(language, `review.field.${key}`, label)}</span>
                      {(() => {
                        const helper = getFieldHelperText(key);
                        if (!helper) return null;
                        return (
                          <span className="text-[10px] font-normal text-zinc-500 mt-0.5 leading-normal block">
                            {helper}
                          </span>
                        );
                      })()}
                      <textarea
                        rows={4}
                        value={draft[key]}
                        onChange={(event) => updateText(key, event.target.value)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#C8A96A]/50 resize-y transition font-medium mt-1"
                      />
                    </label>
                  ))}
                </div>
              </section>

              {/* Optional reflection */}
              <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  {t(language, "review.patterns", "Patterns")}
                </p>
                <h3 className="text-lg font-bold text-zinc-100">{t(language, "review.patternNotes", "Pattern Notes (Optional)")}</h3>
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {optionalFields.map(([key, label]) => (
                    <label
                      key={key}
                      className="grid gap-2 text-xs font-semibold text-zinc-400"
                    >
                      <span>{t(language, `review.field.${key}`, label)}</span>
                      {(() => {
                        const helper = getFieldHelperText(key);
                        if (!helper) return null;
                        return (
                          <span className="text-[10px] font-normal text-zinc-500 mt-0.5 leading-normal block">
                            {helper}
                          </span>
                        );
                      })()}
                      <textarea
                        rows={3}
                        value={draft[key] ?? ""}
                        onChange={(event) => updateText(key, event.target.value)}
                        className="rounded-lg border border-[#27272a] bg-[#121214] p-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#C8A96A]/50 resize-y transition font-medium mt-1"
                      />
                    </label>
                  ))}
                </div>
              </section>
            </form>

            {/* Saved Reviews History */}
            <section className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B7A99] mb-2">
                {t(language, "review.archives", "Archives")}
              </p>
              <h3 className="text-lg font-bold text-zinc-100">{t(language, "review.previousReviews", "Previous Reviews")}</h3>
              <div className="mt-5 grid gap-4">
                {sortedReviews.length > 0 ? (
                  sortedReviews.map((review, index) => {
                    const isOpen = openReviewIds[review.id] !== undefined ? openReviewIds[review.id] : index === 0;
                    const strongest = getStrongestArea(review, language);
                    const weakest = getWeakestArea(review, language);
                    const avg = getWeeklyReviewAverage(review);
                    const completionDate = review.createdAt
                      ? formatReviewDate(review.createdAt, language, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "";

                    return (
                      <article
                        key={review.id}
                        className="rounded-xl border border-[#27272a] bg-[#121214] overflow-hidden flex flex-col transition-all duration-300"
                      >
                        {/* Clickable Header */}
                        <div
                          onClick={() => toggleReview(review.id, index)}
                          className="w-full flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/20 transition-colors select-none gap-2 text-left"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <span className="font-bold text-zinc-150 text-sm">
                              {formatWeekRange(review, language)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-zinc-400">
                                {t(language, "review.average", "Average")}: <span className="text-[#C8A96A] font-bold">{avg}/10</span>
                              </span>
                              <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-[#18181b] text-zinc-300 border border-[#27272a]">
                                {getReviewStatusLabel(review, language)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-450 mt-1 md:mt-0">
                            {(strongest || weakest) && (
                              <div className="hidden sm:flex items-center gap-2 border-r border-[#27272a]/60 pr-3 mr-1">
                                {strongest && (
                                  <span className="text-[#9AAB6B] font-medium">
                                    ▲ {strongest.label} ({strongest.rating})
                                  </span>
                                )}
                                {weakest && (
                                  <span className="text-[#C27A6B] font-medium">
                                    ▼ {weakest.label} ({weakest.rating})
                                  </span>
                                )}
                              </div>
                            )}
                            {completionDate && (
                              <span className="text-zinc-550 font-medium">
                                {t(language, "review.done", "Done")}: {completionDate}
                              </span>
                            )}
                            <span className="text-zinc-500 ml-1">
                              {isOpen ? (
                                <svg className="h-4 w-4 transform rotate-180 text-zinc-500 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4 text-zinc-500 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Collapsible Content */}
                        {isOpen && (
                          <div className="border-t border-[#27272a]/60 p-5 bg-[#18181b]/10 transition-all duration-300">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-[#27272a]/40 pb-4">
                              <div>
                                <h4 className="font-bold text-zinc-150 text-xs uppercase tracking-wider text-zinc-400">
                                  {t(language, "review.detailsOverview", "Details Overview")}
                                </h4>
                                <p className="mt-1 text-[11px] font-semibold text-zinc-500">
                                  {t(language, "review.ratingBreakdown", "Rating Breakdown & Reflective Fields")}
                                </p>
                              </div>
                              <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
                                <button
                                  type="button"
                                  onClick={() => downloadWeeklyReviewMarkdown(review)}
                                  className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-zinc-300 hover:bg-zinc-800 transition"
                                >
                                  {t(language, "common.exportMarkdown", "Export")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const confirmed = window.confirm(`${t(language, "review.deleteConfirm", "Delete weekly review for week")} ${review.weekStart}?`);
                                    if (confirmed) deleteReview(review.id);
                                  }}
                                  className="rounded-lg border border-[#B26A5B]/25 bg-[#B26A5B]/10 px-3 py-2 text-[#C27A6B] hover:bg-[#B26A5B]/20 transition"
                                >
                                  {t(language, "common.delete")}
                                </button>
                              </div>
                            </div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2 text-xs">
                              <p className="leading-relaxed text-zinc-300">
                                <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-wider mb-0.5">{t(language, "review.biggestWin", "Biggest Win")}</span>{" "}
                                {review.biggestWin || review.wins || t(language, "review.noCapturedRecord", "No captured record.")}
                              </p>
                              <p className="leading-relaxed text-zinc-300">
                                <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-wider mb-0.5">{t(language, "review.nextFocus", "Next Focus")}</span>{" "}
                                {review.nextWeekFocus || t(language, "review.noCapturedRecord", "No captured record.")}
                              </p>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-[#27272a] bg-[#121214] px-4 py-4 text-xs text-zinc-500 italic">
                    {t(language, "review.empty", "No reviews saved yet. Completed historical logs will appear here.")}
                  </p>
                )}
              </div>
            </section>

            {/* Roadmap / AI Card */}
            <section className="rounded-xl border border-[#27272a]/65 bg-gradient-to-br from-[#18181b] to-[#141416] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t(language, "review.roadmap", "Roadmap")}
              </p>
              <h2 className="mt-2 text-lg font-bold text-zinc-300">{t(language, "review.patternDetection", "Pattern Detection & Insights")}</h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                {t(language, "review.futureInsights", "Future updates will implement offline secure pattern recognition algorithms to analyze historical reviews, finding energy fluctuations, discipline constraints, and core trends across your personal operational dashboard.")}
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useMemo } from "react";
import {
  ATLAS_STORAGE_KEYS,
  readFromStorage,
  useStoredValue,
  writeToStorage,
} from "@/lib/storage";
import type {
  ReviewArea,
  ReviewDraft,
  ReviewRatings,
  WeeklyReview,
} from "@/types/atlas";

export type {
  ReviewArea,
  ReviewDraft,
  ReviewRatings,
  WeeklyReview,
} from "@/types/atlas";

export const REVIEW_AREAS: { key: ReviewArea; label: string }[] = [
  { key: "finances", label: "Finances" },
  { key: "fitness", label: "Fitness" },
  { key: "academics", label: "Academics" },
  { key: "work", label: "Work" },
  { key: "personal", label: "Personal" },
  { key: "energy", label: "Energy" },
  { key: "discipline", label: "Discipline" },
];

export const DEFAULT_RATINGS: ReviewRatings = {
  finances: 5,
  fitness: 5,
  academics: 5,
  work: 5,
  personal: 5,
  energy: 5,
  discipline: 5,
};

const INITIAL_REVIEWS: WeeklyReview[] = [];

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getCurrentWeekRange(date = new Date()) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: toISODate(monday),
    weekEnd: toISODate(sunday),
    label: `${new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }).format(monday)} - ${new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }).format(sunday)}`,
  };
}

function normalizeReview(value: Partial<WeeklyReview> & Record<string, unknown>) {
  const currentWeek = getCurrentWeekRange();
  const legacyRange = typeof value.weekRange === "string" ? value.weekRange : "";
  const createdAt =
    typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString();
  const ratings = {
    ...DEFAULT_RATINGS,
    ...(value.ratings && typeof value.ratings === "object"
      ? value.ratings
      : {}),
  } as ReviewRatings;

  return {
    id:
      typeof value.id === "string" ? value.id : `${Date.now()}-weekly-review`,
    weekStart:
      typeof value.weekStart === "string" ? value.weekStart : currentWeek.weekStart,
    weekEnd:
      typeof value.weekEnd === "string" ? value.weekEnd : currentWeek.weekEnd,
    createdAt,
    updatedAt:
      typeof value.updatedAt === "string" ? value.updatedAt : createdAt,
    wins:
      typeof value.wins === "string"
        ? value.wins
        : typeof value.wentWell === "string"
          ? value.wentWell
          : "",
    problems:
      typeof value.problems === "string"
        ? value.problems
        : typeof value.biggestProblem === "string"
          ? value.biggestProblem
          : "",
    lessons: typeof value.lessons === "string" ? value.lessons : "",
    whatFeltOff:
      typeof value.whatFeltOff === "string"
        ? value.whatFeltOff
        : typeof value.feltOff === "string"
          ? value.feltOff
          : "",
    whatToImprove:
      typeof value.whatToImprove === "string" ? value.whatToImprove : "",
    nextWeekFocus:
      typeof value.nextWeekFocus === "string"
        ? value.nextWeekFocus
        : typeof value.nextFocus === "string"
          ? value.nextFocus
          : "",
    ratings,
    moodSummary:
      typeof value.moodSummary === "string" ? value.moodSummary : "",
    biggestWin:
      typeof value.biggestWin === "string" ? value.biggestWin : "",
    biggestProblem:
      typeof value.biggestProblem === "string"
        ? value.biggestProblem
        : typeof value.problems === "string"
          ? value.problems
          : "",
    oneThingToStop:
      typeof value.oneThingToStop === "string" ? value.oneThingToStop : "",
    oneThingToContinue:
      typeof value.oneThingToContinue === "string"
        ? value.oneThingToContinue
        : "",
    oneThingToStart:
      typeof value.oneThingToStart === "string" ? value.oneThingToStart : "",
    xpAwarded: Boolean(value.xpAwarded || legacyRange),
  } satisfies WeeklyReview;
}

function normalizeReviews(value: unknown): WeeklyReview[] {
  if (!Array.isArray(value)) {
    return INITIAL_REVIEWS;
  }

  return value.map((review) =>
    normalizeReview(
      review && typeof review === "object"
        ? (review as Partial<WeeklyReview> & Record<string, unknown>)
        : {},
    ),
  );
}

function readReviews() {
  return readFromStorage(
    ATLAS_STORAGE_KEYS.weeklyReviews,
    INITIAL_REVIEWS,
    normalizeReviews,
  );
}

function saveReviews(reviews: WeeklyReview[]) {
  writeToStorage(ATLAS_STORAGE_KEYS.weeklyReviews, reviews);
}

export function getWeeklyReviewAverage(review: WeeklyReview) {
  const values = Object.values(review.ratings);
  const total = values.reduce((sum, rating) => sum + rating, 0);
  return Math.round((total / values.length) * 10) / 10;
}

export function getRatingStatusLabel(rating: number) {
  if (rating <= 3) return "Needs attention";
  if (rating <= 6) return "Stable";
  if (rating <= 8) return "Good";
  return "Strong";
}

function getAreaByRating(
  review: WeeklyReview,
  sorter: (a: [ReviewArea, number], b: [ReviewArea, number]) => number,
) {
  const [key, rating] = (Object.entries(review.ratings) as [ReviewArea, number][])
    .sort(sorter)[0];
  return {
    key,
    label: REVIEW_AREAS.find((area) => area.key === key)?.label ?? key,
    rating,
  };
}

export function getStrongestArea(review?: WeeklyReview) {
  if (!review) return null;
  return getAreaByRating(review, (a, b) => b[1] - a[1]);
}

export function getWeakestArea(review?: WeeklyReview) {
  if (!review) return null;
  return getAreaByRating(review, (a, b) => a[1] - b[1]);
}

export function hasReviewForCurrentWeek(reviews: WeeklyReview[]) {
  const current = getCurrentWeekRange();
  return reviews.some(
    (review) =>
      review.weekStart === current.weekStart && review.weekEnd === current.weekEnd,
  );
}

export function getLatestReview(reviews: WeeklyReview[]) {
  return [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function getReviewStatusLabel(review?: WeeklyReview) {
  if (!review) return "Not started";
  const requiredFields = [
    review.wins,
    review.problems,
    review.lessons,
    review.whatFeltOff,
    review.whatToImprove,
    review.nextWeekFocus,
  ];
  const completed = requiredFields.filter((value) => value.trim()).length;

  if (completed === requiredFields.length) return "Complete";
  if (completed > 0) return "In progress";
  return "Started";
}

export function shouldShowReviewReminder(reviews: WeeklyReview[], date = new Date()) {
  const day = date.getDay();
  return (day === 0 || day === 1) && !hasReviewForCurrentWeek(reviews);
}

export function formatWeekRange(review: Pick<WeeklyReview, "weekStart" | "weekEnd">) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });

  return `${formatter.format(new Date(review.weekStart))} - ${formatter.format(
    new Date(review.weekEnd),
  )}`;
}

export function useWeeklyReviews() {
  const reviews = useStoredValue(
    ATLAS_STORAGE_KEYS.weeklyReviews,
    INITIAL_REVIEWS,
    normalizeReviews,
  );

  const summary = useMemo(() => {
    const latestReview = getLatestReview(reviews);
    const strongestArea = getStrongestArea(latestReview);
    const weakestArea = getWeakestArea(latestReview);
    const lastReviewDate = latestReview
      ? new Intl.DateTimeFormat("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(latestReview.createdAt))
      : "No review yet";
    const averageWeeklyScore = latestReview
      ? getWeeklyReviewAverage(latestReview)
      : null;

    return {
      latestReview,
      lastReviewDate,
      averageWeeklyScore,
      strongestArea,
      weakestArea,
      nextWeekFocus: latestReview?.nextWeekFocus ?? "",
      nextReviewSuggestion: hasReviewForCurrentWeek(reviews)
        ? "Capture notes for the next review"
        : "Complete a review this week",
      reviewCount: reviews.length,
    };
  }, [reviews]);

  function saveReview(draft: ReviewDraft) {
    const currentReviews = readReviews();
    const existingReview = currentReviews.find(
      (review) =>
        review.weekStart === draft.weekStart && review.weekEnd === draft.weekEnd,
    );
    const now = new Date().toISOString();

    if (existingReview) {
      const updatedReview: WeeklyReview = {
        ...existingReview,
        ...draft,
        updatedAt: now,
      };
      saveReviews(
        currentReviews.map((review) =>
          review.id === existingReview.id ? updatedReview : review,
        ),
      );

      return { review: updatedReview, isFirstSave: false };
    }

    const review: WeeklyReview = {
      ...draft,
      id: `${Date.now()}-weekly-review`,
      createdAt: now,
      updatedAt: now,
      xpAwarded: true,
    };

    saveReviews([review, ...currentReviews]);

    return { review, isFirstSave: true };
  }

  function deleteReview(id: string) {
    saveReviews(readReviews().filter((review) => review.id !== id));
  }

  return {
    reviews,
    summary,
    saveReview,
    deleteReview,
  };
}

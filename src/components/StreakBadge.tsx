"use client";

import React from "react";
import { getStreakTier } from "@/lib/streaks";

interface StreakBadgeProps {
  streak: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

export function StreakBadge({ streak, label, size = "md" }: StreakBadgeProps) {
  const tier = getStreakTier(streak);

  if (streak <= 0) return null;

  // Visual configuration based on streak tier
  const tierStyles = {
    none: {
      color: "text-zinc-500",
      bg: "bg-zinc-800/20 border-zinc-700/50",
      glow: "",
      iconClass: "",
    },
    spark: {
      color: "text-amber-500",
      bg: "bg-amber-500/5 border-amber-500/20",
      glow: "shadow-[0_0_8px_rgba(245,158,11,0.1)]",
      iconClass: "",
    },
    flame: {
      color: "text-orange-500",
      bg: "bg-orange-500/10 border-orange-500/25",
      glow: "shadow-[0_0_12px_rgba(249,115,22,0.2)]",
      iconClass: "scale-105",
    },
    blaze: {
      color: "text-red-500",
      bg: "bg-red-500/15 border-red-500/30",
      glow: "shadow-[0_0_16px_rgba(239,68,68,0.3)]",
      iconClass: "scale-110 animate-pulse",
    },
    inferno: {
      color: "text-orange-400",
      bg: "bg-gradient-to-r from-red-500/20 to-orange-500/20 border-orange-500/40",
      glow: "shadow-[0_0_24px_rgba(249,115,22,0.45)]",
      iconClass: "scale-120 animate-flame",
    },
  }[tier];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-3 py-1.5 text-xs gap-1.5",
    lg: "px-5 py-3 text-sm gap-2.5 rounded-xl",
  }[size];

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4.5 h-4.5",
    lg: "w-6 h-6",
  }[size];

  return (
    <div
      className={`inline-flex items-center font-bold tracking-wide uppercase border rounded-full transition-all duration-300 ${tierStyles.bg} ${tierStyles.color} ${tierStyles.glow} ${sizeClasses}`}
      title={`${streak} day ${label} streak — Tier: ${tier.toUpperCase()}`}
    >
      <svg
        className={`${iconSizes} ${tierStyles.iconClass} fill-current`}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span>
        {streak}d {label}
      </span>
    </div>
  );
}

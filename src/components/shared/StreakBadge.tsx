"use client";

import React from "react";
import { getStreakTier } from "@/lib/streaks";
import { t } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";

interface StreakBadgeProps {
  streak: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

export function StreakBadge({ streak, label, size = "md" }: StreakBadgeProps) {
  const { settings } = useAtlasSettings();
  const language = settings.language;
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
      color: "text-[#C8A96A]",
      bg: "bg-[#C8A96A]/5 border-[#C8A96A]/20",
      glow: "shadow-[0_0_8px_rgba(200,169,106,0.1)]",
      iconClass: "",
    },
    flame: {
      color: "text-[#C89060]",
      bg: "bg-[#C89060]/10 border-[#C89060]/25",
      glow: "shadow-[0_0_12px_rgba(200,144,96,0.2)]",
      iconClass: "scale-105",
    },
    blaze: {
      color: "text-[#B26A5B]",
      bg: "bg-[#B26A5B]/15 border-[#B26A5B]/30",
      glow: "shadow-[0_0_16px_rgba(178,106,91,0.3)]",
      iconClass: "scale-110",
    },
    inferno: {
      color: "text-[#D4B87A]",
      bg: "bg-gradient-to-r from-[#B26A5B]/20 to-[#C8A96A]/20 border-[#C8A96A]/40",
      glow: "shadow-[0_0_24px_rgba(200,169,106,0.3)]",
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
      title={`${streak} ${t(language, "streak.day")} ${label} ${t(language, "streak.streak")} — ${t(language, "streak.tier")}: ${tier.toUpperCase()}`}
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
        {streak}{t(language, "streak.daysShort")} {label}
      </span>
    </div>
  );
}

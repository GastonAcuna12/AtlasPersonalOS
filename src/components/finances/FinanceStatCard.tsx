"use client";

import React from "react";

interface FinanceStatCardProps {
  title: string;
  value: string;
  subtext: string;
  warningMessage?: string;
  warningType?: "none" | "low" | "warning" | "danger";
  valueColorClass?: string;
  className?: string;
}

export function FinanceStatCard({
  title,
  value,
  subtext,
  warningMessage,
  warningType = "none",
  valueColorClass = "text-zinc-100",
  className = "",
}: FinanceStatCardProps) {
  const getBorderColorClass = () => {
    switch (warningType) {
      case "danger":
        return "border-red-500/30 bg-red-500/5 text-red-400";
      case "warning":
        return "border-amber-500/30 bg-amber-500/5 text-amber-400";
      case "low":
        return "border-blue-500/30 bg-blue-500/5 text-blue-400";
      default:
        return "border-[#27272a] bg-[#18181b]";
    }
  };

  return (
    <div
      className={`rounded-xl border p-5 shadow-lg flex flex-col justify-between min-h-[140px] transition ${getBorderColorClass()} ${className}`}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {title}
        </p>
        <p className={`mt-2 text-2xl font-bold tracking-tight break-words leading-none ${valueColorClass}`}>
          {value}
        </p>
      </div>
      <div className="mt-3 border-t border-[#27272a]/20 pt-2 flex flex-col gap-1 text-[10px] text-zinc-500">
        <p className="text-[9px] font-semibold uppercase tracking-wide">
          {subtext}
        </p>
        {warningMessage && (
          <p
            className={`mt-1 text-[9px] font-bold uppercase tracking-wider leading-tight flex items-center gap-0.5 ${
              warningType === "danger"
                ? "text-red-450 animate-pulse"
                : warningType === "warning"
                ? "text-amber-500"
                : "text-blue-400"
            }`}
          >
            <span>⚠️</span> {warningMessage}
          </p>
        )}
      </div>
    </div>
  );
}

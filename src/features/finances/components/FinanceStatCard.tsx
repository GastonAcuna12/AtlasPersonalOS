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
        return "border-[#B26A5B]/30 bg-[#B26A5B]/5 text-[#C27A6B]";
      case "warning":
        return "border-[#C8A96A]/30 bg-[#C8A96A]/5 text-[#D4B87A]";
      case "low":
        return "border-[#6F8799]/30 bg-[#6F8799]/5 text-[#7F97A9]";
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
                ? "text-[#B26A5B]"
                : warningType === "warning"
                ? "text-[#C8A96A]"
                : "text-[#6F8799]"
            }`}
          >
            <span>⚠️</span> {warningMessage}
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";
import { isModuleEnabled } from "@/lib/modules";
import { useAtlasSettings } from "@/lib/settings";
import type { AtlasModule } from "@/types/atlas";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  module?: AtlasModule;
}

export function SidebarNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useAtlasSettings();
  const language = settings.language;

  const navItems: NavItem[] = [
    {
      label: t(language, "nav.today"),
      href: "/today",
      module: "today",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: t(language, "nav.work"),
      href: "/work",
      module: "work",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: t(language, "nav.finances"),
      href: "/finances",
      module: "finances",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: t(language, "nav.gym"),
      href: "/gym",
      module: "gym",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: t(language, "nav.academics"),
      href: "/academics",
      module: "academics",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      label: t(language, "nav.goals"),
      href: "/goals",
      module: "goals",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 0A7.5 7.5 0 105.146 18.854m9.682-9.682l3.536-3.536M18.364 5.636a9 9 0 01-12.728 0m12.728 0L5.636 18.364m0 0A9 9 0 0118.364 5.636M12 12m-4 0a4 4 0 108 0 4 4 0 00-8 0" />
        </svg>
      ),
    },
    {
      label: t(language, "nav.notes"),
      href: "/notes",
      module: "notes",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      label: t(language, "nav.review"),
      href: "/review",
      module: "review",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      label: t(language, "nav.calendar"),
      href: "/calendar",
      module: "calendar",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: t(language, "nav.settings"),
      href: "/settings",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.module || isModuleEnabled(settings, item.module),
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between bg-[#121214] border-b border-[#27272a] px-6 py-4 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#C8A96A]"></span>
          <div>
            <h1 className="text-base font-bold uppercase tracking-wider text-zinc-100">Atlas</h1>
            <p className="text-[8px] text-zinc-500 font-medium uppercase tracking-widest leading-none">{t(language, "nav.personalOs")}</p>
          </div>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-zinc-400 hover:text-zinc-100 focus:outline-none"
          aria-label={t(language, "nav.toggle")}
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 top-[61px] z-40 bg-[#0d0d0e]/95 backdrop-blur-md border-b border-[#27272a] overflow-y-auto">
          <nav className="p-6 grid gap-2">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-medium transition duration-200 border ${
                    isActive
                      ? "bg-[#C8A96A]/10 text-[#C8A96A] border-[#C8A96A]/40 hover:border-[#C8A96A]/50"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 hover:border-zinc-700/20 border-transparent"
                  }`}
                >
                  <span className={`${isActive ? "text-[#C8A96A]" : "text-zinc-500"}`}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-[#121214] border-r border-[#27272a] p-6 flex-col justify-between h-screen sticky top-0 overflow-y-auto">
        <div>
          <Link href="/" className="flex items-center gap-3 border-b border-[#27272a] pb-4 mb-6 hover:opacity-90 transition">
            <span className="h-3 w-3 rounded-full bg-[#C8A96A] shrink-0"></span>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider text-zinc-100">Atlas</h1>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-0.5">{t(language, "nav.personalOs")}</p>
            </div>
          </Link>
          <nav aria-label="Atlas modules" className="grid gap-1.5 text-sm font-medium">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-all duration-200 border ${
                    isActive
                      ? "bg-[#C8A96A]/10 text-[#C8A96A] border-[#C8A96A]/40 hover:border-[#C8A96A]/50 hover:bg-[#C8A96A]/15 shadow-sm shadow-[#2C2518]/20"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 hover:border-zinc-700/20 border-transparent"
                  }`}
                >
                  <span className={`transition-colors duration-200 ${isActive ? "text-[#C8A96A]" : "text-zinc-500 group-hover:text-zinc-300"}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-8 pt-4 border-t border-[#27272a] text-[10px] text-zinc-500 font-mono flex items-center justify-between">
          <span>v1.3.0 · {t(language, "nav.offlineVault")}</span>
          <span className="h-2 w-2 rounded-full bg-[#8A9A5B]/50"></span>
        </div>
      </aside>
    </>
  );
}

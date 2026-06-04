"use client";

import React, { useState } from "react";
import { t } from "@/lib/i18n";
import { useAtlasSettings } from "@/lib/settings";
import { WORKSPACE_PRESETS, getModulesForPreset } from "@/lib/presets";
import { MODULE_PREFERENCES } from "@/lib/modules";
import type { WorkspacePreset, EnabledModules, AtlasModule } from "@/types/atlas";

// Interface for quiz question definitions
interface QuizQuestion {
  id: number;
  textEn: string;
  textEs: string;
  options: {
    textEn: string;
    textEs: string;
  }[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    textEn: "What do you mostly want Atlas to help with?",
    textEs: "¿Con qué querés que Atlas te ayude principalmente?",
    options: [
      { textEn: "Study, classes, and deadlines", textEs: "Estudio, clases y entregas" },
      { textEn: "Clients, projects, and payments", textEs: "Clientes, proyectos y cobros" },
      { textEn: "Money, goals, and life organization", textEs: "Dinero, metas y organización personal" },
    ],
  },
  {
    id: 2,
    textEn: "How complex should your workspace be?",
    textEs: "¿Qué tan completo querés que sea tu espacio?",
    options: [
      { textEn: "Keep it simple", textEs: "Simple" },
      { textEn: "Balanced, only what I need", textEs: "Equilibrado" },
      { textEn: "Give me everything", textEs: "Dame todo" },
    ],
  },
  {
    id: 3,
    textEn: "Do you manage work or clients?",
    textEs: "¿Manejás trabajo o clientes?",
    options: [
      { textEn: "No, mostly personal/study", textEs: "No, principalmente personal/estudio" },
      { textEn: "Sometimes", textEs: "A veces" },
      { textEn: "Yes, frequently", textEs: "Sí, frecuentemente" },
    ],
  },
  {
    id: 4,
    textEn: "How important is finance tracking for you?",
    textEs: "¿Qué tan importante es el control de finanzas para vos?",
    options: [
      { textEn: "Basic only", textEs: "Básico solamente" },
      { textEn: "Important", textEs: "Importante" },
      { textEn: "Very important, I track income/payments", textEs: "Muy importante, controlo ingresos/pagos" },
    ],
  },
  {
    id: 5,
    textEn: "Do you want routines and habit tracking?",
    textEs: "¿Querés seguimiento de rutinas y hábitos?",
    options: [
      { textEn: "Not now", textEs: "Ahora no" },
      { textEn: "Some habits/goals", textEs: "Algunos hábitos/metas" },
      { textEn: "Everything: habits, goals, reviews", textEs: "Todo: hábitos, metas, revisiones" },
    ],
  },
];

export function WorkspaceOnboarding() {
  const { settings, updateSettings, setLanguage } = useAtlasSettings();
  const language = settings.language;

  // Onboarding Phase Steps:
  // 1: Welcome & Language
  // 2: Quiz Questions (Q1 to Q5)
  // 3: Recommendation Screen
  // 4: Manual Preset List Overrides (optional)
  // 5: Module Checklist Customize (optional)
  // 6: Setup Complete Confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1, -1, -1]);

  // Recommended state computed at the end of the quiz
  const [recommendedPreset, setRecommendedPreset] = useState<WorkspacePreset>("full");

  // Selection configurations
  const [selectedPreset, setSelectedPreset] = useState<WorkspacePreset>("full");
  const [checkedModules, setCheckedModules] = useState<EnabledModules>(() =>
    getModulesForPreset("full")
  );

  // Recommendation Scoring Engine
  const calculatePresetRecommendation = (currentAnswers: number[]): WorkspacePreset => {
    const scores = {
      student: 0,
      freelancer: 0,
      personal_finance: 0,
      full: 0,
    };

    // Q1: What do you mostly want Atlas to help with?
    if (currentAnswers[0] === 0) scores.student += 2;
    else if (currentAnswers[0] === 1) scores.freelancer += 2;
    else if (currentAnswers[0] === 2) scores.personal_finance += 2;

    // Q2: Complexity?
    if (currentAnswers[1] === 0) {
      scores.personal_finance += 1;
      scores.student += 1;
    } else if (currentAnswers[1] === 1) {
      scores.freelancer += 1;
      scores.student += 1;
    } else if (currentAnswers[1] === 2) {
      scores.full += 2;
    }

    // Q3: Manage work or clients?
    if (currentAnswers[2] === 0) {
      scores.student += 1;
      scores.personal_finance += 1;
    } else if (currentAnswers[2] === 1) {
      scores.freelancer += 1;
    } else if (currentAnswers[2] === 2) {
      scores.freelancer += 2;
    }

    // Q4: Finance tracking importance?
    if (currentAnswers[3] === 0) {
      scores.student += 1;
    } else if (currentAnswers[3] === 1) {
      scores.personal_finance += 2;
    } else if (currentAnswers[3] === 2) {
      scores.freelancer += 1;
      scores.personal_finance += 1;
    }

    // Q5: Routines / habits?
    if (currentAnswers[4] === 1) {
      scores.personal_finance += 1;
      scores.student += 1;
    } else if (currentAnswers[4] === 2) {
      scores.full += 1;
    }

    // Identify peak score
    let highestScore = -1;
    const tiedPresets: WorkspacePreset[] = [];

    const keys: (keyof typeof scores)[] = ["student", "freelancer", "personal_finance", "full"];
    keys.forEach((key) => {
      if (scores[key] > highestScore) {
        highestScore = scores[key];
        tiedPresets.length = 0;
        tiedPresets.push(key);
      } else if (scores[key] === highestScore) {
        tiedPresets.push(key);
      }
    });

    if (tiedPresets.length === 1) {
      return tiedPresets[0];
    }

    // TIE BREAKERS
    // 1. prefer freelancer if work score is tied and user answered work frequently
    if (tiedPresets.includes("freelancer") && currentAnswers[2] === 2) {
      return "freelancer";
    }
    // 2. prefer student if study answer was selected in Q1
    if (tiedPresets.includes("student") && currentAnswers[0] === 0) {
      return "student";
    }
    // 3. prefer personal_finance if finance answer was selected in Q1
    if (tiedPresets.includes("personal_finance") && currentAnswers[0] === 2) {
      return "personal_finance";
    }

    // 4. otherwise default to custom or full depending complexity answer
    if (currentAnswers[1] === 2) {
      return "full";
    }
    return "custom";
  };

  const handleSelectAnswer = (optionIdx: number) => {
    const updatedAnswers = [...answers];
    updatedAnswers[quizIndex] = optionIdx;
    setAnswers(updatedAnswers);

    if (quizIndex < 4) {
      setQuizIndex(quizIndex + 1);
    } else {
      // Calculate recommendation on last answer
      const winner = calculatePresetRecommendation(updatedAnswers);
      setRecommendedPreset(winner);
      setSelectedPreset(winner);
      setCheckedModules(getModulesForPreset(winner));
      setStep(3); // Go to recommendation step
    }
  };

  const handleApplyRecommendation = () => {
    // Re-verify that checked modules align with recommendation
    setCheckedModules(getModulesForPreset(recommendedPreset));
    setSelectedPreset(recommendedPreset);
    setStep(6); // Skip straight to confirm
  };

  const handleSelectPresetManually = (presetId: WorkspacePreset) => {
    setSelectedPreset(presetId);
    setCheckedModules(getModulesForPreset(presetId));
    setStep(6);
  };

  const handleToggleModule = (moduleId: AtlasModule) => {
    const nextModules = {
      ...checkedModules,
      [moduleId]: !checkedModules[moduleId],
    };
    setCheckedModules(nextModules);
    setSelectedPreset("custom");
  };

  const handleCompleteSetup = () => {
    updateSettings({
      enabledModules: checkedModules,
      workspacePreset: selectedPreset,
      onboardingCompleted: true,
    });
  };

  const handleSkipSetup = () => {
    updateSettings({
      enabledModules: getModulesForPreset("full"),
      workspacePreset: "full",
      onboardingCompleted: true,
    });
  };

  const activePresetDef = WORKSPACE_PRESETS.find((p) => p.id === selectedPreset);
  const recommendedPresetDef = WORKSPACE_PRESETS.find((p) => p.id === recommendedPreset);

  return (
    <div className="min-h-screen bg-[#070708] flex items-center justify-center p-4 sm:p-6 md:p-10 text-zinc-100 relative overflow-hidden">
      {/* Decorative Blur Glow Backdrops */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(200,169,106,0.06) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(200,169,106,0.06) 0%, transparent 70%)' }} />

      {/* Onboarding Dialog Card */}
      <div className="relative w-full max-w-3xl rounded-2xl border border-[#27272a]/60 bg-[#121214]/80 backdrop-blur-md p-6 sm:p-10 shadow-2xl flex flex-col min-h-[520px] justify-between animate-fade-in-up">
        
        {/* Header Header */}
        <header className="flex items-center justify-between border-b border-[#27272a]/60 pb-5 mb-6 sm:mb-8">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#C8A96A]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6F8799]">
              Atlas Personal OS &middot; Onboarding
            </span>
          </div>
          {step === 2 && (
            <span className="text-xs text-[#6F8799] font-mono font-bold">
              {quizIndex + 1} / 5
            </span>
          )}
        </header>

        {/* Wizard Main Content Wrapper */}
        <div className="flex-1 flex flex-col justify-center">
          
          {/* STEP 1: Welcome Screen */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center max-w-xl mx-auto py-2">
              <span className="text-5xl mb-5 leading-none">🌌</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#E8E4DD]">
                {t(language, "onboarding.welcome.title", "Welcome to Atlas")}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                {t(language, "onboarding.welcome.desc", "Let’s shape your workspace in less than a minute. Disabling modules only hides their shortcuts; your data stays 100% safe.")}
              </p>

              {/* Lang Toggles */}
              <div className="mt-6 flex gap-3 w-64 justify-center">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    language === "en"
                      ? "border-[#C8A96A]/40 text-[#C8A96A] bg-[#C8A96A]/10"
                      : "border-[#252528] bg-[#17171A] text-[#A8A29E] hover:border-[#C8A96A]/30 hover:text-[#E8E4DD]"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("es")}
                  className={`rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    language === "es"
                      ? "border-[#C8A96A]/40 text-[#C8A96A] bg-[#C8A96A]/10"
                      : "border-[#252528] bg-[#17171A] text-[#A8A29E] hover:border-[#C8A96A]/30 hover:text-[#E8E4DD]"
                  }`}
                >
                  Español
                </button>
              </div>

              <div className="mt-10 flex flex-col items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-[#0B0B0D] px-8 py-3 text-xs font-bold uppercase tracking-wider transition shadow-md shadow-black/20 w-64 text-center"
                >
                  {t(language, "onboarding.getStarted", "Start setup")}
                </button>
                <button
                  type="button"
                  onClick={handleSkipSetup}
                  className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider transition mt-1"
                >
                  {t(language, "onboarding.skip", "Skip setup")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Quiz screen */}
          {step === 2 && (
            <div className="max-w-xl mx-auto w-full py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#C8A96A] mb-1.5">
                {t(language, "onboarding.chooseWorkspace", "Workspace Quiz")}
              </p>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 mb-6 font-sans">
                {language === "es" ? QUIZ_QUESTIONS[quizIndex].textEs : QUIZ_QUESTIONS[quizIndex].textEn}
              </h2>

              <div className="grid gap-3">
                {QUIZ_QUESTIONS[quizIndex].options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAnswer(idx)}
                    className="w-full text-left rounded-xl border border-[#27272a] bg-[#18181b] p-4 text-xs sm:text-sm font-semibold text-zinc-300 hover:bg-[#121214] hover:border-zinc-700 hover:text-white transition flex items-center gap-3.5"
                  >
                    <span className="h-5 w-5 rounded-full border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500 shrink-0 font-mono bg-zinc-900">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{language === "es" ? opt.textEs : opt.textEn}</span>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-start">
                <button
                  type="button"
                  onClick={() => {
                    if (quizIndex > 0) {
                      setQuizIndex(quizIndex - 1);
                    } else {
                      setStep(1);
                    }
                  }}
                  className="rounded-lg border border-[#252528] bg-[#17171A] text-[#A8A29E] hover:border-[#C8A96A]/30 hover:text-[#E8E4DD] px-4 py-2 text-xs font-bold uppercase tracking-wider transition"
                >
                  &larr; {t(language, "common.back", "Back")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Recommendation screen */}
          {step === 3 && recommendedPresetDef && (
            <div className="max-w-xl mx-auto w-full py-2">
              <div className="text-center mb-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C8A96A] mb-1">
                  {t(language, "onboarding.quizRecommendation", "Quiz recommendation")}
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">
                  {t(language, "onboarding.recommendedWorkspace", "Recommended workspace")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {t(language, "onboarding.recommendedWorkspaceDesc", "Based on your answers, we recommend:")}{" "}
                  <strong className="text-[#C8A96A]">{t(language, recommendedPresetDef.nameKey)}</strong>
                </p>
              </div>

              {/* Recommended Preset Card display */}
              <div className="rounded-xl border border-[#C8A96A]/20 bg-[#C8A96A]/5 text-[#C8A96A] p-5 mb-6">
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="text-3xl leading-none">{recommendedPresetDef.icon}</span>
                  <p className="text-base font-bold text-zinc-100 font-sans">
                    {t(language, recommendedPresetDef.nameKey)}
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-zinc-400 mb-4">
                  {t(language, recommendedPresetDef.descKey)}
                </p>
                <div className="pt-3 border-t border-[#27272a]/60">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    {t(language, "settings.presets.enabledModules")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recommendedPresetDef.enabledModules.map((mod) => (
                      <span
                        key={mod}
                        className="rounded bg-zinc-900 border border-[#27272a]/70 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 capitalize"
                      >
                        {t(language, `modules.${mod}.label`, mod)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid gap-3 sm:grid-cols-2 text-xs font-bold uppercase tracking-wider mb-6">
                <button
                  type="button"
                  onClick={handleApplyRecommendation}
                  className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-[#0B0B0D] px-4 py-3 transition text-center shadow-md shadow-black/20"
                >
                  {t(language, "onboarding.applyRecommendation", "Apply recommendation")}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="rounded-lg border border-[#252528] bg-[#17171A] text-[#A8A29E] hover:border-[#C8A96A]/30 hover:text-[#E8E4DD] px-4 py-3 transition text-center"
                >
                  {t(language, "onboarding.reviewModules", "Customize modules")}
                </button>
              </div>

              <div className="flex justify-center border-t border-[#27272a]/45 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider transition"
                >
                  {t(language, "onboarding.choosePresetManually", "Choose another preset manually")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Choose another preset manually */}
          {step === 4 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">
                  {t(language, "onboarding.manualSelection", "Choose manually")}
                </h2>
                <p className="mt-1.5 text-xs text-zinc-400">
                  {t(language, "settings.presets.desc")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[300px] overflow-y-auto pr-1">
                {WORKSPACE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPresetManually(preset.id)}
                    className="flex flex-col items-start text-left rounded-xl border border-[#27272a] bg-[#18181b] p-4.5 transition hover:bg-[#121214] hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-2xl leading-none">{preset.icon}</span>
                      <p className="text-xs font-bold font-sans">
                        {t(language, preset.nameKey)}
                      </p>
                    </div>
                    <p className="text-[10px] leading-relaxed text-zinc-450 mb-3 flex-1">
                      {t(language, preset.descKey)}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-start">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg border border-[#252528] bg-[#17171A] text-[#A8A29E] hover:border-[#C8A96A]/30 hover:text-[#E8E4DD] px-4 py-2 text-xs font-bold uppercase tracking-wider transition"
                >
                  &larr; {t(language, "common.back", "Back")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Custom Module selection checklist */}
          {step === 5 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">
                  {t(language, "onboarding.reviewModules", "Customize modules")}
                </h2>
                <p className="mt-1.5 text-xs text-zinc-400">
                  {t(language, "settings.presets.warning")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[280px] overflow-y-auto pr-1">
                {MODULE_PREFERENCES.map((module) => {
                  const isChecked = checkedModules[module.id];
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => handleToggleModule(module.id)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                        isChecked
                          ? "border-[#C8A96A]/40 bg-[#C8A96A]/10 text-[#E8E4DD]"
                          : "border-[#252528] bg-[#17171A] text-[#A8A29E] opacity-60 hover:opacity-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="mt-1 rounded border-zinc-700 bg-zinc-900 text-[#C8A96A] focus:ring-0 focus:ring-offset-0 pointer-events-none shrink-0"
                      />
                      <div>
                        <p className="text-xs font-bold font-sans">
                          {t(language, module.labelKey)}
                        </p>
                        <p className="mt-0.5 text-[9px] leading-relaxed text-zinc-500">
                          {t(language, module.descriptionKey)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-[#27272a]/60 pt-5">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg border border-[#252528] bg-[#17171A] text-[#A8A29E] hover:border-[#C8A96A]/30 hover:text-[#E8E4DD] px-4 py-2 text-xs font-bold uppercase tracking-wider transition"
                >
                  &larr; {t(language, "common.back", "Back")}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-[#0B0B0D] px-5 py-2 text-xs font-bold uppercase tracking-wider transition shadow-md shadow-black/20"
                >
                  {t(language, "common.next", "Next")} &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Completion confirmation */}
          {step === 6 && activePresetDef && (
            <div className="max-w-xl mx-auto text-center py-2 flex flex-col items-center">
              <span className="text-4xl mb-4 leading-none animate-bounce">🚀</span>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">
                {t(language, "onboarding.setupComplete", "Setup complete!")}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {t(language, "settings.presets.desc")}
              </p>

              <div className="mt-6 border border-[#27272a] bg-[#18181b] p-5 rounded-xl w-full text-left">
                <p className="text-[10px] font-bold text-[#C8A96A] uppercase tracking-widest mb-3 border-b border-[#27272a]/60 pb-1.5">
                  {t(language, "settings.presets.current")}: {t(language, `onboarding.preset.${selectedPreset}.name`, selectedPreset)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {MODULE_PREFERENCES.map((module) => {
                    const isActive = checkedModules[module.id];
                    if (!isActive) return null;
                    return (
                      <span
                        key={module.id}
                        className="rounded bg-zinc-900 border border-[#27272a]/60 px-2 py-1 text-[9px] font-semibold text-zinc-300 capitalize"
                      >
                        {t(language, module.labelKey)}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex gap-3.5 border-t border-[#27272a]/60 pt-6 w-full justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPreset === "custom") {
                      setStep(5);
                    } else if (selectedPreset === recommendedPreset) {
                      setStep(3);
                    } else {
                      setStep(4);
                    }
                  }}
                  className="rounded-lg border border-[#252528] bg-[#17171A] text-[#A8A29E] hover:border-[#C8A96A]/30 hover:text-[#E8E4DD] px-4 py-2 text-xs font-bold uppercase tracking-wider transition"
                >
                  &larr; {t(language, "common.back", "Back")}
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSetup}
                  className="rounded-lg bg-[#C8A96A] hover:bg-[#D4B87A] text-[#0B0B0D] px-8 py-3 text-xs font-bold uppercase tracking-wider transition shadow-md shadow-black/20 text-center"
                >
                  {t(language, "onboarding.enterAtlas", "Enter Atlas")}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

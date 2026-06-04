/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { useAtlasSettings } from "@/lib/settings";
import { WorkspaceOnboarding } from "@/components/WorkspaceOnboarding";

export function WorkspaceOnboardingIntercept({ children }: { children: React.ReactNode }) {
  const { settings } = useAtlasSettings();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Hydration Safety: render empty backdrop while client mounts
  if (!hasMounted) {
    return <div className="min-h-screen bg-[#070708]" />;
  }

  // Intercept layout if onboarding has not been completed
  if (!settings.onboardingCompleted) {
    return <WorkspaceOnboarding />;
  }

  return <>{children}</>;
}

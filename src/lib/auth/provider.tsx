"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentAuthState,
  getDisabledAuthState,
  getInitialAuthState,
  signOutOfSupabase,
  signInWithSupabasePassword,
  signUpWithSupabasePassword,
  subscribeToAuthState,
} from "@/lib/auth/session";
import type { AtlasAuthContextValue, AtlasAuthState } from "@/lib/auth/types";

const AtlasAuthContext = createContext<AtlasAuthContextValue | null>(null);

export function AtlasAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] =
    useState<AtlasAuthState>(getInitialAuthState);

  const refresh = useCallback(async () => {
    setAuthState(await getCurrentAuthState());
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const result = await signInWithSupabasePassword(email, password);
      setAuthState(await getCurrentAuthState());
      return result;
    },
    [],
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string) => {
      const result = await signUpWithSupabasePassword(email, password);
      setAuthState(await getCurrentAuthState());
      return result;
    },
    [],
  );

  const signOut = useCallback(async () => {
    setAuthState(await signOutOfSupabase());
  }, []);

  useEffect(() => {
    let isMounted = true;

    getCurrentAuthState().then((state) => {
      if (isMounted) {
        setAuthState(state);
      }
    });

    const unsubscribe = subscribeToAuthState((state) => {
      if (isMounted) {
        setAuthState(state);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      ...authState,
      refresh,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [authState, refresh, signInWithPassword, signOut, signUpWithPassword],
  );

  return (
    <AtlasAuthContext.Provider value={value}>
      {children}
    </AtlasAuthContext.Provider>
  );
}

export function useAtlasAuth() {
  const context = useContext(AtlasAuthContext);

  if (context) {
    return context;
  }

  return {
    ...getDisabledAuthState(),
    refresh: async () => undefined,
    signInWithPassword: async () => ({
      ok: false,
      message: "Cloud sync is not configured yet. Atlas is running locally.",
    }),
    signUpWithPassword: async () => ({
      ok: false,
      message: "Cloud sync is not configured yet. Atlas is running locally.",
    }),
    signOut: async () => undefined,
  } satisfies AtlasAuthContextValue;
}

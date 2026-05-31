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
      signOut,
    }),
    [authState, refresh, signOut],
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
    signOut: async () => undefined,
  } satisfies AtlasAuthContextValue;
}

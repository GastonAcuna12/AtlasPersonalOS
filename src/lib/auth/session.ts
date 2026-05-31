"use client";

import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AtlasAuthState } from "@/lib/auth/types";

export function getDisabledAuthState(): AtlasAuthState {
  return {
    status: "disabled",
    isConfigured: false,
    session: null,
    user: null,
    workspaceMode: "local_only",
    errorMessage: "",
  };
}

export function getInitialAuthState(): AtlasAuthState {
  if (!isSupabaseConfigured) {
    return getDisabledAuthState();
  }

  return {
    status: "loading",
    isConfigured: true,
    session: null,
    user: null,
    workspaceMode: "local_only",
    errorMessage: "",
  };
}

function getStateFromSession(session: Session | null): AtlasAuthState {
  return {
    status: session ? "signed_in" : "signed_out",
    isConfigured: true,
    session,
    user: session?.user ?? null,
    workspaceMode: session ? "cloud" : "local_only",
    errorMessage: "",
  };
}

export async function getCurrentAuthState(): Promise<AtlasAuthState> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return getDisabledAuthState();
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    return {
      status: "error",
      isConfigured: true,
      session: null,
      user: null,
      workspaceMode: "local_only",
      errorMessage: error.message,
    };
  }

  return getStateFromSession(data.session);
}

export function subscribeToAuthState(
  onChange: (state: AtlasAuthState) => void,
) {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return () => undefined;
  }

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    onChange(getStateFromSession(session));
  });

  return () => data.subscription.unsubscribe();
}

export async function signOutOfSupabase() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return getDisabledAuthState();
  }

  const { error } = await client.auth.signOut();

  if (error) {
    return {
      status: "error",
      isConfigured: true,
      session: null,
      user: null,
      workspaceMode: "local_only",
      errorMessage: error.message,
    } satisfies AtlasAuthState;
  }

  return getStateFromSession(null);
}

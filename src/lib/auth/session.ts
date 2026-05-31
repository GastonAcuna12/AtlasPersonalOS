"use client";

import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AtlasAuthState, AuthActionResult } from "@/lib/auth/types";

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

export async function signInWithSupabasePassword(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      ok: false,
      message: "Cloud sync is not configured yet. Atlas is running locally.",
    };
  }

  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: "Signed in. No Atlas data has been synced or migrated.",
  };
}

export async function signUpWithSupabasePassword(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      ok: false,
      message: "Cloud sync is not configured yet. Atlas is running locally.",
    };
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: data.session
      ? "Account created and signed in. No Atlas data has been synced or migrated."
      : "Account created. Check your email if confirmation is required. No Atlas data has been synced or migrated.",
  };
}

"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAtlasAuth, useLocalAtlasDataSummary } from "@/lib/auth";
import { MigrationDecisionPanel } from "@/components/MigrationDecisionPanel";

type AuthMode = "sign_in" | "sign_up";

export function AccountPage() {
  const auth = useAtlasAuth();
  const localDataSummary = useLocalAtlasDataSummary();
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isSignedIn = auth.status === "signed_in";
  const isSupabaseReady = auth.isConfigured;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!isSupabaseReady) {
      setError("Cloud sync is not configured yet. Atlas is running locally.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Enter an email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        mode === "sign_in"
          ? await auth.signInWithPassword(email.trim(), password)
          : await auth.signUpWithPassword(email.trim(), password);

      if (result.ok) {
        setMessage(result.message);
        setPassword("");
      } else {
        setError(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      await auth.signOut();
      setMessage("Signed out. Atlas remains available in local-first mode.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d0e] text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8 animate-fade-in-up">
        <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
              Account
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
              Account &amp; Sync
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Atlas still works locally without an account. Signing in prepares
              future cloud sync, but existing local data is not uploaded
              automatically and migration will be added later.
            </p>
          </div>
          <Link
            href="/settings"
            className="w-fit rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Settings
          </Link>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="grid gap-6 content-start">
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                  Supabase Auth
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                  Optional sign in
                </h2>
              </div>
              <span
                className={`w-fit rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  isSupabaseReady
                    ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                    : "border-zinc-700 bg-zinc-800/70 text-zinc-300"
                }`}
              >
                {isSupabaseReady ? "Configured" : "Local-only"}
              </span>
            </div>

            {!isSupabaseReady ? (
              <div className="mt-6 rounded-lg border border-[#27272a] bg-[#121214] p-5">
                <p className="text-sm font-semibold text-zinc-100">
                  Cloud sync is not configured yet. Atlas is running locally.
                </p>
                <p className="mt-2 text-xs leading-6 text-zinc-500">
                  Add `NEXT_PUBLIC_SUPABASE_URL` and
                  `NEXT_PUBLIC_SUPABASE_ANON_KEY` locally when you are ready to
                  test sign in. No login form is shown without those public
                  placeholders configured.
                </p>
              </div>
            ) : isSignedIn ? (
              <div className="mt-6 grid gap-4">
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-5">
                  <p className="text-sm font-semibold text-emerald-300">
                    Cloud session detected
                  </p>
                  <p className="mt-2 text-xs leading-6 text-zinc-400">
                    Signed in as{" "}
                    <span className="font-semibold text-zinc-100">
                      {auth.user?.email ?? "this Supabase user"}
                    </span>
                    . No Atlas data is synced yet. Migration will be added
                    later.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSignOut}
                  className="w-fit rounded-lg border border-[#27272a] bg-[#121214] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Signing out..." : "Sign out"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
                <div className="flex w-fit rounded-lg border border-[#27272a] bg-[#121214] p-1">
                  {(["sign_in", "sign_up"] as AuthMode[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setMode(item);
                        setError("");
                        setMessage("");
                      }}
                      className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                        mode === item
                          ? "bg-amber-500 text-zinc-950"
                          : "text-zinc-400 hover:text-zinc-100"
                      }`}
                    >
                      {item === "sign_in" ? "Sign in" : "Sign up"}
                    </button>
                  ))}
                </div>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                  Email
                  <input
                    type="email"
                    value={email}
                    autoComplete="email"
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-3 text-sm font-medium text-zinc-100 outline-none transition focus:border-amber-500/60"
                  />
                </label>

                <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                  Password
                  <input
                    type="password"
                    value={password}
                    autoComplete={
                      mode === "sign_in" ? "current-password" : "new-password"
                    }
                    onChange={(event) => setPassword(event.target.value)}
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-3 text-sm font-medium text-zinc-100 outline-none transition focus:border-amber-500/60"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || auth.status === "loading"}
                  className="mt-2 rounded-lg bg-amber-500 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Working..."
                    : mode === "sign_in"
                      ? "Sign in"
                      : "Create account"}
                </button>
              </form>
            )}

            {message ? (
              <p className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-xs font-semibold text-emerald-400">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-300">
                {error}
              </p>
            ) : null}
            </div>

            <MigrationDecisionPanel />
          </div>

          <aside className="grid gap-6 content-start">
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                Local-first rules
              </p>
              <div className="mt-4 grid gap-3 text-xs leading-6 text-zinc-400">
                <p>Atlas works locally without an account.</p>
                <p>Signing in does not sync existing local data yet.</p>
                <p>No local records are uploaded automatically.</p>
                <p>Migration and merge choices will be implemented later.</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Local Workspace
              </p>
              <p className="mt-3 text-sm font-semibold text-zinc-100">
                {localDataSummary.hasLocalData
                  ? "Local data detected"
                  : "No local records detected"}
              </p>
              <p className="mt-2 text-xs leading-6 text-zinc-500">
                {localDataSummary.hasLocalData
                  ? `${localDataSummary.approximateRecordCount} approximate records across ${localDataSummary.populatedKeyCount} Atlas storage keys.`
                  : "Atlas will continue using this browser as a local workspace."}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

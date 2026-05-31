"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  downloadAllNotesMarkdown,
  downloadNoteMarkdown,
} from "@/lib/markdownExport";
import { useNotes, type NoteDraft } from "@/lib/notes";
import { useXP } from "@/lib/xp";
import { NotesCloudPanel } from "@/components/NotesCloudPanel";

const initialDraft: NoteDraft = {
  title: "",
  area: "Personal",
  tags: [],
  content: "",
};

export function NotesPage() {
  const { notes, addNote, deleteNote } = useNotes();
  const xp = useXP();
  const [draft, setDraft] = useState(initialDraft);
  const [tagText, setTagText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("Please add a note title.");
      return;
    }

    if (!draft.content.trim()) {
      setError("Please add note content before saving.");
      return;
    }

    const processedTags = tagText
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    addNote({
      ...draft,
      tags: processedTags,
    });

    xp.awardXP("note-created", {
      amount: 10,
      label: `Created note: ${draft.title}`,
    });

    setDraft(initialDraft);
    setTagText("");
    setError("");
    setMessage("Note saved successfully! +10 XP awarded.");
    setShowCreateForm(false);

    setTimeout(() => setMessage(""), 4000);
  }

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query) ||
        n.area.toLowerCase().includes(query) ||
        n.tags.some((t) => t.toLowerCase().includes(query))
    );
  }, [notes, searchQuery]);

  return (
    <main className="min-h-screen bg-[#0d0d0e] text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 animate-fade-in-up">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-[#27272a] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
                Knowledge Vault
              </span>
              <span className="rounded-full bg-[#18181b] border border-[#27272a] px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </span>
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
              Notes
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`rounded-lg px-4 py-2.5 transition active:scale-95 ${
                showCreateForm
                  ? "bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20"
                  : "bg-amber-500 text-zinc-950 hover:bg-amber-400"
              }`}
            >
              {showCreateForm ? "✕ Cancel" : "+ Note"}
            </button>
            <button
              type="button"
              onClick={() => downloadAllNotesMarkdown(notes)}
              disabled={notes.length === 0}
              className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2.5 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export All (Markdown)
            </button>
            <Link
              href="/"
              className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2.5 text-zinc-300 transition hover:bg-zinc-800"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {/* Global Notifications */}
        {message && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-xs font-semibold text-emerald-400">
            ✓ {message}
          </div>
        )}

        <NotesCloudPanel localNotes={notes} />

        {/* Collapsible Form — Progressive Disclosure */}
        {showCreateForm && (
          <section className="mt-6 rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl animate-fade-in-up">
            <h2 className="text-lg font-bold text-zinc-100">Create New Note</h2>
            <p className="text-xs text-zinc-500 mt-1">Capture ideas, summaries, study templates, or tasks.</p>
            
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
                  Note Title *
                  <input
                    placeholder="e.g. NextJS 16 Migration Notes"
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
                  Area / Domain
                  <input
                    placeholder="e.g. Work, Personal, Academics"
                    value={draft.area}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, area: event.target.value }))
                    }
                    className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
                Tags (Comma separated)
                <input
                  placeholder="e.g. dev, web, learning"
                  value={tagText}
                  onChange={(event) => setTagText(event.target.value)}
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
                Note Content *
                <textarea
                  placeholder="Type or paste markdown content..."
                  rows={8}
                  value={draft.content}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-[#27272a] bg-[#121214] px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50 resize-y"
                  required
                />
              </label>

              {error && (
                <p className="text-xs font-bold text-red-400 mt-1">⚠️ {error}</p>
              )}

              <div className="flex gap-2 text-xs font-bold uppercase tracking-wider mt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 text-zinc-950 px-5 py-3 hover:bg-amber-400 transition"
                >
                  Save Note
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(initialDraft);
                    setTagText("");
                    setError("");
                    setShowCreateForm(false);
                  }}
                  className="rounded-lg border border-[#27272a] bg-zinc-800 text-zinc-200 px-5 py-3 hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Search Bar / Filters */}
        <section className="mt-8">
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search note titles, content, tags, or areas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#121214] pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
              />
              <span className="absolute left-3.5 top-3 text-zinc-500">
                🔍
              </span>
            </div>
            {searchQuery && (
              <span className="text-xs font-semibold text-zinc-400">
                Found {filteredNotes.length} matching {filteredNotes.length === 1 ? "note" : "notes"}
              </span>
            )}
          </div>
        </section>

        {/* Notes Grid */}
        <section className="mt-6 flex-1">
          {filteredNotes.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((note) => (
                <article
                  key={note.id}
                  className="group relative rounded-xl border border-[#27272a] bg-[#18181b] p-5 shadow-lg flex flex-col justify-between hover:border-zinc-500 transition-all duration-300"
                >
                  <div>
                    {/* Top Row info */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-zinc-800 border border-[#27272a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
                        {note.area || "Personal"}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-medium">
                        {note.updatedAt.slice(0, 10)}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-zinc-100 group-hover:text-amber-400 transition break-words">
                      {note.title}
                    </h2>

                    {note.tags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold text-zinc-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-4 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300 line-clamp-6 break-words border-t border-[#27272a]/60 pt-3">
                      {note.content}
                    </p>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-6 flex gap-2 border-t border-[#27272a]/60 pt-4 text-[10px] font-bold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => downloadNoteMarkdown(note)}
                      className="rounded-lg border border-[#27272a] bg-[#121214] px-3.5 py-2 text-zinc-300 transition hover:bg-zinc-800"
                    >
                      Export MD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(`Delete note "${note.title}"?`);
                        if (confirmed) deleteNote(note.id);
                      }}
                      className="rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2 text-red-400 transition hover:bg-red-500/20 ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-12 text-center">
              <p className="text-zinc-500 italic text-sm">
                {searchQuery
                  ? "No notes found matching your search term."
                  : "No notes saved yet. Click '+ Note' in the header to create one!"}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

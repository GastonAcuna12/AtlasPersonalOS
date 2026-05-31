# Atlas

Atlas is a private personal operating system for tracking the parts of life that benefit from a calm, durable system: finances, gym habits, academics, notes, goals, and eventually AI-powered insights.

This repository is currently the web app foundation. It does not include Supabase, authentication, or AI integrations yet.

## Data Privacy

This repository is public. Do not commit real personal data, private financial records, client names, secrets, API keys, or sensitive notes.

Atlas currently stores real app data locally in your browser with `localStorage`. Keep private exports and backups outside the repository, or use a future private database when that exists. Secrets must live only in local `.env` files or a deployment secret manager.

Commit `.env.example` files with placeholder values only. Never commit real `.env`, `.env.local`, or `.env.*.local` files.

See:

- [DATA_PRIVACY.md](./DATA_PRIVACY.md) for the local data privacy guide
- [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md) for security rules and threat model
- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) for the current local data architecture
- [SUPABASE_PLAN.md](./SUPABASE_PLAN.md) for the future database plan

## Tech Stack

- Next.js with the App Router
- TypeScript
- Tailwind CSS
- ESLint
- npm

## Getting Started

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure

```text
src/app/
  globals.css
  layout.tsx
  page.tsx              # / dashboard
  academics/page.tsx
  calendar/page.tsx
  finances/page.tsx
  goals/page.tsx
  gym/page.tsx
  notes/page.tsx
  review/page.tsx
  settings/page.tsx
  today/page.tsx
  work/page.tsx
src/components/
src/lib/
src/types/
public/
package.json
```

Current routes:

- `/` dashboard, via `src/app/page.tsx`
- `/today`
- `/work`
- `/finances`
- `/gym`
- `/academics`
- `/calendar`
- `/goals`
- `/notes`
- `/review`
- `/settings`

There is currently no separate `/dashboard` route. The dashboard lives at `/`,
and the Atlas logo navigates to `/`.

## Current Scope

Atlas currently runs as a local-first personal operating system with dashboard,
today planning, work and clients, tasks, finances, gym, academics, calendar,
notes, goals, weekly reviews, XP progression, JSON backups, and Markdown
exports. Supabase, authentication, and AI are intentionally not connected yet.

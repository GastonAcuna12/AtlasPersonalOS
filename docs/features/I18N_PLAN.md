# Atlas i18n Plan

Atlas now has a small internal internationalization foundation for English and Spanish. This is intentionally lightweight: it supports gradual translation without changing the app architecture, data model, Supabase behavior, or local-first workflow.

## Supported languages

- `en` - English
- `es` - Spanish

English remains the default language.

## Current implementation

The i18n helper lives in `src/lib/i18n.ts`.

It provides:

- `Language` type: `"en" | "es"`
- A small dictionary object for translated UI strings
- `t(language, key, fallback?)` helper
- Safe fallback to English when a Spanish key is missing
- Safe fallback to the provided fallback text, or the key itself, when no translation exists

No external i18n package is installed.

## Language preference storage

The selected language is stored in the existing Atlas app settings system.

Current storage path:

- `atlas.appSettings`
- `settings.language`

Existing settings are normalized safely. If no language is saved, Atlas defaults to English.

## Translated surface area in this pass

This pass translates only the safest shared surfaces:

- Sidebar navigation labels
- Settings core headings and Account & Sync copy
- Settings language selector
- Testing / Sample Data headings and actions
- Manual Cloud QA Checklist headings and checklist labels
- Basic `/account` auth/status copy

The main product modules are intentionally not translated yet:

- Dashboard
- Today
- Work
- Finances
- Goals
- Gym
- Academics
- Notes
- Weekly Review
- Calendar

## Gradual translation strategy

Atlas should be translated one stable surface at a time.

Recommended order:

1. Shared shell and Settings
2. Account and sync-related screens
3. Dashboard summary widgets
4. Today planning
5. Notes and Weekly Review
6. Goals
7. Academics
8. Gym
9. Work
10. Finances last, because finance language must be especially precise

Avoid large translation rewrites in one pass. Each module should keep its existing behavior while only replacing visible copy with dictionary keys.

## Safety rules

- Missing translation keys must not crash the app.
- English must remain a reliable fallback.
- Do not translate stored user data.
- Do not translate localStorage keys.
- Do not change Supabase sync behavior.
- Do not change business logic while translating UI copy.
- Do not translate sample data in a way that breaks QA expectations.

## Future options

The current helper is enough for a controlled local-first app. A larger i18n package such as `next-intl` should only be considered later if Atlas needs:

- Route-level locale prefixes
- Server-rendered localized metadata
- Date/number formatting by locale across the whole app
- Large translation files maintained outside TypeScript
- Translation workflow tooling

Until then, the internal dictionary keeps the i18n surface small and easy to audit.

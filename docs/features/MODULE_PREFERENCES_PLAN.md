# Atlas Module Preferences Plan

Atlas module preferences let a user shape the workspace around the parts of Atlas they actually use.

## What Module Toggles Do

- Hide disabled modules from the main sidebar.
- Hide matching dashboard widgets and shortcuts where practical.
- Hide matching Quick Capture types.
- Keep direct routes available for now so existing workflows do not break.
- Store preferences locally as part of Atlas app settings.

## What Module Toggles Do Not Do

- They do not delete data.
- They do not clear localStorage.
- They do not remove routes.
- They do not alter Supabase tables or proof-of-concept panels.
- They do not change sync state.
- They do not migrate, upload, download, merge, or sync records.
- They do not change module business logic.

## Data Safety Rule

Disabling a module is a visibility preference only. Atlas keeps the module's local data intact so a user can re-enable the module later and continue where they left off.

## Current Affected Surfaces

- Sidebar navigation hides disabled modules.
- Dashboard omits major widgets tied to disabled modules.
- Quick Capture hides capture types tied to disabled modules.
- Sync Status may visually mark disabled modules, but it does not change sync metadata.

Settings, the root dashboard, and direct module routes remain available.

## Future Surfaces

- Calendar event source filtering by enabled modules.
- Onboarding templates that set module preferences by user role.
- More compact dashboard layouts for small workspaces.
- Module-specific disabled-route notices.
- Cloud Diagnostics labels for disabled workspace modules.

## Recommended Future Presets

- Student: Today, Academics, Goals, Notes, Review, Calendar, Gym.
- Freelancer: Today, Work, Finances, Goals, Notes, Review, Calendar.
- Personal: Today, Goals, Notes, Review, Calendar, Gym.
- Full Atlas: all modules enabled.

Presets should be optional and should never delete existing module data.

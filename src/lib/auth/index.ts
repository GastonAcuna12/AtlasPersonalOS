export type {
  AtlasAuthContextValue,
  AtlasAuthState,
  AtlasAuthStatus,
  AtlasWorkspaceMode,
  AuthActionResult,
  AuthMigrationChoice,
} from "@/lib/auth/types";
export { AUTH_MIGRATION_CHOICES } from "@/lib/auth/types";
export { AtlasAuthProvider, useAtlasAuth } from "@/lib/auth/provider";
export {
  getCurrentAuthState,
  getDisabledAuthState,
  getInitialAuthState,
  signInWithSupabasePassword,
  signOutOfSupabase,
  signUpWithSupabasePassword,
  subscribeToAuthState,
} from "@/lib/auth/session";
export {
  getLocalAtlasDataSummary,
  useLocalAtlasDataSummary,
} from "@/lib/auth/localData";
export type { LocalAtlasDataSummary } from "@/lib/auth/localData";

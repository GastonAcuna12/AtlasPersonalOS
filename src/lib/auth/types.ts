import type { Session, User } from "@supabase/supabase-js";

export type AtlasAuthStatus =
  | "disabled"
  | "loading"
  | "signed_out"
  | "signed_in"
  | "error";

export type AtlasWorkspaceMode =
  | "local_only"
  | "cloud"
  | "migration_pending";

export type AtlasAuthState = {
  status: AtlasAuthStatus;
  isConfigured: boolean;
  session: Session | null;
  user: User | null;
  workspaceMode: AtlasWorkspaceMode;
  errorMessage: string;
};

export type AtlasAuthContextValue = AtlasAuthState & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export type AuthMigrationChoice =
  | "keep_local_only"
  | "upload_local_to_cloud"
  | "merge_local_and_cloud"
  | "replace_cloud_with_local"
  | "skip_for_now";

export const AUTH_MIGRATION_CHOICES: {
  value: AuthMigrationChoice;
  label: string;
  description: string;
}[] = [
  {
    value: "keep_local_only",
    label: "Keep local only",
    description: "Continue using Atlas from this browser without cloud sync.",
  },
  {
    value: "upload_local_to_cloud",
    label: "Upload local to cloud",
    description: "Copy this browser's Atlas data into the signed-in account.",
  },
  {
    value: "merge_local_and_cloud",
    label: "Merge local and cloud",
    description: "Combine local and cloud records with explicit conflict rules.",
  },
  {
    value: "replace_cloud_with_local",
    label: "Replace cloud with local",
    description: "Overwrite cloud data with this browser's Atlas data.",
  },
  {
    value: "skip_for_now",
    label: "Skip for now",
    description: "Stay signed in but postpone migration decisions.",
  },
];

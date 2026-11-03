const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  organization_admin: "Admin",
  team_manager: "Team Manager",
  planner: "Planner",
  viewer: "Viewer",
};

export const roleLabel = (role: string | null | undefined) => (role ? ROLE_LABELS[role] ?? role : "");

/* Why the signed-in Owner/Admin can't reset this member's 2FA, or null if they can.
   The backend enforces the same rules; this keeps the button honest. */
export const resetBlockReason = (
  target: { userId: string; role: string | null },
  me: { userId: string | null; role: string | null },
): string | null => {
  if (me.userId && target.userId === me.userId) {
    return "To change your own two-factor, use \"My two-factor authentication\" above.";
  }
  // An unknown own role leaves the decision to the backend.
  if (target.role === "owner" && me.role && me.role !== "owner") {
    return "Only the Owner can reset the Owner's two-factor authentication.";
  }
  return null;
};

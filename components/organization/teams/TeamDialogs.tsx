"use client";

import { Archive } from "lucide-react";
import { useState } from "react";
import { archiveTeamAction, createTeamAction, renameTeamAction } from "@/app/actions/teams";
import { orgErrorMessage } from "../members/errorMessages";
import type { Team } from "../members/types";
import {
  dangerButtonClass,
  InlineError,
  inputClass,
  labelClass,
  OrgDialog,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  Spinner,
} from "../members/ui";

export const MAX_TEAM_NAME_LENGTH = 120;

// Client-side check matching the backend (1 to 120 characters after trimming).
export const teamNameError = (name: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a team name.";
  if (trimmed.length > MAX_TEAM_NAME_LENGTH) return `Team names can be at most ${MAX_TEAM_NAME_LENGTH} characters.`;
  return null;
};

type NameDialogProps = {
  team?: Team;
  onClose: () => void;
  onSaved: (team: Team) => void;
};

// Create a team, or rename one when `team` is given.
export function TeamNameDialog({ team, onClose, onSaved }: NameDialogProps) {
  const [name, setName] = useState(team?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const invalid = teamNameError(name);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    const result = team ? await renameTeamAction(team.id, name.trim()) : await createTeamAction(name.trim());
    setBusy(false);
    if (result.success && result.data) onSaved(result.data);
    else setError(orgErrorMessage(result));
  };

  return (
    <OrgDialog
      title={team ? "Rename team" : "New team"}
      description={team ? undefined : "Group people who plan events together. You can add members next."}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="team-name-form" className={primaryButtonClass} style={primaryButtonStyle} disabled={busy}>
            {busy && <Spinner />} {team ? "Save name" : "Create team"}
          </button>
        </>
      }
    >
      <form
        id="team-name-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label htmlFor="team-name" className={labelClass}>Team name</label>
        <input
          id="team-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_TEAM_NAME_LENGTH + 20}
          placeholder="e.g. East Coast Events"
          className={inputClass}
          disabled={busy}
          autoFocus
        />
      </form>
      {error && <div className="mt-4"><InlineError>{error}</InlineError></div>}
    </OrgDialog>
  );
}

export function ArchiveTeamDialog({ team, onClose, onArchived }: { team: Team; onClose: () => void; onArchived: (team: Team) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const result = await archiveTeamAction(team.id);
    setBusy(false);
    if (result.success && result.data) onArchived(result.data);
    else setError(orgErrorMessage(result));
  };

  return (
    <OrgDialog
      title={`Archive ${team.name}?`}
      description="The team disappears from team pickers and can't be changed afterwards. Its RFPs and history stay, and members keep their other teams."
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={dangerButtonClass} onClick={confirm} disabled={busy}>
            {busy ? <Spinner /> : <Archive size={15} aria-hidden="true" />} Archive team
          </button>
        </>
      }
    >
      {error && <InlineError>{error}</InlineError>}
    </OrgDialog>
  );
}

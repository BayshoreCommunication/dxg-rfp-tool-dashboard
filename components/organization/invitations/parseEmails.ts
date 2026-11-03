// The invite box takes one email or a pasted list. Mirrors the backend's parseEmailList: commas,
// semicolons or new lines between entries, display names allowed (`"Jane Doe" <jane@x.com>`),
// blanks dropped, order kept. Invalid entries stay in the list so the backend reports each row.

export const MAX_BULK_INVITATIONS = 500;

const EMAIL_PATTERN =
  /^[^\s@<>()[\]\\,;:"]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export const isValidEmail = (value: string): boolean => value.length <= 254 && EMAIL_PATTERN.test(value);

export const parseEmailList = (input: string): string[] =>
  input
    .split(/[\n\r,;]+/)
    .map((piece) => {
      const bracketed = piece.match(/<([^<>]*)>/);
      return (bracketed ? bracketed[1] : piece).trim();
    })
    .filter((piece) => piece.length > 0);

export type EmailListSummary = {
  emails: string[];
  invalid: string[];
  duplicates: string[];
  tooMany: boolean;
};

// A preview for the dialog: how many addresses, and which look wrong before sending.
export const summarizeEmailList = (input: string): EmailListSummary => {
  const emails = parseEmailList(input);
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const email of emails) {
    const key = email.toLowerCase();
    if (seen.has(key)) duplicates.push(email);
    seen.add(key);
  }
  return {
    emails,
    invalid: emails.filter((email) => !isValidEmail(email)),
    duplicates,
    tooMany: emails.length > MAX_BULK_INVITATIONS,
  };
};

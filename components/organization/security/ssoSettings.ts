/* Single sign-on card: the parts with no I/O. */

import type { SsoConnection, SsoConnectionStatus } from "@/app/actions/sso";

export type SsoFormValues = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  domains: string[];
};

export type SsoFormErrors = Partial<Record<keyof SsoFormValues, string>>;

export const emptySsoForm = (connection: SsoConnection | null): SsoFormValues => ({
  issuer: connection?.issuer ?? "",
  clientId: connection?.clientId ?? "",
  clientSecret: "",
  domains: connection?.domains ?? [],
});

const isHttpsUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.search && !url.hash;
  } catch {
    return false;
  }
};

/* Checks before saving. The backend checks again, and also fetches the
   issuer's discovery document. */
export const validateSsoForm = (
  values: SsoFormValues,
  options: { hasClientSecret: boolean; verifiedDomains: string[] },
): SsoFormErrors => {
  const errors: SsoFormErrors = {};
  const issuer = values.issuer.trim();
  if (!issuer) errors.issuer = "Enter the issuer URL from your identity provider.";
  else if (!isHttpsUrl(issuer))
    errors.issuer = "The issuer URL must start with https://, like https://yourcompany.okta.com.";
  if (!values.clientId.trim()) errors.clientId = "Enter the client ID from your identity provider.";
  if (!options.hasClientSecret && !values.clientSecret.trim())
    errors.clientSecret = "Enter the client secret from your identity provider.";
  if (values.domains.length === 0)
    errors.domains = "Choose at least one verified domain for company sign-in.";
  else if (values.domains.some((domain) => !options.verifiedDomains.includes(domain)))
    errors.domains = "Only verified domains can use company sign-in.";
  return errors;
};

export const hasSsoFormErrors = (errors: SsoFormErrors) => Object.keys(errors).length > 0;

/* What PUT /api/organization/sso gets: trimmed, and no secret unless typed. */
export const ssoSavePayload = (values: SsoFormValues) => ({
  issuer: values.issuer.trim(),
  clientId: values.clientId.trim(),
  clientSecret: values.clientSecret.trim() || undefined,
  domains: [...values.domains].sort(),
});

export const SSO_STATUS_LABEL: Record<SsoConnectionStatus | "none", string> = {
  none: "Not set up",
  draft: "Off",
  active: "On",
};

export const ssoStatusKey = (connection: SsoConnection | null): SsoConnectionStatus | "none" =>
  connection ? connection.status : "none";

export const toggleDomain = (domains: string[], domain: string) =>
  domains.includes(domain) ? domains.filter((d) => d !== domain) : [...domains, domain];

/* "Test sign-in": a company sign-in in a new tab, for an email on one of the
   connection's domains. */
export const testSignInEmailError = (email: string, domains: string[]) => {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter an email address to test with.";
  const domain = value.split("@")[1];
  if (!domains.includes(domain)) return `Use an email on ${domains.join(", ") || "a connected domain"}.`;
  return null;
};

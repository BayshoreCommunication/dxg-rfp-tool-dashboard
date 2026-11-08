import { emailDomain, verifyDomainPromptFor } from "./verifyDomainRules";

describe("verifyDomainPromptFor", () => {
  const owner = { canManage: true, email: "casey@acme.co" };

  it("suggests the Owner's company domain when nothing is verified", () => {
    expect(verifyDomainPromptFor({ ...owner, domains: [] })).toEqual({ domain: "acme.co", pending: false });
  });

  it("stays quiet for members who can't manage domains", () => {
    expect(verifyDomainPromptFor({ ...owner, canManage: false, domains: [] })).toBeNull();
  });

  it("stays quiet once any domain is verified", () => {
    expect(verifyDomainPromptFor({ ...owner, domains: [{ domain: "other.co", status: "verified" }] })).toBeNull();
  });

  it("points at a pending domain, preferring the Owner's own", () => {
    expect(
      verifyDomainPromptFor({
        ...owner,
        domains: [{ domain: "first.co", status: "pending" }, { domain: "acme.co", status: "pending" }],
      }),
    ).toEqual({ domain: "acme.co", pending: true });
    expect(verifyDomainPromptFor({ ...owner, domains: [{ domain: "first.co", status: "pending" }] })).toEqual({
      domain: "first.co",
      pending: true,
    });
  });

  it("never suggests a personal mail provider", () => {
    expect(verifyDomainPromptFor({ canManage: true, email: "casey@Gmail.com", domains: [] })).toBeNull();
    expect(verifyDomainPromptFor({ canManage: true, email: null, domains: [] })).toBeNull();
  });

  it("reads the domain from an email", () => {
    expect(emailDomain("A@Sub.Acme.CO ")).toBe("sub.acme.co");
    expect(emailDomain("no-at-sign")).toBeNull();
  });
});

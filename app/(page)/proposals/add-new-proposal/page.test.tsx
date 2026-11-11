import { render, screen } from "@testing-library/react";

jest.mock("@/components/proposals/AssistantWorkspacePage", () => ({
  __esModule: true,
  default: ({ initialProposalId, extraStarter }: { initialProposalId?: string; extraStarter?: React.ReactNode }) => (
    <div data-testid="assistant-workspace">{initialProposalId ?? "no-id"}{extraStarter}</div>
  ),
}));

// ORG-605: "Start from a template" is offered to members who can use RFP templates.
const mockTemplateAccess = jest.fn();
jest.mock("@/app/actions/proposalTemplates", () => ({
  getTemplateAccessAction: (...a: unknown[]) => mockTemplateAccess(...a),
}));
jest.mock("@/components/organization/templates/StartFromTemplate", () => ({
  __esModule: true,
  default: ({ variant }: { variant?: string }) => <div data-testid="start-from-template">{variant ?? "chip"}</div>,
}));

jest.mock("@/components/proposals/ProposalsCreateProcess", () => ({
  __esModule: true,
  default: () => <div data-testid="create-wizard" />,
}));

// Declared outside the factory so its identity survives jest.resetModules().
const mockRedirect = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
jest.mock("next/navigation", () => ({ redirect: mockRedirect }));

const PROPOSAL_ID = "abc123abc123abc123abc123";

type CreateRoute = (props: { searchParams: Promise<{ proposalId?: string }> }) => Promise<React.ReactElement>;

// The flag is read at module scope, so the module is loaded fresh per case.
const loadPage = async (flag: string): Promise<CreateRoute> => {
  process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = flag;
  jest.resetModules();
  const loaded = (await import("./page")) as { default: CreateRoute };
  return loaded.default;
};

describe("/proposals/add-new-proposal", () => {
  const savedFlag = process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTemplateAccess.mockResolvedValue({ canUse: false, canManage: false });
  });

  afterAll(() => {
    if (savedFlag === undefined) delete process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED;
    else process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = savedFlag;
  });

  test("stays the start-something-new entry when no proposal exists yet", async () => {
    const Page = await loadPage("true");
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("assistant-workspace")).toHaveTextContent("no-id");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test("redirects to the proposal's assistant route once a proposal id is present", async () => {
    const Page = await loadPage("true");

    await expect(Page({ searchParams: Promise.resolve({ proposalId: PROPOSAL_ID }) }))
      .rejects.toThrow(`NEXT_REDIRECT:/proposals/${PROPOSAL_ID}/assistant`);
    expect(mockRedirect).toHaveBeenCalledWith(`/proposals/${PROPOSAL_ID}/assistant`);
  });

  test.each([["true", "chip"], ["false", "banner"]])(
    "offers Start from a template to a member who can use templates (conversations %s)",
    async (flag, variant) => {
      mockTemplateAccess.mockResolvedValue({ canUse: true, canManage: false });
      const Page = await loadPage(flag);
      render(await Page({ searchParams: Promise.resolve({}) }));

      expect(screen.getByTestId("start-from-template")).toHaveTextContent(variant);
    },
  );

  test.each(["true", "false"])("offers no template starter to a Viewer (conversations %s)", async (flag) => {
    const Page = await loadPage(flag);
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.queryByTestId("start-from-template")).not.toBeInTheDocument();
  });

  test("falls back to the wizard when conversations are disabled", async () => {
    const Page = await loadPage("false");
    render(await Page({ searchParams: Promise.resolve({ proposalId: PROPOSAL_ID }) }));

    expect(screen.getByTestId("create-wizard")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

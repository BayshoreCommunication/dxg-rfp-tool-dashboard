import { render, screen } from "@testing-library/react";

jest.mock("@/components/proposals/AssistantWorkspacePage", () => ({
  __esModule: true,
  default: ({ initialProposalId }: { initialProposalId?: string }) => (
    <div data-testid="assistant-workspace">{initialProposalId ?? "no-id"}</div>
  ),
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

  beforeEach(() => jest.clearAllMocks());

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

  test("falls back to the wizard when conversations are disabled", async () => {
    const Page = await loadPage("false");
    render(await Page({ searchParams: Promise.resolve({ proposalId: PROPOSAL_ID }) }));

    expect(screen.getByTestId("create-wizard")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

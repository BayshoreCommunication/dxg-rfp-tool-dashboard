import { render, screen } from "@testing-library/react";

// The workspace itself is exercised by its own suite; here it only has to prove
// that the route mounts it with the id from the URL.
jest.mock("@/components/proposals/AssistantWorkspacePage", () => ({
  __esModule: true,
  default: ({ initialProposalId }: { initialProposalId?: string }) => (
    <div data-testid="assistant-workspace">{initialProposalId ?? "no-id"}</div>
  ),
}));

// Declared outside the factory so its identity survives jest.resetModules().
const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
jest.mock("next/navigation", () => ({ notFound: mockNotFound }));

const PROPOSAL_ID = "abc123abc123abc123abc123";

type AssistantRoute = (props: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>;

// The flag is read at module scope, so the module is loaded fresh per case.
const loadPage = async (flag: string): Promise<AssistantRoute> => {
  process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = flag;
  jest.resetModules();
  const loaded = (await import("./page")) as { default: AssistantRoute };
  return loaded.default;
};

describe("/proposals/[id]/assistant", () => {
  const savedFlag = process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED;

  beforeEach(() => jest.clearAllMocks());

  afterAll(() => {
    if (savedFlag === undefined) delete process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED;
    else process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = savedFlag;
  });

  test("renders the assistant workspace for the proposal id in the route", async () => {
    const Page = await loadPage("true");
    render(await Page({ params: Promise.resolve({ id: PROPOSAL_ID }) }));

    expect(screen.getByTestId("assistant-workspace")).toHaveTextContent(PROPOSAL_ID);
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  test("404s when conversations are not enabled", async () => {
    const Page = await loadPage("false");

    await expect(Page({ params: Promise.resolve({ id: PROPOSAL_ID }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });
});

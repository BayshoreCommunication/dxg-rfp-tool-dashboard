import { render, screen } from "@testing-library/react";

// The workspace itself is exercised by its own suite; here it only has to prove
// that the route mounts it with the id from the URL.
jest.mock("@/components/proposals/AssistantWorkspacePage", () => ({
  __esModule: true,
  default: ({ initialProposalId }: { initialProposalId?: string }) => (
    <div data-testid="assistant-workspace">{initialProposalId ?? "no-id"}</div>
  ),
}));

const mockGetProposalById = jest.fn();
jest.mock("@/app/actions/proposals", () => ({
  getProposalByIdAction: (...args: unknown[]) => mockGetProposalById(...args),
}));

// Declared outside the factory so its identity survives jest.resetModules().
const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const mockRedirect = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });
jest.mock("next/navigation", () => ({ notFound: mockNotFound, redirect: mockRedirect, useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/components/proposals/ProposalLoadRecovery', () => ({ __esModule: true, default: ({denied}: {denied:boolean}) => <div>{denied ? 'Access needs checking' : 'Try again'}</div> }));

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProposalById.mockResolvedValue({
      success: true,
      data: { _id: PROPOSAL_ID },
    });
  });

  afterAll(() => {
    if (savedFlag === undefined) delete process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED;
    else process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = savedFlag;
  });

  test("renders the assistant workspace for the proposal id in the route", async () => {
    const Page = await loadPage("true");
    render(await Page({ params: Promise.resolve({ id: PROPOSAL_ID }) }));

    expect(screen.getByTestId("assistant-workspace")).toHaveTextContent(PROPOSAL_ID);
    expect(mockGetProposalById).toHaveBeenCalledWith(PROPOSAL_ID);
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  test("404s when conversations are not enabled", async () => {
    const Page = await loadPage("false");

    await expect(Page({ params: Promise.resolve({ id: PROPOSAL_ID }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
    expect(mockGetProposalById).not.toHaveBeenCalled();
  });

  test("404s when the proposal is unavailable at the destination", async () => {
    mockGetProposalById.mockResolvedValueOnce({
      success: false,
      message: "Proposal not found",
      status: 404,
    });
    const Page = await loadPage("true");

    await expect(
      Page({ params: Promise.resolve({ id: PROPOSAL_ID }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockGetProposalById).toHaveBeenCalledWith(PROPOSAL_ID);
    expect(mockNotFound).toHaveBeenCalled();
  });

  test("rejects an unsafe proposal identifier before backend access", async () => {
    const Page = await loadPage("true");

    await expect(
      Page({ params: Promise.resolve({ id: "../../settings" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockGetProposalById).not.toHaveBeenCalled();
  });
  test.each([503, 502, undefined])('shows recovery, not missing data, for status %s', async status => {
    mockGetProposalById.mockResolvedValueOnce({success:false, status});
    const Page = await loadPage('true');
    render(await Page({params:Promise.resolve({id:PROPOSAL_ID})}));
    expect(screen.getByText('Try again')).toBeVisible();
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(screen.queryByTestId('assistant-workspace')).not.toBeInTheDocument();
  });
  test('expired authentication returns to sign in without pretending the proposal is missing', async () => {
    mockGetProposalById.mockResolvedValueOnce({success:false, status:401});
    const Page = await loadPage('true');
    await expect(Page({params:Promise.resolve({id:PROPOSAL_ID})})).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('reason=session-expired'));
    expect(mockNotFound).not.toHaveBeenCalled();
  });
  test('denied access never mounts the workspace', async () => {
    mockGetProposalById.mockResolvedValueOnce({success:false, status:403});
    const Page = await loadPage('true');
    render(await Page({params:Promise.resolve({id:PROPOSAL_ID})}));
    expect(screen.getByText('Access needs checking')).toBeVisible();
    expect(screen.queryByTestId('assistant-workspace')).not.toBeInTheDocument();
  });
});

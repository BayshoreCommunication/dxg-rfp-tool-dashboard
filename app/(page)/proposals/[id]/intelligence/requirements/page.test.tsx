import { render, screen } from "@testing-library/react";

const getProposal = jest.fn();
const listSets = jest.fn();
const getSet = jest.fn();
const notFound = jest.fn(() => { throw new Error("NEXT_NOT_FOUND"); });
const workspaceProps = jest.fn();
jest.mock("@/app/actions/proposals", () => ({ getProposalByIdAction: (...args: unknown[]) => getProposal(...args) }));
jest.mock("@/app/actions/requirementRegistry", () => ({
  listRequirementSetsAction: (...args: unknown[]) => listSets(...args),
  getRequirementSetAction: (...args: unknown[]) => getSet(...args),
}));
jest.mock("next/navigation", () => ({ notFound }));
jest.mock("@/components/proposalIntelligence/RequirementRegistryWorkspace", () => ({
  __esModule: true,
  default: (props: { proposalId: string; returnTo: string }) => {
    workspaceProps(props);
    return <div data-testid="registry">{props.proposalId}</div>;
  },
}));

const ID = "abc123abc123abc123abc123";
type PageType = (props: { params: Promise<{ id: string }>; searchParams?: Promise<{ returnTo?: string | string[] }> }) => Promise<React.ReactElement>;
const loadPage = async () => (await import("./page")).default as PageType;

describe("requirement registry route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProposal.mockResolvedValue({ success: true, data: { _id: ID } });
    listSets.mockResolvedValue({ success: true, data: [] });
  });
  test("revalidates proposal ownership before rendering", async () => {
    const Page = await loadPage();
    render(await Page({ params: Promise.resolve({ id: ID }) }));
    expect(screen.getByTestId("registry")).toHaveTextContent(ID);
    expect(getProposal).toHaveBeenCalledWith(ID);
    expect(listSets).toHaveBeenCalledWith(ID);
    expect(workspaceProps).toHaveBeenCalledWith(expect.objectContaining({ returnTo: `/proposals/${ID}/intelligence` }));
  });
  test("passes a safe origin back to the approval workspace", async () => {
    const Page = await loadPage();
    render(await Page({ params: Promise.resolve({ id: ID }), searchParams: Promise.resolve({ returnTo: "/vendor-responses/response-1" }) }));
    expect(workspaceProps).toHaveBeenCalledWith(expect.objectContaining({ returnTo: "/vendor-responses/response-1" }));
  });
  test("rejects external return destinations", async () => {
    const Page = await loadPage();
    render(await Page({ params: Promise.resolve({ id: ID }), searchParams: Promise.resolve({ returnTo: "//malicious.example" }) }));
    expect(workspaceProps).toHaveBeenCalledWith(expect.objectContaining({ returnTo: `/proposals/${ID}/intelligence` }));
  });
  test("rejects an unsafe proposal identifier before backend access", async () => {
    const Page = await loadPage();
    await expect(Page({ params: Promise.resolve({ id: "../../settings" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getProposal).not.toHaveBeenCalled();
  });
});

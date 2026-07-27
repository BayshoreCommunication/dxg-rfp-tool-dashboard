import { render, screen } from "@testing-library/react";

const mockListThreads = jest.fn();
const mockGetThread = jest.fn();
jest.mock("@/app/actions/aiAssistant", () => ({
  listAssistantThreadsAction: (...arguments_: unknown[]) =>
    mockListThreads(...arguments_),
  getAssistantThreadAction: (...arguments_: unknown[]) =>
    mockGetThread(...arguments_),
}));

jest.mock("@/components/ai-assistant/AiAssistantWorkspace", () => ({
  __esModule: true,
  default: ({
    initialThreads,
    initialDetail,
  }: {
    initialThreads: Array<{ id: string }>;
    initialDetail: { thread: { id: string } } | null;
  }) => (
    <div data-testid="assistant-workspace">
      {initialThreads.length}:{initialDetail?.thread.id ?? "new"}
    </div>
  ),
}));

const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
jest.mock("next/navigation", () => ({ notFound: mockNotFound }));

type PageComponent = () => Promise<React.ReactElement>;
const loadPage = async (flag: string): Promise<PageComponent> => {
  process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED = flag;
  jest.resetModules();
  const loaded = (await import("./page")) as {
    default: PageComponent;
    dynamic: string;
  };
  expect(loaded.dynamic).toBe("force-dynamic");
  return loaded.default;
};

const thread = {
  id: "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e6f",
  title: "Proposal workflow",
  status: "active",
  messageCount: 0,
  lastMessageAt: null,
  createdAt: "2026-07-27T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:00.000Z",
};

describe("/ai-assistant", () => {
  const savedFlag = process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    mockListThreads.mockResolvedValue({
      success: true,
      data: [],
      correlationId: "corr-list",
    });
  });

  afterAll(() => {
    if (savedFlag === undefined) {
      delete process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED = savedFlag;
    }
  });

  test("404s when the dashboard visibility flag is off", async () => {
    const Page = await loadPage("false");
    await expect(Page()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  test("renders a new assistant workspace when there is no history", async () => {
    const Page = await loadPage("true");
    render(await Page());
    expect(screen.getByTestId("assistant-workspace")).toHaveTextContent(
      "0:new",
    );
    expect(mockGetThread).not.toHaveBeenCalled();
  });

  test("server-loads the most recent active conversation", async () => {
    mockListThreads.mockResolvedValue({
      success: true,
      data: [thread],
      correlationId: "corr-list",
    });
    mockGetThread.mockResolvedValue({
      success: true,
      data: { thread, messages: [] },
      correlationId: "corr-thread",
    });
    const Page = await loadPage("true");
    render(await Page());
    expect(screen.getByTestId("assistant-workspace")).toHaveTextContent(
      `1:${thread.id}`,
    );
  });
});

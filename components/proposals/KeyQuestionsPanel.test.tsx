import { fireEvent, render, screen } from "@testing-library/react";

import KeyQuestionsPanel from "./KeyQuestionsPanel";
import { useConversation } from "./useConversation";

jest.mock("./useConversation", () => ({
  useConversation: jest.fn(),
}));

const mockedUseConversation = useConversation as jest.MockedFunction<
  typeof useConversation
>;
const resolveQuestion = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  resolveQuestion.mockResolvedValue(true);
  mockedUseConversation.mockReturnValue({
    data: {
      conversation: null,
      messages: [],
      questions: [
        {
          id: "question-1",
          code: "ROOM_COUNT",
          severity: "blocking",
          paths: ["/content/venueSchedule/numberOfEventRooms"],
          prompt: "How many event rooms are required?",
          status: "open",
          impact: "cost",
          answerType: "number",
          options: [],
          answeredMessageId: null,
          contextRunId: "run-1",
          createdAt: "2026-07-23T00:00:00.000Z",
        },
      ],
    },
    loading: false,
    loadError: null,
    refresh: jest.fn(),
    pending: [],
    sendMessage: jest.fn(),
    retrySend: jest.fn(),
    resolveQuestion,
    questionBusyId: null,
    questionError: null,
  });
});

test("renders and submits the current key question", async () => {
  const onQuestionResolved = jest.fn();
  render(
    <KeyQuestionsPanel
      proposalId="proposal-1"
      onQuestionResolved={onQuestionResolved}
    />,
  );

  expect(screen.getByText("How many event rooms are required?")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Answer this question"), {
    target: { value: "3" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save answer" }));

  expect(resolveQuestion).toHaveBeenCalledWith("question-1", {
    status: "answered",
    answer: "3",
  });
  expect(await screen.findByText("How many event rooms are required?")).toBeInTheDocument();
});

test("shows a completion state when no open questions remain", () => {
  const onOpenQuestionCountChange = jest.fn();
  mockedUseConversation.mockReturnValue({
    ...mockedUseConversation("proposal-1"),
    data: {
      conversation: null,
      messages: [],
      questions: [],
    },
  });

  render(
    <KeyQuestionsPanel
      proposalId="proposal-1"
      onOpenQuestionCountChange={onOpenQuestionCountChange}
    />,
  );
  expect(screen.getByText("All key questions answered")).toBeInTheDocument();
  expect(onOpenQuestionCountChange).toHaveBeenCalledWith(0);
});

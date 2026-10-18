/** @jest-environment node */

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { revalidatePath } from "next/cache";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import {
  createSupportTicketAction,
  getSupportUnreadCountAction,
  listSupportTicketsAction,
  replySupportTicketAction,
} from "./supportDesk";

const mockedFetch = jest.mocked(authenticatedBackendFetch);
const mockedRevalidate = jest.mocked(revalidatePath);

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

describe("planner support desk actions", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedRevalidate.mockReset();
  });

  test("lists active tickets through the planner route", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(200, { success: true, data: { tickets: [], pagination: { page: 1, perPage: 20, total: 0, totalPages: 1 } } }),
    );
    const result = await listSupportTicketsAction({ status: "active", page: 1 });
    expect(result.success).toBe(true);
    expect(String(mockedFetch.mock.calls[0][0])).toMatch(/\/api\/v1\/support\/tickets\?status=active&page=1$/);
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  test("creates a ticket as JSON, revalidates, and surfaces validation problems", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(201, { success: true, data: { ticket: { id: "t1", ticketNumber: 7 }, message: { id: "m1" } } }),
    );
    const created = await createSupportTicketAction({ subject: "Export", category: "bug", body: "Stuck" });
    expect(created).toMatchObject({ success: true, data: { ticket: { ticketNumber: 7 } } });
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ subject: "Export", category: "bug", body: "Stuck" }),
    });
    expect(mockedRevalidate).toHaveBeenCalledWith("/support");

    mockedFetch.mockResolvedValue(
      jsonResponse(400, { success: false, code: "SUPPORT_INVALID_BODY", message: "A message of 1–5000 characters is required." }),
    );
    await expect(createSupportTicketAction({ subject: "x", category: "other", body: "" })).resolves.toEqual({
      success: false,
      message: "A message of 1–5000 characters is required.",
      code: "SUPPORT_INVALID_BODY",
    });
  });

  test("replies revalidate both the list and the thread", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(201, { success: true, data: { ticket: { id: "t1" }, message: { id: "m2" } } }));
    await replySupportTicketAction("t1", "Still broken");
    expect(String(mockedFetch.mock.calls[0][0])).toMatch(/\/support\/tickets\/t1\/messages$/);
    expect(mockedRevalidate).toHaveBeenCalledWith("/support");
    expect(mockedRevalidate).toHaveBeenCalledWith("/support/t1");
  });

  test("the unread badge degrades to zero on any failure", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { unreadTickets: 3 } }));
    await expect(getSupportUnreadCountAction()).resolves.toBe(3);
    mockedFetch.mockRejectedValue(new Error("offline"));
    await expect(getSupportUnreadCountAction()).resolves.toBe(0);
    mockedFetch.mockResolvedValue(jsonResponse(401, { success: false, message: "nope" }));
    await expect(getSupportUnreadCountAction()).resolves.toBe(0);
  });
});

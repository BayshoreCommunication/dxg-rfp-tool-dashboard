import { createProposalUploadTicketAction } from "@/app/actions/proposals";
import { uploadProposalFiles } from "./uploadProposalFiles";

jest.mock("@/app/actions/proposals", () => ({ createProposalUploadTicketAction: jest.fn() }));
const ticket = jest.mocked(createProposalUploadTicketAction);
const fetchMock = jest.fn();
const originalFetch = global.fetch;
beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = fetchMock;
  ticket.mockResolvedValue({ success: true, ticket: "upload-only", uploadUrl: "https://api.example.com/api/proposals/upload-files/direct" });
});
afterAll(() => { global.fetch = originalFetch; });

test("passes no file bytes to the server action; uploads the original multipart body directly", async () => {
  const form = new FormData();
  form.append("supportDocuments", new File([new Uint8Array(Math.round(12.7 * 1024 * 1024))], "brand-guide.pdf", { type: "application/pdf" }));
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [{ fieldname: "supportDocuments", url: "https://files.example.com/brand-guide.pdf" }] }) });
  const result = await uploadProposalFiles(form);
  expect(ticket).toHaveBeenCalledWith();
  expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/api/proposals/upload-files/direct", {
    method: "POST", headers: { Authorization: "Bearer upload-only" }, body: form, credentials: "omit", cache: "no-store",
  });
  expect(result.supportDocumentUrls).toEqual(["https://files.example.com/brand-guide.pdf"]);
});

test("does not upload when ticket authorization fails", async () => {
  ticket.mockResolvedValue({ success: false, message: "Sign in required" });
  expect(await uploadProposalFiles(new FormData())).toMatchObject({ success: false, message: "Sign in required" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test.each([
  [413, null, /50 MB/],
  [403, null, /sign in again/],
  [422, { message: "Malware scan blocked this file" }, /Malware scan/],
])("reports HTTP %s without claiming a successful upload", async (status, body, expected) => {
  fetchMock.mockResolvedValue({ ok: false, status, json: async () => body });
  const result = await uploadProposalFiles(new FormData());
  expect(result.success).toBe(false);
  expect(result.message).toMatch(expected);
  expect(result.supportDocumentUrls).toEqual([]);
});

test("a retry obtains fresh authorization after a network error", async () => {
  fetchMock.mockRejectedValueOnce(new Error("network"));
  expect((await uploadProposalFiles(new FormData())).success).toBe(false);
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [] }) });
  await uploadProposalFiles(new FormData());
  expect(ticket).toHaveBeenCalledTimes(2);
});

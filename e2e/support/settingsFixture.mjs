// Settings > General for the default e2e account: the saved branding, proposal and signature
// settings (shape from the backend's modal/settingsModel.ts). The stored `linkPrefix` is a value
// saved before the field left the screen; the spec checks it is neither shown nor lost on save.
// `/__e2e/settings` resets the document and returns what the dashboard last saved.

const initial = () => ({
  branding: {
    brandName: "Northwind Events",
    linkPrefix: "northwind-legacy",
    defaultFont: "Inter",
    signatureColor: "#2FC6F5",
    logoFile: null,
  },
  proposals: {
    proposalLanguage: "English",
    defaultCurrency: "$",
    expiryDate: "None",
    priceSeparator: "NONE",
    dateFormat: "MM/DD/YYYY",
    decimalPrecision: "2",
    contacts: {
      email: { enabled: true, value: "planner@example.com" },
      call: { enabled: false, value: "" },
    },
    downloadPreview: "Yes",
    teammateEmail: "",
  },
  signatures: {
    signatureType: "Draw",
    signatureImageUrl: "",
    signatureText: "Avery Planner",
    signatureStyle: "",
  },
});

const state = { settings: initial(), saved: [] };

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
};

// The dashboard sends multipart form data with the document as a JSON `settings` field.
const settingsField = (body) => {
  const match = /name="settings"\r\n\r\n([\s\S]*?)\r\n--/.exec(body);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

export async function handleSettings(request, response, url) {
  const { pathname } = url;
  const method = request.method;

  if (pathname === "/__e2e/settings") {
    if (method === "POST") {
      state.settings = initial();
      state.saved.length = 0;
    }
    json(response, 200, { settings: state.settings, saved: state.saved });
    return true;
  }

  if (pathname !== "/api/settings") return false;

  if (method === "GET") {
    json(response, 200, { success: true, message: "Settings fetched successfully", data: state.settings });
    return true;
  }

  if (method === "PUT") {
    const next = settingsField(await readBody(request));
    if (!next) {
      json(response, 400, { success: false, message: "Settings could not be read." });
      return true;
    }
    state.saved.push(next);
    state.settings = next;
    json(response, 200, { success: true, message: "Settings updated successfully", data: state.settings });
    return true;
  }

  return false;
}

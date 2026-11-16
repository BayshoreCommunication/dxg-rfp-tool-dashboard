// Settings > General (shape from the backend's modal/settingsModel.ts). By default the stub has
// no saved settings and leaves `/api/settings` unanswered, as before this fixture existed, so the
// dashboard shows its own defaults in every other spec. A spec that needs saved settings seeds
// them with `POST /__e2e/settings { seed: "northwind" }`; a POST without a seed clears them, and
// so does the stub's `/__e2e/reset`. A GET returns the settings and what the dashboard last saved.
// The seeded `linkPrefix` is a value saved before the field left the screen.

const northwind = () => ({
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

const state = { settings: null, saved: [] };

export const resetSettings = () => {
  state.settings = null;
  state.saved.length = 0;
};

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
      let body = {};
      try {
        body = JSON.parse((await readBody(request)) || "{}");
      } catch {
        body = {};
      }
      resetSettings();
      if (body.seed === "northwind") state.settings = northwind();
    }
    json(response, 200, { settings: state.settings, saved: state.saved });
    return true;
  }

  // Not seeded: fall through to the stub's 404, which the dashboard treats as "use defaults".
  if (pathname !== "/api/settings" || !state.settings) return false;

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

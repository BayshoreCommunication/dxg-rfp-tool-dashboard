import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ContactData, ProposalSettings } from "../AddNewProposal";
import { buttonsInsideLabels, danglingReferences, duplicateIds } from "./a11yHelpers";
import ContactInfo from "./ContactInfo";

const blank: ContactData = {
  contactFirstName: "", contactLastName: "", contactTitle: "", contactOrganization: "", contactEmail: "",
  contactPhone: "", contactPhoneExt: "", contactPhoneType: "mobile", organizationLegalName: "",
  additionalContacts: [], preferredContactMethod: "", bestTimeToReach: "", anythingElse: "",
};
const settings = {
  branding: { linkPrefix: "", defaultFont: "Inter" },
  proposals: { proposalLanguage: "English", defaultCurrency: "USD", expiryDate: "None", priceSeparator: ",", dateFormat: "MM/DD/YYYY", decimalPrecision: "2" },
} as ProposalSettings;

const renderStep = (data: Partial<ContactData> = {}, showErrors = true, mode: "basic" | "advanced" = "advanced") =>
  render(
    <ContactInfo
      data={{ ...blank, ...data }}
      onChange={jest.fn()}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      showErrors={showErrors}
      proposalSettings={settings}
      mode={mode}
    />,
  );

describe("ContactInfo accessibility wiring", () => {
  test("required fields announce required and tie their errors to the control", () => {
    renderStep();
    for (const [label, error] of [
      [/^First Name/, /First name is required/], [/^Last Name/, /Last name is required/],
      [/^Email Address/, /Email address is required/], [/^Phone Number/, /Phone number is required/],
    ] as const) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("aria-required", "true");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(error);
    }
  });

  test("a malformed email is described by the format error", async () => {
    renderStep({ contactEmail: "not-an-email" });
    const email = screen.getByLabelText(/^Email Address/);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(/valid email address/);
  });

  test("valid fields carry no error attributes", () => {
    renderStep({ contactFirstName: "Sarah", contactEmail: "s@example.com" });
    for (const label of [/^First Name/, /^Email Address/]) {
      expect(screen.getByLabelText(label)).not.toHaveAttribute("aria-invalid");
      expect(screen.getByLabelText(label)).not.toHaveAttribute("aria-describedby");
    }
  });

  test("advanced-only fields are not marked required in basic mode", () => {
    renderStep({}, true, "basic");
    expect(screen.getByLabelText(/^First Name/)).toHaveAttribute("aria-required", "true");
    expect(screen.queryByLabelText(/^Phone Number/)).not.toBeInTheDocument();
  });

  test("phone extension, phone type and preference choices are named", () => {
    renderStep({ contactPhoneType: "mobile", preferredContactMethod: "Email" });
    expect(screen.getByLabelText("Phone extension")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Phone type" })).toBeInTheDocument();
    const preferred = screen.getByRole("group", { name: /Preferred Contact Method/ });
    expect(within(preferred).getByRole("button", { name: "Email" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: /Best Time to Reach You/ })).toBeInTheDocument();
  });

  test("additional contact cards label their fields with unique ids", async () => {
    render(
      <ContactInfo
        data={{ ...blank, additionalContacts: [
          { fullName: "A One", titleAndRole: "", email: "", phone: "", role: "" },
          { fullName: "B Two", titleAndRole: "", email: "", phone: "", role: "" },
        ] as never }}
        onChange={jest.fn()}
        onContinue={jest.fn()}
        onBack={jest.fn()}
        showErrors={false}
        proposalSettings={settings}
        mode="advanced"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /A One/ }));
    await userEvent.click(screen.getByRole("button", { name: /B Two/ }));
    expect(screen.getAllByLabelText("Full Name")).toHaveLength(2);
    expect(screen.getAllByRole("combobox", { name: "Role in Proposal Process" })).toHaveLength(2);
    expect(duplicateIds()).toEqual([]);
  });

  test("no dangling references, duplicate ids or buttons inside labels", () => {
    renderStep({ contactEmail: "bad" });
    expect(danglingReferences()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
    expect(buttonsInsideLabels()).toBe(0);
  });
});

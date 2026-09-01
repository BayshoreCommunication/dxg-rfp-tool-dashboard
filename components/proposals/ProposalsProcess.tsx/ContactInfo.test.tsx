import { render, screen } from "@testing-library/react";

import type { ContactData, ProposalSettings } from "../AddNewProposal";
import ContactInfo from "./ContactInfo";

const contact: ContactData = {
  contactFirstName: "",
  contactLastName: "",
  contactTitle: "",
  contactOrganization: "",
  contactEmail: "",
  contactPhone: "",
  contactPhoneExt: "",
  contactPhoneType: "mobile",
  organizationLegalName: "",
  additionalContacts: [],
  preferredContactMethod: "",
  bestTimeToReach: "",
  anythingElse: "",
};

const settings = {
  branding: { linkPrefix: "", defaultFont: "Inter" },
  proposals: {
    proposalLanguage: "English",
    defaultCurrency: "USD",
    expiryDate: "None",
    priceSeparator: ",",
    dateFormat: "MM/DD/YYYY",
    decimalPrecision: "2",
  },
} as ProposalSettings;

describe("ContactInfo final review placement", () => {
  test("renders the final review after Additional Notes and before publishing controls", () => {
    render(
      <ContactInfo
        data={contact}
        onChange={jest.fn()}
        onContinue={jest.fn()}
        onBack={jest.fn()}
        proposalSettings={settings}
        mode="advanced"
        finalReview={<div data-testid="final-review">Final review cards</div>}
      />,
    );

    const notes = document.getElementById("anythingElse");
    const finalReview = screen.getByTestId("final-review");
    const publishBanner = screen.getByText(/Ready to publish your RFP/i);

    expect(notes).not.toBeNull();
    expect(notes!.compareDocumentPosition(finalReview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(finalReview.compareDocumentPosition(publishBanner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

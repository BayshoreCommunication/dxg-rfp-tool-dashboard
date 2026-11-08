import { fireEvent, render, screen } from "@testing-library/react";
import VerifyDomainBanner from "./VerifyDomainBanner";

describe("VerifyDomainBanner", () => {
  beforeEach(() => window.localStorage.clear());

  it("asks to verify the company domain and links to Security", () => {
    render(<VerifyDomainBanner prompt={{ domain: "acme.co", pending: false }} />);
    expect(screen.getByText("Verify @acme.co")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verify domain" })).toHaveAttribute("href", "/settings/security");
  });

  it("tells a pending domain to use Check now", () => {
    render(<VerifyDomainBanner prompt={{ domain: "acme.co", pending: true }} />);
    expect(screen.getByText("@acme.co isn't verified yet.")).toBeInTheDocument();
    expect(screen.getByText("Check now")).toBeInTheDocument();
  });

  it("stays dismissed for that domain", () => {
    const { unmount } = render(<VerifyDomainBanner prompt={{ domain: "acme.co", pending: false }} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("region", { name: "Verify your company domain" })).toBeNull();
    unmount();
    render(<VerifyDomainBanner prompt={{ domain: "acme.co", pending: false }} />);
    expect(screen.queryByRole("region", { name: "Verify your company domain" })).toBeNull();
  });
});

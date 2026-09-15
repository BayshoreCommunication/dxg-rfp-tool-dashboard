import { render, screen, within } from "@testing-library/react";
import StarterLinks from "./StarterLinks";

describe("StarterLinks", () => {
  test("offers the three workspace starters as links, with the starter carried in the URL", () => {
    render(<StarterLinks />);
    const group = screen.getByRole("group", { name: "Ways to start" });
    expect(group).toHaveTextContent("Start with");
    const links = within(group).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Try an example brief", "/proposals/add-new-proposal?start=example"],
      // Upload carries no param: the picker needs a click on the page itself.
      ["Upload my brief or old RFP", "/proposals/add-new-proposal"],
      ["Describe it from scratch", "/proposals/add-new-proposal?start=scratch"],
    ]);
    expect(links[1]).toHaveAttribute("title", "PDF, DOCX, XLSX, CSV or TXT");
  });

  test("the lead-in label can be omitted", () => {
    render(<StarterLinks label="" />);
    expect(screen.getByRole("group", { name: "Ways to start" })).not.toHaveTextContent("Start with");
  });
});

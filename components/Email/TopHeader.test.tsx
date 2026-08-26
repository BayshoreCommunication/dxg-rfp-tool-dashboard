import { render, screen } from "@testing-library/react";
import TopHeader from "./TopHeader";

test("keeps the email heading without rendering a duplicate send action", () => {
  render(<TopHeader />);

  expect(screen.getByRole("heading", { name: "Email Templates & Reminders" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /email send/i })).not.toBeInTheDocument();
});

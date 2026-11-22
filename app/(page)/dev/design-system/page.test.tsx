import { render, screen } from "@testing-library/react";

const notFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
jest.mock("next/navigation", () => ({ notFound: () => notFound() }));

import DesignSystemPage from "./page";

const setEnv = (value: string) => {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
};

describe("design-system gallery route", () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    setEnv(original as string);
    notFound.mockClear();
  });

  test("returns 404 in production", () => {
    setEnv("production");
    expect(() => DesignSystemPage()).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  test("renders in development", () => {
    setEnv("development");
    render(<DesignSystemPage />);
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Design system", level: 1 })).toBeInTheDocument();
  });
});

import { act, render, screen } from "@testing-library/react";
import SourceIntakeProgress from "./SourceIntakeProgress";

describe("SourceIntakeProgress", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("shows one compact pixel loader with elapsed time", () => {
    jest.useFakeTimers();
    const { container } = render(<SourceIntakeProgress phase="uploading" />);

    const status = screen.getByRole("status", { name: "Attachment progress" });
    expect(status).toHaveClass("w-full", "max-w-3xl");
    expect(status).toHaveTextContent("Uploading your brief");
    expect(status).toHaveTextContent("0.0s");
    expect(container.querySelectorAll("[data-attachment-loader-pixel]")).toHaveLength(9);

    act(() => jest.advanceTimersByTime(1_300));
    expect(status).toHaveTextContent("1.3s");
  });

  test("keeps one continuous timer while the truthful phase changes", () => {
    jest.useFakeTimers();
    const { rerender } = render(<SourceIntakeProgress phase="uploading" />);

    act(() => jest.advanceTimersByTime(2_100));
    rerender(<SourceIntakeProgress phase="checking" />);
    const status = screen.getByRole("status", { name: "Attachment progress" });
    expect(status).toHaveTextContent("Checking your file");
    expect(status).toHaveTextContent("2.1s");

    rerender(<SourceIntakeProgress phase="reading" />);
    expect(status).toHaveTextContent("Reading your brief");
    expect(status).toHaveTextContent("2.1s");
  });
});

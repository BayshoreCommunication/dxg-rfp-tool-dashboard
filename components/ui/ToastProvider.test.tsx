import { render } from "@testing-library/react";
import type { ToastContainerProps } from "react-toastify";
import { ToastProvider } from "./ToastProvider";

let mockToastContainerProps: ToastContainerProps | undefined;

jest.mock("react-toastify", () => ({
  Slide: function MockSlide() {
    return null;
  },
  ToastContainer: function MockToastContainer(props: ToastContainerProps) {
    mockToastContainerProps = props;
    return null;
  },
}));

describe("ToastProvider", () => {
  beforeEach(() => {
    mockToastContainerProps = undefined;
  });

  it("uses readable, deliberate product-notification defaults", () => {
    render(
      <ToastProvider>
        <main>Application</main>
      </ToastProvider>,
    );

    expect(mockToastContainerProps).toEqual(expect.objectContaining({
      "aria-label": "Notifications",
      position: "top-right",
      autoClose: 4500,
      closeOnClick: false,
      draggable: "touch",
      pauseOnHover: true,
      newestOnTop: true,
      limit: 3,
      className: "dxg-toast-container",
      progressClassName: "dxg-toast-progress",
    }));
    expect(mockToastContainerProps?.icon).toEqual(expect.any(Function));
    expect(mockToastContainerProps?.closeButton).toEqual(expect.any(Function));
    expect(mockToastContainerProps?.toastClassName).toEqual(expect.any(Function));
    const toastClassName = mockToastContainerProps?.toastClassName;
    expect(typeof toastClassName === "function"
      ? toastClassName({
          type: "success",
          defaultClassName: "Toastify__toast Toastify__toast-theme--light",
          position: "top-right",
          rtl: false,
        })
      : ""
    ).toContain("Toastify__toast Toastify__toast-theme--light dxg-toast dxg-toast--success");
  });
});

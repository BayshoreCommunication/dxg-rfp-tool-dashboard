"use client";

import { AlertCircle, AlertTriangle, Check, Info, X } from "lucide-react";
import {
  Slide,
  ToastContainer,
  type CloseButtonProps,
  type IconProps,
} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ToastStatusIcon = ({ type }: IconProps) => {
  const Icon = type === "success"
    ? Check
    : type === "error"
      ? AlertCircle
      : type === "warning"
        ? AlertTriangle
        : Info;

  return (
    <span className={`dxg-toast-icon dxg-toast-icon--${type}`} aria-hidden="true">
      <Icon size={18} strokeWidth={2.5} />
    </span>
  );
};

const ToastCloseButton = ({ closeToast }: CloseButtonProps) => (
  <button
    type="button"
    onClick={closeToast}
    aria-label="Dismiss notification"
    className="dxg-toast-close"
  >
    <X size={17} aria-hidden="true" />
  </button>
);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <ToastContainer
        aria-label="Notifications"
        position="top-right"
        autoClose={4500}
        hideProgressBar={false}
        newestOnTop
        limit={3}
        closeOnClick={false}
        pauseOnFocusLoss
        draggable="touch"
        pauseOnHover
        theme="light"
        transition={Slide}
        icon={ToastStatusIcon}
        closeButton={ToastCloseButton}
        className="dxg-toast-container"
        toastClassName={(context) => `${context?.defaultClassName || ""} dxg-toast dxg-toast--${context?.type || "default"}`}
        progressClassName="dxg-toast-progress"
      />
    </>
  );
};

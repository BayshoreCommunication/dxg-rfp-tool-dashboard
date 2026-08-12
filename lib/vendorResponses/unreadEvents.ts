export const VENDOR_UNREAD_COUNT_CHANGED_EVENT =
  "rfpilot:vendor-unread-count-changed";

export const publishVendorUnreadCount = (count: number) => {
  window.dispatchEvent(
    new CustomEvent(VENDOR_UNREAD_COUNT_CHANGED_EVENT, {
      detail: { count: Math.max(0, count) },
    }),
  );
};

/** In-page case open so staff/dashboard/my-cases never need a route redirect. */

export const ADMIN_OPEN_CASE_EVENT = "flyoci:open-admin-case";

export type AdminOpenCaseDetail = {
  applicationId: number;
  reference?: string;
  customer?: string;
};

export function dispatchOpenAdminCase(detail: AdminOpenCaseDetail): boolean {
  if (typeof window === "undefined" || !detail.applicationId) return false;
  const event = new CustomEvent(ADMIN_OPEN_CASE_EVENT, {
    detail,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

export function subscribeOpenAdminCase(
  handler: (detail: AdminOpenCaseDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const listener = (event: Event) => {
    const custom = event as CustomEvent<AdminOpenCaseDetail>;
    const applicationId = Number(custom.detail?.applicationId || 0);
    if (!applicationId) return;
    custom.preventDefault();
    handler({
      applicationId,
      reference: custom.detail?.reference,
      customer: custom.detail?.customer,
    });
  };

  window.addEventListener(ADMIN_OPEN_CASE_EVENT, listener);
  return () => window.removeEventListener(ADMIN_OPEN_CASE_EVENT, listener);
}

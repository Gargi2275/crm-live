"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Check, FolderArchive, RefreshCw, Trash2, X } from "lucide-react";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import {
  approveAdminDocumentDeletionRequest,
  deleteAdminDocumentStorage,
  listAdminDocumentDeletionRequests,
  listAdminDocumentStorageApplications,
  rejectAdminDocumentDeletionRequest,
  type AdminDocumentDeletionRequest,
  type AdminDocumentStorageApplication,
} from "@/lib/admin-auth";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-2 text-sm text-[#102A43]";
const secondaryBtn =
  "inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-50";
const primaryBtn =
  "inline-flex items-center gap-1.5 rounded-[8px] bg-[#1A56DB] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1648b8] disabled:opacity-50";

type DocsTab = "requests" | "storage";

function statusChip(status: string) {
  const key = (status || "").toLowerCase();
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    approved: "bg-blue-50 text-blue-800 border-blue-200",
    rejected: "bg-rose-50 text-rose-800 border-rose-200",
    executed: "bg-emerald-50 text-emerald-800 border-emerald-200",
    cancelled: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${styles[key] || styles.cancelled}`}
    >
      {status || "—"}
    </span>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function AdminDocsPage() {
  const [tab, setTab] = useState<DocsTab>("requests");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [requests, setRequests] = useState<AdminDocumentDeletionRequest[]>([]);
  const [storageRows, setStorageRows] = useState<AdminDocumentStorageApplication[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<AdminDocumentStorageApplication | null>(null);
  const [purging, setPurging] = useState(false);
  const [notesTarget, setNotesTarget] = useState<{
    id: number;
    action: "approve" | "reject";
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const payload = await listAdminDocumentDeletionRequests({
        status: search.trim() ? "all" : statusFilter,
        service: search.trim() ? undefined : serviceFilter.trim() || undefined,
        q: search.trim() || undefined,
        date_from: search.trim() ? undefined : dateFrom || undefined,
        date_to: search.trim() ? undefined : dateTo || undefined,
        limit: 300,
      });
      setRequests(payload.requests);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load deletion requests.");
    } finally {
      setLoadingRequests(false);
    }
  }, [dateFrom, dateTo, search, serviceFilter, statusFilter]);

  const loadStorage = useCallback(async () => {
    setLoadingStorage(true);
    try {
      const rows = await listAdminDocumentStorageApplications();
      setStorageRows(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load document storage.");
    } finally {
      setLoadingStorage(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "requests") return;
    void loadRequests();
  }, [loadRequests, tab]);

  useEffect(() => {
    if (tab !== "storage") return;
    void loadStorage();
  }, [loadStorage, tab]);

  const activeFilterCount =
    tab === "requests"
      ? (statusFilter !== "all" ? 1 : 0) +
        (serviceFilter.trim() ? 1 : 0) +
        (search.trim() ? 1 : 0) +
        (dateFrom ? 1 : 0) +
        (dateTo ? 1 : 0)
      : 0;

  const clearFilters = useCallback(() => {
    setStatusFilter("all");
    setServiceFilter("");
    setDateFrom("");
    setDateTo("");
  }, []);

  const storageWithFiles = useMemo(
    () => storageRows.filter((row) => !row.documents_deleted && (row.document_count > 0 || row.folder_exists)),
    [storageRows],
  );

  useSetAdminPageChrome({
    title: "Documents",
    subtitle: tab === "requests" ? "Deletion request history" : "Server document storage",
    icon: FolderArchive,
    search:
      tab === "requests"
        ? {
            value: search,
            onChange: setSearch,
            placeholder: "Email, ref, file…",
          }
        : undefined,
    activeFilterCount,
    onClearFilters: tab === "requests" ? clearFilters : undefined,
    meta:
      tab === "requests"
        ? `${requests.length} request${requests.length === 1 ? "" : "s"}`
        : `${storageWithFiles.length} with files`,
    syncKey: `${tab}|${statusFilter}|${serviceFilter}|${search}|${dateFrom}|${dateTo}|${requests.length}|${storageWithFiles.length}|${loadingRequests}|${loadingStorage}`,
    actions: (
      <button
        type="button"
        onClick={() => {
          if (tab === "requests") void loadRequests();
          else void loadStorage();
        }}
        disabled={tab === "requests" ? loadingRequests : loadingStorage}
        className={secondaryBtn}
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${(tab === "requests" ? loadingRequests : loadingStorage) ? "animate-spin" : ""}`}
        />
        Refresh
      </button>
    ),
    filtersContent:
      tab === "requests" ? (
        <>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-[#486581]">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={filterFieldClass}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="executed">Executed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-[#486581]">Service</span>
            <input
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              placeholder="OCI, e-Visa…"
              className={filterFieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-[#486581]">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={filterFieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-[#486581]">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={filterFieldClass}
            />
          </label>
        </>
      ) : undefined,
  });

  const runReview = async () => {
    if (!notesTarget) return;
    setActionId(notesTarget.id);
    try {
      if (notesTarget.action === "approve") {
        const updated = await approveAdminDocumentDeletionRequest(notesTarget.id, reviewNotes.trim());
        setRequests((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        toast.success("Request approved. Customer can delete documents.");
      } else {
        const updated = await rejectAdminDocumentDeletionRequest(notesTarget.id, reviewNotes.trim());
        setRequests((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        toast.success("Request rejected.");
      }
      setNotesTarget(null);
      setReviewNotes("");
      await loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setActionId(null);
    }
  };

  const confirmPurge = async () => {
    if (!purgeTarget) return;
    setPurging(true);
    try {
      await deleteAdminDocumentStorage(String(purgeTarget.application_id));
      toast.success("Documents purged from server.");
      setPurgeTarget(null);
      await loadStorage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Purge failed.");
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="w-full space-y-3 font-body">
      <div className="inline-flex rounded-[10px] border border-[#D9E1EA] bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("requests")}
          className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "requests"
              ? "bg-[#1A56DB] text-white shadow-sm"
              : "text-[#486581] hover:bg-[#F5F7FA]"
          }`}
        >
          Requests
          <span className={`ml-1.5 ${tab === "requests" ? "text-white/80" : "text-[#829AB1]"}`}>
            {requests.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("storage")}
          className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "storage"
              ? "bg-[#1A56DB] text-white shadow-sm"
              : "text-[#486581] hover:bg-[#F5F7FA]"
          }`}
        >
          Storage
          <span className={`ml-1.5 ${tab === "storage" ? "text-white/80" : "text-[#829AB1]"}`}>
            {storageWithFiles.length}
          </span>
        </button>
      </div>

      {tab === "requests" ? (
        <section className="overflow-hidden rounded-[10px] border border-[#D9E1EA] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5EAF0] bg-[#F8FCFF] px-3 py-2">
            <h2 className="text-sm font-heading font-semibold text-[#102A43]">Deletion requests</h2>
            <span className="text-xs text-[#627D98]">{requests.length} shown</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-[#F5F7FA] text-[#486581]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Requested</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Service</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Ref / File</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Reviewed</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {loadingRequests ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-[#627D98]">
                      Loading requests…
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-[#627D98]">
                      No deletion requests match these filters.
                    </td>
                  </tr>
                ) : (
                  requests.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F8FCFF]">
                      <td className="px-3 py-2 text-xs text-[#486581] whitespace-nowrap">
                        {formatDate(row.requested_at)}
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium text-[#102A43]">
                          {row.customer_name || row.customer_email || "—"}
                        </p>
                        {row.customer_name && row.customer_email ? (
                          <p className="mt-0.5 text-xs text-[#627D98]">{row.customer_email}</p>
                        ) : null}
                        {row.reason ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-[#627D98]">{row.reason}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-[#486581]">
                        <p className="font-medium text-[#102A43]">{row.service_name || row.service_type || "—"}</p>
                        {row.service_type && row.service_name ? (
                          <p className="text-[11px] text-[#829AB1]">{row.service_type}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-[#486581]">
                        <p>{row.reference_number || "—"}</p>
                        {row.file_number ? <p className="text-[11px] text-[#829AB1]">{row.file_number}</p> : null}
                      </td>
                      <td className="px-3 py-2">{statusChip(row.status)}</td>
                      <td className="px-3 py-2 text-xs text-[#486581]">
                        {row.reviewed_by_name || row.reviewed_at ? (
                          <>
                            <p className="font-medium text-[#102A43]">{row.reviewed_by_name || "—"}</p>
                            <p className="text-[11px] text-[#829AB1]">{formatDate(row.reviewed_at)}</p>
                            {row.review_notes ? (
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-[#627D98]">{row.review_notes}</p>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-[#829AB1]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {row.status === "pending" ? (
                            <>
                              <button
                                type="button"
                                disabled={actionId === row.id}
                                onClick={() => {
                                  setReviewNotes("");
                                  setNotesTarget({ id: row.id, action: "approve" });
                                }}
                                className={primaryBtn}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={actionId === row.id}
                                onClick={() => {
                                  setReviewNotes("");
                                  setNotesTarget({ id: row.id, action: "reject" });
                                }}
                                className="inline-flex items-center gap-1.5 rounded-[8px] border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </>
                          ) : row.status === "executed" && row.executed_at ? (
                            <span className="text-xs text-[#829AB1]">Deleted {formatDate(row.executed_at)}</span>
                          ) : (
                            <span className="text-xs text-[#829AB1]">History</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[10px] border border-[#D9E1EA] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5EAF0] bg-[#F8FCFF] px-3 py-2">
            <h2 className="text-sm font-heading font-semibold text-[#102A43]">Server storage</h2>
            <span className="text-xs text-[#627D98]">{storageWithFiles.length} with files</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-[#F5F7FA] text-[#486581]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Service</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Reference</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Docs</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Status</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {loadingStorage ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-[#627D98]">
                      Loading storage…
                    </td>
                  </tr>
                ) : storageWithFiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-[#627D98]">
                      No applications currently holding documents on the server.
                    </td>
                  </tr>
                ) : (
                  storageWithFiles.map((row) => (
                    <tr key={row.application_id} className="hover:bg-[#F8FCFF]">
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium text-[#102A43]">
                          {row.customer_name || row.customer_email || "—"}
                        </p>
                        {row.customer_name && row.customer_email ? (
                          <p className="mt-0.5 text-xs text-[#627D98]">{row.customer_email}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-[#486581]">{row.service_name || row.case_type || "—"}</td>
                      <td className="px-3 py-2 text-xs text-[#486581]">{row.reference_number || row.application_id}</td>
                      <td className="px-3 py-2 text-xs text-[#486581]">{row.document_count}</td>
                      <td className="px-3 py-2 text-xs text-[#486581]">
                        {row.application_status_label || row.current_stage_label || "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setPurgeTarget(row)}
                          className="inline-flex items-center gap-1.5 rounded-[8px] border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Purge
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {notesTarget ? (
        <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[#D9E1EA] bg-white p-4 shadow-xl">
            <h3 className="text-sm font-heading font-semibold text-[#102A43]">
              {notesTarget.action === "approve" ? "Approve deletion request" : "Reject deletion request"}
            </h3>
            <p className="mt-1 text-xs text-[#627D98]">Optional notes are stored with the review history.</p>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              className={`${filterFieldClass} mt-3`}
              placeholder="Review notes (optional)"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className={secondaryBtn}
                disabled={actionId != null}
                onClick={() => {
                  setNotesTarget(null);
                  setReviewNotes("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  notesTarget.action === "approve"
                    ? primaryBtn
                    : "inline-flex items-center gap-1.5 rounded-[8px] bg-[#B42318] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#912018] disabled:opacity-50"
                }
                disabled={actionId != null}
                onClick={() => void runReview()}
              >
                {notesTarget.action === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(purgeTarget)}
        title="Purge documents from server?"
        description={
          purgeTarget
            ? `Permanently remove stored files for ${purgeTarget.reference_number || purgeTarget.application_id} (${purgeTarget.customer_email || "customer"}). This cannot be undone.`
            : ""
        }
        confirmLabel="Purge now"
        loading={purging}
        tone="danger"
        onConfirm={() => void confirmPurge()}
        onCancel={() => {
          if (!purging) setPurgeTarget(null);
        }}
      />
    </div>
  );
}

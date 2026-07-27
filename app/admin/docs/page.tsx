"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ChevronDown, ChevronRight, FolderArchive, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import {
  deleteAdminDocumentStorage,
  listAdminDocumentStorageApplications,
  type AdminDocumentStorageApplication,
} from "@/lib/admin-auth";

type DateFilter = "all" | "week" | "month" | "year" | "custom";
type FolderFilter = "all" | "on_server" | "missing";

function applicationStatusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["completed", "dispatched", "approved", "paid", "payment_received"].includes(normalized)) {
    return "bg-[#009877]/12 text-[#006F57] border-[#009877]/35";
  }
  if (["rejected", "correction_requested"].includes(normalized)) {
    return "bg-[#FEE2E2] text-[#B42318] border-[#FECACA]";
  }
  if (
    [
      "draft",
      "audit_pending",
      "pending_quote",
      "payment_pending",
      "final_submission_pending",
      "reuploaded_pending_review",
      "under_review",
      "processing",
    ].includes(normalized)
  ) {
    return "bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40";
  }
  if (["quoted", "submitted"].includes(normalized)) {
    return "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]";
  }
  return "bg-[#F5F7FA] text-[#486581] border-[#D9E1EA]";
}

const inputClass =
  "w-full rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none focus:border-[#33A1FD]";

const defaultFilters = () => ({
  search: "",
  service: "all",
  dateFilter: "all" as DateFilter,
  dateFrom: "",
  dateTo: "",
  folderFilter: "all" as FolderFilter,
  documentType: "all",
  applicationStatus: "all",
});

function getDateRangeStart(filter: DateFilter): Date | null {
  const now = new Date();
  if (filter === "all") return null;
  if (filter === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(now);
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (filter === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (filter === "year") {
    return new Date(now.getFullYear(), 0, 1);
  }
  return null;
}

function rowAnchorDate(row: AdminDocumentStorageApplication): Date | null {
  const raw = row.latest_upload_at || row.created_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesDateFilter(
  row: AdminDocumentStorageApplication,
  dateFilter: DateFilter,
  dateFrom: string,
  dateTo: string,
) {
  const anchor = rowAnchorDate(row);
  if (!anchor) return dateFilter === "all" && !dateFrom && !dateTo;

  if (dateFilter === "custom") {
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`);
      if (anchor < from) return false;
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59`);
      if (anchor > to) return false;
    }
    return true;
  }

  if (dateFilter === "all") return true;

  const start = getDateRangeStart(dateFilter);
  if (!start) return true;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return anchor >= start && anchor <= end;
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
        active ? "bg-[#009877] text-white" : "text-[#486581] hover:bg-[#F5F7FA]"
      }`}
    >
      {label}
    </button>
  );
}

export default function AdminDocumentStoragePage() {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const role = adminUser?.role ?? "";

  const [applications, setApplications] = useState<AdminDocumentStorageApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDocumentStorageApplication | null>(null);
  const [expandedDocsId, setExpandedDocsId] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaultFilters);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAdminDocumentStorageApplications();
      setApplications(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load applications.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    if (role !== "admin") {
      router.replace("/admin");
      return;
    }
    void load();
  }, [adminUser, role, router, load]);

  const serviceOptions = useMemo(
    () => Array.from(new Set(applications.map((row) => row.service_name).filter(Boolean))).sort(),
    [applications],
  );

  const documentTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(applications.flatMap((row) => row.documents.map((doc) => doc.document_type)).filter(Boolean)),
      ).sort(),
    [applications],
  );

  const applicationStatusOptions = useMemo(() => {
    const map = new Map<string, string>();
    applications.forEach((row) => {
      if (row.application_status) {
        map.set(row.application_status, row.application_status_label || row.application_status);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [applications]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.service !== "all") count += 1;
    if (filters.dateFilter !== "all") count += 1;
    if (filters.folderFilter !== "all") count += 1;
    if (filters.documentType !== "all") count += 1;
    if (filters.applicationStatus !== "all") count += 1;
    return count;
  }, [filters]);

  const filteredApplications = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    return applications.filter((row) => {
      if (needle) {
        const haystack = [
          row.application_id,
          row.reference_number,
          row.file_number,
          row.customer_name,
          row.customer_email,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      if (filters.service !== "all" && row.service_name !== filters.service) return false;

      if (!matchesDateFilter(row, filters.dateFilter, filters.dateFrom, filters.dateTo)) return false;

      if (filters.folderFilter === "on_server" && !row.folder_exists) return false;
      if (filters.folderFilter === "missing" && row.folder_exists) return false;

      if (
        filters.documentType !== "all" &&
        !row.documents.some((doc) => doc.document_type === filters.documentType)
      ) {
        return false;
      }

      if (filters.applicationStatus !== "all" && row.application_status !== filters.applicationStatus) {
        return false;
      }

      return true;
    });
  }, [applications, filters]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.application_id);
    try {
      await deleteAdminDocumentStorage(deleteTarget.application_id);
      toast.success(`Documents deleted from server for ${deleteTarget.application_id}.`);
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete documents.");
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () =>
    setFilters((current) => ({
      ...defaultFilters(),
      search: current.search,
    }));

  useSetAdminPageChrome(
    adminUser && role === "admin"
      ? {
          title: "Document Storage",
          subtitle: "Encrypted uploads by application",
          icon: FolderArchive,
          search: {
            value: filters.search,
            onChange: (value) => setFilters((c) => ({ ...c, search: value })),
            placeholder: "Application ID, reference, customer…",
          },
          activeFilterCount,
          onClearFilters: clearFilters,
          meta: loading
            ? "Loading…"
            : `${filteredApplications.length} of ${applications.length} application(s)`,
          syncKey: `${filters.search}|${filters.service}|${filters.documentType}|${filters.applicationStatus}|${filters.folderFilter}|${filters.dateFilter}|${filters.dateFrom}|${filters.dateTo}|${loading}|${filteredApplications.length}`,
          filtersContent: (
            <>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#627D98]">Service</span>
                <select
                  value={filters.service}
                  onChange={(e) => setFilters((c) => ({ ...c, service: e.target.value }))}
                  className={inputClass}
                >
                  <option value="all">All services</option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#627D98]">Document type</span>
                <select
                  value={filters.documentType}
                  onChange={(e) => setFilters((c) => ({ ...c, documentType: e.target.value }))}
                  className={inputClass}
                >
                  <option value="all">All document types</option>
                  {documentTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#627D98]">Application status</span>
                <select
                  value={filters.applicationStatus}
                  onChange={(e) => setFilters((c) => ({ ...c, applicationStatus: e.target.value }))}
                  className={inputClass}
                >
                  <option value="all">All statuses</option>
                  {applicationStatusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#627D98]">Folder on server</span>
                <select
                  value={filters.folderFilter}
                  onChange={(e) => setFilters((c) => ({ ...c, folderFilter: e.target.value as FolderFilter }))}
                  className={inputClass}
                >
                  <option value="all">All</option>
                  <option value="on_server">On server</option>
                  <option value="missing">Missing</option>
                </select>
              </label>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#627D98]">Upload date</span>
                <div className="inline-flex flex-wrap gap-1 rounded-[10px] border border-[#D9E1EA] bg-[#FBFCFE] p-1">
                  <FilterChip
                    label="All time"
                    active={filters.dateFilter === "all"}
                    onClick={() => setFilters((c) => ({ ...c, dateFilter: "all", dateFrom: "", dateTo: "" }))}
                  />
                  <FilterChip
                    label="This week"
                    active={filters.dateFilter === "week"}
                    onClick={() => setFilters((c) => ({ ...c, dateFilter: "week", dateFrom: "", dateTo: "" }))}
                  />
                  <FilterChip
                    label="This month"
                    active={filters.dateFilter === "month"}
                    onClick={() => setFilters((c) => ({ ...c, dateFilter: "month", dateFrom: "", dateTo: "" }))}
                  />
                  <FilterChip
                    label="This year"
                    active={filters.dateFilter === "year"}
                    onClick={() => setFilters((c) => ({ ...c, dateFilter: "year", dateFrom: "", dateTo: "" }))}
                  />
                  <FilterChip
                    label="Custom"
                    active={filters.dateFilter === "custom"}
                    onClick={() => setFilters((c) => ({ ...c, dateFilter: "custom" }))}
                  />
                </div>
                {filters.dateFilter === "custom" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs text-[#627D98]">From</span>
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters((c) => ({ ...c, dateFrom: e.target.value }))}
                        className={inputClass}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-[#627D98]">To</span>
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters((c) => ({ ...c, dateTo: e.target.value }))}
                        className={inputClass}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </>
          ),
        }
      : { title: "Documents", icon: FolderArchive },
  );

  if (!adminUser || role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-4 font-body max-w-[1500px] mx-auto">
      {loading ? (
        <div className="rounded-[12px] border border-dashed border-[#B8C7D9] bg-white px-4 py-8 text-sm text-[#627D98]">
          Loading applications with documents...
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[#B8C7D9] bg-white px-4 py-10 text-center text-sm text-[#627D98]">
          No applications with uploaded documents found.
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[#B8C7D9] bg-white px-4 py-10 text-center text-sm text-[#627D98]">
          No applications match the current filters.{" "}
          <button type="button" onClick={clearFilters} className="text-[#009877] font-semibold hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
            <h2 className="text-sm font-heading font-semibold text-[#102A43]">Applications with documents</h2>
            <span className="text-xs text-[#627D98]">
              {filteredApplications.length} of {applications.length} shown
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-[#F5F7FA] text-[#486581]">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold">Application ID</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Customer</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Email</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Service</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Last upload</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Document files</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Folder</th>
                  <th className="px-3 py-2.5 text-left font-semibold w-[72px]">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                {filteredApplications.map((row) => {
                  const docsExpanded = expandedDocsId === row.application_id;
                  const docCount = row.documents.length;
                  return (
                  <tr
                    key={row.application_id}
                    className={`hover:bg-[#F8FCFF] ${docsExpanded ? "align-top" : "align-middle"}`}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-[#102A43]">{row.application_id}</p>
                      {row.reference_number && row.reference_number !== row.application_id ? (
                        <p className="text-xs text-[#627D98] mt-0.5">Ref: {row.reference_number}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">{row.customer_name}</td>
                    <td className="px-3 py-2.5">{row.customer_email}</td>
                    <td className="px-3 py-2.5">{row.service_name || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${applicationStatusClass(row.application_status)}`}
                        title={row.current_stage_label ? `Stage: ${row.current_stage_label}` : undefined}
                      >
                        {row.application_status_label || row.application_status || "—"}
                      </span>
                      {row.current_stage_label ? (
                        <p className="mt-1 text-[10px] text-[#627D98]">{row.current_stage_label}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#627D98]">
                      {row.latest_upload_at
                        ? new Date(row.latest_upload_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {docCount === 0 ? (
                        <span className="text-[#627D98]">—</span>
                      ) : (
                        <div className="min-w-[180px]">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDocsId((current) =>
                                current === row.application_id ? null : row.application_id,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-[8px] border border-[#D9E1EA] bg-[#FBFCFE] px-2 py-1 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
                            aria-expanded={docsExpanded}
                          >
                            {docsExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-[#627D98]" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-[#627D98]" />
                            )}
                            {docCount} file{docCount === 1 ? "" : "s"}
                          </button>
                          {docsExpanded ? (
                            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-[8px] border border-[#E5EAF0] bg-white p-2">
                              {row.documents.map((doc) => (
                                <li key={doc.id} className="text-xs leading-snug">
                                  <span className="font-medium text-[#102A43]" title={doc.display_name}>
                                    {doc.display_name}
                                  </span>
                                  <span className="text-[#627D98]">
                                    {" "}
                                    · {doc.document_type.replace(/_/g, " ")}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          row.folder_exists
                            ? "bg-[#009877]/12 text-[#006F57] border-[#009877]/35"
                            : "bg-[#F5F7FA] text-[#627D98] border-[#D9E1EA]"
                        }`}
                      >
                        {row.folder_exists ? "On server" : "Missing"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        disabled={deletingId === row.application_id || row.documents_deleted}
                        title={
                          row.documents_deleted
                            ? "Documents already deleted"
                            : "Delete documents from server"
                        }
                        className="inline-flex items-center justify-center rounded-[8px] p-2 text-[#B42318] hover:bg-[#FEE2E2] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete documents?"
        description={
          deleteTarget
            ? `Delete all encrypted documents for ${deleteTarget.application_id} (${deleteTarget.customer_name})? This removes ${deleteTarget.document_count} file${deleteTarget.document_count === 1 ? "" : "s"} from the server folder and document records. The user account and application stay.`
            : ""
        }
        confirmLabel="Delete documents"
        loading={Boolean(deletingId)}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deletingId) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

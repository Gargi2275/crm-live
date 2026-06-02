"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { deleteAdminLogs, getAdminLogs, type AdminLogItem, type AdminLogsResponse } from "@/lib/admin-auth";
import { ArrowUp, Logs, RefreshCw, Search, ShieldAlert, Trash2 } from "lucide-react";

export default function AdminLogsPage() {
  const [data, setData] = useState<AdminLogsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [eventType, setEventType] = useState<"all" | "login" | "failed_attempt" | "website_visit" | "event">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllAcrossTable, setSelectAllAcrossTable] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (params?: {
    nextOffset?: number;
    nextSearch?: string;
    nextEventType?: typeof eventType;
    nextDateFrom?: string;
    nextDateTo?: string;
  }) => {
    setLoading(true);
    try {
      const nextOffset = params?.nextOffset ?? offset;
      const nextSearch = params?.nextSearch ?? appliedSearch;
      const nextEventType = params?.nextEventType ?? eventType;
      const nextDateFrom = params?.nextDateFrom ?? dateFrom;
      const nextDateTo = params?.nextDateTo ?? dateTo;
      const payload = await getAdminLogs({
        search: nextSearch,
        eventType: nextEventType,
        dateFrom: nextDateFrom || undefined,
        dateTo: nextDateTo || undefined,
        limit: pageSize,
        offset: nextOffset,
      });
      setData(payload);
      setOffset(nextOffset);
      setSelectedIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []); // initial load only

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const normalized = search.trim();
      setAppliedSearch(normalized);
      setSelectAllAcrossTable(false);
      void load({
        nextOffset: 0,
        nextSearch: normalized,
        nextEventType: eventType,
        nextDateFrom: dateFrom,
        nextDateTo: dateTo,
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, eventType, dateFrom, dateTo, pageSize]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 350);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const rows = useMemo(() => data?.results || [], [data?.results]);
  const allSelected = rows.length > 0 && rows.every((row) => selectAllAcrossTable || selectedIds.includes(row.id));

  const eventBadge = (row: AdminLogItem) => {
    switch (row.event_type) {
      case "login":
        return "bg-[#009877]/10 text-[#006F57] border border-[#009877]/25";
      case "failed_attempt":
        return "bg-[#B42318]/10 text-[#B42318] border border-[#B42318]/25";
      case "website_visit":
        return "bg-[#0B69B7]/10 text-[#0B69B7] border border-[#0B69B7]/25";
      default:
        return "bg-[#627D98]/10 text-[#486581] border border-[#627D98]/25";
    }
  };

  const toggleSelection = (id: string) => {
    if (selectAllAcrossTable) {
      setSelectAllAcrossTable(false);
      setSelectedIds(rows.map((row) => row.id).filter((rowId) => rowId !== id));
      return;
    }
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    if (selectAllAcrossTable) {
      setSelectAllAcrossTable(false);
      setSelectedIds([]);
      return;
    }
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !rows.some((row) => row.id === id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...rows.map((row) => row.id)])));
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectAllAcrossTable(false);
  };

  const toggleSelectAllAcrossTable = () => {
    if (selectAllAcrossTable) {
      setSelectAllAcrossTable(false);
      setSelectedIds([]);
      return;
    }
    setSelectAllAcrossTable(true);
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
    const selectedCount = selectAllAcrossTable ? (data?.pagination.total || 0) : selectedRows.length;
    if (!selectedCount) {
      toast.error("Select at least one log row to delete.");
      return;
    }
    if (!window.confirm(`Delete ${selectedCount} selected log entries from database?`)) {
      return;
    }

    setDeleting(true);
    try {
      let deleteItems: Array<{ source: AdminLogItem["source"]; record_id: number }> = [];

      if (selectAllAcrossTable) {
        const batchLimit = 500;
        let batchOffset = 0;
        let hasMore = true;
        while (hasMore) {
          const batch = await getAdminLogs({
            search: appliedSearch,
            eventType,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            limit: batchLimit,
            offset: batchOffset,
          });
          deleteItems.push(
            ...(batch.results || []).map((row) => ({
              source: row.source,
              record_id: row.record_id,
            }))
          );
          hasMore = Boolean(batch.pagination?.has_more);
          batchOffset += batchLimit;
        }
      } else {
        deleteItems = selectedRows.map((row) => ({
          source: row.source,
          record_id: row.record_id,
        }));
      }

      const payload = await deleteAdminLogs(deleteItems);
      toast.success(`Deleted ${payload.total_deleted} logs.`);
      await load({ nextOffset: 0, nextSearch: appliedSearch, nextEventType: eventType });
      setSelectAllAcrossTable(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete selected logs.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1500px] mx-auto space-y-4 font-body">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-heading font-semibold text-[#102A43] flex items-center gap-2">
            <Logs className="w-5 h-5 text-[#486581]" /> Logs Module
          </h1>
          <p className="mt-1 text-sm text-[#627D98]">
            Login logs, website visit logs, failed attempts, and other events with IP address and timestamps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, event, IP, page..."
              className="bg-white border border-[#D9E1EA] rounded-[10px] pl-9 pr-3 py-2 text-sm text-[#102A43] min-w-[240px]"
            />
          </div>
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value as typeof eventType)}
            className="bg-white border border-[#D9E1EA] rounded-[10px] px-3 py-2 text-sm text-[#102A43]"
            aria-label="Event type filter"
          >
            <option value="all">All events</option>
            <option value="login">Login logs</option>
            <option value="failed_attempt">Failed attempts</option>
            <option value="website_visit">Website visits</option>
            <option value="event">Other events</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="bg-white border border-[#D9E1EA] rounded-[10px] px-3 py-2 text-sm text-[#102A43]"
            aria-label="From date"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="bg-white border border-[#D9E1EA] rounded-[10px] px-3 py-2 text-sm text-[#102A43]"
            aria-label="To date"
            title="To date"
          />
        
          <button
            type="button"
            onClick={toggleSelectAllAcrossTable}
            disabled={loading || (data?.pagination.total || 0) === 0}
            className={`inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-semibold border ${
              selectAllAcrossTable
                ? "bg-[#EFF7FF] text-[#0B69B7] border-[#B7D7F7]"
                : "bg-white text-[#334E68] border-[#D9E1EA] hover:bg-[#F5F7FA]"
            } disabled:opacity-50`}
          >
            {selectAllAcrossTable ? "Unselect Table" : "Select All Rows"}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={loading || (selectedIds.length === 0 && !selectAllAcrossTable)}
            className="inline-flex items-center gap-2 bg-white border border-[#D9E1EA] rounded-[10px] px-3 py-2 text-sm font-semibold text-[#334E68] hover:bg-[#F5F7FA] disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteSelected()}
            disabled={loading || deleting || (selectedIds.length === 0 && !selectAllAcrossTable)}
            className="inline-flex items-center gap-2 bg-[#B42318] border border-[#B42318] rounded-[10px] px-3 py-2 text-sm font-semibold text-white hover:bg-[#9F2618] disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" /> Delete ({selectAllAcrossTable ? (data?.pagination.total || 0) : selectedIds.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setEventType("all")}
          className={`text-left bg-white rounded-[12px] border p-4 ${eventType === "all" ? "border-[#0B69B7]" : "border-[#D9E1EA]"}`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#B45309]" />
            <p className="text-sm font-heading font-semibold text-[#102A43]">Total</p>
          </div>
          <p className="mt-2 text-2xl font-heading font-semibold text-[#102A43]">{loading ? "—" : data?.summary.total ?? 0}</p>
        </button>
        <button
          type="button"
          onClick={() => setEventType("login")}
          className={`text-left bg-white rounded-[12px] border p-4 ${eventType === "login" ? "border-[#006F57]" : "border-[#D9E1EA]"}`}
        >
          <p className="text-sm font-heading font-semibold text-[#102A43]">Login</p>
          <p className="mt-2 text-2xl font-heading font-semibold text-[#006F57]">{loading ? "—" : data?.summary.login_count ?? 0}</p>
        </button>
        <button
          type="button"
          onClick={() => setEventType("failed_attempt")}
          className={`text-left bg-white rounded-[12px] border p-4 ${eventType === "failed_attempt" ? "border-[#B42318]" : "border-[#D9E1EA]"}`}
        >
          <p className="text-sm font-heading font-semibold text-[#102A43]">Failed Attempts</p>
          <p className="mt-2 text-2xl font-heading font-semibold text-[#B42318]">{loading ? "—" : data?.summary.failed_attempt_count ?? 0}</p>
        </button>
        <button
          type="button"
          onClick={() => setEventType("website_visit")}
          className={`text-left bg-white rounded-[12px] border p-4 ${eventType === "website_visit" ? "border-[#0B69B7]" : "border-[#D9E1EA]"}`}
        >
          <p className="text-sm font-heading font-semibold text-[#102A43]">Website Visits</p>
          <p className="mt-2 text-2xl font-heading font-semibold text-[#0B69B7]">{loading ? "—" : data?.summary.website_visit_count ?? 0}</p>
        </button>
        <button
          type="button"
          onClick={() => setEventType("event")}
          className={`text-left bg-white rounded-[12px] border p-4 ${eventType === "event" ? "border-[#486581]" : "border-[#D9E1EA]"}`}
        >
          <p className="text-sm font-heading font-semibold text-[#102A43]">Other Events</p>
          <p className="mt-2 text-2xl font-heading font-semibold text-[#486581]">{loading ? "—" : data?.summary.event_count ?? 0}</p>
        </button>
      </div>

      <div className="bg-white rounded-[12px] border border-[#D9E1EA] overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 border-b border-[#E5EAF0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#627D98]">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAllVisible}
              aria-label="Select all visible logs"
            />
          </div>
          <div className="col-span-2">Name</div>
          <div className="col-span-2">Event Type</div>
          <div className="col-span-2">Event</div>
          <div className="col-span-2">Page</div>
          <div className="col-span-1">IP Address</div>
          <div className="col-span-1">Date</div>
          <div className="col-span-2">Time</div>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-[#627D98]">Loading logs...</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-[#627D98]">No logs found for current search/filter.</div>
        ) : (
          <div className="divide-y divide-[#E5EAF0]">
            {rows.map((row) => (
              <div key={row.id} className="px-4 py-3">
                <div className="md:hidden space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#102A43]">{row.name || "Unknown"}</p>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelection(row.id)}
                      aria-label={`Select log ${row.id}`}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${eventBadge(row)}`}>
                      {row.event_type.replace("_", " ")}
                    </span>
                    <span className="text-[#486581]">{row.event}</span>
                  </div>
                  <p className="text-[#627D98] break-words">Page: {row.website_visit_page || "—"}</p>
                  <p className="text-[#627D98]">IP: {row.ip_address || "—"}</p>
                  <p className="text-[#627D98]">
                    Date: {row.timestamp ? new Date(row.timestamp).toLocaleDateString() : "—"} | Time: {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : "—"}
                  </p>
                </div>

                <div className="hidden md:grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-1 pt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelection(row.id)}
                      aria-label={`Select log ${row.id}`}
                    />
                  </div>
                  <div className="col-span-2 text-sm font-semibold text-[#102A43] break-words">{row.name || "Unknown"}</div>
                  <div className="col-span-2">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${eventBadge(row)}`}>
                      {row.event_type.replace("_", " ")}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-[#334E68] break-words">{row.event || "—"}</div>
                  <div className="col-span-2 text-sm text-[#486581] break-words">{row.website_visit_page || "—"}</div>
                  <div className="col-span-1 text-sm text-[#486581]">{row.ip_address || "—"}</div>
                  <div className="col-span-1 text-sm text-[#627D98]">
                    {row.timestamp ? new Date(row.timestamp).toLocaleDateString() : "—"}
                  </div>
                  <div className="col-span-2 text-sm text-[#627D98]">
                    {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#627D98]">
          Showing {rows.length} of {data?.pagination.total ?? 0} logs
          {" "}• Page {Math.floor(offset / pageSize) + 1}
          {appliedSearch ? ` for "${appliedSearch}"` : ""}.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || offset <= 0}
            onClick={() => void load({ nextOffset: Math.max(offset - pageSize, 0), nextDateFrom: dateFrom, nextDateTo: dateTo })}
            className="inline-flex items-center rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm font-semibold text-[#334E68] disabled:opacity-50"
          >
            Previous
          </button>
          <select
            value={String(pageSize)}
            onChange={(event) => {
              setOffset(0);
              setPageSize(Number(event.target.value));
            }}
            className="bg-white border border-[#D9E1EA] rounded-[10px] px-3 py-2 text-sm text-[#102A43]"
            aria-label="Rows per page"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>{size} rows</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load({ nextOffset: offset, nextDateFrom: dateFrom, nextDateTo: dateTo })}
            className="inline-flex items-center gap-2 bg-white border border-[#D9E1EA] rounded-[10px] px-3 py-2 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            type="button"
            disabled={loading || !data?.pagination.has_more}
            onClick={() => void load({ nextOffset: offset + pageSize, nextDateFrom: dateFrom, nextDateTo: dateTo })}
            className="inline-flex items-center rounded-[10px] border border-[#B7D7F7] bg-[#EFF7FF] px-3 py-2 text-sm font-semibold text-[#0B69B7] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {showBackToTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#0B69B7] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-[#095A99]"
        >
          <ArrowUp className="w-4 h-4" /> Top
        </button>
      ) : null}
    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteAdminLogs,
  getAdminLogs,
  manageAdminIpBlock,
  updateAdminIpSecurity,
  type AdminIpSecurityPayload,
  type AdminLogItem,
  type AdminLogsResponse,
} from "@/lib/admin-auth";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  Ban,
  Logs,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";

type EventFilter = "all" | "login" | "failed_attempt" | "website_visit" | "event" | "email";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DELETE_BATCH_SIZE = 200;
const SELECT_ALL_BATCH_SIZE = 500;

const filterFieldClass =
  "mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm bg-white";

type LogSelection = { source: AdminLogItem["source"]; record_id: number };

export default function AdminLogsPage() {
  const [data, setData] = useState<AdminLogsResponse | null>(null);
  const [ipSecurity, setIpSecurity] = useState<AdminIpSecurityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [eventType, setEventType] = useState<EventFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedItems, setSelectedItems] = useState<Map<string, LogSelection>>(new Map());
  const [deleting, setDeleting] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [thresholdInput, setThresholdInput] = useState("25");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [ipActionLoading, setIpActionLoading] = useState<string | null>(null);
  const [manualBlockIp, setManualBlockIp] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await getAdminLogs({
        search: debouncedSearch.trim(),
        eventType: debouncedSearch.trim() ? "all" : eventType,
        dateFrom: debouncedSearch.trim() ? undefined : dateFrom || undefined,
        dateTo: debouncedSearch.trim() ? undefined : dateTo || undefined,
        limit: pageSize,
        offset,
      });
      setData(payload);
      if (payload.ip_security) {
        setIpSecurity(payload.ip_security);
        setThresholdInput(String(payload.ip_security.daily_request_threshold));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateFrom, dateTo, eventType, offset, pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setOffset(0);
    setSelectedItems(new Map());
  };

  const selectionCount = selectedItems.size;
  const pageRows = data?.results ?? [];

  const clearSelection = () => setSelectedItems(new Map());

  const toggleSelectRow = (row: AdminLogItem) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.set(row.id, { source: row.source, record_id: row.record_id });
      return next;
    });
  };

  const toggleSelectCurrentPage = () => {
    if (!pageRows.length) return;
    const allOnPageSelected = pageRows.every((row) => selectedItems.has(row.id));
    setSelectedItems((prev) => {
      const next = new Map(prev);
      for (const row of pageRows) {
        if (allOnPageSelected) next.delete(row.id);
        else next.set(row.id, { source: row.source, record_id: row.record_id });
      }
      return next;
    });
  };

  const selectAllFiltered = async () => {
    setSelectingAll(true);
    try {
      const map = new Map<string, LogSelection>();
      let fetchOffset = 0;
      let total = 0;
      do {
        const payload = await getAdminLogs({
          search: debouncedSearch.trim(),
          eventType,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          limit: SELECT_ALL_BATCH_SIZE,
          offset: fetchOffset,
        });
        total = payload.pagination.total;
        for (const row of payload.results) {
          map.set(row.id, { source: row.source, record_id: row.record_id });
        }
        fetchOffset += SELECT_ALL_BATCH_SIZE;
      } while (fetchOffset < total);

      setSelectedItems(map);
      toast.success(`Selected ${map.size} log(s) matching filters.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to select all logs.");
    } finally {
      setSelectingAll(false);
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setOffset(0);
    clearSelection();
  };

  const handleEventTypeChange = (value: EventFilter) => {
    setEventType(value);
    setOffset(0);
    clearSelection();
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setOffset(0);
    clearSelection();
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setOffset(0);
    clearSelection();
  };

  const clearFilters = () => {
    setEventType("all");
    setDateFrom("");
    setDateTo("");
    setOffset(0);
    clearSelection();
  };

  const activeFilterCount =
    (eventType !== "all" ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const handleDeleteSelected = async () => {
    const items = Array.from(selectedItems.values());
    if (!items.length) return;
    if (!window.confirm(`Delete ${items.length} selected log(s)? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      let totalDeleted = 0;
      for (let i = 0; i < items.length; i += DELETE_BATCH_SIZE) {
        const chunk = items.slice(i, i + DELETE_BATCH_SIZE);
        const result = await deleteAdminLogs(chunk);
        totalDeleted += result.total_deleted;
      }
      toast.success(`Deleted ${totalDeleted} log row(s).`);
      clearSelection();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete logs.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveThreshold = async () => {
    const value = Number(thresholdInput);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Enter a valid threshold (1 or more).");
      return;
    }
    setSavingThreshold(true);
    try {
      const payload = await updateAdminIpSecurity({ daily_request_threshold: value });
      setIpSecurity(payload);
      toast.success(`Daily IP threshold set to ${value}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save threshold.");
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleBlockIp = async (ip: string) => {
    setIpActionLoading(ip);
    try {
      const payload = await manageAdminIpBlock({
        action: "block",
        ip_address: ip,
        reason: `Blocked from Logs module (>${ipSecurity?.daily_request_threshold ?? 25}/day)`,
      });
      setIpSecurity(payload);
      toast.success(`${ip} blocked.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to block IP.");
    } finally {
      setIpActionLoading(null);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    setIpActionLoading(ip);
    try {
      const payload = await manageAdminIpBlock({ action: "unblock", ip_address: ip });
      setIpSecurity(payload);
      toast.success(`${ip} unblocked.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unblock IP.");
    } finally {
      setIpActionLoading(null);
    }
  };

  const kpiButtons = useMemo(
    () => [
      { key: "all" as const, label: "Total", value: data?.summary.total ?? 0, tone: "text-[#102A43]" },
      { key: "login" as const, label: "Logins", value: data?.summary.login_count ?? 0, tone: "text-[#0B69B7]" },
      {
        key: "failed_attempt" as const,
        label: "Failed",
        value: data?.summary.failed_attempt_count ?? 0,
        tone: "text-[#B42318]",
      },
      {
        key: "website_visit" as const,
        label: "Visits",
        value: data?.summary.website_visit_count ?? 0,
        tone: "text-[#006F57]",
      },
      { key: "event" as const, label: "Events", value: data?.summary.event_count ?? 0, tone: "text-[#9C4F17]" },
      { key: "email" as const, label: "Emails Sent", value: data?.summary.email_total ?? 0, tone: "text-[#6B21A8]" },
    ],
    [data?.summary],
  );

  const emailKpis = useMemo(
    () => ({
      total: data?.summary.email_total ?? 0,
      toStaff: data?.summary.email_to_staff ?? 0,
      toUser: data?.summary.email_to_user ?? 0,
      failed: data?.summary.email_failed ?? 0,
    }),
    [data?.summary],
  );

  const formatTimestamp = (value: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
  };

  const blockedCount = ipSecurity?.blocked_ips?.length ?? 0;

  const totalRows = data?.pagination.total ?? 0;
  const rowStart = totalRows === 0 ? 0 : offset + 1;
  const rowEnd = offset + (data?.results.length ?? 0);

  useSetAdminPageChrome({
    title: "Logs",
    subtitle: "Audit trail, visits & security",
    icon: Logs,
    search: {
      value: search,
      onChange: handleSearchChange,
      placeholder: "Search name, IP, page…",
    },
    activeFilterCount,
    onClearFilters: clearFilters,
    meta: loading ? "Loading…" : `${totalRows} log(s)`,
    syncKey: `${search}|${eventType}|${dateFrom}|${dateTo}|${loading}|${totalRows}|${securityOpen}|${blockedCount}|${selectionCount}`,
    actions: (
      <>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setSecurityOpen((open) => !open)}
          className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-sm font-semibold transition-colors ${
            securityOpen
              ? "border-[#009877] bg-[#009877]/10 text-[#006F57]"
              : "border-[#D9E1EA] bg-white text-[#102A43] hover:bg-[#F5F7FA]"
          }`}
        >
          <Shield className="w-4 h-4" />
          Security
          {blockedCount > 0 ? (
            <span className="rounded-full bg-[#B42318] px-1.5 text-[10px] text-white">{blockedCount}</span>
          ) : null}
        </button>
      </>
    ),
    filtersContent: (
      <>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Event type</span>
          <select
            value={eventType}
            onChange={(e) => handleEventTypeChange(e.target.value as EventFilter)}
            className={filterFieldClass}
          >
            <option value="all">All events</option>
            <option value="login">Login</option>
            <option value="failed_attempt">Failed attempt</option>
            <option value="website_visit">Website visit</option>
            <option value="event">Other events</option>
            <option value="email">Email delivery</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Date from</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className={filterFieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Date to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            className={filterFieldClass}
          />
        </label>
      </>
    ),
  });

  return (
    <div className="space-y-3 font-body min-w-0 max-w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {kpiButtons.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => handleEventTypeChange(kpi.key)}
            className={`text-left rounded-[10px] border p-3 transition-colors ${
              eventType === kpi.key ? "border-[#009877] bg-[#009877]/10" : "border-[#D9E1EA] bg-white hover:border-[#33A1FD]/40"
            }`}
          >
            <p className="text-xs text-[#627D98]">{kpi.label}</p>
            <p className={`text-xl font-semibold mt-1 ${kpi.tone}`}>{loading ? "—" : kpi.value}</p>
          </button>
        ))}
      </div>

      {/* Email delivery KPI strip */}
      {(emailKpis.total > 0 || eventType === "email") ? (
        <div className="flex flex-wrap gap-2 rounded-[10px] border border-[#E9D5FF] bg-[#FAF5FF] p-3">
          <Mail className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
          <span className="text-xs font-semibold text-[#6B21A8] mr-1">Email Delivery:</span>
          <span className="text-xs text-[#627D98]">Total <span className="font-semibold text-[#102A43]">{emailKpis.total}</span></span>
          <span className="text-xs text-[#D9E1EA]">·</span>
          <span className="text-xs text-[#627D98]">To Staff <span className="font-semibold text-[#0B69B7]">{emailKpis.toStaff}</span></span>
          <span className="text-xs text-[#D9E1EA]">·</span>
          <span className="text-xs text-[#627D98]">To Customer <span className="font-semibold text-[#006F57]">{emailKpis.toUser}</span></span>
          <span className="text-xs text-[#D9E1EA]">·</span>
          <span className="text-xs text-[#627D98]">Failed <span className={`font-semibold ${emailKpis.failed > 0 ? "text-[#B42318]" : "text-[#102A43]"}`}>{emailKpis.failed}</span></span>
        </div>
      ) : null}

      {securityOpen ? (
        <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-4 space-y-3">
          <p className="text-sm font-semibold text-[#102A43]">IP threshold & blocking</p>
          <p className="text-xs text-[#627D98]">
            Over-limit IPs trigger admin alert + email. Blocked IPs cannot use the public site or API.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-sm">
              <span className="text-xs text-[#627D98]">Requests per IP / day</span>
              <input
                type="number"
                min={1}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="mt-1 w-32 rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm bg-white"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSaveThreshold()}
              disabled={savingThreshold}
              className="rounded-[10px] bg-[#009877] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingThreshold ? "Saving…" : "Save threshold"}
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-2 pt-1 border-t border-[#E5EAF0]">
            <label className="block text-sm flex-1 min-w-[200px]">
              <span className="text-xs text-[#627D98]">Block IP manually</span>
              <input
                type="text"
                value={manualBlockIp}
                onChange={(e) => setManualBlockIp(e.target.value)}
                placeholder="e.g. 203.0.113.45"
                className="mt-1 w-full max-w-xs rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm font-mono bg-white"
              />
            </label>
            <button
              type="button"
              disabled={!manualBlockIp.trim() || ipActionLoading !== null}
              onClick={() => {
                const ip = manualBlockIp.trim();
                void handleBlockIp(ip).then(() => setManualBlockIp(""));
              }}
              className="inline-flex items-center gap-1 rounded-[10px] bg-[#B42318] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Ban className="w-4 h-4" />
              Block IP
            </button>
          </div>

          {(ipSecurity?.blocked_ips?.length ?? 0) > 0 ? (
            <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEE4E2]/30 p-3">
              <p className="text-xs font-semibold text-[#B42318] mb-2">Currently blocked</p>
              <div className="flex flex-wrap gap-2">
                {ipSecurity?.blocked_ips.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[#FECDCA] bg-white px-3 py-1 text-xs font-mono"
                  >
                    {b.ip_address}
                    <button
                      type="button"
                      disabled={ipActionLoading === b.ip_address}
                      onClick={() => void handleUnblockIp(b.ip_address)}
                      className="font-semibold text-[#0B69B7] hover:underline disabled:opacity-60"
                    >
                      Unblock
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#627D98]">No IPs are blocked right now.</p>
          )}

          {(ipSecurity?.ip_counts_today?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto overflow-y-hidden rounded-[10px] border border-[#E5EAF0] [scrollbar-gutter:stable]">
              <p className="text-xs font-semibold text-[#486581] px-3 py-2 bg-[#F8FAFC] border-b border-[#E5EAF0]">
                IPs seen today
              </p>
              <table className="w-full text-xs min-w-[520px]">
                <thead className="bg-[#F8FAFC] text-[#486581]">
                  <tr>
                    <th className="px-3 py-2 text-left">IP</th>
                    <th className="px-3 py-2 text-center">Count</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {ipSecurity?.ip_counts_today.map((row) => (
                    <tr key={row.ip_address}>
                      <td className="px-3 py-2 font-mono text-[#102A43]">{row.ip_address}</td>
                      <td className="px-3 py-2 text-center font-semibold">{row.count_today}</td>
                      <td className="px-3 py-2 text-center">
                        {row.is_blocked ? (
                          <span className="text-[#B42318] font-semibold">Blocked</span>
                        ) : row.over_threshold ? (
                          <span className="text-[#9C4F17] font-semibold">Over limit</span>
                        ) : (
                          <span className="text-[#627D98]">OK</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.is_blocked ? (
                          <button
                            type="button"
                            disabled={ipActionLoading === row.ip_address}
                            onClick={() => void handleUnblockIp(row.ip_address)}
                            className="text-xs font-semibold text-[#0B69B7] hover:underline disabled:opacity-60"
                          >
                            Unblock
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={ipActionLoading === row.ip_address}
                            onClick={() => void handleBlockIp(row.ip_address)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#B42318] hover:underline disabled:opacity-60"
                          >
                            <Ban className="w-3 h-3" />
                            Block
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2">
        <p className="text-xs text-[#627D98] w-full sm:w-auto sm:mr-2">
          {selectionCount > 0 ? `${selectionCount} selected` : "No rows selected"}
        </p>
        <button
          type="button"
          onClick={() => void selectAllFiltered()}
          disabled={selectingAll || loading || totalRows === 0}
          className="rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-50"
        >
          {selectingAll ? "Selecting…" : "Select all"}
        </button>
        <button
          type="button"
          onClick={clearSelection}
          disabled={selectionCount === 0}
          className="rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA] disabled:opacity-50"
        >
          Clear selection
        </button>
        <button
          type="button"
          onClick={() => void handleDeleteSelected()}
          disabled={deleting || selectionCount === 0}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#B42318] px-3 py-2 text-xs font-semibold text-white hover:bg-[#9B2C1A] disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {deleting ? "Deleting…" : `Delete selected (${selectionCount})`}
        </button>
      </div>

      <div className="bg-white rounded-[12px] border border-[#D9E1EA] overflow-hidden w-full min-w-0">
        <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
          <table className="w-max min-w-full text-sm">
            <thead className="bg-[#F8FAFC] text-[#486581]">
              <tr>
                <th className="px-3 py-2 w-10 sticky left-0 z-10 bg-[#F8FAFC]">
                  <PageSelectAllCheckbox
                    rows={pageRows}
                    selectedItems={selectedItems}
                    onToggle={toggleSelectCurrentPage}
                    disabled={loading}
                  />
                </th>
                <th className="px-3 py-2 text-left whitespace-nowrap min-w-[140px]">Time</th>
                <th className="px-3 py-2 text-left whitespace-nowrap min-w-[120px]">Name</th>
                <th className="px-3 py-2 text-left whitespace-nowrap min-w-[100px]">Event</th>
                <th className="px-3 py-2 text-left whitespace-nowrap min-w-[110px]">IP</th>
                <th className="px-3 py-2 text-left whitespace-nowrap min-w-[120px]">Page</th>
                <th className="px-3 py-2 text-left whitespace-nowrap min-w-[160px]">Target</th>
                <th className="px-3 py-2 text-right whitespace-nowrap min-w-[88px]">IP action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {(data?.results ?? []).map((row) => (
                <LogTableRow
                  key={row.id}
                  row={row}
                  selected={selectedItems.has(row.id)}
                  onToggle={() => toggleSelectRow(row)}
                  formatTimestamp={formatTimestamp}
                  isBlocked={ipSecurity?.blocked_ips.some((b) => b.ip_address === row.ip_address) ?? false}
                  ipLoading={ipActionLoading === row.ip_address}
                  onBlock={() => void handleBlockIp(row.ip_address)}
                  onUnblock={() => void handleUnblockIp(row.ip_address)}
                />
              ))}
              {!loading && (data?.results.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#627D98]">
                    No logs match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 border-t border-[#E5EAF0] text-xs text-[#627D98] bg-[#FAFBFC]">
          <span className="shrink-0">
            {loading
              ? "Loading…"
              : totalRows === 0
                ? "No rows"
                : `Showing ${rowStart}–${rowEnd} of ${totalRows}`}
          </span>
          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end w-full sm:w-auto min-w-0">
            <button
              type="button"
              disabled={offset <= 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
              className="rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-sm font-semibold text-[#102A43] disabled:opacity-50 hover:bg-[#F5F7FA]"
            >
              Previous
            </button>
            <label className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2 py-1">
              <span className="text-[#627D98] whitespace-nowrap">Rows</span>
              <select
                value={pageSize}
                disabled={loading}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-[6px] border-0 bg-transparent py-0.5 pr-6 text-sm font-semibold text-[#102A43] focus:ring-0 cursor-pointer disabled:opacity-50"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!data?.pagination.has_more || loading}
              onClick={() => setOffset((o) => o + pageSize)}
              className="rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-sm font-semibold text-[#102A43] disabled:opacity-50 hover:bg-[#F5F7FA]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageSelectAllCheckbox({
  rows,
  selectedItems,
  onToggle,
  disabled,
}: {
  rows: AdminLogItem[];
  selectedItems: Map<string, LogSelection>;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const allSelected = rows.length > 0 && rows.every((row) => selectedItems.has(row.id));
  const someSelected = rows.some((row) => selectedItems.has(row.id));

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [allSelected, someSelected]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={allSelected}
      disabled={disabled || rows.length === 0}
      onChange={onToggle}
      aria-label="Select all rows on this page"
      className="cursor-pointer disabled:cursor-not-allowed"
    />
  );
}

function LogTableRow({
  row,
  selected,
  onToggle,
  formatTimestamp,
  isBlocked,
  ipLoading,
  onBlock,
  onUnblock,
}: {
  row: AdminLogItem;
  selected: boolean;
  onToggle: () => void;
  formatTimestamp: (v: string | null) => string;
  isBlocked: boolean;
  ipLoading: boolean;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  const hasIp = Boolean(row.ip_address?.trim());
  const isEmail = row.source === "email_delivery_log";

  if (isEmail) {
    const isDelivered = row.email_status === "sent";
    return (
      <tr className="hover:bg-[#FAF5FF] align-top group">
        <td className="px-3 py-2 sticky left-0 z-[1] bg-white group-hover:bg-[#FAF5FF]">
          <input type="checkbox" checked={selected} onChange={onToggle} />
        </td>
        <td className="px-3 py-2 text-[#486581] whitespace-nowrap">{formatTimestamp(row.timestamp)}</td>
        <td className="px-3 py-2 text-[#102A43] text-xs">{row.name}</td>
        <td className="px-3 py-2">
          <span className="text-[10px] uppercase rounded-full border border-[#E9D5FF] px-2 py-0.5 bg-[#FAF5FF] text-[#6B21A8]">email</span>
          <p className="text-xs mt-0.5">
            <span className={`font-semibold ${isDelivered ? "text-[#006F57]" : "text-[#B42318]"}`}>
              {isDelivered ? "delivered" : "failed"}
            </span>
            {row.email_recipient_type ? (
              <span className="text-[#627D98]"> · {row.email_recipient_type}</span>
            ) : null}
          </p>
        </td>
        <td className="px-3 py-2 text-xs text-[#486581] max-w-[200px] truncate" colSpan={2}>{row.email_subject || "—"}</td>
        <td className="px-3 py-2 text-xs text-[#486581]">
          {row.email_context_label ? <span className="inline-block rounded-full bg-[#F5F7FA] border px-2 py-0.5 text-[10px] mr-1">{row.email_context_label}</span> : null}
          {row.email_application_reference ? <span className="text-[#102A43]">{row.email_application_reference}</span> : null}
          {row.email_error ? <p className="text-[#B42318] mt-0.5 text-[10px]">{row.email_error}</p> : null}
        </td>
        <td className="px-3 py-2 text-right text-xs text-[#627D98]">{row.email_triggered_by || "—"}</td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-[#F8FAFC] align-top group">
      <td className="px-3 py-2 sticky left-0 z-[1] bg-white group-hover:bg-[#F8FAFC]">
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td className="px-3 py-2 text-[#486581] whitespace-nowrap">{formatTimestamp(row.timestamp)}</td>
      <td className="px-3 py-2 text-[#102A43]">{row.name}</td>
      <td className="px-3 py-2">
        <span className="text-[10px] uppercase rounded-full border px-2 py-0.5 bg-[#F5F7FA]">{row.event_type}</span>
        <p className="text-xs text-[#627D98] mt-0.5">{row.event}</p>
      </td>
      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.ip_address || "—"}</td>
      <td className="px-3 py-2 text-xs text-[#486581] whitespace-nowrap min-w-[120px]">{row.website_visit_page || "—"}</td>
      <td className="px-3 py-2 text-xs text-[#486581] min-w-[180px] max-w-[320px]">{row.target || "—"}</td>
      <td className="px-3 py-2 text-right">
        {hasIp ? (
          isBlocked ? (
            <button
              type="button"
              disabled={ipLoading}
              onClick={onUnblock}
              className="text-xs font-semibold text-[#0B69B7] hover:underline disabled:opacity-60"
            >
              Unblock
            </button>
          ) : (
            <button
              type="button"
              disabled={ipLoading}
              onClick={onBlock}
              className="text-xs font-semibold text-[#B42318] hover:underline disabled:opacity-60"
            >
              Block
            </button>
          )
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

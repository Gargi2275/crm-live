"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  cancelAdminMiscCharge,
  listAdminMiscCharges,
  markPaidAdminMiscCharge,
  sendAdminMiscCharge,
  type AdminMiscCharge,
} from "@/lib/admin-auth";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { Ban, CheckCircle2, ReceiptText, RotateCcw, Send } from "lucide-react";
import toast from "react-hot-toast";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

function formatGbp(pence: number) {
  return `GBP ${(Number(pence || 0) / 100).toFixed(2)}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusTone(status: string) {
  const key = status.toLowerCase();
  if (key === "paid") return "bg-[#009877]/12 text-[#006F57] border-[#009877]/35";
  if (key === "sent") return "bg-[#EEF4FF] text-[#0B69B7] border-[#B7D7F7]";
  if (key === "cancelled") return "bg-[#F5F7FA] text-[#627D98] border-[#D9E1EA]";
  return "bg-[#FFF8E8] text-[#8D5E12] border-[#F4D89A]";
}

function statusLabel(status: string) {
  const key = status.toLowerCase();
  if (key === "draft") return "Draft";
  if (key === "sent") return "Awaiting payment";
  if (key === "paid") return "Paid";
  if (key === "cancelled") return "Voided";
  return status;
}

function ChargeActions({
  charge,
  busy,
  onAction,
  compact = false,
}: {
  charge: AdminMiscCharge;
  busy: boolean;
  onAction: (id: number, action: "send" | "cancel" | "mark-paid") => void;
  compact?: boolean;
}) {
  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 transition-colors";
  const labelClass = compact ? "hidden xl:inline" : "";

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "justify-end" : ""}`}>
      {charge.status === "draft" || charge.status === "sent" ? (
        <button
          type="button"
          disabled={busy}
          title={charge.status === "sent" ? "Resend payment email" : "Email payment link"}
          onClick={() => onAction(charge.id, "send")}
          className={`${btn} border-[#009877]/35 bg-[#009877]/12 text-[#006F57] hover:bg-[#009877]/18`}
        >
          {charge.status === "sent" ? <RotateCcw className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
          <span className={labelClass}>{charge.status === "sent" ? "Resend email" : "Email link"}</span>
        </button>
      ) : null}
      {charge.status !== "paid" && charge.status !== "cancelled" ? (
        <>
          <button
            type="button"
            disabled={busy}
            title="Mark paid manually"
            onClick={() => onAction(charge.id, "mark-paid")}
            className={`${btn} border-[#D9E1EA] bg-white text-[#334E68] hover:bg-[#F5F7FA]`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className={labelClass}>Mark paid</span>
          </button>
          <button
            type="button"
            disabled={busy}
            title="Void charge"
            onClick={() => onAction(charge.id, "cancel")}
            className={`${btn} border-[#F1A7A0]/45 bg-[#FDECEC] text-[#B42318] hover:bg-[#FAD4D0]`}
          >
            <Ban className="h-3.5 w-3.5" />
            <span className={labelClass}>Void</span>
          </button>
        </>
      ) : null}
      {charge.status === "paid" || charge.status === "cancelled" ? (
        <span className="text-xs text-[#9AA5B1]">No actions</span>
      ) : null}
    </div>
  );
}

export default function AdminMiscChargesPage() {
  const [charges, setCharges] = useState<AdminMiscCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadCharges = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAdminMiscCharges({
        date_from: search.trim() ? undefined : dateFrom || undefined,
        date_to: search.trim() ? undefined : dateTo || undefined,
        search: search.trim() || undefined,
        limit: 500,
      });
      setCharges(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load charges.");
      setCharges([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, search]);

  useEffect(() => {
    void loadCharges();
  }, [loadCharges]);

  const serviceOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of charges) {
      if (row.service_name) names.add(row.service_name);
      else if (row.service_type) names.add(row.service_type);
    }
    return Array.from(names).sort();
  }, [charges]);

  const countryOptions = useMemo(() => {
    const slugs = new Set<string>();
    for (const row of charges) {
      if (row.pricing_country_slug) slugs.add(row.pricing_country_slug);
    }
    return Array.from(slugs).sort();
  }, [charges]);

  const filteredCharges = useMemo(() => {
    if (search.trim()) return charges;
    return charges.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      const serviceLabel = row.service_name || row.service_type || "";
      if (serviceFilter !== "all" && serviceLabel !== serviceFilter) return false;
      if (countryFilter !== "all" && row.pricing_country_slug !== countryFilter) return false;
      return true;
    });
  }, [charges, countryFilter, search, serviceFilter, statusFilter]);

  const stats = useMemo(() => {
    const base = { all: charges.length, draft: 0, sent: 0, paid: 0, cancelled: 0 };
    for (const row of charges) {
      const key = row.status as keyof typeof base;
      if (key in base && key !== "all") base[key] += 1;
    }
    return base;
  }, [charges]);

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setServiceFilter("all");
    setCountryFilter("all");
  };

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (serviceFilter !== "all" ? 1 : 0) +
    (countryFilter !== "all" ? 1 : 0);

  useSetAdminPageChrome({
    title: "Misc Charges",
    icon: ReceiptText,
    search: {
      value: search,
      onChange: setSearch,
      placeholder: "Search reference, customer name or email…",
    },
    meta: loading ? "Loading…" : `${filteredCharges.length} of ${charges.length} charges`,
    activeFilterCount,
    onClearFilters: clearFilters,
    syncKey: `${loading}|${filteredCharges.length}|${statusFilter}|${dateFrom}|${dateTo}|${serviceFilter}|${countryFilter}|${search}`,
    filtersContent: (
      <>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Status</span>
          <select className={filterFieldClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Awaiting payment</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Voided</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">From</span>
          <input type="date" className={filterFieldClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">To</span>
          <input
            type="date"
            className={filterFieldClass}
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Service</span>
          <select className={filterFieldClass} value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
            <option value="all">All services</option>
            {serviceOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Country</span>
          <select className={filterFieldClass} value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
            <option value="all">All countries</option>
            {countryOptions.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
        </label>
      </>
    ),
  });

  const runAction = async (chargeId: number, action: "send" | "cancel" | "mark-paid") => {
    setBusyId(chargeId);
    try {
      if (action === "send") {
        await sendAdminMiscCharge(chargeId);
        toast.success("Payment-link email sent.");
      } else if (action === "cancel") {
        await cancelAdminMiscCharge(chargeId);
        toast.success("Charge voided.");
      } else {
        await markPaidAdminMiscCharge(chargeId);
        toast.success("Marked paid manually.");
      }
      await loadCharges();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const kpiCards: Array<{ key: string; label: string; value: number; tone: string }> = [
    { key: "all", label: "All", value: stats.all, tone: "text-[#102A43]" },
    { key: "draft", label: "Draft", value: stats.draft, tone: "text-[#8D5E12]" },
    { key: "sent", label: "Awaiting payment", value: stats.sent, tone: "text-[#0B69B7]" },
    { key: "paid", label: "Paid", value: stats.paid, tone: "text-[#006F57]" },
    { key: "cancelled", label: "Voided", value: stats.cancelled, tone: "text-[#627D98]" },
  ];

  return (
    <div className="w-full space-y-4 font-body">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((card) => {
          const active = statusFilter === card.key || (card.key === "all" && statusFilter === "all");
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(card.key === "all" ? "all" : card.key)}
              className={`rounded-[12px] border bg-white p-3 text-left shadow-[0_4px_14px_rgba(16,42,67,0.04)] transition ${
                active
                  ? "border-[#009877] ring-1 ring-[#009877]/25 bg-[#009877]/5"
                  : "border-[#D9E1EA] hover:border-[#33A1FD]/50"
              }`}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#627D98]">{card.label}</p>
              <p className={`mt-1 text-xl font-heading font-semibold ${card.tone}`}>{card.value}</p>
            </button>
          );
        })}
      </div>

      {/* Mobile / tablet cards */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white px-4 py-10 text-center text-sm text-[#627D98]">
            Loading charges…
          </div>
        ) : filteredCharges.length === 0 ? (
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white px-4 py-10 text-center text-sm text-[#627D98]">
            No miscellaneous charges found.
          </div>
        ) : (
          filteredCharges.map((charge) => {
            const busy = busyId === charge.id;
            return (
              <article key={charge.id} className="rounded-[12px] border border-[#D9E1EA] bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    {charge.application_id ? (
                      <Link
                        href={`/admin/my-cases?applicationId=${charge.application_id}`}
                        className="font-semibold text-[#0B69B7] hover:underline"
                      >
                        {charge.reference_number || "—"}
                      </Link>
                    ) : (
                      <p className="font-semibold text-[#102A43]">{charge.reference_number || "—"}</p>
                    )}
                    <p className="text-sm font-medium text-[#102A43] line-clamp-2">{charge.description}</p>
                    <p className="text-xs text-[#627D98]">
                      {charge.customer_name || "—"}
                      {charge.customer_email ? ` · ${charge.customer_email}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right space-y-1.5">
                    <p className="text-sm font-bold text-[#0B69B7]">{formatGbp(charge.amount_pence)}</p>
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(charge.status)}`}>
                      {statusLabel(charge.status)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F6] pt-3 text-xs text-[#627D98]">
                  <span>
                    {formatDate(charge.created_at)}
                    {charge.service_name || charge.service_type
                      ? ` · ${charge.service_name || charge.service_type}`
                      : ""}
                  </span>
                </div>
                <ChargeActions charge={charge} busy={busy} onAction={(id, action) => void runAction(id, action)} />
              </article>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[12px] border border-[#D9E1EA] bg-white lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
                <th className="px-4 py-3 text-left font-semibold">Case</th>
                <th className="px-4 py-3 text-left font-semibold">Charge</th>
                <th className="px-4 py-3 text-left font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#627D98]">
                    Loading charges…
                  </td>
                </tr>
              ) : filteredCharges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#627D98]">
                    No miscellaneous charges found.
                  </td>
                </tr>
              ) : (
                filteredCharges.map((charge) => {
                  const busy = busyId === charge.id;
                  return (
                    <tr key={charge.id} className="align-top hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3.5 whitespace-nowrap text-[#627D98]">{formatDate(charge.created_at)}</td>
                      <td className="px-4 py-3.5">
                        {charge.application_id ? (
                          <Link
                            href={`/admin/my-cases?applicationId=${charge.application_id}`}
                            className="font-semibold text-[#0B69B7] hover:underline"
                          >
                            {charge.reference_number || "—"}
                          </Link>
                        ) : (
                          <span className="font-semibold text-[#102A43]">{charge.reference_number || "—"}</span>
                        )}
                        <p className="mt-0.5 text-xs text-[#627D98]">
                          {charge.customer_name || "—"}
                          {charge.customer_email ? (
                            <>
                              <br />
                              {charge.customer_email}
                            </>
                          ) : null}
                        </p>
                        {(charge.service_name || charge.service_type) && (
                          <p className="mt-1 text-[11px] font-medium text-[#486581]">
                            {charge.service_name || charge.service_type}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <p className="font-medium text-[#102A43] line-clamp-2">{charge.description}</p>
                        {charge.sent_at ? (
                          <p className="mt-1 text-[11px] text-[#627D98]">Emailed {formatDate(charge.sent_at)}</p>
                        ) : null}
                        {charge.paid_at ? (
                          <p className="mt-1 text-[11px] text-[#627D98]">Paid {formatDate(charge.paid_at)}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-[#0B69B7]">
                        {formatGbp(charge.amount_pence)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(charge.status)}`}>
                          {statusLabel(charge.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <ChargeActions
                          charge={charge}
                          busy={busy}
                          compact
                          onAction={(id, action) => void runAction(id, action)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

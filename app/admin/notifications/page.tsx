"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getAdminAlerts, type AdminNotification } from "@/lib/admin-auth";
import { Bell, RefreshCw, Eye } from "lucide-react";

const severityPill = (severity?: AdminNotification["severity"]) => {
  if (severity === "critical") return "bg-[#B42318]/10 text-[#B42318] border border-[#B42318]/25";
  if (severity === "high") return "bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/25";
  if (severity === "medium") return "bg-[#0B69B7]/10 text-[#0B69B7] border border-[#0B69B7]/25";
  return "bg-[#627D98]/10 text-[#486581] border border-[#627D98]/25";
};

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async (options?: { markRead?: boolean }) => {
    setLoading(true);
    try {
      const payload = await getAdminAlerts(Boolean(options?.markRead));
      setItems(payload.notifications || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) => {
      const msg = String(n.message || "").toLowerCase();
      const type = String(n.type_label || n.type || "").toLowerCase();
      return msg.includes(q) || type.includes(q);
    });
  }, [items, query]);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1200px] mx-auto space-y-4 font-body">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-heading font-semibold text-[#102A43] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#0B69B7]" /> Notifications
          </h1>
          <p className="mt-1 text-sm text-[#627D98]">Your in-console activity feed (alerts + security/activity signals).</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notifications…"
            className="bg-white border border-[#D9E1EA] rounded-[10px] px-3 py-2 text-sm text-[#102A43] min-w-[240px]"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 bg-white border border-[#D9E1EA] rounded-[10px] px-3 py-2 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => void load({ markRead: true })}
            className="inline-flex items-center gap-2 bg-[#EFF7FF] border border-[#B7D7F7] rounded-[10px] px-3 py-2 text-sm font-semibold text-[#0B69B7] hover:bg-[#E6F2FF]"
            title="This marks visible alerts as acknowledged (read)."
          >
            <Eye className="w-4 h-4" /> Mark read
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#D9E1EA] overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-[#627D98]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-[#627D98]">No notifications found.</div>
        ) : (
          <div className="divide-y divide-[#E5EAF0]">
            {filtered.map((n) => (
              <div key={String(n.id)} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#102A43]">
                      {n.type_label || n.type || "Notification"}
                      {!n.is_read ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-[#B42318]/10 text-[#B42318] border border-[#B42318]/25 px-2 py-0.5 text-[11px] font-semibold">
                          Unread
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-[#486581] break-words">{n.message}</p>

                    {Array.isArray(n.task_ids) && n.task_ids.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {n.task_ids.slice(0, 5).map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center rounded-full border border-[#D9E1EA] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#334E68]"
                            title={`${t.task_type} • ${t.priority} • ${t.application__reference_number || ""}`}
                          >
                            Task #{t.id}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${severityPill(n.severity)}`}>
                      {n.severity || "low"}
                    </span>
                    <span className="text-[11px] text-[#627D98]">
                      {n.timestamp ? new Date(n.timestamp).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


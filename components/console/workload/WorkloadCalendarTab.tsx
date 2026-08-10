"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import {
  clearAdminStaffLeave,
  clearOwnStaffLeave,
  listAdminStaffLeave,
  markAdminStaffLeave,
  markOwnStaffLeave,
  type StaffLeaveCalendarPayload,
  type StaffLeaveEntry,
  type StaffLeaveType,
} from "@/lib/admin-auth";

const LEAVE_LABELS: Record<string, string> = {
  full_day: "Full day",
  half_day: "Half day",
  sick: "Sick",
  other: "Other",
};

const LEAVE_CHIP: Record<string, string> = {
  full_day: "bg-[#FEE2E2] text-[#9B1C1C] border-[#F8B4B4]",
  half_day: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]",
  sick: "bg-[#E0E7FF] text-[#3730A3] border-[#A5B4FC]",
  other: "bg-[#E5E7EB] text-[#374151] border-[#D1D5DB]",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type LeaveModalState = {
  staffId: number;
  staffName: string;
  date: string;
  existing?: StaffLeaveEntry | null;
};

type CalendarCell = {
  day: number;
  date: string;
  inMonth: boolean;
  isToday: boolean;
};

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isAdminStaff(row: { role?: string; name?: string }) {
  const role = String(row.role || "").toLowerCase();
  if (role === "admin") return true;
  const name = String(row.name || "").toLowerCase();
  return name === "system admin" || name.includes("system admin");
}

function buildMonthWeeks(year: number, month: number): CalendarCell[][] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;
  const today = new Date();
  const todayIso = isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const cells: CalendarCell[] = [];
  const prevMonthDays = new Date(year, month - 1, 0).getDate();

  for (let i = 0; i < startOffset; i++) {
    const day = prevMonthDays - startOffset + i + 1;
    const prev = new Date(year, month - 2, day);
    cells.push({
      day,
      date: isoDate(prev.getFullYear(), prev.getMonth() + 1, day),
      inMonth: false,
      isToday: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = isoDate(year, month, day);
    cells.push({
      day,
      date,
      inMonth: true,
      isToday: date === todayIso,
    });
  }

  while (cells.length % 7 !== 0) {
    const nextIndex = cells.length - (startOffset + daysInMonth) + 1;
    const next = new Date(year, month, nextIndex);
    cells.push({
      day: next.getDate(),
      date: isoDate(next.getFullYear(), next.getMonth() + 1, next.getDate()),
      inMonth: false,
      isToday: false,
    });
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function WorkloadCalendarTab({
  canManageOthers,
  selfStaffId,
}: {
  canManageOthers: boolean;
  selfStaffId?: number | null;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<StaffLeaveCalendarPayload | null>(null);
  /** null = team overview (all leave on each day); number = edit one staff */
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [modal, setModal] = useState<LeaveModalState | null>(null);
  const [leaveType, setLeaveType] = useState<StaffLeaveType>("full_day");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const staffList = useMemo(
    () => (payload?.staff || []).filter((s) => !isAdminStaff(s)),
    [payload],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listAdminStaffLeave({ month, year });
      const filteredStaff = (data.staff || []).filter((s) => !isAdminStaff(s));
      setPayload({ ...data, staff: filteredStaff });
      setSelectedStaffId((current) => {
        if (!canManageOthers) {
          if (selfStaffId && filteredStaff.some((s) => s.id === selfStaffId)) return selfStaffId;
          return filteredStaff[0]?.id ?? null;
        }
        // Admin/ops: keep team overview (null) unless already editing someone valid.
        if (current == null) return null;
        if (filteredStaff.some((s) => s.id === current)) return current;
        return null;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load leave calendar.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [month, year, selfStaffId, canManageOthers]);

  useEffect(() => {
    void load();
  }, [load]);

  const leaveByDateForStaff = useMemo(() => {
    const map = new Map<string, StaffLeaveEntry>();
    if (!selectedStaffId) return map;
    for (const entry of payload?.entries || []) {
      if (entry.staff_id === selectedStaffId) map.set(entry.date, entry);
    }
    return map;
  }, [payload, selectedStaffId]);

  const leaveByDateTeam = useMemo(() => {
    const map = new Map<string, StaffLeaveEntry[]>();
    for (const entry of payload?.entries || []) {
      if (isAdminStaff({ role: entry.staff_role, name: entry.staff_name })) continue;
      const list = map.get(entry.date) || [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return map;
  }, [payload]);

  const selectedStaff = useMemo(
    () => staffList.find((s) => s.id === selectedStaffId) || null,
    [staffList, selectedStaffId],
  );

  const teamOverview = canManageOthers && selectedStaffId == null;

  const weeks = useMemo(() => buildMonthWeeks(year, month), [year, month]);

  const monthLabel = useMemo(
    () => new Date(year, month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" }),
    [month, year],
  );

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };

  const openDay = (cell: CalendarCell) => {
    if (!cell.inMonth) return;

    if (teamOverview) {
      // In team view, pick first staff (or self) to mark leave on that day.
      const target =
        (selfStaffId && staffList.find((s) => s.id === selfStaffId)) || staffList[0] || null;
      if (!target) {
        toast.error("No staff available to mark leave.");
        return;
      }
      setSelectedStaffId(target.id);
      const existing =
        (payload?.entries || []).find((e) => e.staff_id === target.id && e.date === cell.date) || null;
      setModal({
        staffId: target.id,
        staffName: target.name,
        date: cell.date,
        existing,
      });
      setLeaveType((existing?.leave_type as StaffLeaveType) || "full_day");
      setReason(existing?.reason || "");
      return;
    }

    if (!selectedStaff) return;
    const isSelf = selfStaffId != null && selectedStaff.id === selfStaffId;
    if (!canManageOthers && !isSelf) {
      toast.error("You can only mark your own leave.");
      return;
    }
    const existing = leaveByDateForStaff.get(cell.date) || null;
    setModal({
      staffId: selectedStaff.id,
      staffName: selectedStaff.name,
      date: cell.date,
      existing,
    });
    setLeaveType((existing?.leave_type as StaffLeaveType) || "full_day");
    setReason(existing?.reason || "");
  };

  const saveLeave = async () => {
    if (!modal) return;
    try {
      setSaving(true);
      const isSelf = selfStaffId != null && modal.staffId === selfStaffId;
      if (canManageOthers && !isSelf) {
        await markAdminStaffLeave(modal.staffId, {
          date: modal.date,
          leave_type: leaveType,
          reason,
        });
      } else {
        await markOwnStaffLeave({ date: modal.date, leave_type: leaveType, reason });
      }
      toast.success("Leave saved.");
      setModal(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save leave.");
    } finally {
      setSaving(false);
    }
  };

  const clearLeave = async () => {
    if (!modal) return;
    try {
      setSaving(true);
      const isSelf = selfStaffId != null && modal.staffId === selfStaffId;
      if (canManageOthers && !isSelf) {
        await clearAdminStaffLeave(modal.staffId, modal.date);
      } else {
        await clearOwnStaffLeave(modal.date);
      }
      toast.success("Leave cleared.");
      setModal(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear leave.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {!canManageOthers ? (
        <div className="flex gap-3 rounded-[12px] border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8]" />
          <div className="min-w-0 text-sm text-[#1E3A8A]">
            <p className="font-semibold">Manage your availability here</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[#1E40AF]">
              Click any day to mark leave (full day, half day, or sick). When you are on full-day or
              sick leave, new tasks will not be auto-assigned to you that day.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#D9E1EA] bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Staff calendar</h2>
          <p className="text-[11px] text-[#627D98]">
            {teamOverview
              ? "Team month view — leave chips on each day. Choose a staff member to edit their calendar."
              : "Month calendar — click a day to mark or clear leave."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageOthers ? (
            <select
              value={selectedStaffId ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                setSelectedStaffId(raw ? Number(raw) : null);
              }}
              className="rounded-lg border border-[#D9E1EA] bg-white px-3 py-1.5 text-sm font-medium text-[#102A43]"
            >
              <option value="">All staff (team view)</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                  {selfStaffId === staff.id ? " (you)" : ""}
                </option>
              ))}
            </select>
          ) : selectedStaff ? (
            <span className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] px-3 py-1.5 text-sm font-semibold text-[#102A43]">
              {selectedStaff.name}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg border border-[#D9E1EA] p-1.5 text-[#486581] hover:bg-[#F8FAFC]"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-semibold text-[#102A43]">{monthLabel}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-lg border border-[#D9E1EA] p-1.5 text-[#486581] hover:bg-[#F8FAFC]"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-[#486581]">
        {Object.entries(LEAVE_LABELS).map(([key, label]) => (
          <span
            key={key}
            className={`inline-flex items-center rounded-md border px-2 py-0.5 ${LEAVE_CHIP[key]}`}
          >
            {label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-8 text-center text-sm text-[#627D98]">
          Loading calendar…
        </div>
      ) : canManageOthers && staffList.length === 0 ? (
        <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-8 text-center text-sm text-[#627D98]">
          No operational staff to show.
        </div>
      ) : !canManageOthers && !selectedStaff ? (
        <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-8 text-center text-sm text-[#627D98]">
          No calendar available for your account.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-[#D9E1EA] bg-white">
          <div className="grid grid-cols-7 border-b border-[#E5EAF0] bg-[#F8FAFC]">
            {WEEKDAYS.map((label) => (
              <div
                key={label}
                className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[#627D98]"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weeks.flat().map((cell) => {
              const single = !teamOverview ? leaveByDateForStaff.get(cell.date) : null;
              const team = teamOverview ? leaveByDateTeam.get(cell.date) || [] : [];
              const hasLeave = Boolean(single) || team.length > 0;

              return (
                <button
                  key={`${cell.date}-${cell.inMonth ? "m" : "o"}`}
                  type="button"
                  disabled={!cell.inMonth}
                  onClick={() => openDay(cell)}
                  className={`relative flex min-h-[88px] flex-col items-stretch border border-[#F0F4F8] p-1.5 text-left transition sm:min-h-[104px] ${
                    cell.inMonth
                      ? hasLeave
                        ? "bg-[#FFFBF5] cursor-pointer hover:bg-[#FFF7ED]"
                        : "bg-white cursor-pointer hover:bg-[#F0FDFA]"
                      : "bg-[#F8FAFC] cursor-default text-[#CBD5E1]"
                  } ${cell.isToday ? "ring-2 ring-inset ring-[#009877]" : ""}`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${
                      cell.isToday
                        ? "bg-[#009877] text-white"
                        : cell.inMonth
                          ? "text-[#102A43]"
                          : "text-[#CBD5E1]"
                    }`}
                  >
                    {cell.day}
                  </span>

                  {cell.inMonth && single ? (
                    <span
                      className={`mt-1 truncate rounded border px-1 py-0.5 text-[10px] font-semibold ${
                        LEAVE_CHIP[single.leave_type] || LEAVE_CHIP.other
                      }`}
                    >
                      {LEAVE_LABELS[single.leave_type] || single.leave_type}
                    </span>
                  ) : null}

                  {cell.inMonth && team.length > 0 ? (
                    <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                      {team.slice(0, 3).map((entry) => (
                        <span
                          key={`${entry.staff_id}-${entry.date}`}
                          className={`truncate rounded border px-1 py-0.5 text-[9px] font-semibold leading-tight ${
                            LEAVE_CHIP[entry.leave_type] || LEAVE_CHIP.other
                          }`}
                          title={`${entry.staff_name}: ${LEAVE_LABELS[entry.leave_type] || entry.leave_type}`}
                        >
                          {entry.staff_name.split(" ")[0]} ·{" "}
                          {LEAVE_LABELS[entry.leave_type] || entry.leave_type}
                        </span>
                      ))}
                      {team.length > 3 ? (
                        <span className="text-[9px] font-semibold text-[#829AB1]">
                          +{team.length - 3} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {cell.inMonth && !hasLeave ? (
                    <span className="mt-auto text-[10px] font-medium text-[#94A3B8]">Available</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#D9E1EA] bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-[#102A43]">Mark leave</h3>
            <p className="mt-1 text-sm text-[#627D98]">
              {modal.staffName} · {modal.date}
            </p>
            {canManageOthers ? (
              <label className="mt-4 block text-xs font-semibold text-[#486581]">
                Staff
                <select
                  value={modal.staffId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const staff = staffList.find((s) => s.id === id);
                    if (!staff) return;
                    const existing =
                      (payload?.entries || []).find(
                        (row) => row.staff_id === id && row.date === modal.date,
                      ) || null;
                    setSelectedStaffId(id);
                    setModal({
                      staffId: id,
                      staffName: staff.name,
                      date: modal.date,
                      existing,
                    });
                    setLeaveType((existing?.leave_type as StaffLeaveType) || "full_day");
                    setReason(existing?.reason || "");
                  }}
                  className="mt-1 w-full rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
                >
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="mt-3 block text-xs font-semibold text-[#486581]">
              Leave type
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as StaffLeaveType)}
                className="mt-1 w-full rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
              >
                {Object.entries(LEAVE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs font-semibold text-[#486581]">
              Reason (optional)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
                placeholder="Optional note"
              />
            </label>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(null)}
                className="rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm font-semibold text-[#486581]"
              >
                Cancel
              </button>
              {modal.existing ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void clearLeave()}
                  className="rounded-lg border border-[#F8B4B4] bg-[#FEF2F2] px-3 py-2 text-sm font-semibold text-[#9B1C1C]"
                >
                  Clear leave
                </button>
              ) : null}
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveLeave()}
                className="rounded-lg bg-[#009877] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

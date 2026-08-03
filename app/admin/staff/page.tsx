"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Activity,
  Briefcase,
  Eye,
  EyeOff,
  KeyRound,
  LockOpen,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import {
  createStaffUserWithPassword,
  deactivateStaffUser,
  deleteStaffUser,
  getAdminDashboardOverview,
  getAdminInternalMessagesFeed,
  getAdminRolesOverview,
  isAdminStaffRole,
  listAdminTasks,
  listStaffUsersWithSummary,
  resetStaffUserPassword,
  staffIdsMatch,
  unlockStaffUser,
  updateStaffUser,
  type AdminDashboardOverview,
  type AdminRoleOverview,
  type AdminStaffInternalMessage,
  type AdminStaffListSummary,
  type AdminStaffUser,
  type AdminTaskItem,
  type AccessScope,
} from "@/lib/admin-auth";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import {
  StaffWorkloadSlideOver,
  type StaffWorkloadSummary,
} from "@/components/console/workload/StaffWorkloadSlideOver";
import { PageLoader } from "@/components/ui/PageLoader";

const ACCESS_SCOPES: AccessScope[] = ["all", "easyfly_only", "exclude_easyfly"];

type StaffPageTab = "accounts" | "summary";

type StaffWorkloadRow = AdminDashboardOverview["staff_members"][number];

const emptyForm = () => ({
  full_name: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  role: "support_agent",
  access_scope: "all" as AccessScope,
  is_active: true,
});

function formatLastLogin(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(roles: AdminRoleOverview[], role?: string) {
  return roles.find((r) => r.id === role)?.label || role || "—";
}

function accessScopeLabel(scope?: string | null) {
  const key = String(scope || "all");
  if (key === "easyfly_only") return "EasyFly only";
  if (key === "exclude_easyfly") return "Exclude EasyFly";
  return "All";
}

function loadStatusStyles(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "overloaded") return "bg-[#FEE4E2] text-[#B42318] border-[#FECDCA]";
  if (normalized === "busy") return "bg-[#FFF4E5] text-[#9C4F17] border-[#F9DBAF]";
  if (normalized === "inactive") return "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]";
  return "bg-[#E6F7F2] text-[#006F57] border-[#B7EBD8]";
}

function AdminStaffPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab: StaffPageTab = searchParams.get("tab") === "summary" ? "summary" : "accounts";
  const [tab, setTab] = useState<StaffPageTab>(initialTab);

  const [staff, setStaff] = useState<AdminStaffUser[]>([]);
  const [summary, setSummary] = useState<AdminStaffListSummary>({ total: 0, active: 0, inactive: 0 });
  const [roles, setRoles] = useState<AdminRoleOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [workloadRows, setWorkloadRows] = useState<StaffWorkloadRow[]>([]);
  const [workloadLoading, setWorkloadLoading] = useState(false);
  const [workloadLoaded, setWorkloadLoaded] = useState(false);
  const [taskItems, setTaskItems] = useState<AdminTaskItem[]>([]);
  const [internalMessages, setInternalMessages] = useState<AdminStaffInternalMessage[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffWorkloadSummary | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetUser, setResetUser] = useState<AdminStaffUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [confirmAction, setConfirmAction] = useState<{
    type: "deactivate" | "delete";
    user: AdminStaffUser;
  } | null>(null);

  const selectTab = (next: StaffPageTab) => {
    setTab(next);
    const qs = next === "summary" ? "?tab=summary" : "";
    router.replace(`/admin/staff${qs}`, { scroll: false });
  };

  const assignableRoles = useMemo(
    () => roles.filter((role) => role.id !== "admin"),
    [roles],
  );

  const filteredStaff = useMemo(() => {
    if (statusFilter === "active") return staff.filter((user) => user.is_active !== false);
    if (statusFilter === "inactive") return staff.filter((user) => user.is_active === false);
    return staff;
  }, [staff, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffPayload, roleRows] = await Promise.all([
        listStaffUsersWithSummary({ excludeAdmin: true }),
        getAdminRolesOverview(),
      ]);
      setStaff(staffPayload.staff_users);
      setSummary(staffPayload.summary);
      setRoles(roleRows.filter((role) => role.id !== "admin"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWorkloadSummary = useCallback(async () => {
    setWorkloadLoading(true);
    try {
      const [overview, tasks, notes] = await Promise.all([
        getAdminDashboardOverview({ teamPeriod: "month" }),
        listAdminTasks({ limit: 500 }).catch(() => [] as AdminTaskItem[]),
        getAdminInternalMessagesFeed(80).catch(() => [] as AdminStaffInternalMessage[]),
      ]);
      const rows = (overview.staff_members || [])
        .filter((row) => {
          if (isAdminStaffRole(row.role_key || row.role)) return false;
          if (String(row.access_scope || "all") === "easyfly_only") return false;
          return true;
        })
        .sort((a, b) => b.pending - a.pending || b.assigned - a.assigned);
      setWorkloadRows(rows);
      setTaskItems(tasks);
      setInternalMessages(notes);
      setWorkloadLoaded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load staff summary.");
    } finally {
      setWorkloadLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === "summary" && !workloadLoaded && !workloadLoading) {
      void loadWorkloadSummary();
    }
  }, [tab, workloadLoaded, workloadLoading, loadWorkloadSummary]);

  useEffect(() => {
    const next = searchParams.get("tab") === "summary" ? "summary" : "accounts";
    setTab(next);
  }, [searchParams]);

  const selectedStaffTasks = useMemo(() => {
    if (!selectedStaff) return [];
    return taskItems
      .filter((task) => staffIdsMatch(task.assigned_staff, selectedStaff.id))
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      });
  }, [selectedStaff, taskItems]);

  const selectedStaffNotes = useMemo(() => {
    if (!selectedStaff) return [];
    return internalMessages.filter(
      (note) =>
        note.recipient_id === selectedStaff.id ||
        String(note.recipient_name || "").toLowerCase() === selectedStaff.name.toLowerCase(),
    );
  }, [internalMessages, selectedStaff]);

  const openStaffSummary = (row: StaffWorkloadRow) => {
    setSelectedStaff({
      id: row.id,
      name: row.name,
      role: row.role,
      assigned: row.assigned,
      pending: row.pending,
      completed: row.completed,
      loadStatus: row.loadStatus,
      slaBreach: row.slaBreach,
    });
  };

  const kpiCards = useMemo(
    () => [
      {
        key: "all" as const,
        label: "Total staff",
        value: summary.total,
        icon: Users,
        tone: "text-[#102A43]",
        activeRing: "ring-[#102A43]/25 border-[#102A43]/40",
      },
      {
        key: "active" as const,
        label: "Active",
        value: summary.active,
        icon: UserCheck,
        tone: "text-[#006F57]",
        activeRing: "ring-[#006F57]/25 border-[#006F57]/40",
      },
      {
        key: "inactive" as const,
        label: "Inactive",
        value: summary.inactive,
        icon: UserMinus,
        tone: "text-[#9C4F17]",
        activeRing: "ring-[#9C4F17]/25 border-[#9C4F17]/40",
      },
    ],
    [summary],
  );

  const summaryKpis = useMemo(() => {
    const assigned = workloadRows.reduce((sum, row) => sum + (row.assigned || 0), 0);
    const pending = workloadRows.reduce((sum, row) => sum + (row.pending || 0), 0);
    const completed = workloadRows.reduce((sum, row) => sum + (row.completed || 0), 0);
    const overloaded = workloadRows.filter((row) => String(row.loadStatus).toLowerCase() === "overloaded").length;
    return { assigned, pending, completed, overloaded, staffCount: workloadRows.length };
  }, [workloadRows]);

  const closeModal = () => {
    setEditId(null);
    setShowCreate(false);
    setForm(emptyForm());
  };

  const startEdit = (user: AdminStaffUser) => {
    setShowCreate(false);
    setEditId(user.id);
    setForm({
      full_name: user.full_name || "",
      username: user.username || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      role: user.role || "support_agent",
      access_scope: user.access_scope || "all",
      is_active: user.is_active !== false,
    });
  };

  const openCreate = () => {
    setEditId(null);
    setShowCreate(true);
    setForm({
      ...emptyForm(),
      role: assignableRoles[0]?.id || "support_agent",
    });
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.username.trim()) {
      toast.error("Name and username are required.");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const updated = await updateStaffUser(editId, {
          full_name: form.full_name.trim(),
          username: form.username.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim(),
          role: form.role,
          access_scope: form.access_scope,
          is_active: form.is_active,
        });
        if (updated) {
          setStaff((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        }
        toast.success("Staff updated.");
      } else {
        if (!form.password || form.password.length < 8) {
          toast.error("Password must be at least 8 characters.");
          return;
        }
        await createStaffUserWithPassword({
          full_name: form.full_name.trim(),
          username: form.username.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          password: form.password,
          role: form.role,
          access_scope: form.access_scope,
        });
        toast.success("Staff created.");
      }
      closeModal();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save staff.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (user: AdminStaffUser) => {
    setConfirmAction({ type: "deactivate", user });
  };

  const handleUnlock = async (user: AdminStaffUser) => {
    setActionLoadingId(user.id);
    try {
      await unlockStaffUser(user.id);
      toast.success("Account unlocked.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unlock account.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReactivate = async (user: AdminStaffUser) => {
    setActionLoadingId(user.id);
    try {
      await updateStaffUser(user.id, { is_active: true });
      toast.success("Staff reactivated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reactivate.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderStatusBadges = (user: AdminStaffUser) => (
    <div className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          user.is_active !== false
            ? "bg-[#009877]/12 text-[#006F57]"
            : "bg-[#FEF3C7] text-[#9C4F17]"
        }`}
      >
        {user.is_active !== false ? "Active" : "Inactive"}
      </span>
      {user.is_locked ? (
        <span className="inline-flex rounded-full bg-[#FEE4E2] px-2 py-0.5 text-[11px] font-semibold text-[#B42318]">
          Locked
        </span>
      ) : null}
    </div>
  );

  const handleDelete = (user: AdminStaffUser) => {
    setConfirmAction({ type: "delete", user });
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    setActionLoadingId(user.id);
    try {
      if (type === "deactivate") {
        await deactivateStaffUser(user.id);
        toast.success("Staff deactivated.");
      } else {
        await deleteStaffUser(user.id);
        toast.success("Staff deleted.");
      }
      setConfirmAction(null);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : type === "deactivate"
            ? "Could not deactivate."
            : "Could not delete staff.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    if (!resetPassword || resetPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await resetStaffUserPassword(resetUser.id, resetPassword);
      toast.success("Password reset.");
      setResetUser(null);
      setResetPassword("");
      setShowResetPassword(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset password.");
    } finally {
      setSaving(false);
    }
  };

  const renderActions = (user: AdminStaffUser, compact = false) => {
    const busy = actionLoadingId === user.id;
    const btnClass = compact
      ? "inline-flex items-center justify-center gap-1 rounded-[8px] border px-2 py-1.5 text-xs font-semibold"
      : "inline-flex items-center justify-center gap-1 rounded-[8px] border p-1.5";

    return (
      <div className={`flex flex-wrap gap-1 ${compact ? "w-full" : ""}`}>
        <button
          type="button"
          onClick={() => startEdit(user)}
          disabled={busy}
          className={`${btnClass} border-[#D9E1EA] hover:bg-[#F8FAFC] text-[#334E68]`}
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
          {compact ? "Edit" : null}
        </button>
        <button
          type="button"
          onClick={() => {
            setResetUser(user);
            setResetPassword("");
            setShowResetPassword(false);
          }}
          disabled={busy}
          className={`${btnClass} border-[#D9E1EA] hover:bg-[#F8FAFC] text-[#0B69B7]`}
          title="Reset password"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {compact ? "Reset" : null}
        </button>
        {user.is_locked ? (
          <button
            type="button"
            onClick={() => void handleUnlock(user)}
            disabled={busy}
            className={`${btnClass} border-[#FEE4E2] text-[#B42318] hover:bg-[#FEF3F2]`}
            title="Unlock account"
          >
            <LockOpen className="h-3.5 w-3.5" />
            {compact ? "Unlock" : null}
          </button>
        ) : null}
        {user.is_active !== false ? (
          <button
            type="button"
            onClick={() => void handleDeactivate(user)}
            disabled={busy}
            className={`${btnClass} border-amber-200 text-amber-700 hover:bg-amber-50`}
            title="Deactivate"
          >
            <UserMinus className="h-3.5 w-3.5" />
            {compact ? "Deactivate" : null}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleReactivate(user)}
            disabled={busy}
            className={`${btnClass} border-[#009877]/30 text-[#006F57] hover:bg-[#009877]/10`}
            title="Reactivate"
          >
            <UserCheck className="h-3.5 w-3.5" />
            {compact ? "Activate" : null}
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleDelete(user)}
          disabled={busy}
          className={`${btnClass} border-rose-200 text-rose-600 hover:bg-rose-50`}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {compact ? "Delete" : null}
        </button>
      </div>
    );
  };

  const modalOpen = showCreate || editId != null;

  useSetAdminPageChrome({
    title: "Staff Management",
    subtitle: tab === "summary" ? "Workload & case load by staff" : "Accounts, roles & access",
    icon: Briefcase,
    syncKey: `${tab}|${loading}|${workloadLoading}|${staff.length}|${statusFilter}|${filteredStaff.length}|${workloadRows.length}`,
    actions: (
      <>
        <button
          type="button"
          onClick={() => void (tab === "summary" ? loadWorkloadSummary() : load())}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
        >
          <RefreshCw className={`h-4 w-4 ${tab === "summary" ? (workloadLoading ? "animate-spin" : "") : loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        {tab === "accounts" ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-[#007B61]"
          >
            <Plus className="h-4 w-4" />
            Add staff
          </button>
        ) : null}
      </>
    ),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1300px] mx-auto px-1 sm:px-0"
    >
      <div className="inline-flex rounded-[10px] border border-[#D9E1EA] bg-white p-1">
        <button
          type="button"
          onClick={() => selectTab("accounts")}
          className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "accounts" ? "bg-[#1A56DB] text-white shadow-sm" : "text-[#486581] hover:bg-[#F5F7FA]"
          }`}
        >
          Accounts
        </button>
        <button
          type="button"
          onClick={() => selectTab("summary")}
          className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "summary" ? "bg-[#1A56DB] text-white shadow-sm" : "text-[#486581] hover:bg-[#F5F7FA]"
          }`}
        >
          Staff summary
        </button>
      </div>

      {tab === "summary" ? (
        <>
          <StaffWorkloadSlideOver
            isOpen={Boolean(selectedStaff)}
            onClose={() => setSelectedStaff(null)}
            staff={selectedStaff}
            tasks={selectedStaffTasks}
            allTasks={selectedStaffTasks}
            internalNotes={selectedStaffNotes}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Staff", value: summaryKpis.staffCount, tone: "text-[#102A43]" },
              { label: "Assigned", value: summaryKpis.assigned, tone: "text-[#0B69B7]" },
              { label: "Pending", value: summaryKpis.pending, tone: "text-[#9C4F17]" },
              { label: "Completed", value: summaryKpis.completed, tone: "text-[#006F57]" },
            ].map((card) => (
              <div key={card.label} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 sm:p-4">
                <p className="text-xs text-[#627D98]">{card.label}</p>
                <p className={`mt-1 text-xl sm:text-2xl font-heading font-semibold ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-heading font-semibold text-[#102A43]">Staff summary</h2>
                <p className="text-[11px] text-[#627D98]">Click staff → then click a task for details</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#627D98]">
                <Activity className="h-3.5 w-3.5" />
                {summaryKpis.overloaded > 0 ? `${summaryKpis.overloaded} overloaded` : `${summaryKpis.staffCount} staff`}
              </span>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {workloadLoading && !workloadLoaded ? (
                <div className="rounded-[10px] border border-[#E5EAF0] p-6 text-center text-sm text-[#627D98]">Loading…</div>
              ) : workloadRows.length === 0 ? (
                <div className="rounded-[10px] border border-[#E5EAF0] p-6 text-center text-sm text-[#627D98]">No staff workload data.</div>
              ) : (
                workloadRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => openStaffSummary(row)}
                    className={`w-full text-left rounded-[10px] border p-3 space-y-2 transition-colors ${
                      selectedStaff?.id === row.id
                        ? "border-[#33A1FD] bg-[#EFF7FF]"
                        : "border-[#E5EAF0] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-heading font-semibold text-[#102A43] truncate">{row.name}</p>
                        <p className="text-xs text-[#627D98] capitalize">{String(row.role).replace(/_/g, " ")}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-semibold uppercase rounded-full border px-2 py-0.5 ${loadStatusStyles(row.loadStatus)}`}>
                        {row.loadStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-[11px] text-[#627D98]">Assigned</p>
                        <p className="font-semibold text-[#0B69B7]">{row.assigned}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#627D98]">Pending</p>
                        <p className="font-semibold text-[#9C4F17]">{row.pending}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#627D98]">Done</p>
                        <p className="font-semibold text-[#006F57]">{row.completed}</p>
                      </div>
                    </div>
                    {row.slaBreach > 0 ? (
                      <p className="text-[11px] text-[#B42318]">{row.slaBreach} overdue</p>
                    ) : null}
                  </button>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[#F5F7FA] text-[#486581]">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Staff</th>
                    <th className="px-4 py-2.5 text-left font-medium">Role</th>
                    <th className="px-4 py-2.5 text-left font-medium">Scope</th>
                    <th className="px-4 py-2.5 text-center font-medium">Assigned</th>
                    <th className="px-4 py-2.5 text-center font-medium">Pending</th>
                    <th className="px-4 py-2.5 text-center font-medium">Done</th>
                    <th className="px-4 py-2.5 text-left font-medium">Load</th>
                    <th className="px-4 py-2.5 text-left font-medium">Avg time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                  {workloadLoading && !workloadLoaded ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-[#627D98]">
                        Loading…
                      </td>
                    </tr>
                  ) : workloadRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-[#627D98]">
                        No staff workload data.
                      </td>
                    </tr>
                  ) : (
                    workloadRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`cursor-pointer transition-colors hover:bg-[#F8FAFC] ${
                          selectedStaff?.id === row.id ? "bg-[#EFF7FF]" : ""
                        }`}
                        onClick={() => openStaffSummary(row)}
                      >
                        <td className="px-4 py-2.5 font-medium text-[#102A43]">
                          {row.name}
                          {row.slaBreach > 0 ? (
                            <span className="ml-1 text-[10px] text-[#B42318]">({row.slaBreach} overdue)</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 capitalize">{String(row.role).replace(/_/g, " ")}</td>
                        <td className="px-4 py-2.5 text-xs text-[#486581]">{accessScopeLabel(row.access_scope)}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-[#0B69B7]">{row.assigned}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-[#9C4F17]">{row.pending}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-[#006F57]">{row.completed}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-semibold uppercase rounded-full border px-2 py-0.5 ${loadStatusStyles(row.loadStatus)}`}>
                            {row.loadStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs whitespace-nowrap">{row.avgTime || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpiCards.map((card) => {
          const selected = statusFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(card.key)}
              aria-pressed={selected}
              className={`bg-white border-[0.5px] rounded-[12px] p-3 sm:p-4 text-left transition ${
                selected
                  ? `ring-2 ${card.activeRing}`
                  : "border-[#D9E1EA] hover:border-[#B8C7D6] hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[#627D98]">{card.label}</p>
                <card.icon className={`h-4 w-4 ${card.tone}`} />
              </div>
              <p className={`mt-1 text-xl sm:text-2xl font-heading font-semibold ${card.tone}`}>{card.value}</p>
              <p className="mt-1 text-[11px] text-[#829AB1]">
                {selected ? "Showing in table" : "Click to filter table"}
              </p>
            </button>
          );
        })}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-6 text-center text-sm text-[#627D98]">Loading…</div>
        ) : filteredStaff.length === 0 ? (
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-6 text-center text-sm text-[#627D98]">
            {statusFilter === "inactive"
              ? "No inactive staff accounts."
              : statusFilter === "active"
                ? "No active staff accounts."
                : "No staff accounts found."}
          </div>
        ) : (
          filteredStaff.map((user) => (
            <div key={user.id} className="rounded-[12px] border border-[#D9E1EA] bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-[#102A43] truncate">{user.full_name}</p>
                  <p className="text-xs text-[#627D98] font-mono truncate">@{user.username}</p>
                </div>
                {renderStatusBadges(user)}
              </div>
              <dl className="grid grid-cols-1 gap-1.5 text-sm text-[#486581]">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#627D98]">Email</dt>
                  <dd className="text-right truncate">{user.email || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#627D98]">Role</dt>
                  <dd className="text-right">{roleLabel(roles, user.role)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#627D98]">Last login</dt>
                  <dd className="text-right text-xs">{formatLastLogin(user.last_login)}</dd>
                </div>
              </dl>
              {renderActions(user, true)}
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between gap-3">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Staff accounts</h2>
          <span className="text-xs text-[#627D98]">
            {filteredStaff.length}
            {statusFilter !== "all" ? ` ${statusFilter}` : ""} / {summary.total} users
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Username</th>
                <th className="px-4 py-2.5 text-left font-medium">Email</th>
                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Last login</th>
                <th className="px-4 py-2.5 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#627D98]">
                    Loading…
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#627D98]">
                    {statusFilter === "inactive"
                      ? "No inactive staff accounts."
                      : statusFilter === "active"
                        ? "No active staff accounts."
                        : "No staff accounts found."}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-2.5 font-medium text-[#102A43]">{user.full_name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{user.username}</td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate">{user.email || "—"}</td>
                    <td className="px-4 py-2.5">{roleLabel(roles, user.role)}</td>
                    <td className="px-4 py-2.5">{renderStatusBadges(user)}</td>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap">{formatLastLogin(user.last_login)}</td>
                    <td className="px-4 py-2.5">{renderActions(user)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full sm:max-w-lg rounded-t-[12px] sm:rounded-[12px] bg-white p-5 shadow-xl border border-[#D9E1EA] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold text-[#102A43]">
                {editId ? "Edit staff" : "Add staff"}
              </h2>
              <button type="button" onClick={closeModal} className="p-1 text-[#627D98] hover:text-[#102A43]" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="text-xs font-medium text-[#627D98]">Full name</span>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-[#627D98]">Username</span>
                <input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-[#627D98]">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-[#627D98]">Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-[#627D98]">Role</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2"
                >
                  {assignableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-medium text-[#627D98]">Access scope</span>
                <select
                  value={form.access_scope}
                  onChange={(e) => setForm((f) => ({ ...f, access_scope: e.target.value as AccessScope }))}
                  className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2"
                >
                  {ACCESS_SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope}
                    </option>
                  ))}
                </select>
              </label>
              {showCreate ? (
                <label className="block text-sm sm:col-span-2">
                  <span className="text-xs font-medium text-[#627D98]">Password</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2"
                  />
                </label>
              ) : (
                <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="h-4 w-4 rounded border-[#C9D6E2] text-[#009877]"
                  />
                  Active account
                </label>
              )}
            </div>
            <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded-[10px] border border-[#D9E1EA] px-4 py-2 text-sm font-semibold text-[#486581]">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-[10px] bg-[#009877] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
              >
                {saving ? "Saving…" : editId ? "Save changes" : "Create staff"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetUser ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-[12px] sm:rounded-[12px] bg-white p-5 shadow-xl border border-[#D9E1EA]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold text-[#102A43]">Reset password</h2>
              <button
                type="button"
                onClick={() => {
                  setResetUser(null);
                  setResetPassword("");
                  setShowResetPassword(false);
                }}
                className="p-1 text-[#627D98] hover:text-[#102A43]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-[#627D98]">
              Set a new password for <span className="font-medium text-[#102A43]">{resetUser.full_name}</span> (@{resetUser.username}).
            </p>
            <label className="mt-4 block text-sm">
              <span className="text-xs font-medium text-[#627D98]">New password</span>
              <div className="relative mt-1">
                <input
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2 pr-10"
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-[#829AB1] hover:text-[#486581]"
                  aria-label={showResetPassword ? "Hide password" : "Show password"}
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetUser(null);
                  setResetPassword("");
                  setShowResetPassword(false);
                }}
                className="rounded-[10px] border border-[#D9E1EA] px-4 py-2 text-sm font-semibold text-[#486581]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleResetPassword()}
                disabled={saving}
                className="rounded-[10px] bg-[#0B69B7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#095a9e] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Reset password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.type === "delete" ? "Delete staff?" : "Deactivate staff?"}
        description={
          confirmAction
            ? confirmAction.type === "delete"
              ? `Permanently delete ${confirmAction.user.full_name} (@${confirmAction.user.username})? This cannot be undone.`
              : `Deactivate ${confirmAction.user.full_name} (@${confirmAction.user.username})? They will not be able to sign in until reactivated.`
            : ""
        }
        confirmLabel={confirmAction?.type === "delete" ? "Delete" : "Deactivate"}
        tone={confirmAction?.type === "delete" ? "danger" : "default"}
        loading={Boolean(confirmAction && actionLoadingId === confirmAction.user.id)}
        onCancel={() => {
          if (confirmAction && actionLoadingId === confirmAction.user.id) return;
          setConfirmAction(null);
        }}
        onConfirm={() => void runConfirmAction()}
      />
    </motion.div>
  );
}

export default function AdminStaffPage() {
  return (
    <Suspense
      fallback={
        <section className="bg-bg-page">
          <PageLoader title="Loading…" subtitle="Staff management." fill={false} />
        </section>
      }
    >
      <AdminStaffPageInner />
    </Suspense>
  );
}

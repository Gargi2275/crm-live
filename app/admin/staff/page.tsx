"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Briefcase,
  KeyRound,
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
  getAdminRolesOverview,
  listStaffUsersWithSummary,
  resetStaffUserPassword,
  updateStaffUser,
  type AdminRoleOverview,
  type AdminStaffListSummary,
  type AdminStaffUser,
  type AccessScope,
} from "@/lib/admin-auth";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";

const ACCESS_SCOPES: AccessScope[] = ["all", "easyfly_only", "exclude_easyfly"];

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

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<AdminStaffUser[]>([]);
  const [summary, setSummary] = useState<AdminStaffListSummary>({ total: 0, active: 0, inactive: 0 });
  const [roles, setRoles] = useState<AdminRoleOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetUser, setResetUser] = useState<AdminStaffUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  const assignableRoles = useMemo(
    () => roles.filter((role) => role.id !== "admin"),
    [roles],
  );

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

  useEffect(() => {
    void load();
  }, [load]);

  const kpiCards = useMemo(
    () => [
      { label: "Total staff", value: summary.total, icon: Users, tone: "text-[#102A43]" },
      { label: "Active", value: summary.active, icon: UserCheck, tone: "text-[#006F57]" },
      { label: "Inactive", value: summary.inactive, icon: UserMinus, tone: "text-[#9C4F17]" },
    ],
    [summary],
  );

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

  const handleDeactivate = async (user: AdminStaffUser) => {
    if (!confirm(`Deactivate ${user.full_name}?`)) return;
    setActionLoadingId(user.id);
    try {
      await deactivateStaffUser(user.id);
      toast.success("Staff deactivated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not deactivate.");
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

  const handleDelete = async (user: AdminStaffUser) => {
    if (!confirm(`Permanently delete ${user.full_name}? This cannot be undone.`)) return;
    setActionLoadingId(user.id);
    try {
      await deleteStaffUser(user.id);
      toast.success("Staff deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete staff.");
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
          }}
          disabled={busy}
          className={`${btnClass} border-[#D9E1EA] hover:bg-[#F8FAFC] text-[#0B69B7]`}
          title="Reset password"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {compact ? "Reset" : null}
        </button>
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
    subtitle: "Accounts, roles & access",
    icon: Briefcase,
    syncKey: `${loading}|${staff.length}`,
    actions: (
      <>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-[#007B61]"
        >
          <Plus className="h-4 w-4" />
          Add staff
        </button>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[#627D98]">{card.label}</p>
              <card.icon className={`h-4 w-4 ${card.tone}`} />
            </div>
            <p className={`mt-1 text-xl sm:text-2xl font-heading font-semibold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-6 text-center text-sm text-[#627D98]">Loading…</div>
        ) : staff.length === 0 ? (
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-6 text-center text-sm text-[#627D98]">No staff accounts found.</div>
        ) : (
          staff.map((user) => (
            <div key={user.id} className="rounded-[12px] border border-[#D9E1EA] bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-[#102A43] truncate">{user.full_name}</p>
                  <p className="text-xs text-[#627D98] font-mono truncate">@{user.username}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    user.is_active !== false
                      ? "bg-[#009877]/12 text-[#006F57]"
                      : "bg-[#FEF3C7] text-[#9C4F17]"
                  }`}
                >
                  {user.is_active !== false ? "Active" : "Inactive"}
                </span>
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
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Staff accounts</h2>
          <span className="text-xs text-[#627D98]">{summary.total} users</span>
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
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#627D98]">
                    No staff accounts found.
                  </td>
                </tr>
              ) : (
                staff.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-2.5 font-medium text-[#102A43]">{user.full_name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{user.username}</td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate">{user.email || "—"}</td>
                    <td className="px-4 py-2.5">{roleLabel(roles, user.role)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          user.is_active !== false
                            ? "bg-[#009877]/12 text-[#006F57]"
                            : "bg-[#FEF3C7] text-[#9C4F17]"
                        }`}
                      >
                        {user.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap">{formatLastLogin(user.last_login)}</td>
                    <td className="px-4 py-2.5">{renderActions(user)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2"
                placeholder="Minimum 8 characters"
              />
            </label>
            <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetUser(null);
                  setResetPassword("");
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
    </motion.div>
  );
}

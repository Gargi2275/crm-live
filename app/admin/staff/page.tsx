"use client";

import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AdminStaffUser,
  StaffRole,
  createStaffUserWithPassword,
  deleteStaffUser,
  deactivateStaffUser,
  listStaffUsers,
  resetStaffUserPassword,
  updateStaffUser,
} from "@/lib/admin-auth";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function StaffPage() {
  const router = useRouter();
  const { adminUser, logout } = useAdminAuth();
  const [staffUsers, setStaffUsers] = useState<AdminStaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingStaffId, setResettingStaffId] = useState<number | null>(null);
  const [newStaff, setNewStaff] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "case_processor" as StaffRole,
  });

  const canCreate = adminUser?.role === "admin";
  const isAdmin = adminUser?.role === "admin";
  const visibleStaffUsers = useMemo(() => staffUsers.filter((row) => row.role !== "admin"), [staffUsers]);

  const handleAuthFailure = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : "";
    const normalized = message.toLowerCase();
    const isSessionError =
      normalized.includes("expired") ||
      normalized.includes("unauthorized") ||
      normalized.includes("401") ||
      normalized.includes("login again");

    if (isSessionError) {
      toast.error("Session expired. Please login again.");
      logout();
      router.replace("/admin/login");
      return true;
    }

    return false;
  };

  const loadStaffUsers = async () => {
    setLoading(true);
    try {
      const rows = await listStaffUsers();
      setStaffUsers(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load staff users.";
      toast.error(message);
      if (message.toLowerCase().includes("expired")) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStaffUsers();
  }, []);

  const activeCount = useMemo(() => visibleStaffUsers.filter((row) => row.is_active !== false).length, [visibleStaffUsers]);
  const inactiveCount = useMemo(() => visibleStaffUsers.filter((row) => row.is_active === false).length, [visibleStaffUsers]);
  const hasActiveAdmin = useMemo(
    () => staffUsers.some((row) => row.role === "admin" && row.is_active !== false),
    [staffUsers],
  );

  const roleCounts = useMemo(() => {
    return visibleStaffUsers.reduce<Record<string, number>>((acc, row) => {
      acc[row.role] = (acc[row.role] || 0) + 1;
      return acc;
    }, {});
  }, [visibleStaffUsers]);

  const allStaffRoles: StaffRole[] = ["admin", "ops_manager", "case_processor", "reviewer", "support_agent"];
  const allowedCreateRoles: StaffRole[] = hasActiveAdmin
    ? ["ops_manager", "case_processor", "reviewer", "support_agent"]
    : allStaffRoles;

  useEffect(() => {
    if (hasActiveAdmin && newStaff.role === "admin") {
      setNewStaff((prev) => ({ ...prev, role: "case_processor" }));
    }
  }, [hasActiveAdmin, newStaff.role]);

  const handleCreate = async () => {
    if (!newStaff.full_name || !newStaff.username || !newStaff.password) {
      toast.error("Full name, username, and password are required.");
      return;
    }

    setSaving(true);
    try {
      await createStaffUserWithPassword(newStaff);
      toast.success("Staff user created successfully.");
      setNewStaff({ full_name: "", username: "", email: "", phone: "", password: "", role: "case_processor" });
      await loadStaffUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create staff user.");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (staffId: number, role: StaffRole) => {
    setSaving(true);
    try {
      await updateStaffUser(staffId, { role });
      toast.success("Role updated.");
      await loadStaffUsers();
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Failed to update role.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (staffId: number, isActive: boolean) => {
    setSaving(true);
    try {
      await updateStaffUser(staffId, { is_active: isActive });
      toast.success("Status updated.");
      if (!isActive && adminUser?.id === staffId) {
        logout();
        router.replace("/admin/login");
        return;
      }
      await loadStaffUsers();
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Failed to update status.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (staffId: number) => {
    setSaving(true);
    try {
      await deactivateStaffUser(staffId);
      toast.success("Staff user deactivated.");
      if (adminUser?.id === staffId) {
        logout();
        router.replace("/admin/login");
        return;
      }
      await loadStaffUsers();
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Failed to deactivate user.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (staffId: number) => {
    if (!confirm("Delete this staff user permanently?")) {
      return;
    }
    setSaving(true);
    try {
      await deleteStaffUser(staffId);
      toast.success("Staff user deleted.");
      await loadStaffUsers();
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Failed to delete user.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (staffId: number) => {
    const password = prompt("Enter new password for this staff user:");
    if (!password) {
      return;
    }
    setResettingStaffId(staffId);
    try {
      await resetStaffUserPassword(staffId, password);
      toast.success("Password reset successfully.");
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Failed to reset password.");
      }
    } finally {
      setResettingStaffId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="animate-in fade-in zoom-in-95 duration-500 max-w-[1300px] mx-auto space-y-6 font-body"
    >
      <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Staff User Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-3">
          <p className="text-xs text-[#627D98]">Total staff</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{staffUsers.length}</p>
        </div>
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-3">
          <p className="text-xs text-[#627D98]">Active</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{activeCount}</p>
        </div>
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-3">
          <p className="text-xs text-[#627D98]">Inactive</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{inactiveCount}</p>
        </div>
      </div>

      {canCreate && (
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
          <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-3">Create Staff User</h2>
          {hasActiveAdmin ? (
            <p className="mb-3 text-xs text-[#9C4F17]">
              Only one active admin is allowed. Deactivate or change the current admin role first.
            </p>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={newStaff.full_name}
              onChange={(e) => setNewStaff((prev) => ({ ...prev, full_name: e.target.value }))}
              placeholder="Full name"
              className="rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm"
            />
            <input
              value={newStaff.username}
              onChange={(e) => setNewStaff((prev) => ({ ...prev, username: e.target.value.toLowerCase() }))}
              placeholder="Username"
              className="rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm"
            />
            <input
              value={newStaff.email}
              onChange={(e) => setNewStaff((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email (optional)"
              type="email"
              className="rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm"
            />
            <input
              value={newStaff.phone}
              onChange={(e) => setNewStaff((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone (optional)"
              className="rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm"
            />
            <input
              value={newStaff.password}
              type="password"
              onChange={(e) => setNewStaff((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Password"
              className="rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm"
            />
            <select
              value={newStaff.role}
              onChange={(e) => setNewStaff((prev) => ({ ...prev, role: e.target.value as StaffRole }))}
              className="rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm"
            >
              {allowedCreateRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="mt-3 rounded-[10px] bg-[#009877] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create User"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Role distribution</h2>
        <p className="text-sm text-[#486581]">
          {Object.entries(roleCounts)
            .map(([role, count]) => `${role}: ${count}`)
            .join(" | ") || "No staff records found."}
        </p>
      </div>

      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Staff users</h2>
          <span className="text-xs text-[#627D98]">{loading ? "Loading..." : `${visibleStaffUsers.length} records`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Name</th>
                <th className="px-4 py-2.5 text-left">Email</th>
                <th className="px-4 py-2.5 text-left">Role</th>
                <th className="px-4 py-2.5 text-left">Active</th>
                <th className="px-4 py-2.5 text-left">Last login</th>
                <th className="px-4 py-2.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {visibleStaffUsers.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5">{row.full_name}</td>
                  <td className="px-4 py-2.5">{row.email}</td>
                  <td className="px-4 py-2.5">
                    {isAdmin ? (
                      <select
                        value={row.role}
                        onChange={(e) => handleRoleChange(row.id, e.target.value as StaffRole)}
                        className="rounded-[8px] border border-[#D9E1EA] px-2 py-1 text-xs"
                      >
                        {(hasActiveAdmin && row.role !== "admin"
                          ? ["ops_manager", "case_processor", "reviewer", "support_agent"]
                          : allStaffRoles).map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      row.role
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {isAdmin ? (
                      <input
                        type="checkbox"
                        checked={row.is_active !== false}
                        onChange={(e) => handleToggleActive(row.id, e.target.checked)}
                      />
                    ) : row.is_active !== false ? (
                      "Yes"
                    ) : (
                      "No"
                    )}
                  </td>
                  <td className="px-4 py-2.5">{row.last_login ? new Date(row.last_login).toLocaleString() : "Never"}</td>
                  <td className="px-4 py-2.5">
                    {isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        {row.is_active !== false && (
                          <button
                            className="rounded-[8px] bg-[#B42318]/10 px-2 py-1 text-xs text-[#B42318]"
                            onClick={() => handleDeactivate(row.id)}
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          className="rounded-[8px] bg-[#0B69B7]/10 px-2 py-1 text-xs text-[#0B69B7] disabled:opacity-50"
                          onClick={() => handleResetPassword(row.id)}
                          disabled={resettingStaffId === row.id}
                        >
                          {resettingStaffId === row.id ? "Resetting..." : "Reset Password"}
                        </button>
                        <button
                          className="rounded-[8px] bg-[#7A1E12]/10 px-2 py-1 text-xs text-[#7A1E12]"
                          onClick={() => handleDelete(row.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

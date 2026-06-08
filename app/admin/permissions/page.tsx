"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { KeyRound, RefreshCw } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  getAdminRolePermissions,
  getAdminStaffPermissions,
  updateAdminRolePermissions,
  updateAdminStaffPermissions,
  type AdminPermissionModuleRow,
  type AdminPermissionRoleOption,
} from "@/lib/admin-auth";

type PermissionMode = "staff" | "role";

export default function AdminPermissionsPage() {
  const { adminUser } = useAdminAuth();
  const isAdmin = adminUser?.role === "admin";

  const [mode, setMode] = useState<PermissionMode>("role");
  const [staffOptions, setStaffOptions] = useState<Array<{ id: number; name: string; role_label?: string }>>([]);
  const [roleOptions, setRoleOptions] = useState<AdminPermissionRoleOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [moduleRows, setModuleRows] = useState<AdminPermissionModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const loadStaff = useCallback(async (staffId?: number | null) => {
    setLoading(true);
    try {
      const data = await getAdminStaffPermissions(staffId ?? undefined);
      setStaffOptions(data.staff || []);
      setRoleOptions(data.roles || []);
      const resolvedStaffId = staffId ?? data.selected_staff?.id ?? data.staff?.[0]?.id ?? null;
      if (resolvedStaffId != null) {
        setSelectedStaffId(resolvedStaffId);
        if (staffId == null && resolvedStaffId !== data.selected_staff?.id) {
          const detail = await getAdminStaffPermissions(resolvedStaffId);
          setModuleRows(detail.module_rows || []);
        } else {
          setModuleRows(data.module_rows || []);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRole = useCallback(async (roleId: string) => {
    setLoading(true);
    try {
      const data = await getAdminRolePermissions(roleId);
      setRoleOptions(data.roles || roleOptions);
      setStaffOptions(data.staff || staffOptions);
      setSelectedRoleId(roleId);
      setModuleRows(data.module_rows || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load role permissions.");
    } finally {
      setLoading(false);
    }
  }, [roleOptions, staffOptions]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await getAdminStaffPermissions();
        setStaffOptions(data.staff || []);
        setRoleOptions(data.roles || []);
        if (data.roles?.length) {
          const firstRole = data.roles[0].id;
          setSelectedRoleId(firstRole);
          setMode("role");
          const roleData = await getAdminRolePermissions(firstRole);
          setModuleRows(roleData.module_rows || []);
        } else if (data.staff?.length) {
          setMode("staff");
          const firstId = data.staff[0].id;
          setSelectedStaffId(firstId);
          const detail = await getAdminStaffPermissions(firstId);
          setModuleRows(detail.module_rows || []);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load permissions.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleStaffChange = async (staffId: number) => {
    setSelectedStaffId(staffId);
    await loadStaff(staffId);
  };

  const handleRoleChange = async (roleId: string) => {
    setSelectedRoleId(roleId);
    await loadRole(roleId);
  };

  const handleModeChange = async (next: PermissionMode) => {
    setMode(next);
    if (next === "role" && roleOptions.length) {
      const roleId = selectedRoleId || roleOptions[0].id;
      await loadRole(roleId);
    } else if (next === "staff" && staffOptions.length) {
      const staffId = selectedStaffId || staffOptions[0].id;
      await loadStaff(staffId);
    }
  };

  const handleToggle = async (moduleKey: string, allowed: boolean) => {
    if (!isAdmin) return;
    setTogglingKey(moduleKey);
    try {
      if (mode === "role" && selectedRoleId) {
        const updated = await updateAdminRolePermissions(selectedRoleId, { [moduleKey]: allowed });
        setModuleRows(updated.module_rows || []);
        toast.success(allowed ? "Role module access enabled." : "Role module access disabled.");
      } else if (mode === "staff" && selectedStaffId) {
        const updated = await updateAdminStaffPermissions(selectedStaffId, { [moduleKey]: allowed });
        setModuleRows(updated.module_rows || []);
        toast.success(allowed ? "Staff module access enabled." : "Staff module access disabled.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save permission.");
    } finally {
      setTogglingKey(null);
    }
  };

  const refresh = () => {
    if (mode === "role" && selectedRoleId) {
      void loadRole(selectedRoleId);
    } else if (selectedStaffId) {
      void loadStaff(selectedStaffId);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-[#102A43]">Permissions</h1>
          <p className="mt-1 text-sm text-[#627D98]">
            Set module access by role or per staff member. Only allowed modules appear in the sidebar.
          </p>
        </div>
        <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-[#D9E1EA] bg-white p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleModeChange("role")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === "role" ? "bg-[#009877] text-white" : "border border-[#D9E1EA] text-[#486581]"
            }`}
          >
            By role
          </button>
          <button
            type="button"
            onClick={() => void handleModeChange("staff")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === "staff" ? "bg-[#009877] text-white" : "border border-[#D9E1EA] text-[#486581]"
            }`}
          >
            By staff
          </button>
        </div>

        {mode === "role" ? (
          <label className="block text-xs font-medium text-[#627D98]">
            Role
            <select
              value={selectedRoleId ?? ""}
              onChange={(e) => void handleRoleChange(e.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
            >
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-xs font-medium text-[#627D98]">
            Staff member
            <select
              value={selectedStaffId ?? ""}
              onChange={(e) => void handleStaffChange(Number(e.target.value))}
              className="mt-1 w-full max-w-md rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
            >
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.role_label ? `(${s.role_label})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <section className="rounded-xl border border-[#D9E1EA] bg-white overflow-hidden">
        <div className="border-b border-[#E5EAF0] px-4 py-3 flex items-center gap-2 text-sm font-semibold text-[#102A43]">
          <KeyRound className="h-4 w-4 text-[#009877]" />
          Module access
        </div>
        {loading ? (
          <p className="px-4 py-8 text-sm text-[#627D98]">Loading…</p>
        ) : (
          <ul className="divide-y divide-[#E5EAF0]">
            {moduleRows.map((row) => (
              <li key={row.module_key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-[#102A43]">{row.module}</p>
                  {mode === "staff" && row.role_default != null ? (
                    <p className="text-xs text-[#627D98]">Role default: {row.role_default ? "Allowed" : "Denied"}</p>
                  ) : null}
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.allowed}
                    disabled={!isAdmin || togglingKey === row.module_key}
                    onChange={(e) => void handleToggle(row.module_key, e.target.checked)}
                    className="h-4 w-4 rounded border-[#C9D6E2] text-[#009877]"
                  />
                  {row.allowed ? "Allowed" : "Denied"}
                </label>
              </li>
            ))}
          </ul>
        )}
        {!isAdmin ? (
          <p className="px-4 py-3 text-xs text-amber-700 bg-amber-50 border-t border-amber-100">
            Only admin can change permissions. You can view access settings here.
          </p>
        ) : null}
      </section>
    </div>
  );
}

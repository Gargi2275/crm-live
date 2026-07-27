"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { KeyRound, RefreshCw } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  getAdminRolePermissions,
  getAdminStaffPermissions,
  isAdminStaffRole,
  updateAdminRolePermissions,
  updateAdminStaffPermissions,
  type AdminPermissionModuleRow,
  type AdminPermissionRoleOption,
} from "@/lib/admin-auth";

type PermissionMode = "staff" | "role";

type StaffOption = { id: number; name: string; role_label?: string; role?: string };

function matchesQuery(haystack: string, query: string) {
  return haystack.toLowerCase().includes(query.toLowerCase());
}

export default function AdminPermissionsPage() {
  const { adminUser } = useAdminAuth();
  const isAdmin = isAdminStaffRole(adminUser?.role);
  const ownRoleId = String(adminUser?.role || "").trim().toLowerCase();
  const ownStaffId = adminUser?.id ?? null;

  const [mode, setMode] = useState<PermissionMode>("role");
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<AdminPermissionRoleOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [moduleRows, setModuleRows] = useState<AdminPermissionModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const editableRoles = useMemo(
    () => roleOptions.filter((role) => role.id.toLowerCase() !== ownRoleId),
    [roleOptions, ownRoleId],
  );

  const editableStaff = useMemo(
    () => staffOptions.filter((s) => ownStaffId == null || s.id !== ownStaffId),
    [staffOptions, ownStaffId],
  );

  const isEditingOwnRole =
    mode === "role" && Boolean(selectedRoleId) && selectedRoleId?.toLowerCase() === ownRoleId;
  const isEditingSelf = mode === "staff" && selectedStaffId != null && selectedStaffId === ownStaffId;
  const canEditSelected = isAdmin && !isEditingOwnRole && !isEditingSelf;

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
      setRoleOptions(data.roles || []);
      setStaffOptions(data.staff || []);
      setSelectedRoleId(roleId);
      setModuleRows(data.module_rows || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load role permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await getAdminStaffPermissions();
        setStaffOptions(data.staff || []);
        setRoleOptions(data.roles || []);
        const roles = (data.roles || []).filter(
          (role) => role.id.toLowerCase() !== String(adminUser?.role || "").trim().toLowerCase(),
        );
        const staff = (data.staff || []).filter((s) => adminUser?.id == null || s.id !== adminUser.id);
        if (roles.length) {
          const firstRole = roles[0].id;
          setSelectedRoleId(firstRole);
          setMode("role");
          const roleData = await getAdminRolePermissions(firstRole);
          setModuleRows(roleData.module_rows || []);
        } else if (staff.length) {
          setMode("staff");
          const firstId = staff[0].id;
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
  }, [adminUser?.id, adminUser?.role]);

  const handleStaffChange = async (staffId: number) => {
    if (ownStaffId != null && staffId === ownStaffId) {
      toast.error("You cannot change your own permissions.");
      return;
    }
    setSelectedStaffId(staffId);
    await loadStaff(staffId);
  };

  const handleRoleChange = async (roleId: string) => {
    if (roleId.toLowerCase() === ownRoleId) {
      toast.error("You cannot change permissions for your own role.");
      return;
    }
    setSelectedRoleId(roleId);
    await loadRole(roleId);
  };

  const handleModeChange = async (next: PermissionMode) => {
    setMode(next);
    if (next === "role" && editableRoles.length) {
      const roleId =
        selectedRoleId && selectedRoleId.toLowerCase() !== ownRoleId
          ? selectedRoleId
          : editableRoles[0].id;
      await loadRole(roleId);
    } else if (next === "staff" && editableStaff.length) {
      const staffId =
        selectedStaffId != null && selectedStaffId !== ownStaffId
          ? selectedStaffId
          : editableStaff[0].id;
      await loadStaff(staffId);
    }
  };

  const handleToggle = async (moduleKey: string, allowed: boolean) => {
    if (!canEditSelected) return;
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

  const query = search.trim();

  const filteredRoles = useMemo(() => {
    if (!query) return editableRoles;
    return editableRoles.filter(
      (role) => matchesQuery(role.label, query) || matchesQuery(role.id, query),
    );
  }, [editableRoles, query]);

  const filteredStaff = useMemo(() => {
    if (!query) return editableStaff;
    return editableStaff.filter(
      (s) =>
        matchesQuery(s.name, query) ||
        matchesQuery(s.role_label || "", query) ||
        matchesQuery(String(s.id), query),
    );
  }, [editableStaff, query]);

  const filteredModules = useMemo(() => {
    if (!query) return moduleRows;
    const moduleHits = moduleRows.filter(
      (row) => matchesQuery(row.module, query) || matchesQuery(row.module_key, query),
    );
    // If the query is clearly targeting a role/staff name, still show all modules for that person.
    const targetingPersonOrRole =
      filteredStaff.length > 0 ||
      filteredRoles.length > 0;
    const targetingModule = moduleHits.length > 0;
    if (targetingPersonOrRole && !targetingModule) return moduleRows;
    return moduleHits;
  }, [moduleRows, query, filteredStaff.length, filteredRoles.length]);

  // When search matches staff/roles, jump to the best match so navbar search can select them.
  useEffect(() => {
    if (query.length < 2 || loading) return;

    const q = query.toLowerCase();
    const moduleHit = moduleRows.some(
      (row) => matchesQuery(row.module, query) || matchesQuery(row.module_key, query),
    );
    // Prefer module filtering when the query matches a module name.
    if (moduleHit) return;

    const staffExact = editableStaff.find(
      (s) => s.name.toLowerCase() === q || `${s.name} (${s.role_label || ""})`.toLowerCase() === q,
    );
    const staffStarts = editableStaff.find((s) => s.name.toLowerCase().startsWith(q));
    const staffHit =
      staffExact ||
      staffStarts ||
      (query.length >= 3
        ? editableStaff.find(
            (s) =>
              matchesQuery(s.name, query) ||
              matchesQuery(`${s.name} ${s.role_label || ""}`, query),
          )
        : undefined);

    const roleExact = editableRoles.find((r) => r.label.toLowerCase() === q || r.id.toLowerCase() === q);
    const roleStarts = editableRoles.find(
      (r) => r.label.toLowerCase().startsWith(q) || r.id.toLowerCase().startsWith(q),
    );
    const roleHit =
      roleExact ||
      roleStarts ||
      (query.length >= 3
        ? editableRoles.find((r) => matchesQuery(r.label, query) || matchesQuery(r.id, query))
        : undefined);

    if (staffHit && (!roleHit || Boolean(staffExact || staffStarts))) {
      if (mode !== "staff" || selectedStaffId !== staffHit.id) {
        setMode("staff");
        setSelectedStaffId(staffHit.id);
        void loadStaff(staffHit.id);
      }
      return;
    }

    if (roleHit && (mode !== "role" || selectedRoleId !== roleHit.id)) {
      setMode("role");
      setSelectedRoleId(roleHit.id);
      void loadRole(roleHit.id);
    }
  }, [
    query,
    loading,
    editableStaff,
    editableRoles,
    moduleRows,
    mode,
    selectedStaffId,
    selectedRoleId,
    loadStaff,
    loadRole,
  ]);

  useSetAdminPageChrome({
    title: "Permissions",
    subtitle: "Set module access by role or per staff member.",
    icon: KeyRound,
    search: {
      value: search,
      onChange: setSearch,
      placeholder: "Search modules, roles, or staff…",
    },
    meta: loading
      ? "Loading…"
      : `${filteredModules.length} module${filteredModules.length === 1 ? "" : "s"}`,
    syncKey: `${loading}|${mode}|${search}|${selectedRoleId ?? ""}|${selectedStaffId ?? ""}|${moduleRows.length}|${filteredModules.length}|${canEditSelected}`,
    actions: (
      <button
        type="button"
        onClick={refresh}
        className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    ),
  });

  const roleSelectOptions = useMemo(() => {
    const base = query ? filteredRoles : editableRoles;
    if (!selectedRoleId) return base;
    if (base.some((r) => r.id === selectedRoleId)) return base;
    const current = editableRoles.find((r) => r.id === selectedRoleId);
    return current ? [current, ...base] : base;
  }, [query, filteredRoles, editableRoles, selectedRoleId]);

  const staffSelectOptions = useMemo(() => {
    const base = query ? filteredStaff : editableStaff;
    if (selectedStaffId == null) return base;
    if (base.some((s) => s.id === selectedStaffId)) return base;
    const current = editableStaff.find((s) => s.id === selectedStaffId);
    return current ? [current, ...base] : base;
  }, [query, filteredStaff, editableStaff, selectedStaffId]);

  return (
    <div className="space-y-6 font-body">
      <div className="rounded-xl border border-[#D9E1EA] bg-white px-5 pt-5 pb-6 space-y-5">
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
          <div className="space-y-1.5">
            <label htmlFor="permissions-role" className="block text-xs font-medium text-[#627D98]">
              Role
            </label>
            <select
              id="permissions-role"
              value={selectedRoleId ?? ""}
              onChange={(e) => void handleRoleChange(e.target.value)}
              className="block w-full max-w-md rounded-lg border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#009877]/20 focus:border-[#009877]"
            >
              {roleSelectOptions.length === 0 ? (
                <option value="">No matching roles</option>
              ) : (
                roleSelectOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-[#829AB1]">Your own role is excluded — you cannot change it here.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="permissions-staff" className="block text-xs font-medium text-[#627D98]">
              Staff member
            </label>
            <select
              id="permissions-staff"
              value={selectedStaffId ?? ""}
              onChange={(e) => void handleStaffChange(Number(e.target.value))}
              className="block w-full max-w-md rounded-lg border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#009877]/20 focus:border-[#009877]"
            >
              {staffSelectOptions.length === 0 ? (
                <option value="">No matching staff</option>
              ) : (
                staffSelectOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.role_label ? `(${s.role_label})` : ""}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-[#829AB1]">You cannot change your own staff permissions.</p>
          </div>
        )}
      </div>

      <section className="rounded-xl border border-[#D9E1EA] bg-white overflow-hidden">
        <div className="border-b border-[#E5EAF0] px-4 py-3 flex items-center justify-between gap-2 text-sm font-semibold text-[#102A43]">
          <span className="inline-flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#009877]" />
            Module access
          </span>
          {query ? (
            <span className="text-xs font-medium text-[#627D98]">
              Filtered by “{query}”
            </span>
          ) : null}
        </div>
        {loading ? (
          <p className="px-4 py-8 text-sm text-[#627D98]">Loading…</p>
        ) : filteredModules.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[#627D98]">No modules match your search.</p>
        ) : (
          <ul className="divide-y divide-[#E5EAF0]">
            {filteredModules.map((row) => (
              <li key={row.module_key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-[#102A43]">{row.module}</p>
                  {mode === "staff" && row.role_default != null ? (
                    <p className="text-xs text-[#627D98]">
                      Role default: {row.role_default ? "Allowed" : "Denied"}
                    </p>
                  ) : null}
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.allowed}
                    disabled={!canEditSelected || togglingKey === row.module_key}
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
        ) : isEditingOwnRole || isEditingSelf ? (
          <p className="px-4 py-3 text-xs text-amber-700 bg-amber-50 border-t border-amber-100">
            You cannot allow or deny modules for your own role or account.
          </p>
        ) : null}
      </section>
    </div>
  );
}

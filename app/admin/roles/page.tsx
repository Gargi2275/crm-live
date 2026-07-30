"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound, Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  createAdminRole,
  deleteAdminRole,
  getAdminRolePermissions,
  getAdminRolesOverview,
  getAdminStaffPermissions,
  isAdminStaffRole,
  updateAdminRole,
  updateAdminRolePermissions,
  updateAdminStaffPermissions,
  type AdminPermissionModuleRow,
  type AdminPermissionRoleOption,
  type AdminRoleOverview,
} from "@/lib/admin-auth";

type AccessTab = "roles" | "permissions";
type PermissionMode = "staff" | "role";
type StaffOption = { id: number; name: string; role_label?: string; role?: string };

function matchesQuery(haystack: string, query: string) {
  return haystack.toLowerCase().includes(query.toLowerCase());
}

function AdminRolesPermissionsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { adminUser } = useAdminAuth();
  const isAdmin = isAdminStaffRole(adminUser?.role);
  const ownRoleId = String(adminUser?.role || "").trim().toLowerCase();
  const ownStaffId = adminUser?.id ?? null;

  const initialTab: AccessTab =
    searchParams.get("tab") === "permissions" ? "permissions" : "roles";
  const [tab, setTab] = useState<AccessTab>(initialTab);

  // —— Roles ——
  const [roles, setRoles] = useState<AdminRoleOverview[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  // —— Permissions ——
  const [mode, setMode] = useState<PermissionMode>("role");
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<AdminPermissionRoleOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [moduleRows, setModuleRows] = useState<AdminPermissionModuleRow[]>([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsBootstrapped, setPermsBootstrapped] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isOwnRole = (role: AdminRoleOverview) => role.id.toLowerCase() === ownRoleId;

  const selectTab = (next: AccessTab) => {
    setTab(next);
    const qs = next === "permissions" ? "?tab=permissions" : "";
    router.replace(`/admin/roles${qs}`, { scroll: false });
  };

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      setRoles(await getAdminRolesOverview());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load roles.");
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "roles") return;
    void loadRoles();
  }, [loadRoles, tab]);

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
    setPermsLoading(true);
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
      setPermsLoading(false);
    }
  }, []);

  const loadRole = useCallback(async (roleId: string) => {
    setPermsLoading(true);
    try {
      const data = await getAdminRolePermissions(roleId);
      setRoleOptions(data.roles || []);
      setStaffOptions(data.staff || []);
      setSelectedRoleId(roleId);
      setModuleRows(data.module_rows || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load role permissions.");
    } finally {
      setPermsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "permissions" || permsBootstrapped) return;
    void (async () => {
      setPermsLoading(true);
      try {
        const data = await getAdminStaffPermissions();
        setStaffOptions(data.staff || []);
        setRoleOptions(data.roles || []);
        const rolesList = (data.roles || []).filter(
          (role) => role.id.toLowerCase() !== String(adminUser?.role || "").trim().toLowerCase(),
        );
        const staff = (data.staff || []).filter((s) => adminUser?.id == null || s.id !== adminUser.id);
        if (rolesList.length) {
          const firstRole = rolesList[0].id;
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
        setPermsBootstrapped(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load permissions.");
      } finally {
        setPermsLoading(false);
      }
    })();
  }, [tab, permsBootstrapped, adminUser?.id, adminUser?.role]);

  const openCreate = () => {
    setNewLabel("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      toast.error("Enter a role name.");
      return;
    }
    try {
      const created = await createAdminRole({ label: newLabel.trim() });
      setRoles((prev) => [...prev, created]);
      setNewLabel("");
      setCreateOpen(false);
      toast.success("Role created. Set module access in the Permissions tab.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create role.");
    }
  };

  const openEdit = (role: AdminRoleOverview) => {
    if (isOwnRole(role)) {
      toast.error("You cannot edit your own role.");
      return;
    }
    setEditId(role.id);
    setLabel(role.label);
    setDescription(role.description || "");
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (editId.toLowerCase() === ownRoleId) {
      toast.error("You cannot edit your own role.");
      return;
    }
    try {
      const updated = await updateAdminRole(editId, {
        label: label.trim(),
        description: description.trim(),
      });
      setRoles((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setEditId(null);
      toast.success("Role updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save role.");
    }
  };

  const handleDelete = async (role: AdminRoleOverview) => {
    if (role.is_system || isOwnRole(role)) return;
    if (!confirm(`Delete role "${role.label}"?`)) return;
    try {
      await deleteAdminRole(role.id);
      setRoles((prev) => prev.filter((row) => row.id !== role.id));
      toast.success("Role deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete role.");
    }
  };

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

  const refreshPermissions = () => {
    if (mode === "role" && selectedRoleId) void loadRole(selectedRoleId);
    else if (selectedStaffId) void loadStaff(selectedStaffId);
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
    const targetingPersonOrRole = filteredStaff.length > 0 || filteredRoles.length > 0;
    const targetingModule = moduleHits.length > 0;
    if (targetingPersonOrRole && !targetingModule) return moduleRows;
    return moduleHits;
  }, [moduleRows, query, filteredStaff.length, filteredRoles.length]);

  useEffect(() => {
    if (tab !== "permissions" || query.length < 2 || permsLoading) return;

    const q = query.toLowerCase();
    const moduleHit = moduleRows.some(
      (row) => matchesQuery(row.module, query) || matchesQuery(row.module_key, query),
    );
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
    tab,
    query,
    permsLoading,
    editableStaff,
    editableRoles,
    moduleRows,
    mode,
    selectedStaffId,
    selectedRoleId,
    loadStaff,
    loadRole,
  ]);

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

  useSetAdminPageChrome({
    title: "Roles & Permissions",
    subtitle:
      tab === "roles"
        ? "Manage custom roles for Staff Management."
        : "Set module access by role or per staff member.",
    icon: tab === "roles" ? ShieldCheck : KeyRound,
    search:
      tab === "permissions"
        ? {
            value: search,
            onChange: setSearch,
            placeholder: "Search modules, roles, or staff…",
          }
        : undefined,
    meta:
      tab === "roles"
        ? rolesLoading
          ? "Loading…"
          : `${roles.length} role${roles.length === 1 ? "" : "s"}`
        : permsLoading
          ? "Loading…"
          : `${filteredModules.length} module${filteredModules.length === 1 ? "" : "s"}`,
    syncKey: `${tab}|${rolesLoading}|${roles.length}|${createOpen}|${editId ?? ""}|${permsLoading}|${mode}|${search}|${selectedRoleId ?? ""}|${selectedStaffId ?? ""}|${moduleRows.length}|${filteredModules.length}|${canEditSelected}`,
    actions: (
      <>
        <button
          type="button"
          onClick={() => {
            if (tab === "roles") void loadRoles();
            else refreshPermissions();
          }}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
        >
          <RefreshCw
            className={`h-4 w-4 ${(tab === "roles" ? rolesLoading : permsLoading) ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
        {tab === "roles" ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-[#007B61]"
          >
            <Plus className="h-4 w-4" />
            Add role
          </button>
        ) : null}
      </>
    ),
  });

  return (
    <div className="space-y-3 font-body">
      <div className="inline-flex rounded-[10px] border border-[#D9E1EA] bg-white p-1">
        <button
          type="button"
          onClick={() => selectTab("roles")}
          className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "roles" ? "bg-[#1A56DB] text-white shadow-sm" : "text-[#486581] hover:bg-[#F5F7FA]"
          }`}
        >
          Roles
        </button>
        <button
          type="button"
          onClick={() => selectTab("permissions")}
          className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "permissions" ? "bg-[#1A56DB] text-white shadow-sm" : "text-[#486581] hover:bg-[#F5F7FA]"
          }`}
        >
          Permissions
        </button>
      </div>

      {tab === "roles" ? (
        <div className="rounded-xl border border-[#D9E1EA] bg-white overflow-hidden">
          <ul className="divide-y divide-[#E5EAF0]">
            {rolesLoading && roles.length === 0 ? (
              <li className="px-4 py-8 text-sm text-[#627D98]">Loading…</li>
            ) : roles.length === 0 ? (
              <li className="px-4 py-8 text-sm text-[#627D98]">No roles yet.</li>
            ) : (
              roles.map((role) => {
                const locked = isOwnRole(role);
                return (
                  <li key={role.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium text-[#102A43]">
                        {role.label}
                        {role.is_system ? <span className="ml-2 text-xs text-[#627D98]">(system)</span> : null}
                        {locked ? <span className="ml-2 text-xs text-[#627D98]">(your role)</span> : null}
                      </p>
                      <p className="text-xs text-[#627D98]">{role.description || role.id}</p>
                      <p className="text-xs text-[#627D98] mt-0.5">{role.active_staff_count ?? 0} active staff</p>
                    </div>
                    <div className="flex gap-1">
                      {!locked ? (
                        <button type="button" onClick={() => openEdit(role)} className="rounded border p-2 hover:bg-[#F8FAFC]">
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                      {!role.is_system && !locked ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(role)}
                          className="rounded border border-rose-200 p-2 text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
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
              {query ? <span className="text-xs font-medium text-[#627D98]">Filtered by “{query}”</span> : null}
            </div>
            {permsLoading ? (
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
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <h2 className="text-lg font-semibold">Add role</h2>
            <label className="mt-3 block text-xs text-[#627D98]">Role name</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              placeholder="e.g. Document reviewer"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border px-3 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                className="rounded-lg bg-[#009877] px-3 py-2 text-sm text-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <h2 className="text-lg font-semibold">Edit role</h2>
            <label className="mt-3 block text-xs text-[#627D98]">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs text-[#627D98]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditId(null)} className="rounded-lg border px-3 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                className="rounded-lg bg-[#009877] px-3 py-2 text-sm text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminRolesPermissionsPage() {
  return (
    <Suspense
      fallback={
        <section className="bg-bg-page">
          <PageLoader title="Loading…" subtitle="Roles & permissions." fill={false} />
        </section>
      }
    >
      <AdminRolesPermissionsInner />
    </Suspense>
  );
}

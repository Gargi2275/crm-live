"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  createAdminRole,
  deleteAdminRole,
  getAdminRolesOverview,
  updateAdminRole,
  type AdminRoleOverview,
} from "@/lib/admin-auth";

export default function AdminRolesPage() {
  const { adminUser } = useAdminAuth();
  const ownRoleId = String(adminUser?.role || "").trim().toLowerCase();
  const [roles, setRoles] = useState<AdminRoleOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const isOwnRole = (role: AdminRoleOverview) => role.id.toLowerCase() === ownRoleId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRoles(await getAdminRolesOverview());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setNewLabel("");
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setNewLabel("");
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
      toast.success("Role created. Set permissions in Permissions module.");
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

  useSetAdminPageChrome({
    title: "Roles",
    subtitle: "Custom roles appear in Staff Management and Permissions.",
    icon: ShieldCheck,
    syncKey: `${loading}|${roles.length}|${createOpen}|${editId ?? ""}`,
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
          Add role
        </button>
      </>
    ),
  });

  return (
    <div className="space-y-6 font-body">
      <div className="rounded-xl border border-[#D9E1EA] bg-white overflow-hidden">
        <ul className="divide-y divide-[#E5EAF0]">
          {loading && roles.length === 0 ? (
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
                      <button type="button" onClick={() => void handleDelete(role)} className="rounded border border-rose-200 p-2 text-rose-600">
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
              <button type="button" onClick={closeCreate} className="rounded-lg border px-3 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void handleCreate()} className="rounded-lg bg-[#009877] px-3 py-2 text-sm text-white">
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
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            <label className="mt-3 block text-xs text-[#627D98]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditId(null)} className="rounded-lg border px-3 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void saveEdit()} className="rounded-lg bg-[#009877] px-3 py-2 text-sm text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

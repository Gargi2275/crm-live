"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  createAdminRole,
  deleteAdminRole,
  getAdminRolesOverview,
  updateAdminRole,
  type AdminRoleOverview,
} from "@/lib/admin-auth";

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRoleOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [newLabel, setNewLabel] = useState("");

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

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      toast.error("Enter a role name.");
      return;
    }
    try {
      const created = await createAdminRole({ label: newLabel.trim() });
      setRoles((prev) => [...prev, created]);
      setNewLabel("");
      toast.success("Role created. Set permissions in Permissions module.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create role.");
    }
  };

  const openEdit = (role: AdminRoleOverview) => {
    setEditId(role.id);
    setLabel(role.label);
    setDescription(role.description || "");
  };

  const saveEdit = async () => {
    if (!editId) return;
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
    if (role.is_system) return;
    if (!confirm(`Delete role "${role.label}"?`)) return;
    try {
      await deleteAdminRole(role.id);
      setRoles((prev) => prev.filter((row) => row.id !== role.id));
      toast.success("Role deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete role.");
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-[#102A43]">Roles</h1>
          <p className="mt-1 text-sm text-[#627D98]">Custom roles appear in Staff Management and Permissions.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New role name"
          className="rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm flex-1 max-w-xs"
        />
        <button type="button" onClick={() => void handleCreate()} className="inline-flex items-center gap-1 rounded-lg bg-[#009877] px-3 py-2 text-sm text-white">
          <Plus className="h-4 w-4" />
          Add role
        </button>
      </div>

      <div className="rounded-xl border border-[#D9E1EA] bg-white overflow-hidden">
        <ul className="divide-y divide-[#E5EAF0]">
          {roles.map((role) => (
            <li key={role.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium text-[#102A43]">
                  {role.label}
                  {role.is_system ? <span className="ml-2 text-xs text-[#627D98]">(system)</span> : null}
                </p>
                <p className="text-xs text-[#627D98]">{role.description || role.id}</p>
                <p className="text-xs text-[#627D98] mt-0.5">{role.active_staff_count ?? 0} active staff</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => openEdit(role)} className="rounded border p-2 hover:bg-[#F8FAFC]">
                  <Pencil className="h-4 w-4" />
                </button>
                {!role.is_system ? (
                  <button type="button" onClick={() => void handleDelete(role)} className="rounded border border-rose-200 p-2 text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <h2 className="text-lg font-semibold">Edit role</h2>
            <label className="mt-3 block text-xs text-[#627D98]">Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            <label className="mt-3 block text-xs text-[#627D98]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditId(null)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={() => void saveEdit()} className="rounded-lg bg-[#009877] px-3 py-2 text-sm text-white">Save</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

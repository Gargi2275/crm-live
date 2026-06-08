"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Bell, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  createAdminNotificationModule,
  deleteAdminNotificationModule,
  getAdminNotificationModules,
  getAdminNotificationPreferences,
  updateAdminNotificationModule,
  updateAdminNotificationPreferences,
  type AdminNotificationModuleItem,
  type AdminNotificationModulePref,
} from "@/lib/admin-auth";

export default function AdminNotificationsPage() {
  const { adminUser } = useAdminAuth();
  const isAdmin = adminUser?.role === "admin";

  const [prefs, setPrefs] = useState<AdminNotificationModulePref[]>([]);
  const [catalog, setCatalog] = useState<AdminNotificationModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const prefData = await getAdminNotificationPreferences();
      setPrefs(prefData.modules || []);
      if (isAdmin) {
        setCatalog(await getAdminNotificationModules());
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePrefToggle = async (key: string, enabled: boolean) => {
    setTogglingKey(key);
    try {
      const updated = await updateAdminNotificationPreferences({ [key]: enabled });
      setPrefs(updated.modules || []);
      toast.success(enabled ? "Notifications enabled for this category." : "Notifications disabled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save preference.");
    } finally {
      setTogglingKey(null);
    }
  };

  const handleDefaultToggle = async (mod: AdminNotificationModuleItem, enabled: boolean) => {
    setTogglingKey(`default:${mod.key}`);
    try {
      const updated = await updateAdminNotificationModule(mod.key, { admin_default_enabled: enabled });
      setCatalog((prev) => prev.map((row) => (row.key === updated.key ? { ...row, ...updated } : row)));
      toast.success("Default updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update default.");
    } finally {
      setTogglingKey(null);
    }
  };

  const openEdit = (mod: AdminNotificationModuleItem) => {
    setEditKey(mod.key);
    setEditLabel(mod.label);
    setEditDescription(mod.description || "");
  };

  const saveEdit = async () => {
    if (!editKey) return;
    try {
      const updated = await updateAdminNotificationModule(editKey, {
        label: editLabel.trim(),
        description: editDescription.trim(),
      });
      setCatalog((prev) => prev.map((row) => (row.key === updated.key ? { ...row, ...updated } : row)));
      setEditKey(null);
      toast.success("Category updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save category.");
    }
  };

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      toast.error("Enter a category name.");
      return;
    }
    try {
      const created = await createAdminNotificationModule({ label: newLabel.trim() });
      setCatalog((prev) => [...prev, created]);
      setNewLabel("");
      toast.success("Category created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create category.");
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm("Remove this notification category?")) return;
    try {
      await deleteAdminNotificationModule(key);
      setCatalog((prev) => prev.filter((row) => row.key !== key));
      toast.success("Category removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete category.");
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-[#102A43]">Notifications</h1>
          <p className="mt-1 text-sm text-[#627D98]">
            Toggle categories to control in-app alerts and email. Changes apply immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm font-medium text-[#486581] hover:bg-[#F8FAFC]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <section className="rounded-xl border border-[#D9E1EA] bg-white overflow-hidden">
        <div className="border-b border-[#E5EAF0] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#102A43]">
            <Bell className="h-4 w-4 text-[#009877]" />
            Your notification preferences
          </div>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-sm text-[#627D98]">Loading…</p>
        ) : (
          <ul className="divide-y divide-[#E5EAF0]">
            {prefs.map((mod) => (
              <li key={mod.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-[#102A43]">{mod.label}</p>
                  {mod.description ? <p className="text-xs text-[#627D98] mt-0.5">{mod.description}</p> : null}
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-[#486581]">
                  <input
                    type="checkbox"
                    checked={mod.enabled}
                    disabled={togglingKey === mod.key}
                    onChange={(e) => void handlePrefToggle(mod.key, e.target.checked)}
                    className="h-4 w-4 rounded border-[#C9D6E2] text-[#009877] focus:ring-[#009877]"
                  />
                  {mod.enabled ? "On" : "Off"}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin ? (
        <section className="rounded-xl border border-[#D9E1EA] bg-white overflow-hidden">
          <div className="border-b border-[#E5EAF0] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#102A43]">Notification categories (admin)</p>
            <div className="flex gap-2">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="New category name"
                className="rounded-lg border border-[#D9E1EA] px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => void handleCreate()}
                className="inline-flex items-center gap-1 rounded-lg bg-[#009877] px-3 py-1.5 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>
          <ul className="divide-y divide-[#E5EAF0]">
            {catalog.map((mod) => (
              <li key={mod.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#102A43]">{mod.label}</p>
                  <p className="text-xs text-[#627D98] mt-0.5">{mod.description || "—"}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#486581]">
                  <input
                    type="checkbox"
                    checked={Boolean(mod.admin_default_enabled)}
                    disabled={togglingKey === `default:${mod.key}`}
                    onChange={(e) => void handleDefaultToggle(mod, e.target.checked)}
                    className="h-4 w-4 rounded border-[#C9D6E2] text-[#009877]"
                  />
                  Default on
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(mod)}
                    className="rounded-lg border border-[#D9E1EA] p-2 text-[#486581] hover:bg-[#F8FAFC]"
                    title="Edit label"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {!mod.is_system ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(mod.key)}
                      className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {editKey ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-[#102A43]">Edit category</h2>
            <label className="mt-4 block text-xs font-medium text-[#627D98]">Label</label>
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs font-medium text-[#627D98]">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditKey(null)} className="rounded-lg border px-3 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                className="rounded-lg bg-[#009877] px-3 py-2 text-sm font-medium text-white"
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

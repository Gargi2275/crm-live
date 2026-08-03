"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Layers, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useAdminModuleAccess } from "@/hooks/useAdminModuleAccess";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { clearPublicPricingCache } from "@/lib/public-pricing";
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  reorderAdminCategories,
  updateAdminCategory,
  type AdminCategory,
} from "@/lib/admin-auth";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

const inputClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#009877]/20 focus:border-[#009877]";

const iconBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border transition-colors disabled:opacity-50";

function SortableCategoryRow({
  row,
  saving,
  canDrag,
  onEdit,
  onDelete,
}: {
  row: AdminCategory;
  saving: boolean;
  canDrag: boolean;
  onEdit: (row: AdminCategory) => void;
  onDelete: (row: AdminCategory) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: !canDrag || saving,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-[#F8FCFF] ${
        isDragging ? "bg-[#EFF7FF] shadow-sm relative z-10" : ""
      } ${canDrag && !saving ? "cursor-grab active:cursor-grabbing" : ""}`}
      title={canDrag ? "Drag row to reorder" : "Clear search/filters to reorder"}
      {...attributes}
      {...listeners}
    >
      <td className="px-2 py-2 w-10">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#829AB1] ${
            canDrag && !saving ? "" : "opacity-40"
          }`}
          aria-hidden="true"
        >
          <GripVertical className="h-4 w-4" />
        </span>
      </td>
      <td className="px-3 py-2 text-sm font-semibold text-[#102A43]">{row.name}</td>
      <td className="px-3 py-2 text-xs text-[#627D98]">{row.slug}</td>
      <td className="px-3 py-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            row.is_active ? "bg-[#009877]/12 text-[#006F57]" : "bg-[#F5F7FA] text-[#627D98]"
          }`}
        >
          {row.is_active ? "Active" : "Off"}
        </span>
      </td>
      <td className="px-3 py-2">
        <div
          className="flex items-center justify-end gap-1.5"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={saving}
            onClick={() => onEdit(row)}
            className={`${iconBtnClass} border-[#D9E1EA] text-[#0B69B7] hover:bg-[#EFF7FF]`}
            title="Edit"
            aria-label={`Edit ${row.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onDelete(row)}
            className={`${iconBtnClass} border-[#F2C7C3] text-[#B42318] hover:bg-[#FFF1F0]`}
            title="Delete"
            aria-label={`Delete ${row.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminCategoriesPanel() {
  const { canAccess, accessReady } = useAdminModuleAccess("/admin/categories");
  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formActive, setFormActive] = useState(true);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      setRows(await listAdminCategories());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  useEffect(() => {
    if (!accessReady || !canAccess) return;
    void load();
  }, [accessReady, canAccess, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (activeFilter === "true" && !row.is_active) return false;
      if (activeFilter === "false" && row.is_active) return false;
      if (!q) return true;
      return row.name.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q);
    });
  }, [rows, search, activeFilter]);

  const canDrag = search.trim() === "" && activeFilter === "all";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setActiveFilter("all");
  }, []);

  const openCreateModal = useCallback(() => {
    setEditing(null);
    setFormName("");
    setFormSlug("");
    setFormActive(true);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((row: AdminCategory) => {
    setEditing(row);
    setFormName(row.name);
    setFormSlug(row.slug);
    setFormActive(Boolean(row.is_active));
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setFormName("");
    setFormSlug("");
    setFormActive(true);
  }, [saving]);

  const handleSave = useCallback(async () => {
    if (!formName.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateAdminCategory(editing.id, {
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          is_active: formActive,
        });
        if (updated) {
          setRows((prev) =>
            prev
              .map((r) => (r.id === editing.id ? { ...r, ...updated } : r))
              .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)),
          );
        }
        toast.success("Category updated.");
      } else {
        const created = await createAdminCategory({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          is_active: formActive,
        });
        if (created) {
          setRows((prev) =>
            [...prev, created].sort(
              (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name),
            ),
          );
        }
        toast.success("Category created.");
      }
      setModalOpen(false);
      setEditing(null);
      setFormName("");
      setFormSlug("");
      setFormActive(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }, [editing, formName, formSlug, formActive]);

  const requestDelete = useCallback((row: AdminCategory) => {
    setDeleteTarget(row);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteAdminCategory(deleteTarget.id);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }, [deleteTarget]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!canDrag || saving) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = rows.findIndex((row) => row.id === active.id);
      const newIndex = rows.findIndex((row) => row.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const previous = rows;
      const next = arrayMove(rows, oldIndex, newIndex).map((row, index) => ({
        ...row,
        display_order: (index + 1) * 10,
      }));
      setRows(next);
      setSaving(true);
      try {
        const refreshed = await reorderAdminCategories(next.map((row) => row.id));
        if (refreshed.length) setRows(refreshed);
        clearPublicPricingCache();
        toast.success("Order updated.");
      } catch (error) {
        setRows(previous);
        toast.error(error instanceof Error ? error.message : "Failed to reorder.");
      } finally {
        setSaving(false);
      }
    },
    [canDrag, rows, saving],
  );

  const activeFilterCount = (search.trim() ? 1 : 0) + (activeFilter !== "all" ? 1 : 0);

  useSetAdminPageChrome(
    canAccess
      ? {
          title: "Categories",
          subtitle: "Public pricing tabs",
          icon: Layers,
          search: {
            value: search,
            onChange: setSearch,
            placeholder: "Search name or slug…",
          },
          activeFilterCount,
          onClearFilters: clearFilters,
          meta: `${filtered.length} categor${filtered.length === 1 ? "y" : "ies"}`,
          syncKey: `${search}|${activeFilter}|${loading}|${rows.length}|${filtered.length}|${modalOpen}|${saving}|${canAccess ? 1 : 0}`,
          actions: (
            <>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add category
              </button>
            </>
          ),
          filtersContent: (
            <label className="block text-sm">
              <span className="text-xs font-semibold text-[#486581]">Active status</span>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as "all" | "true" | "false")}
                className={filterFieldClass}
              >
                <option value="all">Active + inactive</option>
                <option value="true">Active only</option>
                <option value="false">Inactive only</option>
              </select>
            </label>
          ),
        }
      : null,
  );

  if (!accessReady) {
    return (
      <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <p className="text-sm text-[#627D98]">Checking access…</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <h1 className="text-xl font-heading font-semibold text-[#102A43]">Categories</h1>
        <p className="mt-2 text-sm text-[#627D98]">
          Access restricted. Ask an admin to grant the Services or Categories module for your role.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 font-body">
      {!canDrag ? (
        <p className="text-xs text-[#627D98]">
          Clear search/filters to drag and reorder categories.
        </p>
      ) : (
        <p className="text-xs text-[#627D98]">Drag any row to rearrange category order on the public site.</p>
      )}

      <div className="overflow-hidden rounded-[10px] border border-[#D9E1EA] bg-white">
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[#F5F7FA] text-[#486581]">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold w-10" aria-label="Reorder" />
                  <th className="px-3 py-2 text-left text-xs font-semibold">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Slug</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Active</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <SortableContext items={filtered.map((row) => row.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#627D98]">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#627D98]">
                        No categories match these filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <SortableCategoryRow
                        key={row.id}
                        row={row}
                        saving={saving}
                        canDrag={canDrag}
                        onEdit={openEditModal}
                        onDelete={requestDelete}
                      />
                    ))
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            className="w-full rounded-t-[16px] border border-[#D9E1EA] bg-white shadow-[0_24px_48px_rgba(15,42,67,0.18)] sm:max-w-md sm:rounded-[14px]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#E5EAF0] px-4 py-3">
              <h2 id="category-modal-title" className="text-base font-heading font-semibold text-[#102A43]">
                {editing ? "Edit category" : "Add category"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-full p-1.5 text-[#829AB1] hover:bg-[#F5F7FA] hover:text-[#486581] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <label className="block text-sm">
                <span className="text-xs font-semibold text-[#486581]">Name</span>
                <input
                  autoFocus
                  value={formName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormName(value);
                    if (!editing) setFormSlug(value.trim().toLowerCase().replace(/\s+/g, "-"));
                  }}
                  placeholder="e.g. Passport"
                  className={inputClass}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSave();
                  }}
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold text-[#486581]">Slug</span>
                <input
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="auto from name"
                  className={inputClass}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSave();
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[#D9E1EA]"
                />
                <span className="text-xs font-semibold text-[#486581]">Active</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#E5EAF0] px-4 py-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-[8px] bg-[#009877] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
              >
                {saving ? "Saving…" : editing ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete category?"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? Categories that still have services cannot be deleted.`
            : ""
        }
        confirmLabel="Delete category"
        loading={saving && Boolean(deleteTarget)}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!saving) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { Globe2, GripVertical, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAdminModuleAccess } from "@/hooks/useAdminModuleAccess";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import {
  deleteAdminOriginCountry,
  listAdminOriginCountries,
  reorderAdminOriginCountries,
  type AdminOriginCountry,
} from "@/lib/admin-auth";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

function SortableCountryRow({
  row,
  saving,
  canDrag,
  onDelete,
}: {
  row: AdminOriginCountry;
  saving: boolean;
  canDrag: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: !canDrag || saving,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-[#EEF2F6] last:border-0">
      <td className="px-3 py-3 align-middle">
        <button
          type="button"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-[#829AB1] ${
            canDrag ? "cursor-grab hover:bg-[#F0F4F8] active:cursor-grabbing" : "cursor-not-allowed opacity-40"
          }`}
          aria-label="Drag to reorder"
          disabled={!canDrag || saving}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-3">
          {row.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.image_url} alt="" className="h-10 w-14 rounded object-cover" />
          ) : (
            <div className="flex h-10 w-14 items-center justify-center rounded bg-[#EEF2F6] text-xs font-bold text-[#1c69dd]">
              {row.country_code}
            </div>
          )}
          <div>
            <p className="font-medium text-[#102A43]">{row.name}</p>
            <p className="text-xs text-[#829AB1]">{row.slug || "—"}</p>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-3 align-middle text-sm text-[#486581] md:table-cell">
        {row.visa_options?.length ?? 0} options
      </td>
      <td className="px-3 py-3 align-middle">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {row.is_active ? "Active" : "Hidden"}
        </span>
      </td>
      <td className="px-3 py-3 align-middle text-right">
        <div className="inline-flex items-center gap-1">
          <Link
            href={`/admin/origin-countries/${row.id}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#486581] hover:bg-[#F0F4F8] hover:text-[#009877]"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#486581] hover:bg-rose-50 hover:text-rose-600"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminOriginCountriesPage() {
  const { canAccess, accessReady } = useAdminModuleAccess("/admin/origin-countries");
  const [rows, setRows] = useState<AdminOriginCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminOriginCountry | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAdminOriginCountries());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    void load();
  }, [canAccess, load]);

  useSetAdminPageChrome({
    title: "Origin countries",
    subtitle: "Homepage cards and Visament-style nationality pages",
    icon: Globe2,
    syncKey: `${loading}|${rows.length}`,
    actions: (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || saving}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-sm font-medium text-[#486581] hover:border-[#009877] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <Link
          href="/admin/origin-countries/new"
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#007a5f]"
        >
          <Plus className="h-4 w-4" />
          Add country
        </Link>
      </div>
    ),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (activeFilter === "true" && !row.is_active) return false;
      if (activeFilter === "false" && row.is_active) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.country_code.toLowerCase().includes(q) ||
        (row.slug || "").toLowerCase().includes(q) ||
        row.service_label.toLowerCase().includes(q)
      );
    });
  }, [rows, search, activeFilter]);

  const canDrag = search.trim() === "" && activeFilter === "all";

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteAdminOriginCountry(deleteTarget.id);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete.");
    } finally {
      setSaving(false);
    }
  };

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
        const refreshed = await reorderAdminOriginCountries(next.map((row) => row.id));
        if (Array.isArray(refreshed)) setRows(refreshed);
        toast.success("Order updated.");
      } catch (error) {
        setRows(previous);
        toast.error(error instanceof Error ? error.message : "Reorder failed.");
      } finally {
        setSaving(false);
      }
    },
    [canDrag, saving, rows],
  );

  if (!accessReady) {
    return (
      <div className="rounded-[12px] border border-[#E1E7EF] bg-white p-6 text-sm text-[#486581]">
        Checking access…
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="rounded-[12px] border border-[#E1E7EF] bg-white p-6 text-sm text-[#486581]">
        Access restricted. Ask an admin to grant the Origin countries module for your role.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-[12px] border border-[#E1E7EF] bg-white p-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-[#486581]">
          Search
          <input
            className={filterFieldClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, code, slug…"
          />
        </label>
        <label className="text-xs font-medium text-[#486581]">
          Status
          <select
            className={filterFieldClass}
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as "all" | "true" | "false")}
          >
            <option value="all">All</option>
            <option value="true">Active</option>
            <option value="false">Hidden</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActiveFilter("all");
            }}
            className="w-full rounded-[8px] border border-[#D9E1EA] px-3 py-1.5 text-sm text-[#486581]"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#E1E7EF] bg-white">
        {loading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-[#829AB1]">
            <Globe2 className="h-4 w-4 animate-pulse" />
            Loading countries…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#829AB1]">No countries match.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map((row) => row.id)} strategy={verticalListSortingStrategy}>
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-[#E1E7EF] bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#829AB1]">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold"> </th>
                    <th className="px-3 py-2.5 font-semibold">Country</th>
                    <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Plans</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <SortableCountryRow
                      key={row.id}
                      row={row}
                      saving={saving}
                      canDrag={canDrag}
                      onDelete={() => setDeleteTarget(row)}
                    />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete country?"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.name} from the homepage and public country pages.`
            : ""
        }
        confirmLabel="Delete"
        loading={saving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

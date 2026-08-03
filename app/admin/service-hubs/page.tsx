"use client";

import { useCallback, useEffect, useState } from "react";
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
import { GripVertical, MapPin, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAdminModuleAccess } from "@/hooks/useAdminModuleAccess";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import {
  deleteAdminHubCountry,
  listAdminHubCountries,
  reorderAdminHubCountries,
  type AdminHubCountry,
} from "@/lib/admin-auth";

function SortableCountryRow({
  row,
  saving,
  onDelete,
}: {
  row: AdminHubCountry;
  saving: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: saving,
  });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
      }}
      className={`border-t border-[#EEF2F6] ${saving ? "" : "cursor-grab active:cursor-grabbing"}`}
      {...attributes}
      {...listeners}
    >
      <td className="px-3 py-3 align-middle">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#829AB1]" aria-hidden>
          <GripVertical className="h-4 w-4" />
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#1c69dd]" />
          <div>
            <p className="font-medium text-[#102A43]">{row.name}</p>
            <p className="text-xs text-[#829AB1]">/service/{row.slug}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[#486581]">
        {row.currency_symbol} ({row.currency_code})
      </td>
      <td className="px-4 py-3 text-[#486581]">{row.city_count ?? row.cities?.length ?? 0}</td>
      <td className="px-4 py-3 text-[#486581]">{row.offerings?.length ?? 0}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {row.is_active ? "Active" : "Hidden"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <Link
            href={`/admin/service-hubs/${row.id}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#486581] hover:bg-[#F0F4F8] hover:text-[#009877]"
            aria-label="Edit"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
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

export default function AdminServiceHubsPage() {
  const { canAccess, accessReady } = useAdminModuleAccess("/admin/service-hubs");
  const [rows, setRows] = useState<AdminHubCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAdminHubCountries());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load service hubs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    void load();
  }, [canAccess, load]);

  useSetAdminPageChrome({
    title: "Service hubs",
    subtitle: "Drag to reorder countries — same order appears on the site and footer",
  });

  const onDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteAdminHubCountry(deleteId);
      toast.success("Country deleted");
      setDeleteId(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (saving) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = rows.findIndex((row) => row.id === active.id);
      const newIndex = rows.findIndex((row) => row.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const previous = rows;
      const next = arrayMove(rows, oldIndex, newIndex);
      setRows(next);
      setSaving(true);
      try {
        const refreshed = await reorderAdminHubCountries(next.map((row) => row.id));
        if (Array.isArray(refreshed) && refreshed.length) setRows(refreshed);
        toast.success("Order updated");
      } catch (error) {
        setRows(previous);
        toast.error(error instanceof Error ? error.message : "Reorder failed");
      } finally {
        setSaving(false);
      }
    },
    [saving, rows],
  );

  if (!accessReady) {
    return (
      <div className="rounded-xl border border-[#E1E7EF] bg-white p-6 text-sm text-[#627D98]">
        Checking access…
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="rounded-xl border border-[#E1E7EF] bg-white p-6 text-sm text-[#627D98]">
        Access restricted. Ask an admin to grant the Service hubs module for your role.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#627D98]">
          Drag countries to reorder. Open a country to add services from your catalog and set local
          fees — that fills <code className="text-xs">/service/…</code> pages.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E1EA] bg-white px-3 py-2 text-sm font-medium text-[#486581] hover:bg-[#F0F4F8]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/admin/service-hubs/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#009877] px-3 py-2 text-sm font-semibold text-white hover:bg-[#007a5f]"
          >
            <Plus className="h-4 w-4" />
            Add country
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E1E7EF] bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#829AB1]">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#829AB1]">No hub countries yet.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#829AB1]">
                  <tr>
                    <th className="px-3 py-3 font-semibold"> </th>
                    <th className="px-4 py-3 font-semibold">Country</th>
                    <th className="px-4 py-3 font-semibold">Currency</th>
                    <th className="px-4 py-3 font-semibold">Cities</th>
                    <th className="px-4 py-3 font-semibold">Services</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <SortableCountryRow
                      key={row.id}
                      row={row}
                      saving={saving}
                      onDelete={() => setDeleteId(row.id)}
                    />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete hub country?"
        description="This removes the country, its cities, and location offerings."
        confirmLabel="Delete"
        loading={saving}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
